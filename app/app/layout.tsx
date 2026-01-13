'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  FileText,
  Link2,
  Calendar,
  LogOut,
  Plus,
  Menu,
  X,
  LayoutDashboard,
  Play,
  Zap,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/app/posts', icon: LayoutDashboard },
  { name: 'Queue', href: '/app/queue', icon: Calendar },
  { name: 'Connections', href: '/app/connections', icon: Link2 },
  { name: 'Billing', href: '/app/billing', icon: CreditCard },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-surface-border bg-surface transform transition-transform duration-300 lg:translate-x-0 lg:static lg:shrink-0 flex flex-col',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 shrink-0">
          <Link href="/app/posts" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:shadow-brand-primary/30 transition-all">
              <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
            </div>
            <span className="text-xl font-headings font-bold text-white tracking-tight">
              ReelRelay
            </span>
          </Link>
        </div>

        {/* Main Navigation Area */}
        <div className="flex-1 flex flex-col p-4 gap-8 overflow-y-auto min-h-0">
          {/* Primary Action */}
          <Link 
            href="/app/posts/new" 
            className="btn-primary w-full shadow-lg shadow-brand-primary/10 justify-start px-4 h-12 rounded-xl shrink-0"
            onClick={() => setMobileMenuOpen(false)}
          >
            <Plus className="w-5 h-5 mr-2" />
            <span className="font-semibold">New Post</span>
          </Link>

          {/* Navigation */}
          <nav className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-surface-muted uppercase tracking-[0.2em] mb-4">
              Overview
            </p>
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group',
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'text-surface-muted hover:bg-surface-card hover:text-white'
                  )}
                >
                  <item.icon className={clsx(
                    "w-5 h-5 transition-colors",
                    isActive ? "text-brand-primary" : "text-surface-muted group-hover:text-white"
                  )} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User / Logout - Fixed at bottom */}
        <div className="p-4 border-t border-surface-border shrink-0 bg-surface">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-surface-muted hover:bg-brand-error/10 hover:text-brand-error transition-colors group"
          >
            <LogOut className="w-5 h-5 text-surface-muted group-hover:text-brand-error transition-colors" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile Header */}
        <header className="h-16 lg:hidden flex items-center justify-between px-4 border-b border-surface-border bg-surface/80 backdrop-blur-md sticky top-0 z-30">
          <Link href="/app/posts" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
            </div>
            <span className="font-headings font-bold text-white">ReelRelay</span>
          </Link>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl text-surface-muted hover:bg-surface-card hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
