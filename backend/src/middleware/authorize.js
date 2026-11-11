import { query } from '../db/pool.js';

/**
 * İstekten board id'sini kaynağa göre çözer.
 * - 'board': /api/boards/:id veya :boardId
 * - 'list' : /api/boards/:boardId/lists veya /api/lists/:listId -> list üzerinden board
 * - 'card' : /api/cards/:id -> card -> list -> board
 */
// id'yi pozitif tam sayıya çevirir; geçersizse null döner (DB'ye hatalı değer gitmez).
const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

async function resolveBoardId(source, req) {
  if (source === 'board') {
    return toId(req.params.boardId ?? req.params.id);
  }
  if (source === 'list') {
    const listId = toId(req.params.listId ?? req.params.id);
    if (!listId) return null;
    const r = await query('SELECT board_id FROM lists WHERE id = $1', [listId]);
    return r.rows[0]?.board_id ?? null;
  }
  if (source === 'card') {
    const cardId = toId(req.params.id);
    if (!cardId) return null;
    const r = await query(
      `SELECT l.board_id
         FROM cards c
         JOIN lists l ON l.id = c.list_id
        WHERE c.id = $1`,
      [cardId]
    );
    return r.rows[0]?.board_id ?? null;
  }
  return null;
}

/**
 * Rol bazlı yetkilendirme middleware fabrikası.
 *
 * @param {object} opts
 * @param {'board'|'list'|'card'} [opts.source='board'] boardId'nin nereden çözüleceği
 * @param {'member'|'admin'} [opts.role='member'] gereken minimum rol
 *
 * Başarılıysa req.boardId ve req.boardRole doldurulur.
 */
export function authorizeBoard({ source = 'board', role = 'member' } = {}) {
  return async (req, res, next) => {
    try {
      const boardId = await resolveBoardId(source, req);
      if (!boardId) {
        return res.status(404).json({ error: 'İlgili board bulunamadı.' });
      }

      const membership = await query(
        'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
        [boardId, req.user.id]
      );

      if (membership.rows.length === 0) {
        return res.status(403).json({ error: 'Bu board üzerinde yetkiniz yok.' });
      }

      const userRole = membership.rows[0].role;
      if (role === 'admin' && userRole !== 'admin') {
        return res.status(403).json({ error: 'Bu işlem için board admin yetkisi gereklidir.' });
      }

      req.boardId = Number(boardId);
      req.boardRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}
