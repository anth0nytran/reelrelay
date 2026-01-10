'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  X,
  Shield,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Star,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ConnectionStatus, PlatformId } from '@/lib/database.types';
import { platformRegistry, PLATFORM_IDS, IMPLEMENTED_PLATFORM_IDS } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
};

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<PlatformId | null>(null);
  const searchParams = useSearchParams();

  const successMessage = searchParams.get('success') ? 'Account connected successfully' : null;
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connect/list');
      const data = await res.json();
      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(platform: PlatformId) {
    const entry = platformRegistry[platform];
    if (!entry.implemented) return;
    window.location.href = entry.connectUrl || `/api/connect/${platform}/start`;
  }

  async function handleDisconnect(platform: PlatformId, accountId?: string) {
    setActionLoading(accountId || platform);
    try {
      const res = await fetch(`/api/connect/${platform}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) await fetchConnections();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSetPrimary(platform: PlatformId, accountId: string) {
    setActionLoading(accountId);
    try {
      const res = await fetch(`/api/connect/${platform}/selectPrimary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) await fetchConnections();
    } catch (error) {
      console.error('Failed to set primary:', error);
    } finally {
      setActionLoading(null);
    }
  }

  function toggleExpanded(platform: PlatformId) {
    setExpandedPlatform(expandedPlatform === platform ? null : platform);
  }

  const connectedCount = connections.filter(c => c.connected).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-surface-muted font-medium">Loading connections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-headings font-bold text-white mb-1">Integrations</h1>
          <p className="text-surface-muted text-sm">
            Manage connected social accounts for automatic publishing.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-xs font-bold text-brand-primary">
          <Shield className="w-3.5 h-3.5" />
          {connectedCount} Active
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-brand-accent flex items-center gap-3 animate-enter">
          <Check className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-brand-error/10 border border-brand-error/20 text-brand-error flex items-center gap-3 animate-enter">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-medium text-sm">{decodeURIComponent(errorMessage)}</span>
        </div>
      )}

      <div className="space-y-6 animate-enter">
        {/* Available Platforms */}
        <section>
          <h2 className="text-xs font-bold text-surface-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Available Platforms
          </h2>
          
          <div className="space-y-3">
            {IMPLEMENTED_PLATFORM_IDS.map((platformId) => {
              const entry = platformRegistry[platformId];
              const connection = connections.find((c) => c.platform === platformId);
              const Icon = iconMap[entry.icon] || Facebook;
              const isConnected = connection?.connected;
              const accounts = connection?.accounts || [];
              const isExpanded = expandedPlatform === platformId;

              return (
                <div 
                  key={platformId}
                  className={clsx(
                    "rounded-xl border transition-all overflow-hidden",
                    isConnected 
                      ? "bg-surface-card/50 border-surface-border" 
                      : "bg-surface-card/20 border-surface-border/50 hover:border-surface-muted"
                  )}
                >
                  {/* Platform Row */}
                  <div className="p-4 flex items-center gap-4">
                    <div 
                      className={clsx(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all shrink-0",
                        isConnected ? "shadow-md" : "opacity-60 grayscale"
                      )}
                      style={{ backgroundColor: isConnected ? entry.color : '#374151' }}
                    >
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white">{entry.displayName}</h3>
                        {isConnected && (
                          <span className="px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-wider border border-brand-accent/20 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-surface-muted mt-0.5">
                        {isConnected 
                          ? `${accounts.length} account${accounts.length !== 1 ? 's' : ''} connected`
                          : "Not connected"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isConnected ? (
                        <Button 
                          onClick={() => handleConnect(platformId)}
                          size="sm"
                          className="btn-primary h-9 px-4 text-xs"
                        >
                          <Plus className="w-4 h-4 mr-1.5" />
                          Connect
                        </Button>
                      ) : (
                        <>
                          <Button
                            onClick={() => handleConnect(platformId)}
                            size="sm"
                            variant="ghost"
                            className="h-9 px-3 text-xs text-surface-muted hover:text-white"
                          >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add
                          </Button>
                          <button
                            onClick={() => toggleExpanded(platformId)}
                            className={clsx(
                              "h-9 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border",
                              isExpanded 
                                ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" 
                                : "bg-surface-card border-surface-border text-surface-muted hover:text-white hover:border-surface-muted"
                            )}
                          >
                            Manage
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded Account List */}
                  {isConnected && isExpanded && accounts.length > 0 && (
                    <div className="border-t border-surface-border bg-surface/40 px-4 py-3 space-y-2 animate-enter">
                      {accounts.map((account) => (
                        <div 
                          key={account.id} 
                          className="flex items-center justify-between p-3 rounded-lg bg-surface-card/50 border border-surface-border/50"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: entry.color }}
                            >
                              {account.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-white">{account.name}</p>
                                {account.isPrimary && (
                                  <span className="text-[10px] font-bold bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Star className="w-2.5 h-2.5 fill-brand-primary" />
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-surface-muted font-mono mt-0.5">
                                ID: {account.externalId}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {!account.isPrimary && accounts.length > 1 && (
                              <button
                                onClick={() => handleSetPrimary(platformId, account.id)}
                                disabled={actionLoading === account.id}
                                className="text-xs font-medium text-surface-muted hover:text-brand-primary px-3 py-1.5 rounded-lg hover:bg-brand-primary/10 transition-colors"
                              >
                                {actionLoading === account.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  'Make Primary'
                                )}
                              </button>
                            )}
                            <button 
                              onClick={() => handleDisconnect(platformId, account.id)}
                              disabled={actionLoading === account.id}
                              className="p-2 rounded-lg text-surface-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors"
                              title="Remove account"
                            >
                              {actionLoading === account.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Coming Soon */}
        <section className="pt-6 border-t border-surface-border/50">
          <h2 className="text-xs font-bold text-surface-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Coming Soon
          </h2>
          <div className="grid sm:grid-cols-3 gap-3">
            {PLATFORM_IDS.filter((p) => !platformRegistry[p].implemented).map((platformId) => {
              const entry = platformRegistry[platformId];
              const Icon = iconMap[entry.icon] || Facebook;
              
              return (
                <div 
                  key={platformId} 
                  className="p-3 rounded-lg border border-surface-border/30 bg-surface-card/10 flex items-center gap-3 opacity-50"
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-card/50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-surface-muted" />
                  </div>
                  <div>
                    <h3 className="font-medium text-surface-muted text-sm">{entry.displayName}</h3>
                    <p className="text-[10px] text-surface-muted/60">Coming soon</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
