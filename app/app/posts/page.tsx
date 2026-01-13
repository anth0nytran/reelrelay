'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';
import {
  Plus,
  Video,
  Clock,
  Check,
  Loader2,
  Calendar,
  ArrowRight,
  RefreshCw,
  Instagram,
  Facebook,
  FileText,
  TrendingUp,
  Zap,
  AlertCircle,
  Link2,
  ChevronRight,
  ExternalLink,
  Eye,
  Music2,
  Users,
  X,
  Trash2,
  MoreHorizontal,
  Play,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PostStatus, PlatformPost, PlatformId, ConnectionStatus } from '@/lib/database.types';
import { platformRegistry } from '@/lib/platform/registry';

// Analytics types
interface PlatformStats {
  platform: string;
  accountName: string;
  followers?: number;
  mediaCount?: number;
  profilePicture?: string;
}

interface AnalyticsData {
  platforms: PlatformStats[];
  totals: {
    followers: number;
    connectedAccounts: number;
  };
}
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
};

interface PlatformPostWithAnalytics extends PlatformPost {
  external_post_id?: string;
  external_url?: string;
  latest_analytics?: {
    views?: number;
    reach?: number;
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    plays?: number;
    engagement_rate?: number;
    fetched_at?: string;
  } | null;
  last_analytics_sync?: string;
}

type PostWithRelations = Post & {
  assets: { id: string; public_url: string; mime: string; duration_seconds?: number } | null;
  platform_posts: PlatformPostWithAnalytics[];
};

const statusConfig: Record<PostStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; icon?: any }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileText },
  scheduled: { label: 'Scheduled', variant: 'warning', icon: Calendar },
  queued: { label: 'Queued', variant: 'default', icon: Clock },
  publishing: { label: 'Publishing', variant: 'default', icon: Loader2 },
  published: { label: 'Published', variant: 'success', icon: Check },
  partially_published: { label: 'Partial', variant: 'warning', icon: AlertCircle },
  failed: { label: 'Failed', variant: 'destructive', icon: AlertCircle },
  canceled: { label: 'Canceled', variant: 'outline', icon: FileText },
};

