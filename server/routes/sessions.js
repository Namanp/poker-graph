import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { parseHandHistory, detectGameType } from '../lib/parsers/index.js';

const router = express.Router();

// In-memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  },
});

// POST /api/sessions/upload
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname;
    const site = req.body.site || 'ignition';

    // Compute SHA-256 for duplicate detection
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Check for duplicate
    const existing = db.prepare('SELECT id, filename FROM sessions WHERE file_hash = ?').get(fileHash);
    if (existing) {
      return res.status(409).json({
        error: 'Duplicate file',
        message: `This file has already been uploaded (session: ${existing.filename})`,
        sessionId: existing.id,
      });
    }

    // Parse the hand history
    const content = buffer.toString('utf-8');
    const { hands, sessionDate, playerCount } = parseHandHistory(content, { filename, site });

    if (hands.length === 0) {
      return res.status(422).json({ error: 'No valid hands found in file' });
    }

    // Detect game type — for tournaments, refine using actual player count from content:
    //   2 players = HUSNG, 3+ players = sng (multi-table or larger format)
    //   playerCount null = cash game; 0 = failed to parse seats (fall back to filename)
    let detectedGameType = detectGameType(filename, { site, content });
    if (playerCount > 0) {
      detectedGameType = playerCount === 2 ? 'husng' : 'sng';
    }
    const gameType = req.body.gameType || detectedGameType;

    if (!gameType) {
      // Return the parsed data and let the client choose game type
      return res.status(200).json({
        needsGameType: true,
        detectedGameType: null,
        filename,
        fileHash,
        handsCount: hands.length,
        playerCount,
        sessionDate: sessionDate || new Date().toISOString().split('T')[0],
        _parseData: {
          hands,
          sessionDate,
          fileHash,
          filename,
        },
      });
    }

    // Store session and hands
    const sessionId = uuidv4();
    const finalDate = sessionDate || new Date().toISOString().split('T')[0];

    const insertSession = db.prepare(`
      INSERT INTO sessions (id, file_hash, filename, game_type, source, session_date, has_hand_history)
      VALUES (?, ?, ?, ?, 'online', ?, ?)
    `);

    const insertSessionResult = db.prepare(`
      INSERT INTO session_results (id, session_id, net, ev_net, hand_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertHand = db.prepare(`
      INSERT INTO hands (id, session_id, hand_ts, net, ev_net, hand_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const storeAll = db.transaction(() => {
      const isHusng = gameType === 'husng';
      const hasHandHistory = isHusng ? 0 : 1;

      insertSession.run(sessionId, fileHash, filename, gameType, finalDate, hasHandHistory);

      let sessionNet = 0;
      let sessionEv = 0;
      for (let i = 0; i < hands.length; i++) {
        const h = hands[i];
        sessionNet += h.net;
        sessionEv += h.evNet ?? h.net;
        if (!isHusng) {
          insertHand.run(uuidv4(), sessionId, h.timestamp, h.net, h.evNet ?? null, i + 1);
        }
      }

      insertSessionResult.run(
        uuidv4(),
        sessionId,
        Math.round(sessionNet * 100) / 100,
        Math.round((isHusng ? sessionNet : sessionEv) * 100) / 100,
        isHusng ? 0 : hands.length
      );
    });

    storeAll();

    return res.status(201).json({
      sessionId,
      filename,
      gameType,
      handsCount: hands.length,
      sessionDate: finalDate,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions/upload/confirm - confirm game type for pending upload
router.post('/upload/confirm', express.json(), async (req, res) => {
  try {
    const { gameType, filename, fileHash, hands, sessionDate } = req.body;

    if (!gameType || !hands || !fileHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Double-check for duplicate (race condition protection)
    const existing = db.prepare('SELECT id FROM sessions WHERE file_hash = ?').get(fileHash);
    if (existing) {
      return res.status(409).json({ error: 'Duplicate file', sessionId: existing.id });
    }

    const sessionId = uuidv4();
    const finalDate = sessionDate || new Date().toISOString().split('T')[0];

    const insertSession = db.prepare(`
      INSERT INTO sessions (id, file_hash, filename, game_type, source, session_date, has_hand_history)
      VALUES (?, ?, ?, ?, 'online', ?, ?)
    `);

    const insertSessionResult = db.prepare(`
      INSERT INTO session_results (id, session_id, net, ev_net, hand_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertHand = db.prepare(`
      INSERT INTO hands (id, session_id, hand_ts, net, ev_net, hand_index)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const storeAll = db.transaction(() => {
      const isHusng = gameType === 'husng';
      const hasHandHistory = isHusng ? 0 : 1;
      insertSession.run(sessionId, fileHash, filename || 'unknown.txt', gameType, finalDate, hasHandHistory);

      let sessionNet = 0;
      let sessionEv = 0;
      for (let i = 0; i < hands.length; i++) {
        const h = hands[i];
        sessionNet += h.net;
        sessionEv += h.evNet ?? h.net;
        if (!isHusng) {
          insertHand.run(uuidv4(), sessionId, h.timestamp, h.net, h.evNet ?? null, i + 1);
        }
      }

      insertSessionResult.run(
        uuidv4(),
        sessionId,
        Math.round(sessionNet * 100) / 100,
        Math.round((isHusng ? sessionNet : sessionEv) * 100) / 100,
        isHusng ? 0 : hands.length
      );
    });

    storeAll();

    return res.status(201).json({
      sessionId,
      filename,
      gameType,
      handsCount: hands.length,
      sessionDate: finalDate,
    });
  } catch (err) {
    console.error('Confirm error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions
router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT
      s.id,
      s.filename,
      s.game_type,
      s.session_date,
      s.has_hand_history,
      s.created_at,
      COALESCE(r.hand_count, 0) as hand_count,
      COALESCE(r.net, 0) as total_net,
      COALESCE(r.ev_net, r.net, 0) as total_ev_net
    FROM sessions s
    LEFT JOIN session_results r ON r.session_id = s.id
    WHERE s.game_type != 'home_game'
    ORDER BY s.session_date DESC, s.created_at DESC
  `).all();

  res.json(sessions);
});

// DELETE /api/sessions/:id
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const session = db.prepare('SELECT id FROM sessions WHERE id = ?').get(id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  res.json({ success: true });
});

// GET /api/global - session-level aggregates
router.get('/global', (req, res) => {
  // This is handled in server/index.js as /api/global
  res.json([]);
});

export default router;
