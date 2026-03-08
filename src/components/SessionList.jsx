import React, { useState } from 'react';
import { deleteSession } from '../api.js';

function formatDollar(val) {
  if (val === undefined || val === null) return '-';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '+';
  if (val === 0) return '$0.00';
  return `${sign}$${abs.toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function GameTypeBadge({ gameType }) {
  const colors = {
    '10NL': 'bg-blue-900/50 text-blue-300 border-blue-800',
    '25NL': 'bg-purple-900/50 text-purple-300 border-purple-800',
    '50NL': 'bg-yellow-900/50 text-yellow-300 border-yellow-800',
    '100NL': 'bg-orange-900/50 text-orange-300 border-orange-800',
    'husng': 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
    'home_game': 'bg-pink-900/50 text-pink-300 border-pink-800',
  };
  const cls = colors[gameType] || 'bg-gray-800 text-gray-300 border-gray-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>
      {gameType}
    </span>
  );
}

export default function SessionList({ sessions = [], onDeleted, loading }) {
  const [deleting, setDeleting] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  async function handleDelete(id) {
    if (confirmDelete !== id) {
      setConfirmDelete(id);
      return;
    }

    setDeleting(id);
    setConfirmDelete(null);
    try {
      await deleteSession(id);
      onDeleted?.(id);
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-3xl mb-2">📁</p>
        <p className="text-gray-500">No sessions yet</p>
        <p className="text-gray-600 text-sm mt-1">Upload a hand history file to get started</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">File / Label</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Game</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Hands</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Net P&L</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">EV P&L</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {sessions.map(s => {
              const isDeleting = deleting === s.id;
              const isConfirming = confirmDelete === s.id;
              return (
                <tr
                  key={s.id}
                  className={`hover:bg-gray-800/30 transition-colors ${isDeleting ? 'opacity-40' : ''}`}
                >
                  <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                    {formatDate(s.session_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300 max-w-[200px] truncate" title={s.filename}>
                    {s.filename || s.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <GameTypeBadge gameType={s.game_type} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400 text-right">
                    {s.hand_count ?? '-'}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                    s.total_net >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatDollar(s.total_net)}
                  </td>
                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                    s.total_ev_net >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatDollar(s.total_ev_net)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isConfirming ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-gray-400">Sure?</span>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded transition-colors"
                          disabled={isDeleting}
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={isDeleting}
                        className="btn-danger opacity-60 hover:opacity-100"
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
