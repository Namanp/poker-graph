import React from 'react';
import UploadZone from '../components/UploadZone.jsx';

export default function Upload({ onSuccess }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Upload Hand History</h2>
        <p className="text-gray-400 mt-1">
          Import one or many Ignition Poker hand history files to track P&L and EV.
        </p>
      </div>

      {/* Upload Zone */}
      <UploadZone onSuccess={onSuccess} />

      {/* Instructions */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span>ℹ️</span> How to export from Ignition
        </h3>
        <ol className="space-y-2 text-sm text-gray-400 list-decimal list-inside">
          <li>Open the Ignition Poker client</li>
          <li>Go to <span className="text-gray-200">My Account → Hand History</span></li>
          <li>Select the date range and game type you want to export</li>
          <li>Click <span className="text-gray-200">Export</span> and save as a .txt file</li>
          <li>Upload the file here</li>
        </ol>

        <div className="border-t border-gray-800 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Auto-detected game types:</h4>
          <div className="grid grid-cols-2 gap-1 text-sm text-gray-500">
            <span>• $0.05/$0.10 blinds → 10NL</span>
            <span>• $0.10/$0.25 blinds → 25NL</span>
            <span>• SIT-N-GO → HUSNG</span>
            <span>• Other → manual selection</span>
          </div>
        </div>
      </div>

      {/* EV Info */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span>📊</span> About EV Calculation
        </h3>
        <p className="text-sm text-gray-400">
          EV (Expected Value) is calculated for all-in situations where your hole cards are visible.
          It shows what you <em className="text-gray-300">should</em> have won based on equity,
          smoothing out variance.
        </p>
        <ul className="space-y-1 text-sm text-gray-500">
          <li>• River: exact calculation (direct comparison)</li>
          <li>• Turn: exact (44 runouts)</li>
          <li>• Flop: exact (903 combos)</li>
          <li>• Preflop: Monte Carlo (20,000 simulations, ~±0.5%)</li>
        </ul>
        <p className="text-xs text-gray-600">
          EV is null if opponent mucked or if 3+ players are all-in.
        </p>
      </div>
    </div>
  );
}
