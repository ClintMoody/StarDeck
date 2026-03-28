'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function ViewToggle() {
  const pathname = usePathname();
  const isMC = pathname === '/mission-control';

  return (
    <div className="flex rounded-lg border border-[#30363d] overflow-hidden text-xs">
      <Link
        href="/"
        className={`px-3 py-1.5 transition-colors ${
          !isMC
            ? 'bg-[#1f6feb] text-white font-medium'
            : 'bg-[#161b22] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
        }`}
      >
        Browse
      </Link>
      <Link
        href="/mission-control"
        className={`px-3 py-1.5 transition-colors border-l border-[#30363d] ${
          isMC
            ? 'bg-[#1f6feb] text-white font-medium'
            : 'bg-[#161b22] text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d]'
        }`}
      >
        Mission Control
      </Link>
    </div>
  );
}
