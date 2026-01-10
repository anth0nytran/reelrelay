'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import {
  Clock,
  Video,
  Loader2,
  Check,
  AlertCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  Instagram,
  Facebook,
  CalendarDays,
  MoreHorizontal,
  Pause,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PlatformId } from '@/lib/database.types';
import { platformRegistry, IMPLEMENTED_PLATFORM_IDS } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';

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

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => fetchQueue(true), 30000);
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

  // Sort keys: 'now' first, then chronological dates
  const sortedKeys = Object.keys(groupedQueue).sort((a, b) => {
    if (a === 'now') return -1;
    if (b === 'now') return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-surface-muted font-medium">Loading queue...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-headings font-bold text-white mb-1">Queue</h1>
          <p className="text-surface-muted text-sm">
            {queue.length} post{queue.length !== 1 ? 's' : ''} scheduled
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchQueue()}
            disabled={refreshing}
            className="p-2.5 rounded-lg text-surface-muted hover:text-white hover:bg-surface-card transition-colors border border-transparent hover:border-surface-border"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-5 h-5', refreshing && 'animate-spin')} />
          </button>
          <Link href="/app/posts/new">
            <Button className="btn-primary h-10 px-5 rounded-lg font-bold text-sm">
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
                {/* Date Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={clsx(
                    "w-2.5 h-2.5 rounded-full shrink-0",
                    isActive ? "bg-brand-primary animate-pulse" : "bg-surface-muted"
                  )} />
                  <div>
                    <h2 className={clsx(
                      "text-sm font-bold",
                      isActive ? "text-brand-primary" : "text-white"
                    )}>
                      {dateLabel}
                    </h2>
                    {dateSubLabel && (
                      <p className="text-xs text-surface-muted">{dateSubLabel}</p>
                    )}
                  </div>
                  <div className="flex-1 h-px bg-surface-border ml-3" />
                </div>

                {/* Posts Grid */}
                <div className="space-y-3 pl-5 border-l-2 border-surface-border/50 ml-1">
                  {posts.map((post) => (
                    <QueueCard key={post.id} post={post} isActive={isActive} />
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

function QueueCard({ post, isActive }: { post: QueuePost; isActive: boolean }) {
  const context = post.context as Record<string, unknown>;
  const platformSummary = (post.platformSummary || []).filter((p) =>
    IMPLEMENTED_PLATFORM_IDS.includes(p.platform as PlatformId)
  );

  return (
    <Link href={`/app/posts/${post.id}`} className="group block">
      <div className={clsx(
        "rounded-xl border p-4 transition-all flex items-center gap-4",
        isActive 
          ? "bg-surface-card border-brand-primary/30 shadow-[0_0_20px_rgba(37,99,235,0.08)]" 
          : "bg-surface-card/40 border-surface-border hover:bg-surface-card/70 hover:border-surface-muted"
      )}>
        {/* Time */}
        <div className="w-14 text-center shrink-0">
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
            <div className="flex flex-col items-center gap-0.5 text-brand-primary">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-[10px] font-bold uppercase">Now</span>
            </div>
          )}
        </div>

        {/* Thumbnail */}
        <div className="w-14 h-14 rounded-lg bg-surface overflow-hidden shrink-0 border border-surface-border">
          {post.assets?.public_url ? (
            <video
              src={post.assets.public_url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-5 h-5 text-surface-muted/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white truncate text-sm group-hover:text-brand-primary transition-colors">
            {(context?.topic as string) || 'Untitled Post'}
          </h3>
          <div className="flex items-center gap-1.5 mt-2">
            {platformSummary.map(({ platform, status }) => {
              const entry = platformRegistry[platform as PlatformId];
              const Icon = platformIcons[entry?.icon] || Facebook;
              
              const isProcessing = ['queued', 'publishing'].includes(status);
              const isDone = status === 'published';
              const isFailed = status === 'failed';
              
              return (
                <div 
                  key={platform}
                  className={clsx(
                    "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border",
                    isProcessing && "bg-brand-primary/10 border-brand-primary/20 text-brand-primary",
                    isDone && "bg-brand-accent/10 border-brand-accent/20 text-brand-accent",
                    isFailed && "bg-brand-error/10 border-brand-error/20 text-brand-error",
                    !isProcessing && !isDone && !isFailed && "bg-surface-card border-surface-border text-surface-muted"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{entry?.displayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action */}
        <button className="p-2 rounded-lg text-surface-muted hover:text-white hover:bg-surface-border transition-colors opacity-0 group-hover:opacity-100">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}

function EmptyQueue() {
  return (
    <div className="text-center py-16 border border-dashed border-surface-border rounded-xl bg-surface-card/20">
      <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-5">
        <CalendarDays className="w-8 h-8 text-surface-muted" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Your queue is empty</h3>
      <p className="text-surface-muted text-sm mb-6 max-w-xs mx-auto">
        Schedule posts to keep your content flowing consistently.
      </p>
      <Link href="/app/posts/new">
        <Button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Post
        </Button>
      </Link>
    </div>
  );
}
