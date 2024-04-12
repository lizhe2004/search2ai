// index.js 示例
 
import fetch from 'node-fetch'
import handleRequest from './search2ai.js';
const process = require('process');
const Stream = require('stream');
const http = require('http');

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', // 允许的HTTP方法
    'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization',
    'Access-Control-Max-Age': '86400', // 预检请求结果的缓存时间
};



  function OPTIONS(req){
 
    const optionsResponse ={
        status: 200,
        headers: corsHeaders
    };
    const response = new Response("", optionsResponse);
      return response;

}

  async function POST(req)   {
    console.log(`收到请求: ${req.method} ${req.url}`);

    const apiBase = process.env.APIBASE || 'https://one-api.lizhe.io';
    const requestHeaders = new Headers(req.headers)
    const authHeader =requestHeaders.get('authorization') // 从请求的 headers 中获取 Authorization
    let apiKey = '';
    if (authHeader) {
        apiKey = authHeader.split(' ')[1]; // 从 Authorization 中获取 API key
    } else {
        const response = new Response('Authorization header is missing', {status: 400});
        return response;
    }
    let response;
    try {
      
        console.log('接收到 fetch 事件');
        return  await handleRequest(req, apiBase, apiKey);
 
       
    } catch (error) {
        console.error('请求处理时发生错误:', error)
        const response  = new Response('Internal Server Error', { status: 500});
        return response;
    }

return response

}
module.exports ={
    OPTIONS,POST
}