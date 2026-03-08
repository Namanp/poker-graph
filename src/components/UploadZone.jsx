import React, { useState, useRef, useCallback } from 'react';
import { uploadSession, uploadSessions, confirmUpload } from '../api.js';

const GAME_TYPES = ['10NL', '25NL', '50NL', '100NL', 'husng', 'home_game'];

export default function UploadZone({ onSuccess }) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | uploading | needs-type | success | error | duplicate
  const [error, setError] = useState(null);
  const [pendingData, setPendingData] = useState(null);
  const [selectedGameType, setSelectedGameType] = useState('');
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      setStatus('error');
      return;
    }

    setStatus('uploading');
    setError(null);
    setPendingData(null);
    setResult(null);

    try {
      const data = await uploadSession(file);

      if (data.needsGameType) {
        setPendingData(data);
        setSelectedGameType('');
        setStatus('needs-type');
      } else {
        setResult(data);
        setStatus('success');
        onSuccess?.(data);
      }
    } catch (err) {
      if (err.status === 409) {
        setStatus('duplicate');
        setError(err.data?.message || 'This file has already been uploaded.');
      } else {
        setStatus('error');
        setError(err.message || 'Upload failed');
      }
    }
  }, [onSuccess]);

  const processFiles = useCallback(async (files) => {
    const validFiles = Array.from(files || []).filter(f => f.name.endsWith('.txt'));
    if (validFiles.length === 0) {
      setError('Please upload one or more .txt files');
      setStatus('error');
      return;
    }

    if (validFiles.length === 1) {
      await processFile(validFiles[0]);
      return;
    }

    setStatus('uploading');
    setError(null);
    setPendingData(null);
    setResult(null);

    try {
      const data = await uploadSessions(validFiles);
      setResult(data);

      if (data.summary.success > 0) {
        setStatus('success');
        onSuccess?.(data);
      } else if (data.summary.duplicate > 0 && data.summary.error === 0 && data.summary.needsGameType === 0) {
        setStatus('duplicate');
        setError('All selected files were duplicates.');
      } else {
        setStatus('error');
        setError('No files were uploaded successfully.');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Batch upload failed');
    }
  }, [onSuccess, processFile]);

  async function handleConfirm() {
    if (!selectedGameType) {
      setError('Please select a game type');
      return;
    }

    setStatus('uploading');
    setError(null);

    try {
      const data = await confirmUpload({
        gameType: selectedGameType,
        filename: pendingData.filename,
        fileHash: pendingData.fileHash,
        hands: pendingData._parseData?.hands || [],
        sessionDate: pendingData.sessionDate,
      });

      setResult(data);
      setStatus('success');
      onSuccess?.(data);
    } catch (err) {
      if (err.status === 409) {
        setStatus('duplicate');
        setError('This file has already been uploaded.');
      } else {
        setStatus('error');
        setError(err.message || 'Failed to confirm upload');
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  function handleFileChange(e) {
    processFiles(e.target.files);
  }

  function reset() {
    setStatus('idle');
    setError(null);
    setPendingData(null);
    setResult(null);
    setSelectedGameType('');
    if (fileRef.current) fileRef.current.value = '';
  }

  const isBatchResult = result && Array.isArray(result.results);

  return (
    <div className="space-y-4">
      {(status === 'idle' || status === 'error' || status === 'duplicate') && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`
            relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
            ${dragging
              ? 'border-emerald-500 bg-emerald-900/10'
              : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
            }
          `}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".txt"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center gap-3">
            <div className={`text-5xl transition-transform ${dragging ? 'scale-110' : ''}`}>
              📄
            </div>
            <div>
              <p className="text-white font-semibold text-lg">
                {dragging ? 'Drop files!' : 'Drop your hand histories here'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                or click to browse • upload one or many Ignition .txt files
              </p>
            </div>
          </div>
        </div>
      )}

      {(status === 'error' || status === 'duplicate') && error && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          status === 'duplicate' ? 'bg-yellow-900/20 border border-yellow-800' : 'bg-red-900/20 border border-red-800'
        }`}>
          <span className="text-xl">{status === 'duplicate' ? '⚠️' : '❌'}</span>
          <div className="flex-1">
            <p className={`font-medium ${status === 'duplicate' ? 'text-yellow-300' : 'text-red-300'}`}>
              {status === 'duplicate' ? 'Duplicate File' : 'Upload Error'}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {status === 'uploading' && (
        <div className="card flex items-center gap-4">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div>
            <p className="font-medium text-white">Parsing hand history...</p>
            <p className="text-sm text-gray-500">Running EV calculations, this may take a moment</p>
          </div>
        </div>
      )}

      {status === 'needs-type' && pendingData && (
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-white text-lg">Select Game Type</h3>
            <p className="text-gray-400 text-sm mt-1">
              We couldn't auto-detect the game type for{' '}
              <span className="text-gray-200 font-medium">{pendingData.filename}</span>
              {' '}({pendingData.handsCount} hands found).
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {GAME_TYPES.map(gt => (
              <button
                key={gt}
                onClick={() => setSelectedGameType(gt)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition-all ${
                  selectedGameType === gt
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                {gt}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3">
            <button onClick={handleConfirm} className="btn-primary flex-1">
              Confirm & Upload
            </button>
            <button onClick={reset} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === 'success' && result && !isBatchResult && (
        <div className="card border-emerald-800 bg-emerald-900/10 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-semibold text-emerald-300 text-lg">Upload Successful!</p>
              <p className="text-gray-400 text-sm mt-0.5">{result.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{result.handsCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Hands</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">{result.gameType}</p>
              <p className="text-xs text-gray-500 mt-0.5">Game Type</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 text-center">
              <p className="text-sm font-medium text-gray-300">{result.sessionDate}</p>
              <p className="text-xs text-gray-500 mt-0.5">Date</p>
            </div>
          </div>

          <button onClick={reset} className="btn-secondary w-full">
            Upload Another File
          </button>
        </div>
      )}

      {status === 'success' && isBatchResult && (
        <div className="card border-emerald-800 bg-emerald-900/10 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1">
              <p className="font-semibold text-emerald-300 text-lg">Batch Upload Complete</p>
              <p className="text-gray-400 text-sm mt-0.5">
                {result.summary.success} success • {result.summary.duplicate} duplicates • {result.summary.error + result.summary.needsGameType} issues
              </p>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900/60">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-400">File</th>
                  <th className="text-left px-3 py-2 text-gray-400">Status</th>
                  <th className="text-left px-3 py-2 text-gray-400">Info</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {result.results.map((r, idx) => (
                  <tr key={`${r.filename}-${idx}`}>
                    <td className="px-3 py-2 text-gray-300 truncate max-w-[260px]" title={r.filename}>{r.filename}</td>
                    <td className={`px-3 py-2 font-medium ${
                      r.status === 'success' ? 'text-emerald-400' :
                      r.status === 'duplicate' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {r.status}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {r.status === 'success'
                        ? `${r.handsCount} hands • ${r.gameType}`
                        : (r.error || r.message || 'n/a')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button onClick={reset} className="btn-secondary w-full">
            Upload More Files
          </button>
        </div>
      )}
    </div>
  );
}
