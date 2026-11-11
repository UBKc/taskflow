import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, me } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Brute-force ve kullanıcı numaralandırmaya karşı hız sınırı.
// Yalnızca BAŞARISIZ istekler sayılır; meşru girişler etkilenmez.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dk içinde en fazla 5 başarısız deneme
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çok fazla başarısız deneme. Lütfen bir süre sonra tekrar deneyin.' },
});

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Yeni kullanıcı kaydı
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Umut Boran }
 *               email: { type: string, example: umut@taskflow.dev }
 *               password: { type: string, example: password123 }
 *     responses:
 *       201:
 *         description: Kullanıcı oluşturuldu
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400: { description: Eksik/geçersiz alan, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: E-posta zaten kayıtlı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/register', authLimiter, register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Giriş yap ve JWT al
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: umut@taskflow.dev }
 *               password: { type: string, example: password123 }
 *     responses:
 *       200:
 *         description: Giriş başarılı
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       401: { description: E-posta veya şifre hatalı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/login', authLimiter, login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Geçerli oturumdaki kullanıcı bilgisi
 *     responses:
 *       200:
 *         description: Kullanıcı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: Yetkisiz, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/me', authenticate, me);

export default router;
