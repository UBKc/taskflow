import bcrypt from 'bcrypt';
import { query } from '../db/pool.js';
import { signToken } from '../utils/jwt.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Ad, email ve şifre ile yeni kullanıcı oluşturur.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email ve password alanları zorunludur.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
  }

  // E-posta zaten kayıtlı mı? (parametreli sorgu)
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Bu e-posta ile zaten bir kullanıcı var.' });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, created_at`,
    [name, email, passwordHash]
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, email: user.email, name: user.name });

  res.status(201).json({ user, token });
});

/**
 * POST /api/auth/login
 * E-posta + şifre doğrular, JWT döner.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'email ve password alanları zorunludur.' });
  }

  const result = await query(
    'SELECT id, name, email, password_hash FROM users WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
  }

  const user = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
  }

  const token = signToken({ id: user.id, email: user.email, name: user.name });

  res.json({
    user: { id: user.id, name: user.name, email: user.email },
    token,
  });
});

/**
 * GET /api/auth/me
 * Geçerli token'a sahip kullanıcının bilgilerini döner.
 */
export const me = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, name, email, created_at FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  }
  res.json({ user: result.rows[0] });
});
