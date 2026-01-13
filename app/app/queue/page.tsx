'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow } from 'date-fns';
import {
  Video,
  Loader2,
  Plus,
  RefreshCw,
  Instagram,
  Facebook,
  CalendarDays,
  Clock,
  ArrowRight,
  X,
  Trash2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PlatformId } from '@/lib/database.types';
import { platformRegistry, IMPLEMENTED_PLATFORM_IDS } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
};

type QueuePost = Post & {
  assets: { id: string; public_url: string } | null;
  platform_posts: Array<{ platform: string; status: string; scheduled_for?: string }>;
  platformSummary: Array<{ platform: string; status: string }>;
};

export default function QueuePage() {
  const [queue, setQueue] = useState<QueuePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(true), 10000); // More frequent polling
    return () => clearInterval(interval);
  }, []);

  async function fetchQueue(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    try {
      const res = await fetch('/api/queue');
      const data = await res.json();
      if (data.queue) {
        setQueue(data.queue);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Quick actions
  async function handleCancel(postId: string) {
    setActionLoading(postId);
    const originalQueue = [...queue];
    // Optimistic update - remove from list immediately
    setQueue(prev => prev.filter(p => p.id !== postId));
    
    try {
      const res = await fetch(`/api/posts/${postId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Cancel failed:', data.error);
        alert(data.error || 'Failed to cancel');
        setQueue(originalQueue); // Revert to original state
        return;
      }
      // Success - item stays removed from queue
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('Failed to cancel');
      setQueue(originalQueue);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm('Delete this post? This cannot be undone.')) return;
    
    setActionLoading(postId);
    const originalQueue = [...queue];
    // Optimistic update - remove from list immediately
    setQueue(prev => prev.filter(p => p.id !== postId));
    
    try {
      const res = await fetch(`/api/posts/${postId}/delete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('Delete failed:', data.error);
        alert(data.error || 'Failed to delete');
        setQueue(originalQueue); // Revert to original state
        return;
      }
      // Success - item stays removed from queue
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete');
      setQueue(originalQueue);
    } finally {
      setActionLoading(null);
    }
  }

  // Group by date
  const groupedQueue = queue.reduce((acc, post) => {
    let dateKey: string;
    if (!post.scheduled_for) {
      dateKey = 'now';
    } else {
      const date = new Date(post.scheduled_for);
      dateKey = format(date, 'yyyy-MM-dd');
    }
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(post);
    return acc;
  }, {} as Record<string, QueuePost[]>);

  const sortedKeys = Object.keys(groupedQueue).sort((a, b) => {
    if (a === 'now') return -1;
    if (b === 'now') return 1;
    return a.localeCompare(b);
  });

  if (loading) return <QueueSkeleton />;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-headings font-bold text-white mb-2">Queue</h1>
          <p className="text-surface-muted">
            {queue.length} post{queue.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => fetchQueue()}
            disabled={refreshing}
            className="text-surface-muted hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
          </Button>
          <Link href="/app/posts/new">
            <Button className="font-bold shadow-lg shadow-brand-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </Link>
        </div>
      </div>

      {queue.length === 0 ? (
        <EmptyQueue />
      ) : (
        <div className="space-y-8">
          {sortedKeys.map((dateKey) => {
            const posts = groupedQueue[dateKey];
            let dateLabel: string;
            let dateSubLabel: string = '';
            let isActive = false;

            if (dateKey === 'now') {
              dateLabel = 'Publishing Now';
              isActive = true;
            } else {
              const date = new Date(dateKey);
              if (isToday(date)) {
                dateLabel = 'Today';
                dateSubLabel = format(date, 'EEEE, MMMM d');
              } else if (isTomorrow(date)) {
                dateLabel = 'Tomorrow';
                dateSubLabel = format(date, 'EEEE, MMMM d');
              } else {
                dateLabel = format(date, 'EEEE');
                dateSubLabel = format(date, 'MMMM d, yyyy');
              }
            }

            return (
              <div key={dateKey} className="animate-enter">
                <div className="flex items-center gap-4 mb-4">
                  <div className={clsx(
                    "flex flex-col items-center justify-center w-12 h-12 rounded-xl border border-surface-border bg-surface-card",
                    isActive ? "border-brand-primary/50 bg-brand-primary/10" : ""
                  )}>
                    {isActive ? (
                        <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                    ) : (
                        <span className="text-lg font-bold text-white">
                           {dateKey !== 'now' ? new Date(dateKey).getDate() : <Clock className="w-5 h-5" />}
                        </span>
                    )}
                  </div>
                  <div>
                    <h2 className={clsx(
                      "text-lg font-bold",
                      isActive ? "text-brand-primary" : "text-white"
                    )}>
                      {dateLabel}
                    </h2>
                    {dateSubLabel && (
                      <p className="text-sm text-surface-muted">{dateSubLabel}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {posts.map((post) => (
                    <QueueCard 
                      key={post.id} 
                      post={post} 
                      isActive={isActive}
                      onCancel={handleCancel}
                      onDelete={handleDelete}
                      actionLoading={actionLoading}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface QueueCardProps {
  post: QueuePost;
  isActive: boolean;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  actionLoading: string | null;
}

function QueueCard({ post, isActive, onCancel, onDelete, actionLoading }: QueueCardProps) {
  const context = post.context as Record<string, unknown>;
  const platformSummary = (post.platformSummary || []).filter((p) =>
    IMPLEMENTED_PLATFORM_IDS.includes(p.platform as PlatformId)
  );
  const isLoading = actionLoading === post.id;

  return (
    <Card className={clsx(
      "transition-all hover:border-surface-muted/50 hover:shadow-lg group",
      isActive ? "border-brand-primary/30 bg-surface-card" : "border-surface-border bg-surface-card/40"
    )}>
      <CardContent className="p-4 flex items-center gap-4">
         {/* Time */}
         <div className="w-16 text-center shrink-0">
           {post.scheduled_for ? (
             <>
               <div className="text-lg font-bold text-white tabular-nums leading-tight">
                 {format(new Date(post.scheduled_for), 'h:mm')}
               </div>
               <div className="text-[10px] font-bold text-surface-muted uppercase">
                 {format(new Date(post.scheduled_for), 'a')}
               </div>
             </>
           ) : (
             <div className="flex flex-col items-center gap-1 text-brand-primary">
               {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
               <span className="text-[10px] font-bold uppercase">Now</span>
             </div>
           )}
         </div>

         {/* Thumbnail */}
         <Link href={`/app/posts/${post.id}`} className="w-16 h-16 rounded-xl bg-surface-card border border-surface-border overflow-hidden shrink-0">
           {post.assets?.public_url ? (
             <video
               src={post.assets.public_url}
               className="w-full h-full object-cover"
               muted
               preload="metadata"
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center">
               <Video className="w-6 h-6 text-surface-muted/50" />
             </div>
           )}
         </Link>

         {/* Content */}
         <Link href={`/app/posts/${post.id}`} className="flex-1 min-w-0">
           <h3 className="font-bold text-white truncate text-base group-hover:text-brand-primary transition-colors">
             {(context?.topic as string) || 'Untitled Post'}
           </h3>
           <div className="flex items-center gap-2 mt-2">
             {platformSummary.map(({ platform, status }) => {
               const entry = platformRegistry[platform as PlatformId];
               const Icon = platformIcons[entry?.icon] || Facebook;
               
               const isProcessing = ['queued', 'publishing'].includes(status);
               const isDone = status === 'published';
               const isFailed = status === 'failed';
               
               let variant: any = "outline";
               if (isProcessing) variant = "default";
               if (isDone) variant = "success";
               if (isFailed) variant = "destructive";

               return (
                 <Badge key={platform} variant={variant} className="gap-1 px-2">
                   {isProcessing && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                   <Icon className="w-3 h-3" />
                   {entry?.displayName}
                 </Badge>
               );
             })}
           </div>
         </Link>
         
         {/* Quick Actions */}
         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button
             onClick={(e) => { e.preventDefault(); onCancel(post.id); }}
             disabled={isLoading}
             className="p-2 rounded-lg text-surface-muted hover:text-white hover:bg-surface-card transition-colors"
             title="Cancel"
           >
             {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
           </button>
           <button
             onClick={(e) => { e.preventDefault(); onDelete(post.id); }}
             disabled={isLoading}
             className="p-2 rounded-lg text-surface-muted hover:text-brand-error hover:bg-brand-error/10 transition-colors"
             title="Delete"
           >
             <Trash2 className="w-4 h-4" />
           </button>
           <Link href={`/app/posts/${post.id}`} className="p-2 rounded-lg text-surface-muted hover:text-brand-primary transition-colors">
             <ArrowRight className="w-4 h-4" />
           </Link>
         </div>
      </CardContent>
    </Card>
  );
}

function EmptyQueue() {
  return (
    <Card className="border-dashed bg-surface-card/30">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mb-4">
            <CalendarDays className="w-8 h-8 text-surface-muted" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Your queue is empty</h3>
          <p className="text-surface-muted mb-6 max-w-sm">
            Schedule posts to keep your content flowing consistently across all your platforms.
          </p>
          <Link href="/app/posts/new">
            <Button className="font-bold">
              <Plus className="w-4 h-4 mr-2" />
              Schedule Post
            </Button>
          </Link>
        </CardContent>
    </Card>
  );
}

function QueueSkeleton() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-end">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-32" />
                </div>
            </div>
            <div className="space-y-8">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-12 h-12 rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-4 w-48" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[...Array(3)].map((_, j) => (
                                <Skeleton key={j} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
