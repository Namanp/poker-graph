import React, { useState } from 'react';
import { createHomeGame } from '../api.js';

export default function HomeGameForm({ onSuccess }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    gameDate: today,
    buyIn: '',
    cashOut: '',
    notes: '',
  });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [error, setError] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }

  const net = form.buyIn && form.cashOut
    ? (parseFloat(form.cashOut) - parseFloat(form.buyIn)).toFixed(2)
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.gameDate || !form.buyIn || !form.cashOut) {
      setError('Please fill in all required fields');
      return;
    }

    if (parseFloat(form.buyIn) < 0 || parseFloat(form.cashOut) < 0) {
      setError('Buy-in and Cash-out must be non-negative');
      return;
    }

    setStatus('submitting');

    try {
      const data = await createHomeGame({
        gameDate: form.gameDate,
        buyIn: parseFloat(form.buyIn),
        cashOut: parseFloat(form.cashOut),
        notes: form.notes.trim() || null,
      });

      setStatus('success');
      setForm({
        gameDate: today,
        buyIn: '',
        cashOut: '',
        notes: '',
      });
      onSuccess?.(data);

      // Reset success after 3 seconds
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Failed to add home game');
    }
  }

  return (
    <div className="card">
      <h3 className="font-semibold text-white text-lg mb-4 flex items-center gap-2">
        <span>🏠</span> Log Home Game
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              name="gameDate"
              value={form.gameDate}
              onChange={handleChange}
              required
              className="input-field"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Notes
            </label>
            <input
              type="text"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="e.g. Friday night game at Mike's"
              className="input-field"
            />
          </div>

          {/* Buy-in */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Buy-in ($) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                name="buyIn"
                value={form.buyIn}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="100.00"
                className="input-field pl-7"
              />
            </div>
          </div>

          {/* Cash-out */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">
              Cash-out ($) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                name="cashOut"
                value={form.cashOut}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="150.00"
                className="input-field pl-7"
              />
            </div>
          </div>
        </div>

        {/* Net Preview */}
        {net !== null && (
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            parseFloat(net) >= 0
              ? 'bg-emerald-900/20 border border-emerald-800'
              : 'bg-red-900/20 border border-red-800'
          }`}>
            <span className="text-sm text-gray-400">Net result:</span>
            <span className={`font-bold text-lg ${
              parseFloat(net) >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {parseFloat(net) >= 0 ? '+' : ''}{net}
            </span>
          </div>
        )}

        {/* Error */}
        {(status === 'error' || error) && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <span>✓</span>
            <span>Home game logged successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="btn-primary w-full"
        >
          {status === 'submitting' ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Log Home Game'
          )}
        </button>
      </form>
    </div>
  );
}
