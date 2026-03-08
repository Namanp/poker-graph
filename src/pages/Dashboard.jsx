import React, { useState, useEffect, useCallback } from 'react';
import PokerGraph from '../components/PokerGraph.jsx';
import SessionList from '../components/SessionList.jsx';
import HomeGameForm from '../components/HomeGameForm.jsx';
import { getSessions, getHands, getGlobal, getHomeGames, deleteHomeGame } from '../api.js';

const TABS = [
  { id: 'global', label: '🌐 Global' },
  { id: '25NL', label: '25NL' },
  { id: '10NL', label: '10NL' },
  { id: 'husng', label: 'HUSNG' },
  { id: 'home_game', label: '🏠 Home' },
];

function StatCard({ label, value, sub, positive }) {
  const isPositive = positive !== undefined ? positive : (typeof value === 'number' ? value >= 0 : true);
  const isZero = value === 0;

  return (
    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold mt-1 ${
        isZero ? 'text-gray-400' : isPositive ? 'text-emerald-400' : 'text-red-400'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatDollar(val) {
  if (val === undefined || val === null) return '$0.00';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : (val > 0 ? '+' : '');
  return `${sign}$${abs.toFixed(2)}`;
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('global');
  const [showEV, setShowEV] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [handsData, setHandsData] = useState({});    // { gameType -> { series, total } }
  const [globalData, setGlobalData] = useState(null);
  const [homeGamesData, setHomeGamesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsRes, globalRes, homeRes] = await Promise.all([
        getSessions(),
        getGlobal(),
        getHomeGames(),
      ]);
      setSessions(sessionsRes);
      setGlobalData(globalRes);
      setHomeGamesData(homeRes);

      // Fetch hands for each online game type
      const gameTypes = ['25NL', '10NL', 'husng'];
      const handResults = await Promise.all(
        gameTypes.map(gt => getHands({ gameType: gt }))
      );
      const newHandsData = {};
      gameTypes.forEach((gt, i) => {
        newHandsData[gt] = handResults[i];
      });
      setHandsData(newHandsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function handleSessionDeleted(id) {
    setSessions(prev => prev.filter(s => s.id !== id));
    fetchAll(); // Refetch everything to update graphs
  }

  async function handleHomeGameDeleted(id) {
    try {
      await deleteHomeGame(id);
      fetchAll();
    } catch (err) {
      alert(`Failed to delete: ${err.message}`);
    }
  }

  // Current graph data based on active tab
  const husngSeries = (() => {
    const husngSessions = sessions
      .filter(s => s.game_type === 'husng')
      .slice()
      .sort((a, b) => {
        if (a.session_date < b.session_date) return -1;
        if (a.session_date > b.session_date) return 1;
        return 0;
      });

    let cumNet = 0;
    return husngSessions.map((s, idx) => {
      const rawNet = Number(s.total_net || 0);
      cumNet += rawNet;
      return {
        sessionNum: idx + 1,
        net: Math.round(cumNet * 100) / 100,
        evNet: Math.round(cumNet * 100) / 100,
        rawNet: Math.round(rawNet * 100) / 100,
        rawEvNet: null,
        date: s.session_date,
        gameType: s.game_type,
        sessionId: s.id,
      };
    });
  })();

  const currentSeries = (() => {
    if (activeTab === 'global') return globalData?.series || [];
    if (activeTab === 'home_game') return homeGamesData?.series || [];
    if (activeTab === 'husng') return husngSeries;
    return handsData[activeTab]?.series || [];
  })();

  const isHomeTab = activeTab === 'home_game';
  const isGlobalTab = activeTab === 'global';
  const isOnlineTab = !isHomeTab && !isGlobalTab;

  // Stats
  const lastGlobal = globalData?.series?.slice(-1)[0];
  const totalNet = lastGlobal?.net ?? 0;
  const totalEv = lastGlobal?.evNet ?? 0;
  const totalSessions = sessions.length + (homeGamesData?.games?.length ?? 0);
  const totalHands = sessions
    .filter(sess => sess.game_type !== 'husng')
    .reduce((s, sess) => s + (sess.hand_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="All-time P&L"
            value={formatDollar(totalNet)}
            positive={totalNet >= 0}
          />
          <StatCard
            label="EV-Adjusted"
            value={formatDollar(totalEv)}
            positive={totalEv >= 0}
          />
          <StatCard
            label="Sessions"
            value={totalSessions}
            positive={true}
          />
          <StatCard
            label="Hands Played"
            value={totalHands.toLocaleString()}
            positive={true}
          />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-300 text-sm">
          Failed to load data: {error}
          <button onClick={fetchAll} className="ml-3 underline">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Graph */}
      {loading ? (
        <div className="card h-80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading your data...</p>
          </div>
        </div>
      ) : (
        <PokerGraph
          data={currentSeries}
          xKey={isOnlineTab && activeTab !== 'husng' ? 'handNum' : 'sessionNum'}
          xLabel={isOnlineTab && activeTab !== 'husng' ? 'Hand' : 'Session'}
          showEV={showEV && !isHomeTab}
          onToggleEV={!isHomeTab ? () => setShowEV(v => !v) : undefined}
          title={(() => {
            if (isGlobalTab) return 'Global P&L';
            if (isHomeTab) return 'Home Games P&L';
            return `${activeTab} P&L`;
          })()}
          subtitle={(() => {
            if (isGlobalTab) return 'All game types combined';
            if (isHomeTab) return 'Cumulative home game results';
            if (activeTab === 'husng') {
              return `${sessions.filter(s => s.game_type === 'husng').length} sessions`;
            }
            if (isOnlineTab && handsData[activeTab]) {
              return `${handsData[activeTab].total} hands across ${
                sessions.filter(s => s.game_type === activeTab).length
              } sessions`;
            }
            return undefined;
          })()}
          emptyMessage={
            isHomeTab
              ? 'No home games logged yet. Add one below!'
              : `No ${activeTab} data yet. Upload some hand histories!`
          }
        />
      )}

      {/* Home Game Tab Content */}
      {activeTab === 'home_game' && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <HomeGameForm onSuccess={fetchAll} />

          {/* Home Games List */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <span>📋</span> Home Game Log
            </h3>
            {(!homeGamesData?.games || homeGamesData.games.length === 0) ? (
              <p className="text-gray-500 text-sm text-center py-6">No home games logged yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {homeGamesData.games.map((game, idx) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-300 font-medium">
                          {new Date(game.game_date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric'
                          })}
                        </span>
                        {game.notes && (
                          <span className="text-xs text-gray-500 truncate">{game.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                        <span>In: ${game.buy_in.toFixed(2)}</span>
                        <span>Out: ${game.cash_out.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${game.net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {game.net >= 0 ? '+' : ''}{game.net.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleHomeGameDeleted(game.id)}
                        className="btn-danger opacity-60 hover:opacity-100 text-xs py-1 px-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session List - shown for online tabs */}
      {(isOnlineTab || isGlobalTab) && !loading && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">
            {isGlobalTab ? 'All Sessions' : `${activeTab} Sessions`}
          </h2>
          <SessionList
            sessions={
              isGlobalTab
                ? sessions
                : sessions.filter(s => s.game_type === activeTab)
            }
            onDeleted={handleSessionDeleted}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
