import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeBoard } from '../middleware/authorize.js';
import {
  listBoards,
  getBoard,
  createBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
} from '../controllers/boardController.js';

const router = Router();

// Tüm board route'ları kimlik doğrulama gerektirir
router.use(authenticate);

/**
 * @openapi
 * /api/boards:
 *   get:
 *     tags: [Boards]
 *     summary: Kullanıcının üyesi olduğu board'lar
 *     responses:
 *       200:
 *         description: Board listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 boards:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Board' }
 *   post:
 *     tags: [Boards]
 *     summary: Yeni board oluştur (oluşturan otomatik admin olur)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: Yaz Stajı Görev Panosu }
 *     responses:
 *       201:
 *         description: Oluşturulan board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board: { $ref: '#/components/schemas/Board' }
 */
router.get('/', listBoards);
router.post('/', createBoard);

/**
 * @openapi
 * /api/boards/{id}:
 *   get:
 *     tags: [Boards]
 *     summary: Board detayı (listeler + kartlar + üyeler + etiketler)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Board detayı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board: { $ref: '#/components/schemas/Board' }
 *                 members: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                 labels: { type: array, items: { $ref: '#/components/schemas/Label' } }
 *                 lists:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/List'
 *                       - type: object
 *                         properties:
 *                           cards: { type: array, items: { $ref: '#/components/schemas/Card' } }
 *       403: { description: Yetkisiz, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   put:
 *     tags: [Boards]
 *     summary: Board güncelle (sadece admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, example: Güncel Pano Adı }
 *     responses:
 *       200:
 *         description: Güncellenen board
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 board: { $ref: '#/components/schemas/Board' }
 *       403: { description: Admin yetkisi gerekli, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Boards]
 *     summary: Board sil (sadece admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Silindi }
 *       403: { description: Admin yetkisi gerekli, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.get('/:id', authorizeBoard({ source: 'board', role: 'member' }), getBoard);
router.put('/:id', authorizeBoard({ source: 'board', role: 'admin' }), updateBoard);
router.delete('/:id', authorizeBoard({ source: 'board', role: 'admin' }), deleteBoard);

/**
 * @openapi
 * /api/boards/{id}/members:
 *   post:
 *     tags: [Boards]
 *     summary: E-posta ile üye davet et (sadece admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, example: elif@taskflow.dev }
 *               role: { type: string, enum: [admin, member], example: member }
 *     responses:
 *       201:
 *         description: Eklenen üye
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member: { $ref: '#/components/schemas/User' }
 *       404: { description: Kullanıcı bulunamadı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *       409: { description: Zaten üye, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.post('/:id/members', authorizeBoard({ source: 'board', role: 'admin' }), addMember);

/**
 * @openapi
 * /api/boards/{id}/members/{userId}:
 *   delete:
 *     tags: [Boards]
 *     summary: Üyeyi board'dan çıkar (sadece admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Çıkarıldı }
 *       400: { description: Board sahibi çıkarılamaz, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.delete('/:id/members/:userId', authorizeBoard({ source: 'board', role: 'admin' }), removeMember);

export default router;
