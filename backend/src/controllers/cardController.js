import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Bir kartın etiket id'lerini getirir (yardımcı).
 */
async function getCardLabelIds(cardId) {
  const r = await query('SELECT label_id FROM card_labels WHERE card_id = $1', [cardId]);
  return r.rows.map((row) => row.label_id);
}

/**
 * GET /api/lists/:listId/cards
 */
export const getCards = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const result = await query(
    `SELECT id, list_id, title, description, position, due_date, assigned_to, created_at
       FROM cards
      WHERE list_id = $1
      ORDER BY position, id`,
    [listId]
  );

  const cardLabels = await query(
    `SELECT cl.card_id, cl.label_id
       FROM card_labels cl
       JOIN cards c ON c.id = cl.card_id
      WHERE c.list_id = $1`,
    [listId]
  );
  const byCard = new Map();
  for (const { card_id, label_id } of cardLabels.rows) {
    if (!byCard.has(card_id)) byCard.set(card_id, []);
    byCard.get(card_id).push(label_id);
  }

  const cards = result.rows.map((c) => ({ ...c, label_ids: byCard.get(c.id) || [] }));
  res.json({ cards });
});

/**
 * POST /api/lists/:listId/cards
 */
export const createCard = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const { title, description = null, position, due_date = null, assigned_to = null } = req.body || {};

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title alanı zorunludur.' });
  }

  // assigned_to verildiyse, atanacak kullanıcı board üyesi olmalı
  if (assigned_to) {
    const member = await query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [req.boardId, assigned_to]
    );
    if (member.rows.length === 0) {
      return res.status(400).json({ error: 'Atanan kullanıcı bu board üyesi değil.' });
    }
  }

  let pos = position;
  if (pos === undefined || pos === null) {
    const maxRes = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE list_id = $1',
      [listId]
    );
    pos = maxRes.rows[0].next;
  }

  const result = await query(
    `INSERT INTO cards (list_id, title, description, position, due_date, assigned_to)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, list_id, title, description, position, due_date, assigned_to, created_at`,
    [listId, title.trim(), description, pos, due_date, assigned_to]
  );

  res.status(201).json({ card: { ...result.rows[0], label_ids: [] } });
});

/**
 * PUT /api/lists/:listId/cards/:cardId
 */
export const updateCard = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const cardId = Number(req.params.cardId);
  const { title, description, position, due_date, assigned_to } = req.body || {};

  if (assigned_to) {
    const member = await query(
      'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
      [req.boardId, assigned_to]
    );
    if (member.rows.length === 0) {
      return res.status(400).json({ error: 'Atanan kullanıcı bu board üyesi değil.' });
    }
  }

  const result = await query(
    `UPDATE cards
        SET title       = COALESCE($1, title),
            description  = COALESCE($2, description),
            position     = COALESCE($3, position),
            due_date     = COALESCE($4, due_date),
            assigned_to  = COALESCE($5, assigned_to)
      WHERE id = $6 AND list_id = $7
      RETURNING id, list_id, title, description, position, due_date, assigned_to, created_at`,
    [
      title ?? null,
      description ?? null,
      position ?? null,
      due_date ?? null,
      assigned_to ?? null,
      cardId,
      listId,
    ]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Kart bulunamadı.' });
  }
  const labelIds = await getCardLabelIds(cardId);
  res.json({ card: { ...result.rows[0], label_ids: labelIds } });
});

/**
 * DELETE /api/lists/:listId/cards/:cardId
 */
export const deleteCard = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const cardId = Number(req.params.cardId);
  const result = await query(
    'DELETE FROM cards WHERE id = $1 AND list_id = $2 RETURNING id',
    [cardId, listId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Kart bulunamadı.' });
  }
  res.status(204).send();
});

/**
 * PATCH /api/cards/:id/move
 * Kartı (isteğe bağlı olarak) başka bir listeye taşır ve hedef pozisyona yerleştirir.
 * Hedef listedeki diğer kartların pozisyonları kaydırılır (drag & drop mantığı).
 *
 * Body: { list_id: <hedef liste>, position: <hedef sıra> }
 */
