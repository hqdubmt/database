
require('dotenv').config();

const express = require('express');
const pool = require('./src/config/db');
const redis = require('./src/config/redis');
const mongoose = require('./src/config/mongo');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const USERS_CACHE_KEY = 'users:all';
const USERS_CACHE_TTL = 60;

app.use(express.json());

// 1. Trang chủ
app.get('/', (req, res) => {
  res.json({
    message: 'Node.js API is running',
  });
});

// 2. Kiểm tra PostgreSQL
app.get('/postgres', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS server_time');

    res.json({
      message: 'PostgreSQL connected',
      time: result.rows[0].server_time,
    });
  } catch (error) {
    console.error('PostgreSQL error:', error.message);

    res.status(500).json({
      error: 'PostgreSQL connection failed',
    });
  }
});

// 3. Kiểm tra Redis
app.get('/redis', async (req, res) => {
  try {
    const value = await redis.get('test_key');

    res.json({
      message: 'Redis connected',
      value,
    });
  } catch (error) {
    console.error('Redis error:', error.message);

    res.status(500).json({
      error: 'Redis connection failed',
    });
  }
});

// 4. Tạo bảng users nếu chưa tồn tại
app.post('/setup-users', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    res.status(200).json({
      message: 'Table users is ready',
    });
  } catch (error) {
    console.error('Create users table error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    res.status(500).json({
      error: 'Cannot create users table',
    });
  }
});

// 5. Thêm user vào PostgreSQL
app.post('/users', async (req, res) => {
  try {
    const { name, email } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        error: 'name and email are required',
      });
    }

    // PostgreSQL là nơi lưu dữ liệu gốc
    const result = await pool.query(
      `INSERT INTO users (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email, created_at`,
      [name.trim(), email.trim()]
    );

    // Xóa cache cũ sau khi thêm user thành công.
    // Nếu Redis lỗi, user vẫn đã được lưu trong PostgreSQL.
    try {
      await redis.del(USERS_CACHE_KEY);
    } catch (cacheError) {
      console.error(
        'Redis cache invalidation error:',
        cacheError.message
      );
    }

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Create user error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email already exists',
      });
    }

    if (error.code === '42P01') {
      return res.status(500).json({
        error: 'Table users does not exist. Run POST /setup-users first.',
      });
    }

    if (error.code === '42501') {
      return res.status(500).json({
        error: 'PostgreSQL user does not have permission to insert.',
      });
    }

    res.status(500).json({
      error: 'Cannot create user',
    });
  }
});

// 6. Lấy danh sách users: Redis trước, PostgreSQL sau
app.get('/users', async (req, res) => {
  // Thử đọc cache Redis
  try {
    const cachedUsers = await redis.get(USERS_CACHE_KEY);

    if (cachedUsers !== null) {
      const users = JSON.parse(cachedUsers);

      return res.json({
        source: 'Redis',
        count: users.length,
        users,
      });
    }
  } catch (cacheError) {
    // Redis lỗi thì vẫn tiếp tục lấy dữ liệu từ PostgreSQL
    console.error('Redis cache read error:', cacheError.message);
  }

  // Cache không có hoặc Redis lỗi: lấy dữ liệu gốc
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       ORDER BY id DESC`
    );

    // Thử lưu bản sao vào Redis trong 60 giây
    try {
      await redis.set(
        USERS_CACHE_KEY,
        JSON.stringify(result.rows),
        { EX: USERS_CACHE_TTL }
      );
    } catch (cacheError) {
      console.error('Redis cache write error:', cacheError.message);
    }

    return res.json({
      source: 'PostgreSQL',
      count: result.rowCount,
      users: result.rows,
    });
  } catch (error) {
    console.error('Get users error:', error.message);
    console.error('PostgreSQL error code:', error.code);

    return res.status(500).json({
      error: 'Cannot get users',
    });
  }
});

// 7. Khởi động server
async function startServer() {
  try {
    if (!redis.isOpen) {
      await redis.connect();
    }

    await pool.query('SELECT 1');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log('PostgreSQL connected');
      console.log('Redis connected');
    });
  } catch (error) {
    console.error('Startup failed:', error.message);

    if (redis.isOpen) {
      await redis.quit().catch(() => {});
    }

    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
}

startServer();
