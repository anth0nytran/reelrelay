import Link from 'next/link';
import { Icons } from '@/components/ui/icons';

export function Footer() {
  return (
    <footer className="py-16 border-t border-surface-border bg-surface">
      <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-xs text-surface-muted font-medium uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold tracking-tight normal-case text-lg">ReelRelay</span> © 2026
        </div>
        <div className="flex gap-12 items-center">
          <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
          <div className="w-px h-4 bg-surface-border" />
          <a href="#" className="hover:text-white transition-colors">TikTok</a>
          <a href="#" className="hover:text-white transition-colors">Instagram</a>
          <a href="#" className="hover:text-white transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
}
