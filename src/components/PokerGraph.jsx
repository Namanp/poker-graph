import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';

function formatDollar(val) {
  if (val === undefined || val === null) return '-';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '+';
  if (val === 0) return '$0.00';
  return `${sign}$${abs.toFixed(2)}`;
}

function CustomTooltip({ active, payload, label, xLabel }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="custom-tooltip">
      <p className="text-gray-400 text-xs mb-2">
        {xLabel} {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span
            className={`font-semibold ${
              entry.value >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatDollar(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatYAxis(value) {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
}

export default function PokerGraph({
  data = [],
  xKey = 'handNum',
  xLabel = 'Hand',
  showEV = true,
  onToggleEV,
  title,
  subtitle,
  emptyMessage = 'No data yet. Upload some hand histories!',
}) {
  const hasData = data.length > 0;
  const hasEVData = hasData && data.some(d => d.evNet !== undefined && d.evNet !== null && d.evNet !== d.net);

  // Calculate stats
  const lastPoint = hasData ? data[data.length - 1] : null;
  const totalNet = lastPoint?.net ?? 0;
  const totalEv = lastPoint?.evNet ?? 0;

  // Domain padding
  const allValues = hasData
    ? data.flatMap(d => [d.net, showEV && d.evNet !== null ? d.evNet : d.net].filter(v => v !== undefined))
    : [0];
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 0);
  const padding = Math.max((maxVal - minVal) * 0.1, 5);
  const yDomain = [minVal - padding, maxVal + padding];

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
          {subtitle && <p className="text-gray-400 text-sm mt-0.5">{subtitle}</p>}
          {hasData && (
            <div className="flex gap-4 mt-2">
              <div>
                <span className="text-xs text-gray-500">Raw P&L</span>
                <p className={`text-sm font-bold ${totalNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatDollar(totalNet)}
                </p>
              </div>
              {hasEVData && showEV && (
                <div>
                  <span className="text-xs text-gray-500">EV-Adjusted</span>
                  <p className={`text-sm font-bold ${totalEv >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatDollar(totalEv)}
                  </p>
                </div>
              )}
              <div>
                <span className="text-xs text-gray-500">{xLabel === 'Hand' ? 'Hands' : 'Sessions'}</span>
                <p className="text-sm font-bold text-gray-300">{data.length}</p>
              </div>
            </div>
          )}
        </div>

        {/* EV Toggle */}
        {hasEVData && onToggleEV && (
          <button
            onClick={onToggleEV}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              showEV
                ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300'
                : 'bg-gray-800 border border-gray-700 text-gray-400'
            }`}
          >
            <span
              className="inline-block w-4 h-0.5"
              style={{
                background: showEV ? '#34d399' : '#6b7280',
                borderTop: '2px dashed',
              }}
            />
            EV Line
          </button>
        )}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">📈</p>
            <p className="text-gray-500 text-sm">{emptyMessage}</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey={xKey}
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              label={{
                value: xLabel,
                position: 'insideBottom',
                offset: -2,
                fill: '#6b7280',
                fontSize: 11,
              }}
            />
            <YAxis
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 11 }}
              tickFormatter={formatYAxis}
              domain={yDomain}
            />
            <Tooltip
              content={<CustomTooltip xLabel={xLabel} />}
              cursor={{ stroke: '#374151', strokeWidth: 1 }}
            />
            <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />

            {/* EV Line (behind raw line) */}
            {showEV && hasEVData && (
              <Line
                type="monotone"
                dataKey="evNet"
                name="EV-Adjusted"
                stroke="#34d399"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: '#34d399' }}
                connectNulls
              />
            )}

            {/* Raw P&L Line */}
            <Line
              type="monotone"
              dataKey="net"
              name="Raw P&L"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#3b82f6' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
