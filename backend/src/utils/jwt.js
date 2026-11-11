import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'degistir-beni';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Kullanıcı için access token üretir.
 * @param {{ id: number, email: string, name: string }} payload
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Token'ı doğrular; geçersizse hata fırlatır.
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
