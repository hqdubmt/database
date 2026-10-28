
const express = require('express');
const pool = require('./db/db');

const app = express();

app.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu' });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server chạy tại port 3000');
});



const redis = require('./db/redis');

async function main() {
  try {
    await redis.connect();

    console.log('Redis ket noi thanh cong!');

    await redis.set('test_key', 'Hello Redis');
    console.log('Gia tri:', await redis.get('test_key'));
  } catch (error) {
    console.error('Loi Redis:', error.message);
  } finally {
    if (redis.isOpen) {
      await redis.quit();
    }
  }
}

main();
