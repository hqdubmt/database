
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env')
});

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.DB_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
});

// Kiểm tra kết nối
pool.query('SELECT NOW()')
  .then((result) => {
    console.log('Ket noi PostgreSQL thanh cong!');
    console.log('Thoi gian server:', result.rows[0].now);
  })
  .catch((error) => {
    console.error('Loi ket noi PostgreSQL:', error.message);
  });

module.exports = pool;
