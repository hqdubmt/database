const mongoose = require('mongoose');
const path = require('path');

// 1. Tự động tìm và nạp file .env (lùi 2 cấp từ src/config/ ra thư mục gốc)
require('dotenv').config({
  path: path.resolve(__dirname, '../../.env')
});

// 2. Dựng chuỗi URI kết nối từ các biến môi trường của bạn
// Sử dụng 127.0.0.1 (localhost) để gọi thẳng vào cổng Docker mở trên máy vật lý
const MONGO_URI = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}@127.0.0.1:${process.env.MONGO_PORT}/${process.env.MONGO_INITDB_DATABASE}?authSource=admin`;

// 3. Hàm thực hiện kết nối
const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🎉 Kết nối thành công tới MongoDB (Docker)!');
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1); // Dừng ứng dụng nếu không kết nối được database
  }
};

// 4. Thực thi kết nối ngay khi file này được require
connectMongoDB();

// Xuất đối tượng mongoose ra để các file Models sử dụng sau này
module.exports = mongoose;
