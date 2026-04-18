'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Search, Database, Cpu, BarChart2 } from 'lucide-react';

const links = [
  { href: '/', label: 'Library', icon: BookOpen },
  { href: '/qa', label: 'Ask AI', icon: Search },
  { href: '/admin-panel', label: 'Admin', icon: Database },
  { href: '/insights', label: 'Insights', icon: Cpu },
];

export default function Navbar() {
  const path = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-amber-900/40"
      style={{ background: 'rgba(15,14,12,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl">📚</span>
          <span className="font-display text-amber-400 text-xl font-bold tracking-tight group-hover:text-amber-300 transition-colors">
            BookInsight <span className="text-amber-600">AI</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all
                  ${active
                    ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50'
                    : 'text-parchment/60 hover:text-parchment hover:bg-white/5'
                  }`}>
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
