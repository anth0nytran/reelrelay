'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Video,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Play,
  Zap,
  Check,
  Globe,
  X,
  Trash2
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PlatformPost, CaptionSet, PostContext, PostStatus } from '@/lib/database.types';
import { platformRegistry } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type PostDetail = Post & {
  assets: {
    id: string;
    public_url: string;
    mime: string;
    size_bytes: number;
    duration_seconds?: number;
    width?: number;
    height?: number;
  };
  caption_sets: CaptionSet[];
  platform_posts: PlatformPost[];
};

const statusConfig: Record<PostStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; icon?: any }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  scheduled: { label: 'Scheduled', variant: 'warning' },
  queued: { label: 'Queued', variant: 'default' },
  publishing: { label: 'Publishing', variant: 'default' },
  published: { label: 'Published', variant: 'success' },
  partially_published: { label: 'Partial', variant: 'warning' },
  failed: { label: 'Failed', variant: 'destructive' },
  canceled: { label: 'Canceled', variant: 'outline' },
};

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      const data = await res.json();
      if (data.post) setPost(data.post);
      else setError('Post not found');
    } catch (err) {
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // Poll more frequently during publishing
  useEffect(() => {
    if (!post) return;
    
    const isActive = ['publishing', 'queued'].includes(post.status);
    const interval = setInterval(() => {
      if (isActive) fetchPost();
    }, isActive ? 2000 : 30000); // Poll every 2s when publishing, every 30s otherwise
    
    return () => clearInterval(interval);
  }, [post?.status, fetchPost]);

  async function handleAction(action: string, method = 'POST', body?: any) {
    setActionLoading(action);
    setError(null);
    setSuccessMessage(null);

    // Optimistic update for some actions
    if (action === 'cancel' && post) {
      setPost({ ...post, status: 'canceled' });
    } else if (action === 'publishNow' && post) {
      setPost({ ...post, status: 'publishing' });
    }

    try {
      const res = await fetch(`/api/posts/${postId}/${action}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action}`);
      }

      // Show success message or redirect
      if (action === 'cancel') {
        setSuccessMessage('Post canceled successfully');
      } else if (action === 'publishNow') {
        setSuccessMessage(data.message || 'Publishing complete!');
      } else if (action === 'retry') {
        setSuccessMessage('Retry complete');
      } else if (action === 'delete') {
        router.push('/app/posts');
        return;
      }

      // Refresh post data
      await fetchPost();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} post`);
      // Revert optimistic update
      await fetchPost();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <PostDetailSkeleton />;
  if (!post) return <div className="text-center py-20 text-surface-muted font-bold">Post not found</div>;

  const context = post.context as PostContext;
  const platformPosts = post.platform_posts || [];
  const statusInfo = statusConfig[post.status];
  const isPublishing = post.status === 'publishing' || post.status === 'queued';
  const canPublish = ['draft', 'scheduled', 'failed', 'partially_published'].includes(post.status);
  const canCancel = ['draft', 'scheduled', 'queued', 'publishing'].includes(post.status);
  const canDelete = post.status !== 'publishing'; // Can delete any non-publishing post
  const hasFailedPlatforms = platformPosts.some(pp => pp.status === 'failed');

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-enter">
      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent flex items-center gap-3 animate-enter">
          <Check className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="ml-auto hover:bg-brand-accent/20 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error flex items-center gap-3 animate-enter">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto hover:bg-brand-error/20 p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Publishing Progress Banner */}
      {isPublishing && (
        <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center gap-4 animate-enter">
          <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
          <div className="flex-1">
            <p className="font-semibold text-white">Publishing in progress...</p>
            <p className="text-sm text-surface-muted">This may take a few minutes. The page will update automatically.</p>
          </div>
        </div>
      )}

      {/* Failed Status Banner */}
      {(post.status === 'failed' || post.status === 'partially_published') && !isPublishing && (
        <div className="p-4 rounded-xl bg-brand-error/10 border border-brand-error/20 flex items-center gap-4">
          <AlertCircle className="w-5 h-5 text-brand-error shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-white">
              {post.status === 'failed' ? 'Publishing failed' : 'Some platforms failed'}
            </p>
            <p className="text-sm text-surface-muted">
              {hasFailedPlatforms 
                ? 'Check the error details below. Make sure you have connected your social media accounts.'
                : 'Some platforms could not be published.'}
            </p>
          </div>
          {hasFailedPlatforms && (
            <Button 
              onClick={() => handleAction('retry')} 
              isLoading={actionLoading === 'retry'}
              className="font-bold shrink-0"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Failed
            </Button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/app/posts">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl border border-surface-border">
              <ArrowLeft className="w-4 h-4 text-surface-muted" /> 
            </Button>
          </Link>
          <div>
             <div className="flex items-center gap-3">
                <h1 className="text-2xl font-headings font-bold text-white truncate max-w-md tracking-tight">
                  {context?.topic || 'Untitled Post'}
                </h1>
                <Badge variant={statusInfo.variant} className={clsx(isPublishing && "animate-pulse")}>
                  {isPublishing && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                  {statusInfo.label}
                </Badge>
             </div>
             <p className="text-sm text-surface-muted">
                Created {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
             </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Publish/Retry button */}
          {canPublish && !isPublishing && (
            <Button 
              onClick={() => handleAction('publishNow')} 
              isLoading={actionLoading === 'publishNow'} 
              className="font-bold shadow-lg shadow-brand-primary/20"
            >
              <Zap className="w-4 h-4 mr-2" />
              {hasFailedPlatforms ? 'Retry All' : 'Publish Now'}
            </Button>
          )}
          
          {/* Cancel button */}
          {canCancel && (
            <Button 
              variant="outline" 
              onClick={() => handleAction('cancel')} 
              isLoading={actionLoading === 'cancel'} 
              className="font-bold"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}

          {/* Delete button */}
          {canDelete && (
            <Button 
              variant="ghost" 
              onClick={async () => {
                if (confirm('Are you sure you want to delete this post? This cannot be undone.')) {
                  setActionLoading('delete');
                  try {
                    const res = await fetch(`/api/posts/${postId}/delete`, { method: 'DELETE' });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to delete');
                    router.push('/app/posts');
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to delete post');
                    setActionLoading(null);
                  }
                }
              }}
              isLoading={actionLoading === 'delete'} 
              className="font-bold text-brand-error hover:bg-brand-error/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}

          {/* Refresh button */}
          <Button 
            variant="ghost" 
            onClick={() => fetchPost()} 
            className="h-10 w-10 p-0"
            title="Refresh"
          >
            <RefreshCw className={clsx("w-4 h-4", isPublishing && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Media Preview & Campaign Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="relative rounded-2xl border border-surface-border bg-black shadow-2xl overflow-hidden aspect-[9/16] group">
            {post.assets?.public_url ? (
              <video 
                src={post.assets.public_url} 
                controls 
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-surface-muted">
                <Video className="w-16 h-16 mb-4 opacity-50" />
                <p>No video available</p>
              </div>
            )}
          </div>
          
          <Card>
            <CardHeader>
               <CardTitle className="text-sm uppercase tracking-wider text-surface-muted">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
                <span className="text-sm font-medium text-surface-muted">Audience</span>
                <span className="text-sm font-semibold text-white text-right">{context?.targetAudience || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
                <span className="text-sm font-medium text-surface-muted">Goal</span>
                <span className="text-sm font-semibold text-white text-right">{context?.cta || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-surface-muted">Tone</span>
                <span className="text-sm font-semibold text-white text-right">{context?.tone || '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Platform Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 mb-2">
             <Zap className="w-5 h-5 text-brand-primary fill-current" />
             <h2 className="text-lg font-bold text-white">Platform Status</h2>
          </div>
          
          <div className="grid gap-4">
            {platformPosts.map((pp) => {
              const entry = platformRegistry[pp.platform];
              let statusVariant: any = "outline";
              if (pp.status === 'published') statusVariant = "success";
              if (pp.status === 'failed') statusVariant = "destructive";
              if (pp.status === 'queued' || pp.status === 'publishing') statusVariant = "default";

              const isPlatformPublishing = pp.status === 'publishing' || pp.status === 'queued';

              return (
                <Card key={pp.id} className={clsx(
                  "transition-all",
                  isPlatformPublishing && "border-brand-primary/30 bg-brand-primary/5"
                )}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <div className="flex items-center gap-3">
                        <div className={clsx(
                          "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all",
                          isPlatformPublishing && "animate-pulse"
                        )} style={{ backgroundColor: entry.color }}>
                           <Globe className="w-6 h-6 text-white" />
                        </div>
                        <div>
                           <CardTitle className="text-base">{entry.displayName}</CardTitle>
                           <div className="flex items-center gap-2 mt-1">
                              <Badge variant={statusVariant} className="h-5 px-1.5 text-[10px]">
                                 {isPlatformPublishing && <Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" />}
                                 {pp.status}
                              </Badge>
                              {pp.published_at && (
                                 <span className="text-xs text-surface-muted">
                                    {formatDistanceToNow(new Date(pp.published_at), { addSuffix: true })}
                                 </span>
                              )}
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        {pp.external_url && (
                           <a href={pp.external_url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-bold border border-surface-border">
                                 <ExternalLink className="w-3.5 h-3.5 mr-2" /> View
                              </Button>
                           </a>
                        )}
                        {pp.status === 'failed' && (
                           <Button 
                              onClick={() => handleAction('retry', 'POST', { platforms: [pp.platform] })} 
                              isLoading={actionLoading === 'retry'}
                              size="sm"
                              className="h-8 px-3 text-xs font-bold"
                           >
                              <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                           </Button>
                        )}
                     </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                     <div className="p-4 rounded-xl bg-surface-card border border-surface-border text-sm text-white leading-relaxed font-medium">
                        {pp.caption_final || <span className="text-surface-muted italic">No caption</span>}
                     </div>
                     {pp.last_error && (
                        <div className="mt-3 p-3 rounded-lg bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs flex items-center gap-2 font-semibold">
                           <AlertCircle className="w-4 h-4 shrink-0" />
                           {pp.last_error}
                        </div>
                     )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
             <Skeleton className="h-10 w-10 rounded-xl" />
             <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-32" />
             </div>
          </div>
          <div className="flex gap-2">
             <Skeleton className="h-10 w-32" />
          </div>
       </div>
       <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
             <Skeleton className="w-full aspect-[9/16] rounded-2xl" />
             <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="lg:col-span-2 space-y-4">
             <Skeleton className="h-8 w-48 mb-4" />
             <Skeleton className="h-64 rounded-xl" />
             <Skeleton className="h-64 rounded-xl" />
          </div>
       </div>
    </div>
  )
}
