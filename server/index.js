import express from 'express';
import cors from 'cors';
import path from 'node:path';
import db from './db.js';
import sessionsRouter from './routes/sessions.js';
import handsRouter from './routes/hands.js';
import homeGamesRouter from './routes/homeGames.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'file://',
  'null',
]);

app.use(cors({
  origin: (origin, cb) => {
    // No origin is common for local desktop and curl-style requests.
    if (!origin || allowedOrigins.has(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/hands', handsRouter);
app.use('/api/home-games', homeGamesRouter);

// GET /api/global - session-level aggregates combining all types
app.get('/api/global', (req, res) => {
  const sessions = db.prepare(`
    SELECT
      s.id,
      s.game_type,
      s.session_date,
      s.filename,
      COALESCE(r.net, 0) as session_net,
      COALESCE(r.ev_net, r.net, 0) as session_ev_net,
      COALESCE(r.hand_count, 0) as hand_count,
      s.source
    FROM sessions s
    LEFT JOIN session_results r ON r.session_id = s.id
    ORDER BY s.session_date ASC, s.created_at ASC
  `).all();

  const all = sessions.sort((a, b) => {
    if (a.session_date < b.session_date) return -1;
    if (a.session_date > b.session_date) return 1;
    return 0;
  });

  // Build cumulative series
  let cumNet = 0;
  let cumEv = 0;

  const series = all.map((item, idx) => {
    cumNet += item.session_net;
    cumEv += item.session_ev_net;
    return {
      sessionNum: idx + 1,
      net: Math.round(cumNet * 100) / 100,
      evNet: Math.round(cumEv * 100) / 100,
      rawNet: Math.round(item.session_net * 100) / 100,
      rawEvNet: Math.round(item.session_ev_net * 100) / 100,
      date: item.session_date,
      gameType: item.game_type,
      source: item.source,
      handCount: item.hand_count,
      label: item.filename || (item.game_type === 'home_game' ? `Home Game ${idx + 1}` : `Session ${idx + 1}`),
    };
  });

  // Summary stats
  const totalNet = cumNet;
  const totalEv = cumEv;
  const totalSessions = all.length;

  res.json({ series, totalNet, totalEv, totalSessions });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In Electron production, serve the built frontend from the backend process.
if (process.env.POKER_GRAPH_ELECTRON === '1' && process.env.POKER_GRAPH_DIST_DIR) {
  const distDir = process.env.POKER_GRAPH_DIST_DIR;
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Poker Graph server running on http://localhost:${PORT}`);
});
