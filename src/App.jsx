import React, { useState } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Upload from './pages/Upload.jsx';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  function handleUploadSuccess() {
    setRefreshKey(k => k + 1);
    setPage('dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">♠</span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Poker<span className="text-emerald-400">Graph</span>
            </h1>
          </div>
          <nav className="flex gap-2">
            <button
              onClick={() => setPage('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page === 'dashboard' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setPage('upload')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                page === 'upload' ? 'tab-active' : 'tab-inactive'
              }`}
            >
              + Upload
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {page === 'dashboard' && <Dashboard key={refreshKey} />}
        {page === 'upload' && <Upload onSuccess={handleUploadSuccess} />}
      </main>
    </div>
  );
}
