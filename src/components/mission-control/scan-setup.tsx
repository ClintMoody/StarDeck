'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ScanDir {
  id: number;
  path: string;
  recursive: boolean;
  enabled: boolean;
  lastScannedAt: string | null;
}

interface ScanSetupProps {
  onClose: () => void;
}

export function ScanSetup({ onClose }: ScanSetupProps) {
  const [dirs, setDirs] = useState<ScanDir[]>([]);
  const [newPath, setNewPath] = useState('');
  const [newRecursive, setNewRecursive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/scan/directories').then(r => r.json()).then(setDirs);
  }, []);

  async function addDirectory() {
    if (!newPath.trim()) return;
    await fetch('/api/scan/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath.trim(), recursive: newRecursive }),
    });
    setNewPath('');
    const updated = await fetch('/api/scan/directories').then(r => r.json());
    setDirs(updated);
  }

  async function removeDirectory(id: number) {
    await fetch('/api/scan/directories', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDirs(prev => prev.filter(d => d.id !== id));
  }

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    const res = await fetch('/api/scan', { method: 'POST' });
    const result = await res.json();
    setScanResult(result);
    setScanning(false);
    router.refresh();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[560px] max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f6fc]">Directory Scanner</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9]">✕</button>
        </div>

        <div className="mb-4">
          <div className="text-xs text-[#8b949e] font-semibold uppercase mb-2">Watch Directories</div>
          {dirs.length === 0 ? (
            <div className="text-sm text-[#484f58] py-2">No directories configured.</div>
          ) : (
            dirs.map(dir => (
              <div key={dir.id} className="flex items-center gap-2 py-1.5 border-b border-[#21262d]">
                <span className="text-xs text-[#c9d1d9] flex-1 font-mono truncate">{dir.path}</span>
                <span className="text-[10px] text-[#8b949e]">{dir.recursive ? 'recursive' : 'shallow'}</span>
                {dir.lastScannedAt && (
                  <span className="text-[10px] text-[#484f58]">
                    scanned {new Date(dir.lastScannedAt).toLocaleDateString()}
                  </span>
                )}
                <button onClick={() => removeDirectory(dir.id)} className="text-[#f85149] text-xs hover:underline">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addDirectory()}
            placeholder="/path/to/directory"
            className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded text-xs font-mono"
          />
          <label className="flex items-center gap-1 text-xs text-[#8b949e]">
            <input type="checkbox" checked={newRecursive} onChange={e => setNewRecursive(e.target.checked)} className="accent-[#1f6feb]" />
            Recursive
          </label>
          <button onClick={addDirectory} className="bg-[#238636] text-white text-xs px-3 py-1.5 rounded hover:bg-[#2ea043]">
            Add
          </button>
        </div>

        <button
          onClick={runScan}
          disabled={scanning || dirs.length === 0}
          className="w-full bg-[#1f6feb] text-white text-sm py-2 rounded-md hover:bg-[#388bfd] disabled:opacity-50 mb-4"
        >
          {scanning ? 'Scanning...' : 'Run Scan Now'}
        </button>

        {scanResult && (
          <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-xs">
            <div className="text-[#f0f6fc] font-semibold mb-2">Scan Results</div>
            <div className="text-[#8b949e] space-y-1">
              <div>Directories scanned: {scanResult.scannedDirs}</div>
              <div>Repos found: {scanResult.totalReposFound}</div>
              <div className="text-[#3fb950]">Auto-matched: {scanResult.autoMatched}</div>
              {scanResult.ambiguous?.length > 0 && (
                <div className="text-[#f0883e]">Ambiguous: {scanResult.ambiguous.length} (need review)</div>
              )}
              {scanResult.untracked?.length > 0 && (
                <div className="text-[#8b949e]">Untracked: {scanResult.untracked.length}</div>
              )}
            </div>
            {scanResult.ambiguous?.length > 0 && (
              <div className="mt-3">
                <div className="text-[#f0883e] font-semibold text-[10px] uppercase mb-1">Needs Review</div>
                {scanResult.ambiguous.map((m: any, i: number) => (
                  <div key={i} className="text-[#8b949e] py-1">📂 {m.localPath} {m.remoteName && `→ ${m.remoteName}`}</div>
                ))}
              </div>
            )}
            {scanResult.untracked?.length > 0 && (
              <div className="mt-3">
                <div className="text-[#8b949e] font-semibold text-[10px] uppercase mb-1">Not in StarDeck</div>
                {scanResult.untracked.map((m: any, i: number) => (
                  <div key={i} className="text-[#484f58] py-1">📂 {m.localPath} {m.remoteName && `(${m.remoteName})`}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
