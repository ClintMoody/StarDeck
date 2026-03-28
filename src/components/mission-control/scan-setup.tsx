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

interface BrowseFolder {
  name: string;
  path: string;
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
  const [browsing, setBrowsing] = useState(false);
  const [browseDir, setBrowseDir] = useState('');
  const [browseParent, setBrowseParent] = useState('');
  const [browseFolders, setBrowseFolders] = useState<BrowseFolder[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/scan/directories').then(r => r.json()).then(setDirs);
  }, []);

  async function addDirectory(pathToAdd?: string) {
    const dirPath = pathToAdd || newPath.trim();
    if (!dirPath) return;
    await fetch('/api/scan/directories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath, recursive: newRecursive }),
    });
    setNewPath('');
    setBrowsing(false);
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

  async function openBrowser(dir?: string) {
    setBrowsing(true);
    const params = dir ? `?dir=${encodeURIComponent(dir)}` : '';
    const res = await fetch(`/api/scan/browse${params}`);
    const data = await res.json();
    if (data.error) return;
    setBrowseDir(data.current);
    setBrowseParent(data.parent);
    setBrowseFolders(data.folders);
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
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg w-[600px] max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#f0f6fc]">Directory Scanner</h2>
          <button onClick={onClose} className="text-[#8b949e] hover:text-[#c9d1d9]">✕</button>
        </div>

        {/* Existing directories */}
        <div className="mb-4">
          <div className="text-xs text-[#8b949e] font-semibold uppercase mb-2">Watch Directories</div>
          {dirs.length === 0 ? (
            <div className="text-sm text-[#484f58] py-2">No directories configured. Add one below to get started.</div>
          ) : (
            dirs.map(dir => (
              <div key={dir.id} className="flex items-center gap-2 py-1.5 border-b border-[#21262d]">
                <span className="text-xs text-[#c9d1d9] flex-1 font-mono truncate" title={dir.path}>{dir.path}</span>
                <span className="text-[10px] text-[#8b949e] flex-shrink-0">{dir.recursive ? 'recursive' : 'shallow'}</span>
                {dir.lastScannedAt && (
                  <span className="text-[10px] text-[#484f58] flex-shrink-0">
                    scanned {new Date(dir.lastScannedAt).toLocaleDateString()}
                  </span>
                )}
                <button onClick={() => removeDirectory(dir.id)} className="text-[#f85149] text-xs hover:underline flex-shrink-0">
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add directory */}
        {!browsing ? (
          <div className="mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => openBrowser()}
                className="bg-[#238636] text-white text-xs px-4 py-2 rounded hover:bg-[#2ea043] flex items-center gap-1.5 flex-shrink-0"
              >
                📁 Browse...
              </button>
              <input
                type="text"
                value={newPath}
                onChange={e => setNewPath(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDirectory()}
                placeholder="Or type a path..."
                className="flex-1 bg-[#0d1117] border border-[#30363d] text-[#c9d1d9] px-3 py-1.5 rounded text-xs font-mono"
              />
              <button
                onClick={() => addDirectory()}
                disabled={!newPath.trim()}
                className="bg-[#1f6feb] text-white text-xs px-3 py-1.5 rounded hover:bg-[#388bfd] disabled:opacity-40 flex-shrink-0"
              >
                Add
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-xs text-[#8b949e] mt-2">
              <input type="checkbox" checked={newRecursive} onChange={e => setNewRecursive(e.target.checked)} className="accent-[#1f6feb]" />
              Scan subdirectories recursively
            </label>
          </div>
        ) : (
          /* Folder browser */
          <div className="mb-4 bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[#21262d] bg-[#161b22]">
              <button
                onClick={() => openBrowser(browseParent)}
                disabled={browseDir === browseParent}
                className="text-xs text-[#58a6ff] hover:underline disabled:text-[#484f58] disabled:no-underline"
              >
                ↑ Up
              </button>
              <span className="text-xs text-[#c9d1d9] font-mono truncate flex-1" title={browseDir}>{browseDir}</span>
              <button
                onClick={() => addDirectory(browseDir)}
                className="bg-[#238636] text-white text-[10px] px-2.5 py-1 rounded hover:bg-[#2ea043] flex-shrink-0"
              >
                Add This Folder
              </button>
              <button
                onClick={() => setBrowsing(false)}
                className="text-[#8b949e] text-xs hover:text-[#c9d1d9] flex-shrink-0"
              >
                Cancel
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {browseFolders.length === 0 ? (
                <div className="text-xs text-[#484f58] px-3 py-3">No subfolders found.</div>
              ) : (
                browseFolders.map(folder => (
                  <button
                    key={folder.path}
                    onClick={() => openBrowser(folder.path)}
                    className="w-full text-left px-3 py-1.5 text-xs text-[#c9d1d9] hover:bg-[#21262d] flex items-center gap-2 transition-colors"
                  >
                    <span className="text-[#8b949e]">📁</span>
                    {folder.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Scan button */}
        <button
          onClick={runScan}
          disabled={scanning || dirs.length === 0}
          className="w-full bg-[#1f6feb] text-white text-sm py-2 rounded-md hover:bg-[#388bfd] disabled:opacity-50 mb-4"
        >
          {scanning ? 'Scanning...' : 'Run Scan Now'}
        </button>

        {/* Results */}
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
