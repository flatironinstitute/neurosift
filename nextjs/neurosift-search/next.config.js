/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  env: {
    PUBNUB_SUBSCRIBE_KEY: process.env.PUBNUB_SUBSCRIBE_KEY,
    PUBNUB_PUBLISH_KEY: process.env.PUBNUB_PUBLISH_KEY,
  },
}

module.exports = nextConfig