export default function DashboardPage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchPosts(), fetchConnections(), fetchAnalytics()]).finally(() => setLoading(false));
    const interval = setInterval(() => fetchPosts(true), 10000); // More frequent polling
    return () => clearInterval(interval);
  }, []);

  async function fetchPosts(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/posts');
      const data = await res.json();
      if (data.posts) setPosts(data.posts);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchConnections() {
    try {
      const res = await fetch('/api/connect/list');
      const data = await res.json();
      if (data.connections) setConnections(data.connections);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    }
  }

  async function fetchAnalytics() {
    try {
      const res = await fetch('/api/analytics/overview');
      const data = await res.json();
      if (!data.error) setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }

  // Quick actions
  async function handleCancel(postId: string) {
    setActionLoading(postId);
    const originalPosts = [...posts];
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'canceled' as PostStatus } : p));
    
    try {
      const res = await fetch(`/api/posts/${postId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Cancel failed:', data.error);
        alert(data.error || 'Failed to cancel post');
        setPosts(originalPosts); // Revert to original state
        return;
      }
      // Fetch fresh data after small delay
      setTimeout(() => fetchPosts(true), 300);
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('Failed to cancel post');
      setPosts(originalPosts);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    
    setActionLoading(postId);
    const originalPosts = [...posts];
    // Optimistic update - remove from list immediately
    setPosts(prev => prev.filter(p => p.id !== postId));
    
    try {
      const res = await fetch(`/api/posts/${postId}/delete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Delete failed:', data.error);
        alert(data.error || 'Failed to delete post');
        setPosts(originalPosts);
        return;
      }
      // Success - post stays removed
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete post');
      setPosts(originalPosts);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRetry(postId: string) {
    setActionLoading(postId);
    const originalPosts = [...posts];
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'publishing' as PostStatus } : p));
    
    try {
      const res = await fetch(`/api/posts/${postId}/retry`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Retry failed:', data.error);
        alert(data.error || 'Failed to retry');
        setPosts(originalPosts);
        return;
      }
      // Check actual status and update UI
      setTimeout(() => fetchPosts(true), 1000);
    } catch (error) {
      console.error('Retry failed:', error);
      alert('Failed to retry');
      setPosts(originalPosts);
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePublishNow(postId: string) {
    setActionLoading(postId);
    const originalPosts = [...posts];
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'publishing' as PostStatus } : p));
    
    try {
      const res = await fetch(`/api/posts/${postId}/publishNow`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Publish failed:', data.error);
        alert(data.error || 'Failed to publish');
        setPosts(originalPosts);
        return;
      }
      // Check actual status and update UI
      setTimeout(() => fetchPosts(true), 1000);
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Failed to publish');
      setPosts(originalPosts);
    } finally {
      setActionLoading(null);
    }
  }

  // Derived data
  const activePosts = posts.filter(p => ['scheduled', 'queued', 'publishing'].includes(p.status));
  const recentPosts = posts.filter(p => !['scheduled', 'queued', 'publishing'].includes(p.status)).slice(0, 10);
  const publishedCount = posts.filter(p => p.status === 'published' || p.status === 'partially_published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;
  const failedPosts = posts.filter(p => p.status === 'failed' || p.status === 'partially_published');
  const connectedPlatforms = connections.filter(c => c.connected).length;
  const hasConnections = connectedPlatforms > 0;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headings font-bold text-white mb-2">Dashboard</h1>
          <p className="text-surface-muted">
            {activePosts.length > 0 
              ? `${activePosts.length} post${activePosts.length !== 1 ? 's' : ''} in queue`
              : 'Your content command center'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => fetchPosts()}
            disabled={refreshing}
            className="text-surface-muted hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
          </Button>
          <Link href="/app/posts/new">
            <Button className="font-bold shadow-lg shadow-brand-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Connection Alert */}
      {!hasConnections && (
        <Link href="/app/connections" className="block animate-enter">
          <div className="p-4 rounded-xl border border-brand-warning/30 bg-brand-warning/5 flex items-center gap-4 hover:bg-brand-warning/10 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-brand-warning/20 flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-brand-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm">Connect your accounts</h3>
              <p className="text-xs text-surface-muted">Link Facebook & Instagram to start publishing</p>
            </div>
            <ChevronRight className="w-5 h-5 text-surface-muted group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </div>
        </Link>
      )}

      {/* Failed Posts Alert */}
      {failedPosts.length > 0 && (
        <div className="p-4 rounded-xl border border-brand-error/30 bg-brand-error/5 flex items-center gap-4 animate-enter">
          <div className="w-10 h-10 rounded-xl bg-brand-error/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-brand-error" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">{failedPosts.length} post{failedPosts.length !== 1 ? 's' : ''} failed to publish</h3>
            <p className="text-xs text-surface-muted">
              {!hasConnections 
                ? 'Connect your social media accounts first, then retry'
                : 'Check the error details and retry publishing'}
            </p>
          </div>
          <Link href={`/app/posts/${failedPosts[0].id}`}>
            <Button variant="outline" size="sm" className="font-bold shrink-0">
              View Details
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 animate-enter">
        <StatCard 
          label="Total Followers" 
          value={analytics?.totals.followers || 0} 
          icon={Users} 
          className="border-brand-primary/20 bg-brand-primary/5"
          iconClassName="text-brand-primary"
          formatNumber
        />
        <StatCard 
          label="Published" 
          value={publishedCount} 
          icon={Check} 
          className="border-brand-accent/20 bg-brand-accent/5"
          iconClassName="text-brand-accent"
        />
        <StatCard 
          label="Scheduled" 
          value={scheduledCount} 
          icon={Calendar} 
          className="border-brand-warning/20 bg-brand-warning/5"
          iconClassName="text-brand-warning"
        />
        <StatCard 
          label="In Queue" 
          value={activePosts.length} 
          icon={Zap} 
          className="border-surface-border bg-surface-card/50"
          iconClassName="text-surface-muted"
          pulse={activePosts.length > 0}
        />
        <StatCard 
          label="Drafts" 
          value={draftCount} 
          icon={FileText} 
        />
      </div>

      {/* Connected Accounts with Stats */}
      {analytics && analytics.platforms.length > 0 && (
        <div className="animate-enter">
          <h2 className="text-xs font-bold text-surface-muted uppercase tracking-widest mb-3 flex items-center gap-2">
            <Eye className="w-3.5 h-3.5" /> Account Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {analytics.platforms.map((platform, idx) => (
              <AccountInsightCard key={`${platform.platform}-${idx}`} stats={platform} />
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Queue */}
        <Card className="lg:col-span-1 border-surface-border bg-surface-card/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Active Queue</CardTitle>
              <Link href="/app/queue" className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePosts.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-surface-muted" />
                </div>
                <p className="text-sm font-medium text-white">Queue is empty</p>
                <p className="text-xs text-surface-muted mt-1">Schedule a post to get started</p>
              </div>
            ) : (
              activePosts.slice(0, 5).map((post) => (
                <QueuePostItem 
                  key={post.id} 
                  post={post} 
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Posts Table */}
        <Card className="lg:col-span-2 border-surface-border bg-surface-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {recentPosts.length === 0 ? (
                <div className="text-center py-12">
                   <p className="text-surface-muted text-sm">No recent activity</p>
                </div>
             ) : (
               <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Content</TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPosts.map((post) => (
                    <PostTableRow 
                      key={post.id} 
                      post={post} 
                      onRetry={handleRetry}
                      onDelete={handleDelete}
                      onPublishNow={handlePublishNow}
                      actionLoading={actionLoading}
                    />
                  ))}
                </TableBody>
              </Table>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  className,
  iconClassName,
  pulse = false,
  formatNumber: shouldFormat = false
}: { 
  label: string; 
  value: number; 
  icon: any; 
  className?: string;
  iconClassName?: string;
  pulse?: boolean;
  formatNumber?: boolean;
}) {
  return (
    <Card className={clsx("transition-all hover:bg-surface-card", className)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-surface-muted mb-1">{label}</p>
          <h3 className="text-2xl font-bold text-white">
            {shouldFormat ? formatNumber(value) : value}
          </h3>
        </div>
        <div className={clsx("p-2.5 rounded-xl bg-surface-card border border-surface-border", iconClassName && "bg-transparent border-current opacity-20")}>
          <Icon className={clsx("w-5 h-5 text-surface-muted", iconClassName, pulse && "animate-pulse")} />
        </div>
      </CardContent>
    </Card>
  );
}

function AccountInsightCard({ stats }: { stats: PlatformStats }) {
  const Icon = stats.platform === 'instagram' ? Instagram 
    : stats.platform === 'facebook' ? Facebook 
    : stats.platform === 'tiktok' ? Music2 
    : Video;
  
  const color = stats.platform === 'instagram' ? '#E1306C'
    : stats.platform === 'facebook' ? '#1877F2'
    : stats.platform === 'tiktok' ? '#00F2EA'
    : '#666';

  return (
    <div className="p-4 rounded-xl border border-surface-border bg-surface-card/50 flex items-center gap-4">
      {/* Profile Picture or Icon */}
      <div className="relative shrink-0">
        {stats.profilePicture ? (
          <img 
            src={stats.profilePicture} 
            alt={stats.accountName}
            className="w-12 h-12 rounded-full object-cover border-2"
            style={{ borderColor: color }}
          />
        ) : (
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        )}
        <div 
          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface-card"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Account Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{stats.accountName}</p>
        <p className="text-[10px] text-surface-muted uppercase tracking-wider capitalize">{stats.platform}</p>
      </div>

      {/* Stats */}
      <div className="text-right">
        {stats.followers !== undefined ? (
          <>
            <p className="text-lg font-bold text-white">{formatNumber(stats.followers)}</p>
            <p className="text-[10px] text-surface-muted uppercase tracking-wider">
              {stats.platform === 'facebook' ? 'Fans' : 'Followers'}
            </p>
          </>
        ) : (
          <p className="text-xs text-surface-muted italic">Stats coming soon</p>
        )}
      </div>
    </div>
  );
}

interface QueuePostItemProps {
  post: PostWithRelations;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}

function QueuePostItem({ post, onCancel, onDelete, actionLoading }: QueuePostItemProps) {
  const context = post.context as Record<string, unknown>;
  const platforms = post.platform_posts?.map((p) => p.platform) || [];
  const isLoading = actionLoading === post.id;
  
  let timeDisplay = '';
  if (post.scheduled_for) {
     const date = new Date(post.scheduled_for);
     timeDisplay = isToday(date) ? format(date, 'h:mm a') : format(date, 'MMM d');
  } else {
     timeDisplay = 'Now';
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-surface-border bg-surface hover:bg-surface-card transition-colors group">
      <Link href={`/app/posts/${post.id}`} className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border overflow-hidden shrink-0">
        {post.assets?.public_url ? (
          <video src={post.assets.public_url} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-4 h-4 text-surface-muted" />
          </div>
        )}
      </Link>
      <Link href={`/app/posts/${post.id}`} className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate group-hover:text-brand-primary transition-colors">
          {(context?.topic as string) || 'Untitled'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={post.status === 'publishing' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
            {post.status === 'publishing' && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
            {timeDisplay}
          </Badge>
          <div className="flex -space-x-1">
             {platforms.slice(0, 3).map((p) => {
                const entry = platformRegistry[p as PlatformId];
                const Icon = platformIcons[entry?.icon] || Facebook;
                return (
                   <div key={p} className="w-4 h-4 rounded-full bg-surface-card border border-surface-border flex items-center justify-center z-10">
                      <Icon className="w-2.5 h-2.5 text-surface-muted" />
                   </div>
                )
             })}
          </div>
        </div>
      </Link>
      
      {/* Quick Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); onCancel(post.id); }}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-surface-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors"
          title="Cancel"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onDelete(post.id); }}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-surface-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

interface PostTableRowProps {
  post: PostWithRelations;
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onPublishNow: (id: string) => void;
  actionLoading: string | null;
}

function PostTableRow({ post, onRetry, onDelete, onPublishNow, actionLoading }: PostTableRowProps) {
  const context = post.context as Record<string, unknown>;
  const status = statusConfig[post.status];
  const platforms = post.platform_posts?.map((p) => p.platform) || [];
  const isLoading = actionLoading === post.id;
  const canRetry = ['failed', 'partially_published'].includes(post.status);
  const canPublish = post.status === 'draft';

  // Aggregate analytics across all platforms
  const aggregatedAnalytics = post.platform_posts?.reduce(
    (acc, pp) => {
      const a = pp.latest_analytics;
      if (a) {
        acc.views += a.views || a.plays || 0;
        acc.likes += a.likes || 0;
        acc.comments += a.comments || 0;
        acc.hasData = true;
      }
      return acc;
    },
    { views: 0, likes: 0, comments: 0, hasData: false }
  ) || { views: 0, likes: 0, comments: 0, hasData: false };

  return (
    <TableRow className="group">
      <TableCell>
        <Link href={`/app/posts/${post.id}`} className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-card border border-surface-border overflow-hidden shrink-0">
            {post.assets?.public_url ? (
              <video src={post.assets.public_url} className="w-full h-full object-cover" muted preload="metadata" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-4 h-4 text-surface-muted" />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-white truncate max-w-[200px] group-hover:text-brand-primary transition-colors">
              {(context?.topic as string) || 'Untitled Post'}
            </p>
            <p className="text-xs text-surface-muted truncate max-w-[200px] opacity-70">
              {context?.targetAudience as string || 'General audience'}
            </p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {platforms.map((p) => {
            const entry = platformRegistry[p as PlatformId];
            const Icon = platformIcons[entry?.icon] || Facebook;
            return (
              <div key={p} className="p-1 rounded bg-surface-card border border-surface-border" title={entry?.displayName}>
                <Icon className="w-3 h-3 text-surface-muted" />
              </div>
            );
          })}
        </div>
      </TableCell>
      <TableCell>
        {post.status === 'published' && aggregatedAnalytics.hasData ? (
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 text-surface-muted" title="Views">
              <Eye className="w-3 h-3" />
              <span className="font-medium text-white">{formatNumber(aggregatedAnalytics.views)}</span>
            </div>
            <div className="flex items-center gap-1 text-surface-muted" title="Likes">
              <TrendingUp className="w-3 h-3" />
              <span className="font-medium text-white">{formatNumber(aggregatedAnalytics.likes)}</span>
            </div>
          </div>
        ) : post.status === 'published' ? (
          <span className="text-xs text-surface-muted italic">Syncing...</span>
        ) : (
          <span className="text-xs text-surface-muted">—</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>
          {status.icon && <status.icon className="w-3 h-3 mr-1" />}
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-right text-surface-muted text-sm">
         {format(new Date(post.created_at), 'MMM d, yyyy')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {/* Quick Actions */}
          {canRetry && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-brand-primary hover:bg-brand-primary/10"
              onClick={() => onRetry(post.id)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Retry
            </Button>
          )}
          {canPublish && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs text-brand-primary hover:bg-brand-primary/10"
              onClick={() => onPublishNow(post.id)}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
              Publish
            </Button>
          )}
          
          {/* More Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="w-4 h-4 text-surface-muted" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/app/posts/${post.id}`} className="flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-brand-error focus:text-brand-error"
                onClick={() => onDelete(post.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
           <Skeleton className="h-10 w-10" />
           <Skeleton className="h-10 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Skeleton className="lg:col-span-1 h-96 rounded-xl" />
        <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
      </div>
    </div>
  )
}
