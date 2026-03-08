const BASE = window.location.protocol === 'file:'
  ? 'http://127.0.0.1:3001/api'
  : '/api';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Sessions
export async function getSessions() {
  const res = await fetch(`${BASE}/sessions`);
  return handleResponse(res);
}

export async function deleteSession(id) {
  const res = await fetch(`${BASE}/sessions/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}

export async function uploadSession(file, gameType) {
  const formData = new FormData();
  formData.append('file', file);
  if (gameType) formData.append('gameType', gameType);

  const res = await fetch(`${BASE}/sessions/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function uploadSessions(files, gameType) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (gameType) formData.append('gameType', gameType);

  const res = await fetch(`${BASE}/sessions/upload/batch`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
}

export async function confirmUpload(payload) {
  const res = await fetch(`${BASE}/sessions/upload/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Hands
export async function getHands(params = {}) {
  const query = new URLSearchParams();
  if (params.gameType) query.set('gameType', params.gameType);
  if (params.sessionId) query.set('sessionId', params.sessionId);

  const res = await fetch(`${BASE}/hands?${query.toString()}`);
  return handleResponse(res);
}

// Global
export async function getGlobal() {
  const res = await fetch(`${BASE}/global`);
  return handleResponse(res);
}

// Home Games
export async function getHomeGames() {
  const res = await fetch(`${BASE}/home-games`);
  return handleResponse(res);
}

export async function createHomeGame(data) {
  const res = await fetch(`${BASE}/home-games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteHomeGame(id) {
  const res = await fetch(`${BASE}/home-games/${id}`, { method: 'DELETE' });
  return handleResponse(res);
}
