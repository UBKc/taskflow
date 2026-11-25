// schema.sql'i (db:seed ile seed.sql'i de) calistiriyor
// docker-compose kullaniliyorsa gerek yok, konteyner ilk acilista kendisi calistiriyor
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { pool } from '../src/db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '../../');

async function runSqlFile(relativePath) {
  const fullPath = resolve(rootDir, relativePath);
  const sql = readFileSync(fullPath, 'utf-8');
  console.log(`-> Çalıştırılıyor: ${relativePath}`);
  await pool.query(sql);
  console.log(`   Tamam: ${relativePath}`);
}

async function main() {
  const withSeed = process.argv.includes('--seed');
  try {
    await runSqlFile('schema.sql');
    if (withSeed) {
      await runSqlFile('seed.sql');
    }
    console.log('Veritabanı hazır.');
  } catch (err) {
    console.error('Veritabanı hazırlanırken hata:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
