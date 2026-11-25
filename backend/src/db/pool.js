import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// butun sorgular parametreli ($1, $2...), sql injection olmasin
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);

pool.on('error', (err) => {
  console.error('Beklenmedik PostgreSQL havuz hatası:', err);
});
