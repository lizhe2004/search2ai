import fetch from 'node-fetch'
const process = require('process');
const { config } = require('dotenv');
config({ path: __dirname + '/../.env' });

async function search(query) {
    console.log(`正在使用查询进行自定义搜索: ${JSON.stringify(query)}`);
    try {
        const response = await fetch('https://search.search2ai.one', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": process.env.SEARCH1API_KEY ? `Bearer ${process.env.SEARCH1API_KEY}` : '',
                "google_cx": process.env.GOOGLE_CX || '',
                "google_key": process.env.GOOGLE_KEY || '',
                "serpapi_key": process.env.SERPAPI_KEY || '',
                "serper_key": process.env.SERPER_KEY || '',
                "bing_key": process.env.BING_KEY || '',
                "apibase": process.env.APIBASE || 'https://api.openai.com'
            },
            body: JSON.stringify({
                query: query,
                search_service: process.env.SEARCH_SERVICE,
                max_results: process.env. MAX_RESULTS || "10",
                crawl_results:process.env.CRAWL_RESULTS || "0"
            })
        });

        if (!response.ok) {
            console.error(`API 请求失败, 状态码: ${response.status}`);
            return `API 请求失败, 状态码: ${response.status}`;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            console.error("收到的响应不是有效的 JSON 格式");
            return "收到的响应不是有效的 JSON 格式";
        }

        const data = await response.json();
        console.log('自定义搜索服务调用完成');
        return JSON.stringify(data); 
    } catch (error) {
        console.error(`在 search 函数中捕获到错误: ${error}`);
        return `在 search 函数中捕获到错误: ${error}`;
    }
}

module.exports = search;