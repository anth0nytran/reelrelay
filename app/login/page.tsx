'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, AlertCircle, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/app/posts';

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex relative overflow-hidden">
      {/* Abstract Background */}
      <div className="absolute inset-0 bg-grid opacity-[0.2]" />
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-brand-primary/10 blur-[150px] rounded-full" />

      {/* Left: Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative z-10 border-r border-surface-border bg-surface/50 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 text-white font-headings font-bold tracking-tight text-2xl">
          <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center">
            <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
          </div>
          ReelRelay
        </Link>
        
        <div className="max-w-md">
          <h2 className="text-5xl font-headings font-bold text-white mb-6 leading-[1.1]">
            Post once. <br />
            <span className="text-surface-muted">Publish everywhere.</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-surface-muted">
              <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary"><Check className="w-3 h-3" /></div>
              <span>Crisp, conversion-oriented captions</span>
            </div>
            <div className="flex items-center gap-3 text-surface-muted">
              <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary"><Check className="w-3 h-3" /></div>
              <span>One-click cross-platform relay</span>
            </div>
            <div className="flex items-center gap-3 text-surface-muted">
              <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary"><Check className="w-3 h-3" /></div>
              <span>Scheduled. Shipped. Done.</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-surface-muted font-medium uppercase tracking-widest">
          © 2026 REELRELAY INC.
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative z-10">
        <div className="w-full max-w-sm">
          <div className="text-center lg:text-left mb-8">
            <Link href="/" className="lg:hidden flex items-center justify-center gap-2 text-white font-headings font-bold tracking-tight text-2xl mb-8">
              <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
              </div>
              ReelRelay
            </Link>
            <h1 className="text-3xl font-headings font-bold text-white mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-surface-muted text-sm">
              {isLogin ? 'Enter your details to access your dashboard.' : 'Start your free trial today.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@work.com"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
              minLength={6}
            />

            {error && (
              <div className="p-3 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {message && (
              <div className="p-3 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs flex items-center gap-2">
                <Check className="w-4 h-4" />
                {message}
              </div>
            )}

            <Button type="submit" className="w-full h-11 btn-primary" isLoading={loading}>
              {isLogin ? 'Sign In' : 'Start Trial'}
            </Button>
          </form>

          <div className="mt-8 text-center text-sm">
            <span className="text-surface-muted">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
              className="ml-2 text-brand-primary hover:text-brand-dark transition-colors font-semibold"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
