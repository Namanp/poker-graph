import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = express.Router();

// POST /api/home-games
router.post('/', express.json(), (req, res) => {
  const { gameDate, buyIn, cashOut, notes } = req.body;

  if (!gameDate || buyIn === undefined || cashOut === undefined) {
    return res.status(400).json({ error: 'Missing required fields: gameDate, buyIn, cashOut' });
  }

  const sessionId = uuidv4();
  const resultId = uuidv4();
  const buyInNum = parseFloat(buyIn);
  const cashOutNum = parseFloat(cashOut);
  const net = cashOutNum - buyInNum;

  const store = db.transaction(() => {
    db.prepare(`
      INSERT INTO sessions (id, file_hash, filename, game_type, source, session_date, notes, has_hand_history)
      VALUES (?, NULL, NULL, 'home_game', 'home_game', ?, ?, 0)
    `).run(sessionId, gameDate, notes || null);

    db.prepare(`
      INSERT INTO session_results (id, session_id, net, ev_net, hand_count, buy_in, cash_out)
      VALUES (?, ?, ?, ?, 0, ?, ?)
    `).run(resultId, sessionId, net, net, buyInNum, cashOutNum);
  });

  store();

  const game = db.prepare(`
    SELECT
      s.id,
      s.session_date as game_date,
      s.notes,
      r.buy_in,
      r.cash_out,
      r.net
    FROM sessions s
    JOIN session_results r ON r.session_id = s.id
    WHERE s.id = ?
  `).get(sessionId);

  res.status(201).json(game);
});

// GET /api/home-games
router.get('/', (req, res) => {
  const games = db.prepare(`
    SELECT
      s.id,
      s.session_date as game_date,
      s.notes,
      r.buy_in,
      r.cash_out,
      r.net
    FROM sessions s
    JOIN session_results r ON r.session_id = s.id
    WHERE s.game_type = 'home_game'
    ORDER BY s.session_date ASC, s.created_at ASC
  `).all();

  let cumNet = 0;
  const series = games.map((g, idx) => {
    cumNet += g.net;
    return {
      sessionNum: idx + 1,
      net: Math.round(cumNet * 100) / 100,
      rawNet: Math.round(g.net * 100) / 100,
      buyIn: g.buy_in,
      cashOut: g.cash_out,
      date: g.game_date,
      notes: g.notes,
      id: g.id,
    };
  });

  res.json({ games, series });
});

// DELETE /api/home-games/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const game = db.prepare(`
    SELECT id FROM sessions WHERE id = ? AND game_type = 'home_game'
  `).get(id);

  if (!game) {
    return res.status(404).json({ error: 'Home game not found' });
  }

  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  res.json({ success: true });
});

export default router;
