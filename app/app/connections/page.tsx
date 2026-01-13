'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Shield,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Star,
} from 'lucide-react';
import { clsx } from 'clsx';
import { ConnectionStatus, PlatformId } from '@/lib/database.types';
import { platformRegistry, PLATFORM_IDS } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
  Linkedin,
  Youtube,
  Music2,
};

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<ConnectionsFallback />}>
      <ConnectionsContent />
    </Suspense>
  );
}

function ConnectionsFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto mb-4" />
        <p className="text-surface-muted font-medium">Loading connections...</p>
      </div>
    </div>
  );
}

function ConnectionsContent() {
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
        {/* Meta Platforms (Facebook & Instagram) */}
        <section>
          <h2 className="text-xs font-bold text-surface-muted uppercase tracking-widest mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Available Platforms
          </h2>
          
          <div className="space-y-3">
            {/* Unified Meta Connection Card */}
            <MetaConnectionCard
              connections={connections}
              expandedPlatform={expandedPlatform}
              actionLoading={actionLoading}
              onConnect={() => handleConnect('facebook')}
              onDisconnect={handleDisconnect}
              onSetPrimary={handleSetPrimary}
              onToggleExpanded={toggleExpanded}
            />

            {/* TikTok Connection Card */}
            <PlatformConnectionCard
              platform="tiktok"
              connections={connections}
              expandedPlatform={expandedPlatform}
              actionLoading={actionLoading}
              onConnect={() => handleConnect('tiktok')}
              onDisconnect={handleDisconnect}
              onSetPrimary={handleSetPrimary}
              onToggleExpanded={toggleExpanded}
            />
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

// Unified Meta (Facebook + Instagram) connection card
function MetaConnectionCard({
  connections,
  expandedPlatform,
  actionLoading,
  onConnect,
  onDisconnect,
  onSetPrimary,
  onToggleExpanded,
}: {
  connections: ConnectionStatus[];
  expandedPlatform: PlatformId | null;
  actionLoading: string | null;
  onConnect: () => void;
  onDisconnect: (platform: PlatformId, accountId?: string) => void;
  onSetPrimary: (platform: PlatformId, accountId: string) => void;
  onToggleExpanded: (platform: PlatformId) => void;
}) {
  const fbConnection = connections.find((c) => c.platform === 'facebook');
  const igConnection = connections.find((c) => c.platform === 'instagram');
  
  const fbAccounts = fbConnection?.accounts || [];
  const igAccounts = igConnection?.accounts || [];
  const totalAccounts = fbAccounts.length + igAccounts.length;
  const isConnected = fbConnection?.connected || igConnection?.connected;
  const isExpanded = expandedPlatform === 'facebook' || expandedPlatform === 'instagram';

  return (
    <div 
      className={clsx(
        "rounded-xl border transition-all overflow-hidden",
        isConnected 
          ? "bg-surface-card/50 border-surface-border" 
          : "bg-surface-card/20 border-surface-border/50 hover:border-surface-muted"
      )}
    >
      {/* Main Row */}
      <div className="p-4 flex items-center gap-4">
        {/* Dual Icon */}
        <div className="relative shrink-0">
          <div 
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
              isConnected ? "shadow-md" : "opacity-60 grayscale"
            )}
            style={{ backgroundColor: isConnected ? '#1877F2' : '#374151' }}
          >
            <Facebook className="w-6 h-6 text-white" />
          </div>
          <div 
            className={clsx(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-surface transition-all",
              isConnected ? "" : "opacity-60 grayscale"
            )}
            style={{ backgroundColor: isConnected ? '#E1306C' : '#374151' }}
          >
            <Instagram className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white">Facebook & Instagram</h3>
            {isConnected && (
              <span className="px-1.5 py-0.5 rounded bg-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-wider border border-brand-accent/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-surface-muted mt-0.5">
            {isConnected 
              ? `${totalAccounts} account${totalAccounts !== 1 ? 's' : ''} connected`
              : "Connect via Meta to publish to both platforms"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button 
              onClick={onConnect}
              size="sm"
              className="btn-primary h-9 px-4 text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Connect
            </Button>
          ) : (
            <>
              <Button
                onClick={onConnect}
                size="sm"
                variant="ghost"
                className="h-9 px-3 text-xs text-surface-muted hover:text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add
              </Button>
              <button
                onClick={() => onToggleExpanded('facebook')}
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
      {isConnected && isExpanded && (
        <div className="border-t border-surface-border bg-surface/40 px-4 py-3 space-y-4 animate-enter">
          {/* Instagram Accounts */}
          {igAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Instagram className="w-4 h-4 text-[#E1306C]" />
                <span className="text-xs font-bold text-surface-muted uppercase tracking-wider">Instagram</span>
              </div>
              <div className="space-y-2">
                {igAccounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    platform="instagram"
                    color="#E1306C"
                    accounts={igAccounts}
                    actionLoading={actionLoading}
                    onSetPrimary={onSetPrimary}
                    onDisconnect={onDisconnect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Facebook Pages */}
          {fbAccounts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span className="text-xs font-bold text-surface-muted uppercase tracking-wider">Facebook Pages</span>
              </div>
              <div className="space-y-2">
                {fbAccounts.map((account) => (
                  <AccountRow
                    key={account.id}
                    account={account}
                    platform="facebook"
                    color="#1877F2"
                    accounts={fbAccounts}
                    actionLoading={actionLoading}
                    onSetPrimary={onSetPrimary}
                    onDisconnect={onDisconnect}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Generic platform connection card (TikTok, LinkedIn, YouTube, etc.)
function PlatformConnectionCard({
  platform,
  connections,
  expandedPlatform,
  actionLoading,
  onConnect,
  onDisconnect,
  onSetPrimary,
  onToggleExpanded,
}: {
  platform: PlatformId;
  connections: ConnectionStatus[];
  expandedPlatform: PlatformId | null;
  actionLoading: string | null;
  onConnect: () => void;
  onDisconnect: (platform: PlatformId, accountId?: string) => void;
  onSetPrimary: (platform: PlatformId, accountId: string) => void;
  onToggleExpanded: (platform: PlatformId) => void;
}) {
  const entry = platformRegistry[platform];
  const connection = connections.find((c) => c.platform === platform);
  const accounts = connection?.accounts || [];
  const isConnected = connection?.connected;
  const isExpanded = expandedPlatform === platform;
  const Icon = iconMap[entry.icon] || Facebook;

  return (
    <div 
      className={clsx(
        "rounded-xl border transition-all overflow-hidden",
        isConnected 
          ? "bg-surface-card/50 border-surface-border" 
          : "bg-surface-card/20 border-surface-border/50 hover:border-surface-muted"
      )}
    >
      {/* Main Row */}
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
              : `Connect your ${entry.displayName} account`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button 
              onClick={onConnect}
              size="sm"
              className="btn-primary h-9 px-4 text-xs"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Connect
            </Button>
          ) : (
            <>
              <Button
                onClick={onConnect}
                size="sm"
                variant="ghost"
                className="h-9 px-3 text-xs text-surface-muted hover:text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add
              </Button>
              <button
                onClick={() => onToggleExpanded(platform)}
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
            <AccountRow
              key={account.id}
              account={account}
              platform={platform}
              color={entry.color}
              accounts={accounts}
              actionLoading={actionLoading}
              onSetPrimary={onSetPrimary}
              onDisconnect={onDisconnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reusable account row component
function AccountRow({
  account,
  platform,
  color,
  accounts,
  actionLoading,
  onSetPrimary,
  onDisconnect,
}: {
  account: { id: string; name: string; externalId: string; isPrimary: boolean };
  platform: PlatformId;
  color: string;
  accounts: Array<{ id: string }>;
  actionLoading: string | null;
  onSetPrimary: (platform: PlatformId, accountId: string) => void;
  onDisconnect: (platform: PlatformId, accountId?: string) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-card/50 border border-surface-border/50">
      <div className="flex items-center gap-3">
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: color }}
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
            onClick={() => onSetPrimary(platform, account.id)}
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
          onClick={() => onDisconnect(platform, account.id)}
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
  );
}
