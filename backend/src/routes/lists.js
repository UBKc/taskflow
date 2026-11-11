import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeBoard } from '../middleware/authorize.js';
import {
  getLists,
  createList,
  updateList,
  deleteList,
} from '../controllers/listController.js';

// mergeParams: üst route'tan gelen :boardId'ye erişmek için
const router = Router({ mergeParams: true });

// Kimlik doğrulama + board üyeliği (member yeterli)
router.use(authenticate);
router.use(authorizeBoard({ source: 'board', role: 'member' }));

/**
 * @openapi
 * /api/boards/{boardId}/lists:
 *   get:
 *     tags: [Lists]
 *     summary: Board'un listelerini getir
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Liste dizisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 lists: { type: array, items: { $ref: '#/components/schemas/List' } }
 *   post:
 *     tags: [Lists]
 *     summary: Yeni liste oluştur
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title]
 *             properties:
 *               title: { type: string, example: Yapılacak }
 *               position: { type: integer, example: 0 }
 *     responses:
 *       201:
 *         description: Oluşturulan liste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list: { $ref: '#/components/schemas/List' }
 */
router.get('/', getLists);
router.post('/', createList);

/**
 * @openapi
 * /api/boards/{boardId}/lists/{listId}:
 *   put:
 *     tags: [Lists]
 *     summary: Liste güncelle (title ve/veya position)
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: Yapılıyor }
 *               position: { type: integer, example: 1 }
 *     responses:
 *       200:
 *         description: Güncellenen liste
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 list: { $ref: '#/components/schemas/List' }
 *       404: { description: Liste bulunamadı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Lists]
 *     summary: Liste sil
 *     parameters:
 *       - in: path
 *         name: boardId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Silindi }
 *       404: { description: Liste bulunamadı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
router.put('/:listId', updateList);
router.delete('/:listId', deleteList);

export default router;
