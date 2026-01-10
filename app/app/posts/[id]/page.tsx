'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Video,
  Clock,
  Calendar,
  Check,
  X,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Play,
  Edit,
  Globe,
  Zap
} from 'lucide-react';
import { clsx } from 'clsx';
import { Post, PlatformPost, CaptionSet, PostContext } from '@/lib/database.types';
import { platformRegistry, PLATFORM_IDS } from '@/lib/platform/registry';
import { Button } from '@/components/ui/button';

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

export default function PostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPost();
    const interval = setInterval(() => {
      if (post?.status === 'publishing' || post?.status === 'queued') {
        fetchPost();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [postId, post?.status]);

  async function fetchPost() {
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
  }

  async function handleAction(action: string, method = 'POST', body?: any) {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/posts/${postId}/${action}`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`Failed to ${action}`);
      await fetchPost();
    } catch (err) {
      setError(`Failed to ${action} post`);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>;
  if (!post) return <div className="text-center py-20 text-surface-muted font-bold">Post not found</div>;

  const context = post.context as PostContext;
  const platformPosts = post.platform_posts || [];

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-120px)] flex flex-col animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 shrink-0 pb-6 border-b border-surface-border">
        <div className="flex items-center gap-6">
          <Link href="/app/posts">
            <Button variant="ghost" size="sm" className="font-bold text-surface-muted hover:text-white rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> 
              Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-surface-border" />
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-headings font-bold text-white truncate max-w-md tracking-tight">
              {context?.topic || 'Untitled Post'}
            </h1>
            <span className={clsx(
              "status-chip h-6",
              post.status === 'publishing' && 'status-publishing',
              post.status === 'queued' && 'status-publishing',
              post.status === 'scheduled' && 'status-scheduled',
              post.status === 'published' && 'status-published',
              post.status === 'failed' && 'status-failed',
              post.status === 'draft' && 'bg-surface/50 text-surface-muted border-surface-border'
            )}>
              {post.status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {post.status === 'scheduled' && (
            <>
              <Button onClick={() => handleAction('publishNow')} isLoading={actionLoading === 'publishNow'} className="btn-primary h-10 px-6 rounded-xl font-bold">
                Publish now
              </Button>
              <Button variant="ghost" onClick={() => handleAction('cancel')} isLoading={actionLoading === 'cancel'} className="text-brand-error hover:bg-brand-error/10 h-10 px-4 rounded-xl font-bold">
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-10 h-full min-h-0 overflow-hidden">
        {/* Left: Media Preview */}
        <div className="lg:col-span-1 flex flex-col gap-6 min-h-0">
          <div className="relative rounded-2xl border border-surface-border bg-surface shadow-2xl overflow-hidden aspect-[9/16] lg:h-full lg:max-h-[600px] flex items-center justify-center">
            {post.assets?.public_url ? (
              <video src={post.assets.public_url} controls className="w-full h-full object-contain" />
            ) : (
              <Video className="w-16 h-16 text-surface-border" />
            )}
            <div className="absolute top-4 right-4 z-10">
              <div className="w-10 h-10 rounded-xl bg-surface/80 backdrop-blur-md border border-surface-border flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-white fill-current translate-x-0.5" />
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-2xl border border-surface-border bg-surface-card/40 shadow-sm">
            <h3 className="text-[10px] font-bold text-surface-muted mb-4 uppercase tracking-[0.2em]">Campaign Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
                <span className="text-xs font-bold text-surface-muted uppercase">Audience</span>
                <span className="text-sm font-semibold text-white">{context?.targetAudience || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-border/50">
                <span className="text-xs font-bold text-surface-muted uppercase">Goal</span>
                <span className="text-sm font-semibold text-white">{context?.cta || '—'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs font-bold text-surface-muted uppercase">Tone</span>
                <span className="text-sm font-semibold text-white">{context?.tone || '—'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Platform Status */}
        <div className="lg:col-span-2 overflow-y-auto pr-4 custom-scrollbar space-y-6">
          <h3 className="text-[10px] font-bold text-surface-muted mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
            <Zap className="w-4 h-4 text-brand-primary fill-current" />
            Platform Relay Status
          </h3>
          
          <div className="grid gap-6">
            {platformPosts.map((pp) => {
              const entry = platformRegistry[pp.platform];
              return (
                <div key={pp.id} className="card p-6 hover:border-surface-muted transition-all">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:scale-105" style={{ backgroundColor: entry.color }}>
                        <Globe className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-headings font-bold text-white text-xl">{entry.displayName}</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={clsx(
                            'status-chip h-5',
                            pp.status === 'publishing' && 'status-publishing',
                            pp.status === 'scheduled' && 'status-scheduled',
                            pp.status === 'published' && 'status-published',
                            pp.status === 'failed' && 'status-failed'
                          )}>
                            {pp.status}
                          </span>
                          {pp.published_at && (
                            <span className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">
                              {formatDistanceToNow(new Date(pp.published_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {pp.external_url && (
                        <a href={pp.external_url} target="_blank" rel="noreferrer">
                          <Button size="sm" className="btn-secondary h-9 px-4 rounded-xl font-bold text-xs">
                            <ExternalLink className="w-3.5 h-3.5 mr-2" /> View
                          </Button>
                        </a>
                      )}
                      {pp.status === 'failed' && (
                        <Button onClick={() => handleAction('retry', 'POST', { platforms: [pp.platform] })} className="btn-primary h-9 px-4 rounded-xl font-bold text-xs">
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-surface border border-surface-border text-sm text-white font-medium leading-relaxed">
                    {pp.caption_final}
                  </div>

                  {pp.last_error && (
                    <div className="mt-4 p-4 rounded-xl bg-brand-error/10 border border-brand-error/20 text-brand-error text-xs flex items-center gap-3 font-semibold">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      {pp.last_error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
