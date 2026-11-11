import { pool, query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * GET /api/boards
 * Giriş yapan kullanıcının üyesi olduğu tüm board'lar (rolüyle birlikte).
 */
export const listBoards = asyncHandler(async (req, res) => {
  const result = await query(
    `SELECT b.id, b.name, b.owner_id, b.created_at, bm.role
       FROM boards b
       JOIN board_members bm ON bm.board_id = b.id
      WHERE bm.user_id = $1
      ORDER BY b.created_at DESC`,
    [req.user.id]
  );
  res.json({ boards: result.rows });
});

/**
 * GET /api/boards/:id
 * Board detayı: üyeler + listeler + kartlar + etiketler (iç içe).
 */
export const getBoard = asyncHandler(async (req, res) => {
  const boardId = req.boardId;

  const boardRes = await query(
    'SELECT id, name, owner_id, created_at FROM boards WHERE id = $1',
    [boardId]
  );
  if (boardRes.rows.length === 0) {
    return res.status(404).json({ error: 'Board bulunamadı.' });
  }
  const board = boardRes.rows[0];

  const membersRes = await query(
    `SELECT u.id, u.name, u.email, bm.role
       FROM board_members bm
       JOIN users u ON u.id = bm.user_id
      WHERE bm.board_id = $1
      ORDER BY bm.role, u.name`,
    [boardId]
  );

  const listsRes = await query(
    'SELECT id, board_id, title, position FROM lists WHERE board_id = $1 ORDER BY position, id',
    [boardId]
  );

  const cardsRes = await query(
    `SELECT c.id, c.list_id, c.title, c.description, c.position, c.due_date,
            c.assigned_to, c.created_at
       FROM cards c
       JOIN lists l ON l.id = c.list_id
      WHERE l.board_id = $1
      ORDER BY c.position, c.id`,
    [boardId]
  );

  const labelsRes = await query(
    'SELECT id, board_id, name, color FROM labels WHERE board_id = $1 ORDER BY id',
    [boardId]
  );

  const cardLabelsRes = await query(
    `SELECT cl.card_id, cl.label_id
       FROM card_labels cl
       JOIN cards c ON c.id = cl.card_id
       JOIN lists l ON l.id = c.list_id
      WHERE l.board_id = $1`,
    [boardId]
  );

  // Kartlara etiketlerini iliştir
  const labelsByCard = new Map();
  for (const { card_id, label_id } of cardLabelsRes.rows) {
    if (!labelsByCard.has(card_id)) labelsByCard.set(card_id, []);
    labelsByCard.get(card_id).push(label_id);
  }
  const cards = cardsRes.rows.map((c) => ({
    ...c,
    label_ids: labelsByCard.get(c.id) || [],
  }));

  // Listeleri kartlarıyla birlikte döndür
  const lists = listsRes.rows.map((l) => ({
    ...l,
    cards: cards.filter((c) => c.list_id === l.id),
  }));

  res.json({
    board,
    members: membersRes.rows,
    labels: labelsRes.rows,
    lists,
  });
});

/**
 * POST /api/boards
 * Board oluşturur; oluşturan kullanıcı otomatik olarak 'admin' üye olur.
 */
export const createBoard = asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name alanı zorunludur.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const boardRes = await client.query(
      'INSERT INTO boards (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at',
      [name.trim(), req.user.id]
    );
    const board = boardRes.rows[0];

    await client.query(
      "INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, 'admin')",
      [board.id, req.user.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ board: { ...board, role: 'admin' } });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * PUT /api/boards/:id  (sadece admin)
 */
export const updateBoard = asyncHandler(async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name alanı zorunludur.' });
  }

  const result = await query(
    'UPDATE boards SET name = $1 WHERE id = $2 RETURNING id, name, owner_id, created_at',
    [name.trim(), req.boardId]
  );
  res.json({ board: result.rows[0] });
});

/**
 * DELETE /api/boards/:id  (sadece admin)
 */
export const deleteBoard = asyncHandler(async (req, res) => {
  await query('DELETE FROM boards WHERE id = $1', [req.boardId]);
  res.status(204).send();
});

/**
 * POST /api/boards/:id/members  (sadece admin)
 * E-posta ile üye davet eder.
 */
export const addMember = asyncHandler(async (req, res) => {
  const { email, role = 'member' } = req.body || {};
  if (!email) {
    return res.status(400).json({ error: 'email alanı zorunludur.' });
  }
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: "role yalnızca 'admin' veya 'member' olabilir." });
  }

  const userRes = await query('SELECT id, name, email FROM users WHERE email = $1', [email]);
  if (userRes.rows.length === 0) {
    return res.status(404).json({ error: 'Bu e-postaya sahip kullanıcı bulunamadı.' });
  }
  const user = userRes.rows[0];

  const existing = await query(
    'SELECT 1 FROM board_members WHERE board_id = $1 AND user_id = $2',
    [req.boardId, user.id]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Kullanıcı zaten bu board üyesi.' });
  }

  await query(
    'INSERT INTO board_members (board_id, user_id, role) VALUES ($1, $2, $3)',
    [req.boardId, user.id, role]
  );

  res.status(201).json({ member: { id: user.id, name: user.name, email: user.email, role } });
});

/**
 * DELETE /api/boards/:id/members/:userId  (sadece admin)
 */
export const removeMember = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);

  // Board sahibi çıkarılamaz
  const boardRes = await query('SELECT owner_id FROM boards WHERE id = $1', [req.boardId]);
  if (boardRes.rows[0]?.owner_id === userId) {
    return res.status(400).json({ error: 'Board sahibi üyelikten çıkarılamaz.' });
  }

  const result = await query(
    'DELETE FROM board_members WHERE board_id = $1 AND user_id = $2 RETURNING user_id',
    [req.boardId, userId]
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Üye bulunamadı.' });
  }
  res.status(204).send();
});
