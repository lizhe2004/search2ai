// @ts-check
 
/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    async rewrites() {
      return [
        {
          source: '/:path*',
          destination: '/',
        },
      ]
    },
  }
   
  module.exports = nextConfig