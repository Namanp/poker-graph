import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/hands?gameType=25NL or ?sessionId=X
router.get('/', (req, res) => {
  const { gameType, sessionId } = req.query;

  let rows;

  if (sessionId) {
    // Get all hands for a specific session
    rows = db.prepare(`
      SELECT
        h.id,
        h.session_id,
        h.hand_ts,
        h.net,
        CASE WHEN s.game_type = 'husng' THEN NULL ELSE h.ev_net END as ev_net,
        h.hand_index,
        s.game_type,
        s.session_date
      FROM hands h
      JOIN sessions s ON s.id = h.session_id
      WHERE h.session_id = ?
      ORDER BY h.hand_index ASC
    `).all(sessionId);
  } else if (gameType && gameType !== 'all') {
    // Get all hands for a game type
    rows = db.prepare(`
      SELECT
        h.id,
        h.session_id,
        h.hand_ts,
        h.net,
        CASE WHEN s.game_type = 'husng' THEN NULL ELSE h.ev_net END as ev_net,
        h.hand_index,
        s.game_type,
        s.session_date
      FROM hands h
      JOIN sessions s ON s.id = h.session_id
      WHERE s.game_type = ?
      ORDER BY s.session_date ASC, h.hand_index ASC
    `).all(gameType);
  } else {
    // Get all hands
    rows = db.prepare(`
      SELECT
        h.id,
        h.session_id,
        h.hand_ts,
        h.net,
        CASE WHEN s.game_type = 'husng' THEN NULL ELSE h.ev_net END as ev_net,
        h.hand_index,
        s.game_type,
        s.session_date
      FROM hands h
      JOIN sessions s ON s.id = h.session_id
      ORDER BY s.session_date ASC, h.hand_index ASC
    `).all();
  }

  // Build cumulative P&L series
  let cumNet = 0;
  let cumEv = 0;

  const series = rows.map((row, idx) => {
    cumNet += row.net;
    cumEv += row.ev_net !== null ? row.ev_net : row.net;
    return {
      handNum: idx + 1,
      net: Math.round(cumNet * 100) / 100,
      evNet: Math.round(cumEv * 100) / 100,
      rawNet: Math.round(row.net * 100) / 100,
      rawEvNet: row.ev_net !== null ? Math.round(row.ev_net * 100) / 100 : null,
      handTs: row.hand_ts,
      sessionId: row.session_id,
      gameType: row.game_type,
    };
  });

  res.json({ series, total: rows.length });
});

export default router;
