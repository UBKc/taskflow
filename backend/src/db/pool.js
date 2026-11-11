import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

/**
 * Uygulama genelinde tek bir bağlantı havuzu (connection pool) kullanılır.
 * Tüm sorgular parametreli ($1, $2, ...) yazılır -> SQL injection'a karşı korunur.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Kısa yol sorgu yardımcı fonksiyonu.
 * @param {string} text - parametreli SQL metni
 * @param {Array} params - parametre dizisi
 */
export const query = (text, params) => pool.query(text, params);

pool.on('error', (err) => {
  // Beklenmedik havuz hatalarını logla (idle client hatası vb.)
  console.error('Beklenmedik PostgreSQL havuz hatası:', err);
});
