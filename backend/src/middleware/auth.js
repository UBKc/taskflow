import { verifyToken } from '../utils/jwt.js';

/**
 * Kimlik doğrulama middleware'i.
 * "Authorization: Bearer <token>" başlığını doğrular ve req.user'ı doldurur.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Yetkilendirme başlığı eksik veya hatalı (Bearer token bekleniyor).' });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}
