'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CreditCard, Check, AlertCircle, Clock, Loader2, Sparkles, Calendar, Shield, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { clsx } from 'clsx';

type BillingStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid';

interface BillingAccount {
  status: BillingStatus;
  trial_started_at: string;
  trial_ends_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingLoadingState />}>
      <BillingContent />
    </Suspense>
  );
}

function BillingLoadingState() {
  return (
     <div className="max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
           <Skeleton className="h-96 rounded-xl" />
           <Skeleton className="h-96 rounded-xl" />
        </div>
     </div>
  );
}

function BillingContent() {
  const [billing, setBilling] = useState<BillingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<'month' | 'year'>('month');
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const canceled = searchParams.get('canceled');
  const reason = searchParams.get('reason');

  const supabase = createClient();

  useEffect(() => {
    fetchBilling();
  }, []);

  useEffect(() => {
    if (success) {
      let attempts = 0;
      const maxAttempts = 10;
      const interval = setInterval(async () => {
        attempts++;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('billing_accounts')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data?.status === 'active') {
          setBilling(data as BillingAccount);
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [success]);

  async function fetchBilling() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('billing_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setBilling(data as BillingAccount);
    }
    setLoading(false);
  }

  async function handleCheckout() {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interval: selectedInterval }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setCheckoutLoading(false);
      } else {
        setError('Something went wrong. Please try again.');
        setCheckoutLoading(false);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to start checkout. Please try again.');
      setCheckoutLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setPortalLoading(false);
      } else {
        setError('Something went wrong. Please try again.');
        setPortalLoading(false);
      }
    } catch (err) {
      console.error('Portal error:', err);
      setError('Failed to open billing portal. Please try again.');
      setPortalLoading(false);
    }
  }

  if (loading) return <BillingLoadingState />;

  const trialEndsAt = billing?.trial_ends_at ? new Date(billing.trial_ends_at) : null;
  const now = new Date();
  const isTrialExpired = trialEndsAt ? trialEndsAt < now : false;
  const daysRemaining = trialEndsAt 
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const isActive = billing?.status === 'active';
  const isPastDue = billing?.status === 'past_due';
  const isCanceled = billing?.status === 'canceled';

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-3xl font-headings font-bold text-white mb-2">Billing & Subscription</h1>
        <p className="text-surface-muted text-lg">Manage your plan and payment details.</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Payment successful!</p>
            <p className="text-sm opacity-90">Your subscription is now active. Thank you for subscribing!</p>
          </div>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Plan Card */}
        <Card className={clsx("h-full border-2", isActive ? "border-brand-primary" : "border-surface-border")}>
           <CardHeader>
              <div className="flex justify-between items-start">
                 <div>
                    <CardTitle className="text-2xl mb-1">Pro Plan</CardTitle>
                    <CardDescription>Everything you need to grow.</CardDescription>
                 </div>
                 {isActive && <Badge variant="default" className="text-sm px-3 py-1">Active</Badge>}
              </div>
           </CardHeader>
           <CardContent className="space-y-6">
              {isActive ? (
                 <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-surface-card border border-surface-border">
                       <p className="text-sm text-surface-muted mb-1">Current Period Ends</p>
                       <p className="font-bold text-white text-lg">
                          {billing?.current_period_end 
                            ? new Date(billing.current_period_end).toLocaleDateString(undefined, { dateStyle: 'long' })
                            : '—'}
                       </p>
                       {billing?.cancel_at_period_end && (
                          <p className="text-xs text-brand-warning mt-2 font-semibold">Cancels at period end</p>
                       )}
                    </div>
                    <Button 
                       onClick={handlePortal} 
                       className="w-full font-bold" 
                       variant="secondary"
                       isLoading={portalLoading}
                    >
                       Manage Subscription
                    </Button>
                 </div>
              ) : (
                 <div className="space-y-6">
                    <div className="flex items-center justify-center p-1 bg-surface-card rounded-lg border border-surface-border w-fit mx-auto">
                       <button
                          onClick={() => setSelectedInterval('month')}
                          className={clsx(
                             "px-4 py-2 rounded-md text-sm font-bold transition-all",
                             selectedInterval === 'month' ? "bg-brand-primary text-white shadow" : "text-surface-muted hover:text-white"
                          )}
                       >
                          Monthly
                       </button>
                       <button
                          onClick={() => setSelectedInterval('year')}
                          className={clsx(
                             "px-4 py-2 rounded-md text-sm font-bold transition-all",
                             selectedInterval === 'year' ? "bg-brand-primary text-white shadow" : "text-surface-muted hover:text-white"
                          )}
                       >
                          Yearly <span className="text-[10px] ml-1 bg-brand-accent/20 text-brand-accent px-1 rounded">20% OFF</span>
                       </button>
                    </div>
                    <div className="text-center">
                       <div className="flex items-baseline justify-center gap-1">
                          <span className="text-5xl font-headings font-bold text-white">
                             ${selectedInterval === 'year' ? '290' : '29'}
                          </span>
                          <span className="text-surface-muted font-medium">/{selectedInterval === 'year' ? 'year' : 'mo'}</span>
                       </div>
                    </div>
                    
                    {billing?.status === 'trialing' && !isTrialExpired && (
                       <div className="text-center p-3 rounded-xl bg-brand-primary/10 text-brand-primary text-sm font-bold border border-brand-primary/20">
                          {daysRemaining} days left in free trial
                       </div>
                    )}

                    <Button 
                       onClick={handleCheckout} 
                       className="w-full h-12 text-lg font-bold shadow-xl shadow-brand-primary/20" 
                       isLoading={checkoutLoading}
                    >
                       {isTrialExpired ? 'Subscribe Now' : 'Upgrade to Pro'}
                    </Button>
                 </div>
              )}
           </CardContent>
        </Card>

        {/* Features Card */}
        <Card className="h-full bg-surface-card/30 border-surface-border">
           <CardHeader>
              <CardTitle className="text-xl">Included in Pro</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
              <FeatureItem icon={Zap} text="Unlimited AI Captions" />
              <FeatureItem icon={Calendar} text="Smart Scheduling & Queue" />
              <FeatureItem icon={Globe} text="Multi-platform Publishing" />
              <FeatureItem icon={Shield} text="Priority Support" />
              <FeatureItem icon={Check} text="Analytics Dashboard" />
              <FeatureItem icon={Check} text="Connect up to 5 accounts" />
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: any; text: string }) {
   return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-card transition-colors">
         <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-brand-primary" />
         </div>
         <span className="font-medium text-white">{text}</span>
      </div>
   );
}
