// index.js 示例
const fetch = require('node-fetch');

const process = require('process');
const Stream = require('stream');
const http = require('http');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // 允许的HTTP方法
    'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
    'Access-Control-Max-Age': '86400', // 预检请求结果的缓存时间
};

  async function handleRequest(apiBase, apiKey, req, pathname) {
    // 创建一个新的 Headers 对象，复制原始请求的所有头部，但不包括 Host 头部
    const headers = {...req.headers};
    delete headers['host'];
    headers['authorization'] = `Bearer ${apiKey}`;

    // 对所有请求，直接转发
    const response = await fetch(`${apiBase}${pathname}`, {
        method: req.method,
        headers: headers,
        body: req.body
    });

    let data;
    if (pathname.startsWith('/v1/audio/')) {
        // 如果路径以 '/v1/audio/' 开头，处理音频文件
        const arrayBuffer = await response.arrayBuffer();
        data = Buffer.from(arrayBuffer);        
        return  new Response(data,{"headers": { ...response.headers, 'Content-Type': 'audio/mpeg', ...corsHeaders }})  
    } else {
        // 对于其他路径，处理 JSON 数据
        data = await response.json();
        return  Response.json(data,{"headers": response.headers})  
    }
}

  function OPTIONS(){

    const optionsResponse ={
        status: 200,
        headers: corsHeaders
    };
    const response = new Response("", optionsResponse);
      return response;
}

 function GET(req) {
 
    const url = new URL(req.url)
 
    console.log(`收到请求: ${req.method} ${req.url} ${url.pathname}`);
    if (url.pathname === '/') {
    const data = '<html><head><meta charset="UTF-8"></head><body><h1>欢迎体验基于Next的search2ai，让你的大模型自由联网！</h1></body></html>'
    const headers = {
        'Content-Type': 'text/html'
      };
      const response = new Response(data, {
        headers,
        status: 200
      });
      return response;
    }
    else 
        return new Response("No Found", {status: 404 });
      
}

  async function POST(req)   {
    console.log(`收到请求: ${req.method} ${req.url}`);
    const url = new URL(req.url)
    const apiBase = process.env.APIBASE ||  'https://api.openai.com';
    const authHeader = req.headers['authorization']; // 从请求的 headers 中获取 Authorization

    let apiKey = '';
    if (authHeader) {
        apiKey = authHeader.split(' ')[1]; // 从 Authorization 中获取 API key
    } else {
        res.statusCode = 400;
        res.end('Authorization header is missing');
        return;
    }
    let response;
    try {
        console.log(url.pathname)
        response = await handleRequest(apiBase, apiKey, req, url.pathname);
      
    } catch (error) {
        console.error('请求处理时发生错误:', error);
         
        response  = new Response('Internal Server Error', { status: 500});
        return response;
    }
}
module.exports ={
    GET,OPTIONS,POST
}