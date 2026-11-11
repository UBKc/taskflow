import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorizeBoard } from '../middleware/authorize.js';
import {
  getCards,
  createCard,
  updateCard,
  deleteCard,
  moveCard,
  addLabelToCard,
  removeLabelFromCard,
} from '../controllers/cardController.js';

/**
 * Liste altındaki kartlar: /api/lists/:listId/cards
 * Board, liste (:listId) üzerinden çözülür.
 */
export const listCardsRouter = Router({ mergeParams: true });
listCardsRouter.use(authenticate);
listCardsRouter.use(authorizeBoard({ source: 'list', role: 'member' }));

/**
 * @openapi
 * /api/lists/{listId}/cards:
 *   get:
 *     tags: [Cards]
 *     summary: Listedeki kartları getir
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Kart dizisi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards: { type: array, items: { $ref: '#/components/schemas/Card' } }
 *   post:
 *     tags: [Cards]
 *     summary: Yeni kart oluştur
 *     parameters:
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
 *             required: [title]
 *             properties:
 *               title: { type: string, example: Board CRUD uç noktaları }
 *               description: { type: string, example: GET/POST/PUT/DELETE /api/boards. }
 *               due_date: { type: string, format: date, example: '2026-07-08' }
 *               assigned_to: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Oluşturulan kart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card: { $ref: '#/components/schemas/Card' }
 */
listCardsRouter.get('/', getCards);
listCardsRouter.post('/', createCard);

/**
 * @openapi
 * /api/lists/{listId}/cards/{cardId}:
 *   put:
 *     tags: [Cards]
 *     summary: Kart güncelle
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string, example: Board CRUD uç noktaları (güncel) }
 *               description: { type: string }
 *               due_date: { type: string, format: date }
 *               assigned_to: { type: integer }
 *     responses:
 *       200:
 *         description: Güncellenen kart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card: { $ref: '#/components/schemas/Card' }
 *       404: { description: Kart bulunamadı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 *   delete:
 *     tags: [Cards]
 *     summary: Kart sil
 *     parameters:
 *       - in: path
 *         name: listId
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: cardId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204: { description: Silindi }
 *       404: { description: Kart bulunamadı, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
listCardsRouter.put('/:cardId', updateCard);
listCardsRouter.delete('/:cardId', deleteCard);

/**
 * Kart üzerinde tekil işlemler: /api/cards/:id/...
 * Board, kart (:id) üzerinden çözülür.
 */
export const cardActionsRouter = Router();
cardActionsRouter.use(authenticate);

/**
 * @openapi
 * /api/cards/{id}/move:
 *   patch:
 *     tags: [Cards]
 *     summary: Kartı başka listeye taşı / sırasını değiştir (drag & drop)
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
 *             required: [list_id, position]
 *             properties:
 *               list_id: { type: integer, example: 3, description: Hedef liste }
 *               position: { type: integer, example: 0, description: Hedef sıra }
 *     responses:
 *       200:
 *         description: Taşınan kart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card: { $ref: '#/components/schemas/Card' }
 *       400: { description: Geçersiz hedef, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
cardActionsRouter.patch('/:id/move', authorizeBoard({ source: 'card', role: 'member' }), moveCard);

/**
 * @openapi
 * /api/cards/{id}/labels:
 *   post:
 *     tags: [Cards]
 *     summary: Karta etiket ata
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
 *             required: [label_id]
 *             properties:
 *               label_id: { type: integer, example: 1 }
 *     responses:
 *       201:
 *         description: Kartın güncel etiketleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card_id: { type: integer, example: 5 }
 *                 label_ids: { type: array, items: { type: integer }, example: [1] }
 */
cardActionsRouter.post('/:id/labels', authorizeBoard({ source: 'card', role: 'member' }), addLabelToCard);

/**
 * @openapi
 * /api/cards/{id}/labels/{labelId}:
 *   delete:
 *     tags: [Cards]
 *     summary: Karttan etiket kaldır
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: labelId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Kartın güncel etiketleri
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 card_id: { type: integer, example: 5 }
 *                 label_ids: { type: array, items: { type: integer }, example: [] }
 *       404: { description: Etiket kartta yok, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
 */
cardActionsRouter.delete('/:id/labels/:labelId', authorizeBoard({ source: 'card', role: 'member' }), removeLabelFromCard);
