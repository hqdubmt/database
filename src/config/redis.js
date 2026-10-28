
require('dotenv').config({
  path: require('path').join(__dirname, '../.env')
});

const { createClient } = require('redis');

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
  },
  password: process.env.REDIS_PASSWORD,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

module.exports = redis;
