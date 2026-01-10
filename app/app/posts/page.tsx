'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
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
  LayoutGrid,
  List,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PostStatus, PlatformPost, PlatformId } from '@/lib/database.types';
import { platformRegistry } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
};

type PostWithRelations = Post & {
  assets: { id: string; public_url: string; mime: string; duration_seconds?: number } | null;
  platform_posts: PlatformPost[];
};

const statusConfig: Record<PostStatus, { label: string; color: string; bgColor: string; borderColor: string }> = {
  draft: { label: 'Draft', color: 'text-surface-muted', bgColor: 'bg-surface-card', borderColor: 'border-surface-border' },
  scheduled: { label: 'Scheduled', color: 'text-brand-warning', bgColor: 'bg-brand-warning/10', borderColor: 'border-brand-warning/20' },
  queued: { label: 'Queued', color: 'text-brand-primary', bgColor: 'bg-brand-primary/10', borderColor: 'border-brand-primary/20' },
  publishing: { label: 'Publishing', color: 'text-brand-primary', bgColor: 'bg-brand-primary/10', borderColor: 'border-brand-primary/20' },
  published: { label: 'Published', color: 'text-brand-accent', bgColor: 'bg-brand-accent/10', borderColor: 'border-brand-accent/20' },
  failed: { label: 'Failed', color: 'text-brand-error', bgColor: 'bg-brand-error/10', borderColor: 'border-brand-error/20' },
  canceled: { label: 'Canceled', color: 'text-surface-muted', bgColor: 'bg-surface-card', borderColor: 'border-surface-border' },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<PostWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(() => fetchPosts(true), 30000);
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
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Group posts
  const recentPosts = posts.slice(0, 10);
  const activePosts = posts.filter(p => ['scheduled', 'queued', 'publishing'].includes(p.status));
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-surface-muted font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl font-headings font-bold text-white mb-1">Dashboard</h1>
          <p className="text-surface-muted text-sm">Overview of your content.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchPosts()}
            disabled={refreshing}
            className="p-2.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface-card transition-colors border border-transparent hover:border-surface-border"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
          </button>
          <Link href="/app/posts/new">
            <Button className="btn-primary h-10 px-5 rounded-lg font-bold text-sm">
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total" value={posts.length} icon={FileText} />
        <StatCard label="Published" value={publishedCount} color="text-brand-accent" icon={Check} />
        <StatCard label="Scheduled" value={scheduledCount} color="text-brand-warning" icon={Calendar} />
        <StatCard label="Drafts" value={draftCount} icon={FileText} color="text-surface-muted" />
      </div>

      {/* Active Posts Section */}
      {activePosts.length > 0 && (
        <div className="mb-8 animate-enter">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
              Active
            </h2>
            <Link href="/app/queue" className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1">
              View Queue <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activePosts.map((post) => (
              <ActivePostRow key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Posts */}
      <div className="bg-surface-card/30 border border-surface-border rounded-xl overflow-hidden animate-enter animate-enter-delay-1">
        <div className="px-5 py-3 border-b border-surface-border flex items-center justify-between bg-surface-card/40">
          <h2 className="font-bold text-white text-sm">Recent Posts</h2>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setViewMode('list')}
              className={clsx(
                "p-1.5 rounded transition-colors",
                viewMode === 'list' ? "bg-surface-border text-white" : "text-surface-muted hover:text-white"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={clsx(
                "p-1.5 rounded transition-colors",
                viewMode === 'grid' ? "bg-surface-border text-white" : "text-surface-muted hover:text-white"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-14 px-6">
            <div className="w-14 h-14 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-4">
              <Video className="w-7 h-7 text-surface-muted" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No posts yet</h3>
            <p className="text-surface-muted text-sm mb-5">Create your first post to get started.</p>
            <Link href="/app/posts/new">
              <Button className="btn-secondary text-sm">Create Post</Button>
            </Link>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] uppercase font-semibold text-surface-muted bg-surface-card/50">
                <tr>
                  <th className="px-5 py-3 tracking-wider">Content</th>
                  <th className="px-5 py-3 tracking-wider">Platforms</th>
                  <th className="px-5 py-3 tracking-wider">Status</th>
                  <th className="px-5 py-3 tracking-wider">Date</th>
                  <th className="px-5 py-3 tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/50">
                {recentPosts.map((post) => (
                  <PostTableRow key={post.id} post={post} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = "text-white" }: { label: string; value: number; icon: any; color?: string }) {
  return (
    <div className="p-4 rounded-xl border border-surface-border bg-surface-card/30 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-surface-card border border-surface-border">
        <Icon className={clsx("w-4 h-4", color)} />
      </div>
      <div>
        <p className={clsx("text-xl font-bold leading-none", color)}>{value}</p>
        <p className="text-[10px] font-semibold text-surface-muted uppercase tracking-wider mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function ActivePostRow({ post }: { post: PostWithRelations }) {
  const context = post.context as Record<string, unknown>;
  const platforms = post.platform_posts?.map((p) => p.platform) || [];
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-surface-border bg-surface-card/30 hover:bg-surface-card/60 transition-colors group">
      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface shrink-0 border border-surface-border relative">
        {post.assets?.public_url ? (
          <video src={post.assets.public_url} className="w-full h-full object-cover" muted preload="metadata" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-4 h-4 text-surface-muted" />
          </div>
        )}
        {post.status === 'publishing' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate text-sm">
            {(context?.topic as string) || 'Untitled Post'}
          </h3>
          <div className="flex -space-x-1 shrink-0">
            {platforms.slice(0, 3).map((p) => {
              const entry = platformRegistry[p as PlatformId];
              const Icon = platformIcons[entry?.icon] || Facebook;
              return (
                <div key={p} className="w-5 h-5 rounded-full flex items-center justify-center border border-surface-card" style={{ backgroundColor: entry?.color }}>
                  <Icon className="w-2.5 h-2.5 text-white" />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-brand-primary font-medium">
            {post.status === 'publishing' ? 'Publishing...' : post.status === 'queued' ? 'Queued' : 'Scheduled'}
          </span>
          {post.scheduled_for && (
            <span className="text-[11px] text-surface-muted">
              • {formatDistanceToNow(new Date(post.scheduled_for), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      
      <Link href={`/app/posts/${post.id}`}>
        <button className="px-3 py-1.5 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary/20 transition-colors flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" />
          View
        </button>
      </Link>
    </div>
  );
}

function PostTableRow({ post }: { post: PostWithRelations }) {
  const context = post.context as Record<string, unknown>;
  const status = statusConfig[post.status];
  const platforms = post.platform_posts?.map((p) => p.platform) || [];

  return (
    <tr className="group hover:bg-surface-card/30 transition-colors">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg overflow-hidden bg-surface border border-surface-border shrink-0">
            {post.assets?.public_url ? (
              <video src={post.assets.public_url} className="w-full h-full object-cover" muted preload="metadata" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Video className="w-3 h-3 text-surface-muted" />
              </div>
            )}
          </div>
          <span className="font-medium text-white truncate max-w-[180px] text-sm">
            {(context?.topic as string) || 'Untitled'}
          </span>
        </div>
      </td>
      <td className="px-5 py-3">
        <div className="flex -space-x-1">
          {platforms.slice(0, 3).map((p) => {
            const entry = platformRegistry[p as PlatformId];
            const Icon = platformIcons[entry?.icon] || Facebook;
            return (
              <div key={p} className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-surface-card" style={{ backgroundColor: entry?.color || '#374151' }}>
                <Icon className="w-3 h-3 text-white" />
              </div>
            );
          })}
        </div>
      </td>
      <td className="px-5 py-3">
        <span className={clsx(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border',
          status.color, status.bgColor, status.borderColor
        )}>
          {post.status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin" />}
          {status.label}
        </span>
      </td>
      <td className="px-5 py-3 text-surface-muted text-xs">
        {post.scheduled_for 
          ? format(new Date(post.scheduled_for), 'MMM d, h:mm a')
          : format(new Date(post.created_at), 'MMM d, yyyy')
        }
      </td>
      <td className="px-5 py-3 text-right">
        <Link href={`/app/posts/${post.id}`}>
          <button className="px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-surface-muted hover:text-white hover:border-surface-muted text-xs font-medium transition-colors flex items-center gap-1.5 ml-auto">
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </button>
        </Link>
      </td>
    </tr>
  );
}

function PostCard({ post }: { post: PostWithRelations }) {
  const context = post.context as Record<string, unknown>;
  const status = statusConfig[post.status];
  
  return (
    <Link href={`/app/posts/${post.id}`} className="group block">
      <div className="rounded-xl border border-surface-border bg-surface-card/40 hover:bg-surface-card/70 hover:border-surface-muted transition-all overflow-hidden h-full flex flex-col">
        <div className="aspect-video bg-surface-card relative border-b border-surface-border">
          {post.assets?.public_url ? (
            <video src={post.assets.public_url} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted preload="metadata" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-8 h-8 text-surface-muted/30" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <span className={clsx(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border backdrop-blur-md',
              status.color, status.bgColor, status.borderColor
            )}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-bold text-white text-sm mb-1 line-clamp-1 group-hover:text-brand-primary transition-colors">
            {(context?.topic as string) || 'Untitled'}
          </h3>
          <p className="text-xs text-surface-muted mb-3 line-clamp-2 flex-1">
            {(context?.cta as string) || 'No description.'}
          </p>
          <div className="pt-2 border-t border-surface-border/50 flex items-center justify-between text-[10px] text-surface-muted">
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </Link>
  );
}