export const moveCard = asyncHandler(async (req, res) => {
  const cardId = Number(req.params.id);
  const { list_id: targetListId, position: targetPosition } = req.body || {};

  if (targetListId === undefined || targetPosition === undefined) {
    return res.status(400).json({ error: 'list_id ve position alanları zorunludur.' });
  }
  // Girdi doğrulama: list_id pozitif tam sayı, position negatif olamaz.
  if (!Number.isInteger(targetListId) || targetListId <= 0 || !Number.isInteger(targetPosition) || targetPosition < 0) {
    return res.status(400).json({ error: 'list_id pozitif tam sayı, position negatif olmayan tam sayı olmalıdır.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Kartın mevcut durumu
    const cardRes = await client.query('SELECT id, list_id FROM cards WHERE id = $1', [cardId]);
    if (cardRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Kart bulunamadı.' });
    }
    const sourceListId = cardRes.rows[0].list_id;

    // Hedef liste kartla aynı board'a mı ait? (authorizeBoard board'u karttan çözdü)
    const targetList = await client.query('SELECT board_id FROM lists WHERE id = $1', [targetListId]);
    if (targetList.rows.length === 0 || targetList.rows[0].board_id !== req.boardId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Hedef liste bu board üzerinde değil.' });
    }

    // 1) Kartı geçici olarak kaynaktan çıkar: sonraki kartları yukarı kaydır
    await client.query(
      `UPDATE cards SET position = position - 1
        WHERE list_id = $1 AND position > (SELECT position FROM cards WHERE id = $2)`,
      [sourceListId, cardId]
    );

    // 2) Hedef listede yer aç: hedef pozisyon ve sonrasını aşağı kaydır
    await client.query(
      `UPDATE cards SET position = position + 1
        WHERE list_id = $1 AND position >= $2`,
      [targetListId, targetPosition]
    );

    // 3) Kartı yeni yerine koy
    const updated = await client.query(
      `UPDATE cards SET list_id = $1, position = $2
        WHERE id = $3
        RETURNING id, list_id, title, description, position, due_date, assigned_to, created_at`,
      [targetListId, targetPosition, cardId]
    );

    await client.query('COMMIT');

    const labelIds = await getCardLabelIds(cardId);
    res.json({ card: { ...updated.rows[0], label_ids: labelIds } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * POST /api/cards/:id/labels   Body: { label_id }
 * Karta etiket atar (etiket kartla aynı board'a ait olmalı).
 */
export const addLabelToCard = asyncHandler(async (req, res) => {
  const cardId = Number(req.params.id);
  const { label_id: labelId } = req.body || {};
  if (!labelId) {
    return res.status(400).json({ error: 'label_id alanı zorunludur.' });
  }

  const label = await query('SELECT id, board_id FROM labels WHERE id = $1', [labelId]);
  if (label.rows.length === 0 || label.rows[0].board_id !== req.boardId) {
    return res.status(400).json({ error: 'Etiket bu board üzerinde bulunamadı.' });
  }

  await query(
    'INSERT INTO card_labels (card_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [cardId, labelId]
  );

  const labelIds = await getCardLabelIds(cardId);
  res.status(201).json({ card_id: cardId, label_ids: labelIds });
});

/**
 * DELETE /api/cards/:id/labels/:labelId
 * Karttan etiket kaldırır.
 */
export const removeLabelFromCard = asyncHandler(async (req, res) => {
  const cardId = Number(req.params.id);
  const labelId = Number(req.params.labelId);

  const result = await query(
    'DELETE FROM card_labels WHERE card_id = $1 AND label_id = $2 RETURNING label_id',
    [cardId, labelId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Bu kartta böyle bir etiket yok.' });
  }

  const labelIds = await getCardLabelIds(cardId);
  res.json({ card_id: cardId, label_ids: labelIds });
});
