import Link from 'next/link';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between text-sm font-medium">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-white font-headings font-bold tracking-tight text-xl">
            <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
            </div>
            ReelRelay
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/#features" className="text-surface-muted hover:text-white transition-colors">
              Features
            </Link>
            <Link href="/#pricing" className="text-surface-muted hover:text-white transition-colors">
              Pricing
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-surface-muted hover:text-white transition-colors">
            Log in
          </Link>
          <Link href="/login">
            <Button className="btn-primary h-10 px-6 rounded-xl font-bold text-xs">
              Start Trial
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
