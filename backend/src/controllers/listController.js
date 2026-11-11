import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/boards/:boardId/lists
 */
export const getLists = asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT id, board_id, title, position FROM lists WHERE board_id = $1 ORDER BY position, id',
    [req.boardId]
  );
  res.json({ lists: result.rows });
});

/**
 * POST /api/boards/:boardId/lists
 * position verilmezse listenin sonuna eklenir.
 */
export const createList = asyncHandler(async (req, res) => {
  const { title, position } = req.body || {};
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title alanı zorunludur.' });
  }

  let pos = position;
  if (pos === undefined || pos === null) {
    const maxRes = await query(
      'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM lists WHERE board_id = $1',
      [req.boardId]
    );
    pos = maxRes.rows[0].next;
  }

  const result = await query(
    'INSERT INTO lists (board_id, title, position) VALUES ($1, $2, $3) RETURNING id, board_id, title, position',
    [req.boardId, title.trim(), pos]
  );
  res.status(201).json({ list: result.rows[0] });
});

/**
 * PUT /api/boards/:boardId/lists/:listId
 * title ve/veya position güncellenebilir.
 */
export const updateList = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const { title, position } = req.body || {};

  if (title === undefined && position === undefined) {
    return res.status(400).json({ error: 'Güncellenecek en az bir alan (title veya position) gönderin.' });
  }

  const result = await query(
    `UPDATE lists
        SET title    = COALESCE($1, title),
            position = COALESCE($2, position)
      WHERE id = $3 AND board_id = $4
      RETURNING id, board_id, title, position`,
    [title ?? null, position ?? null, listId, req.boardId]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Liste bulunamadı.' });
  }
  res.json({ list: result.rows[0] });
});

/**
 * DELETE /api/boards/:boardId/lists/:listId
 */
export const deleteList = asyncHandler(async (req, res) => {
  const listId = Number(req.params.listId);
  const result = await query(
    'DELETE FROM lists WHERE id = $1 AND board_id = $2 RETURNING id',
    [listId, req.boardId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Liste bulunamadı.' });
  }
  res.status(204).send();
});
