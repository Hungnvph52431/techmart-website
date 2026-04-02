// ============================================================
// SỬA connection.ts - Thêm charset utf8mb4 để fix encoding
// ============================================================

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3307'),
  database: process.env.DB_NAME || 'mobile_shop',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // ✅ THÊM 3 DÒNG NÀY ĐỂ FIX ENCODING "Tá»± NhiÃªn"
  charset: 'utf8mb4',
  timezone: '+07:00',
  multipleStatements: false,
});

// ✅ Set charset sau khi connect
pool.on('connection', (connection: any) => {
  connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
});

export const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    // ✅ Set charset cho connection này
    await connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export default pool;