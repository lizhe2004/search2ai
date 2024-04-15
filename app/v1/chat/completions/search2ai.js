import fetch from 'node-fetch'
const search = require('../../../../units/search.js');
const crawler = require('../../../../units/crawler.js');
const news = require('../../../../units/news.js');
const { config } = require('dotenv');
const Stream = require('stream');
import { createParser } from 'eventsource-parser';
config();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // 允许的HTTP方法
    'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
    'Access-Control-Max-Age': '86400', // 预检请求结果的缓存时间
};
async function handleRequest(req, apiBase, apiKey) {
    let responseSent = false;
        if (req.method !== 'POST') {
            console.log(`不支持的请求方法: ${req.method}`);
            responseSent = true;
            return new Response(`不支持的请求方法: ${req.method}`, { status: 405});
        }
    const requestData = await req.json();
    console.log('请求数据:', requestData);
    console.log('API base:', apiBase);
    const stream = requestData.stream || false;
    const userMessages = requestData.messages.filter(message => message.role === 'user');
    const latestUserMessage = userMessages[userMessages.length - 1];
    const model = requestData.model
    const isContentArray = Array.isArray(latestUserMessage.content);
    const defaultMaxTokens = 3000;
    const maxTokens = requestData.max_tokens || defaultMaxTokens; // 使用默认 max_tokens 如果未提供

    const body = JSON.stringify({
        model: model,
        messages: requestData.messages, 
        max_tokens: maxTokens, 
        ...(isContentArray ? {} : {
            tools: [
                {
                    type: "function",
                    function: {
                        name: "search",
                        description: "search for factors",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string","description": "The query to search."}
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "news",
                        description: "Search for news",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { type: "string", description: "The query to search for news." }
                            },
                            required: ["query"]
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "crawler",
                        description: "Get the content of a specified url",
                        parameters: {
                            type: "object",
                            properties: {
                                url: {
                                    type: "string",
                                    description: "The URL of the webpage"},
                            },
                            required: ["url"],
                        }
                    }
                }
            ],
            tool_choice: "auto"
        })
    });
    let openAIResponse;
    try {
        openAIResponse = await fetch(`${apiBase}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: body
        });
    } catch (error) {
        console.error('请求 OpenAI API 时发生错误:', error);
        return new Response('OpenAI API 请求失败', { status: 500});

responseSent
    }
    if (!openAIResponse.ok) {
        throw new Error('OpenAI API 请求失败'+ await openAIResponse.text());
    }

    let data = await openAIResponse.json();
    console.log('确认解析后的 data 对象:', data);
    if (!data) {

    }
    console.log('OpenAI API 响应接收完成，检查是否需要调用自定义函数');
    let messages = requestData.messages;
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message) {
        console.error('OpenAI 响应数据格式不正确');
        return new Response('OpenAI 响应数据格式不正确', { status: 500});
        
    }
    
    messages.push(data.choices[0].message);
    console.log('更新后的 messages 数组:', messages);
    // 检查是否有函数调用
    console.log('开始检查是否有函数调用');

    let calledCustomFunction = false;
    if (data.choices[0].message.tool_calls) {
        const toolCalls = data.choices[0].message.tool_calls;
        const availableFunctions = {
            "search": search,
            "news": news,
            "crawler": crawler        
        };
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionToCall = availableFunctions[functionName];
            const functionArgs = JSON.parse(toolCall.function.arguments);
            let functionResponse;
            if (functionName === 'search') {
                functionResponse = await functionToCall(functionArgs.query);
            } else if (functionName === 'crawler') {
                functionResponse = await functionToCall(functionArgs.url);
            } else if (functionName === 'news') {
                functionResponse = await functionToCall(functionArgs.query);
            }
            console.log(JSON.stringify(functionResponse))
            messages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: functionName,
                content: functionResponse, 
            });
            calledCustomFunction = true;
        }
    } else {
        console.log('没有发现函数调用');
    }
    console.log('结束检查是否有函数调用');

    // 如果调用了自定义函数，再次向 OpenAI API 发送请求
    if (calledCustomFunction) {
        let requestBody = {
            model: model,
            messages: messages,
            stream: stream
        };
        console.log(JSON.stringify(requestBody))
        try {
            let secondResponse = await fetch(`${apiBase}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            if (stream) {
                console.log('返回流');
                const stream_reader = await OpenAIStream(secondResponse)
                console.log(secondResponse.headers)
                return new Response(stream_reader, {headers: { "Content-Type": "text/event-stream",...corsHeaders}});
            }else {
                // 使用普通 JSON 格式
                const data = await secondResponse.json();
                return  Response.json(data)  
            }
        } catch (error) {
            console.error('请求处理时发生错误:', error);
            if (!responseSent) {
                responseSent = true;
                return new Response('Internal Server Error', { status: 500});
                
            } return;  
        }
    } else {
        // 没有调用自定义函数，直接返回原始回复
        console.log('没有调用自定义函数，返回原始回复');
        if (stream) {
            // 使用 SSE 格式
            console.log('Using SSE format');
            const sseStream = jsonToStream(data);
            

            return new Response(sseStream, {
                headers: {
                  "Content-Type": "text/event-stream",
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // 允许的HTTP方法
                  'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
                  'Access-Control-Max-Age': '86400', // 预检请求结果的缓存时间
                },
              });


        } else {
            // 使用普通 JSON 格式
            console.log('Using JSON format');
            return  Response.json(data)  


        }

        console.log('Response sent');
        return { status: 200 };
    }

    async function OpenAIStream(res) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
      
        let counter = 0;
      
        const stream = new ReadableStream({
          async start(controller) {
            function onParse(event) {
              if (event.type === "event") {
                const data = event.data;
                // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
      
                try {
                  const queue = encoder.encode("data: " + data + "\n\n");
                  controller.enqueue(queue);
                  counter++;
                  if (data === "[DONE]") {
                    controller.close();
                    return;
                  }
                } catch (e) {
                  controller.error(e);
                }
              }
            }
      
            //     // 发送响应头到前端
            // controller.enqueue(response);
            // stream response (SSE) from OpenAI may be fragmented into multiple chunks
            // this ensures we properly read chunks and invoke an event for each SSE event stream
            const parser = createParser(onParse);
            // https://web.dev/streams/#asynchronous-iteration
            for await (const chunk of res.body ) {
              parser.feed(decoder.decode(chunk));
            }
          },
        });
        return stream;
      }
      

        function jsonToStream(jsonData) {
            const characters = Array.from(jsonData.choices[0].message.content);
            let currentIndex = 0;

            return new Stream.Readable({
                read() {
                    const pushData = () => {
                        if (currentIndex < characters.length) {
                            const character = characters[currentIndex];
                            const newJsonData = {
                                id: jsonData.id,
                                object: 'chat.completion.chunk',
                                created: jsonData.created,
                                model: jsonData.model,
                                choices: [
                                    {
                                        index: 0,
                                        delta: {
                                            content: character
                                        },
                                        logprobs: null,
                                        finish_reason: currentIndex === characters.length - 1 ? 'stop' : null
                                    }
                                ],
                                system_fingerprint: jsonData.system_fingerprint
                            };

                            const data = `data: ${JSON.stringify(newJsonData)}\n\n`;
                            this.push(data, 'utf8');
                            currentIndex++;
                        } else {
                            this.push('data: [DONE]\n\n', 'utf8');
                            this.push(null);  // 结束流
                        }
                    };

                    setTimeout(pushData, 10);  // 延迟 0.01 秒
                }
            });
        }}
module.exports = handleRequest;