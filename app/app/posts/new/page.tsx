'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Calendar,
  Clock,
  AlertCircle,
  Play,
  Zap,
  Instagram,
  Facebook,
  Link2,
  Sparkles,
  Edit3,
  ChevronRight,
  X,
  FileVideo,
  Wand2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { PlatformId, ConnectionStatus } from '@/lib/database.types';
import { platformRegistry, IMPLEMENTED_PLATFORM_IDS } from '@/lib/platform/registry';
import { CaptionOutput } from '@/lib/captions/generator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Icon mapping
const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  Instagram,
  Facebook,
};

type Step = 'connect' | 'upload' | 'context' | 'captions' | 'schedule';

interface UploadedAsset {
  id: string;
  publicUrl: string;
  r2Key: string;
  localPreviewUrl?: string;
}

interface PostContext {
  topic: string;
  targetAudience: string;
  cta: string;
  tone: string;
  brandVoice: string;
}

interface ConnectedAccount {
  platform: PlatformId;
  name: string;
  id: string;
}

const toneOptions = [
  { value: 'Professional', emoji: '💼' },
  { value: 'Casual', emoji: '😊' },
  { value: 'Luxury', emoji: '✨' },
  { value: 'Hype', emoji: '🔥' },
  { value: 'Witty', emoji: '😏' },
  { value: 'Inspiring', emoji: '🚀' },
];

export default function NewPostPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('connect');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformId[]>([]);

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [asset, setAsset] = useState<UploadedAsset | null>(null);

  // Context state
  const [context, setContext] = useState<PostContext>({
    topic: '',
    targetAudience: '',
    cta: '',
    tone: 'Professional',
    brandVoice: '',
  });

  // Post state
  const [postId, setPostId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionOutput | null>(null);
  const [selectedCaptions, setSelectedCaptions] = useState<Record<PlatformId, string>>({} as Record<PlatformId, string>);
  const [editingPlatform, setEditingPlatform] = useState<PlatformId | null>(null);

  // Schedule state
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [timezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections();
  }, []);

  async function fetchConnections() {
    setLoading(true);
    try {
      const res = await fetch('/api/connect/list');
      const data = await res.json();
      
      if (data.connections) {
        setConnections(data.connections);
        
        // Extract connected accounts for implemented platforms only
        const connected: ConnectedAccount[] = [];
        for (const conn of data.connections) {
          if (conn.connected && platformRegistry[conn.platform as PlatformId]?.implemented) {
            for (const acc of conn.accounts || []) {
              connected.push({
                platform: conn.platform as PlatformId,
                name: acc.name,
                id: acc.id,
              });
            }
          }
        }
        setConnectedAccounts(connected);
        
        // Auto-select all connected platforms
        const connectedPlatforms = Array.from(new Set(connected.map(a => a.platform)));
        setSelectedPlatforms(connectedPlatforms);
        
        // If user has connections, skip to upload
        if (connected.length > 0) {
          setStep('upload');
        }
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    } finally {
      setLoading(false);
    }
  }

  // Dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setActionLoading(true);
    setError(null);
    setUploadProgress(0);

    const localPreviewUrl = URL.createObjectURL(file);

    try {
      setUploadProgress(10);
      const presignRes = await fetch('/api/assets/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });

      if (!presignRes.ok) throw new Error('Failed to get upload URL');
      const { uploadUrl, r2Key, publicUrl } = await presignRes.json();
      setUploadProgress(30);

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadRes.ok && !uploadUrl.includes('httpbin.org')) {
        throw new Error('Failed to upload file');
      }
      setUploadProgress(70);

      const completeRes = await fetch('/api/assets/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          r2Key,
          publicUrl,
          mime: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!completeRes.ok) {
        const errorData = await completeRes.json();
        throw new Error(errorData.error || 'Failed to complete upload');
      }

      const { asset: createdAsset } = await completeRes.json();
      setUploadProgress(100);

      setAsset({
        id: createdAsset.id,
        publicUrl: createdAsset.public_url,
        r2Key: createdAsset.r2_key,
        localPreviewUrl,
      });
    } catch (err) {
      console.error('Upload error:', err);
      URL.revokeObjectURL(localPreviewUrl);
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setActionLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm'] },
    maxFiles: 1,
    disabled: actionLoading,
  });

  async function handleGenerateCaptions() {
    if (!asset || selectedPlatforms.length === 0) return;
    setActionLoading(true);
    setError(null);

    try {
      // Create draft with selected platforms
      const draftRes = await fetch('/api/posts/createDraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          context,
          timezone,
          platforms: selectedPlatforms,
        }),
      });

      if (!draftRes.ok) throw new Error('Failed to create draft');
      const { post } = await draftRes.json();
      setPostId(post.id);

      // Generate captions
      const captionsRes = await fetch(`/api/posts/${post.id}/generateCaptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platforms: selectedPlatforms }),
      });

      if (!captionsRes.ok) throw new Error('Failed to generate captions');
      const { captions: generated } = await captionsRes.json();
      setCaptions(generated);

      // Pre-select first caption for each platform
      const selections: Record<PlatformId, string> = {} as Record<PlatformId, string>;
      for (const platform of selectedPlatforms) {
        if (generated[platform]?.captionOptions?.[0]) {
          selections[platform] = generated[platform].captionOptions[0];
        }
      }
      setSelectedCaptions(selections);
      setStep('captions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate captions');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveCaptions() {
    if (!postId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/selectCaptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections: selectedCaptions }),
      });
      if (!res.ok) throw new Error('Failed to save selections');
      setStep('schedule');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save captions');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!postId) return;
    setActionLoading(true);
    try {
      if (publishMode === 'now') {
        const res = await fetch(`/api/posts/${postId}/publishNow`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to publish');
      } else {
        const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        const res = await fetch(`/api/posts/${postId}/schedule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledFor, timezone }),
        });
        if (!res.ok) throw new Error('Failed to schedule');
      }
      router.push(publishMode === 'now' ? '/app/posts' : '/app/queue');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setActionLoading(false);
    }
  }

  function togglePlatform(platform: PlatformId) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-surface-muted font-medium">Loading your accounts...</p>
        </div>
      </div>
    );
  }

  const steps: { key: Step; label: string; number: number }[] = connectedAccounts.length === 0
    ? [
        { key: 'connect', label: 'Connect', number: 1 },
        { key: 'upload', label: 'Upload', number: 2 },
        { key: 'context', label: 'Details', number: 3 },
        { key: 'captions', label: 'Captions', number: 4 },
        { key: 'schedule', label: 'Launch', number: 5 },
      ]
    : [
        { key: 'upload', label: 'Upload', number: 1 },
        { key: 'context', label: 'Details', number: 2 },
        { key: 'captions', label: 'Captions', number: 3 },
        { key: 'schedule', label: 'Launch', number: 4 },
      ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-2xl mx-auto pb-20 pt-6">
      {/* Progress Steps */}
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
           {/* Line Background */}
           <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-surface-border -z-10 -translate-y-1/2" />
           
          {steps.map((s, i) => {
            const isActive = step === s.key;
            const isCompleted = currentStepIndex > i;

            return (
              <div key={s.key} className="flex flex-col items-center bg-surface px-2">
                <div
                  className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all border-2',
                    isActive && 'bg-brand-primary border-brand-primary text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]',
                    isCompleted && 'bg-brand-primary/20 border-brand-primary text-brand-primary',
                    !isActive && !isCompleted && 'bg-surface-card border-surface-border text-surface-muted'
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                </div>
                <span className={clsx(
                  'text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors',
                  isActive ? 'text-white' : 'text-surface-muted'
                )}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-brand-error/10 border border-brand-error/20 text-brand-error flex items-center gap-3 animate-enter">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-brand-error/60 hover:text-brand-error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="animate-enter">
        
        {/* Step: Connect (only shown if no connections) */}
        {step === 'connect' && (
          <div className="text-center py-10 card">
            <div className="w-16 h-16 rounded-2xl bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Link2 className="w-8 h-8 text-brand-primary" />
            </div>
            
            <h2 className="text-2xl font-headings font-bold text-white mb-3">
              Connect Your Accounts
            </h2>
            <p className="text-surface-muted mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Link your social media accounts to start publishing. You need at least one connected account to create posts.
            </p>

            <div className="grid gap-3 max-w-xs mx-auto mb-8">
              {IMPLEMENTED_PLATFORM_IDS.map((platformId) => {
                const entry = platformRegistry[platformId];
                const Icon = platformIcons[entry.icon] || Facebook;
                const isConnected = connectedAccounts.some((a) => a.platform === platformId);

                return (
                  <Link
                    key={platformId}
                    href={`/api/connect/${platformId}/start`}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all group',
                      isConnected
                        ? 'bg-brand-accent/5 border-brand-accent/30 cursor-default'
                        : 'bg-surface-card hover:bg-surface-card/80 border-surface-border hover:border-brand-primary/50'
                    )}
                    onClick={(e) => isConnected && e.preventDefault()}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105"
                      style={{ backgroundColor: isConnected ? entry.color : '#1F2937' }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-white text-sm">{entry.displayName}</div>
                    </div>
                    {isConnected ? (
                      <Check className="w-4 h-4 text-brand-accent" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-surface-muted group-hover:text-white transition-colors" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
             <div className="mb-8">
                <h2 className="text-2xl font-headings font-bold text-white mb-1">Upload Content</h2>
                <p className="text-surface-muted text-sm">Select platforms and upload your video.</p>
             </div>

            {/* Platform Selection */}
            <div className="mb-8">
              <label className="label">Destination</label>
              <div className="flex flex-wrap gap-3">
                {IMPLEMENTED_PLATFORM_IDS.map((platformId) => {
                  const entry = platformRegistry[platformId];
                  const Icon = platformIcons[entry.icon] || Facebook;
                  const isConnected = connectedAccounts.some((a) => a.platform === platformId);
                  const isSelected = selectedPlatforms.includes(platformId);

                  if (!isConnected) return null;

                  return (
                    <button
                      key={platformId}
                      onClick={() => togglePlatform(platformId)}
                      className={clsx(
                        'flex items-center gap-2.5 pl-2 pr-4 py-2 rounded-lg border transition-all',
                        isSelected
                          ? 'border-brand-primary bg-brand-primary/10 text-white shadow-[0_0_15px_rgba(37,99,235,0.1)]'
                          : 'border-surface-border bg-surface-card/30 text-surface-muted hover:border-surface-muted hover:text-white'
                      )}
                    >
                      <div
                        className={clsx(
                          'w-6 h-6 rounded flex items-center justify-center transition-colors',
                          isSelected ? '' : 'opacity-70 grayscale'
                        )}
                        style={{ backgroundColor: entry.color }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-bold text-xs uppercase tracking-wide">{entry.displayName}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand-primary ml-1" />}
                    </button>
                  );
                })}
              </div>
              {selectedPlatforms.length === 0 && (
                <p className="text-xs text-brand-error mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Select at least one platform
                </p>
              )}
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={clsx(
                'relative border border-dashed rounded-xl p-12 transition-all cursor-pointer group',
                isDragActive
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-surface-border hover:border-brand-primary/30 bg-surface-card/20'
              )}
            >
              <input {...getInputProps()} />

              {actionLoading ? (
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <svg className="w-16 h-16 -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#1F2937" strokeWidth="4" />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={175}
                        strokeDashoffset={175 - (175 * uploadProgress) / 100}
                        className="transition-all duration-300"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                      {uploadProgress}%
                    </span>
                  </div>
                  <p className="text-sm text-surface-muted font-medium">Uploading...</p>
                </div>
              ) : asset ? (
                <div className="flex flex-col items-center">
                   <div className="w-48 aspect-[9/16] rounded-lg overflow-hidden bg-black relative group/video border border-surface-border shadow-2xl mb-4">
                    <video
                      src={asset.localPreviewUrl || asset.publicUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-brand-accent font-bold text-xs uppercase tracking-wider mb-2 px-3 py-1 rounded-full bg-brand-accent/10 border border-brand-accent/20">
                      <Check className="w-3 h-3" />
                      Upload Complete
                    </div>
                    <p className="text-xs text-surface-muted mb-4">Ready to process</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (asset.localPreviewUrl) URL.revokeObjectURL(asset.localPreviewUrl);
                        setAsset(null);
                      }}
                      className="text-xs font-medium text-surface-muted hover:text-white underline decoration-surface-border hover:decoration-white underline-offset-4 transition-all"
                    >
                      Replace video
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-card border border-surface-border flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:border-brand-primary/50 group-hover:text-brand-primary transition-all shadow-lg">
                    <Upload className="w-6 h-6 text-surface-muted group-hover:text-brand-primary transition-colors" />
                  </div>
                  <p className="font-bold text-white mb-1">Drag video here</p>
                  <p className="text-xs text-surface-muted">or click to browse</p>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-surface-border/50">
              {connectedAccounts.length === 0 ? (
                <Button variant="ghost" onClick={() => setStep('connect')}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <Link href="/app/posts">
                  <Button variant="ghost">Cancel</Button>
                </Link>
              )}
              <Button
                onClick={() => setStep('context')}
                disabled={!asset || selectedPlatforms.length === 0}
                className="btn-primary"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Context */}
        {step === 'context' && (
          <div>
            <div className="mb-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-primary/20">
                 <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-headings font-bold text-white mb-1">Content Details</h2>
              <p className="text-surface-muted text-sm">Tell us about your video so AI can generate the perfect captions.</p>
            </div>

            <div className="space-y-6 card">
              <Input
                label="What is this video about?"
                placeholder="e.g. A tour of our new office..."
                value={context.topic}
                onChange={(e) => setContext({ ...context, topic: e.target.value })}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Target Audience"
                  placeholder="e.g. Entrepreneurs..."
                  value={context.targetAudience}
                  onChange={(e) => setContext({ ...context, targetAudience: e.target.value })}
                />
                <Input
                  label="Call to Action"
                  placeholder="e.g. Link in bio..."
                  value={context.cta}
                  onChange={(e) => setContext({ ...context, cta: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Tone & Style</label>
                <div className="grid grid-cols-3 gap-3">
                  {toneOptions.map((tone) => (
                    <button
                      key={tone.value}
                      onClick={() => setContext({ ...context, tone: tone.value })}
                      className={clsx(
                        'px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all border',
                        context.tone === tone.value
                          ? 'border-brand-primary bg-brand-primary/10 text-white shadow-[0_0_10px_rgba(37,99,235,0.1)]'
                          : 'border-surface-border bg-surface-card/30 text-surface-muted hover:border-surface-muted hover:text-white'
                      )}
                    >
                      <span className="mr-2 opacity-80">{tone.emoji}</span>
                      {tone.value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Additional Notes</label>
                <textarea
                  className="input min-h-[80px] resize-none"
                  placeholder="Specific hashtags, mentions, or brand guidelines..."
                  value={context.brandVoice}
                  onChange={(e) => setContext({ ...context, brandVoice: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-surface-border/50">
              <Button variant="ghost" onClick={() => setStep('upload')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleGenerateCaptions}
                disabled={!context.topic || actionLoading}
                isLoading={actionLoading}
                className="btn-primary"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Magic Captions
              </Button>
            </div>
          </div>
        )}

        {/* Step: Captions */}
        {step === 'captions' && captions && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-headings font-bold text-white mb-1">Review Captions</h2>
              <p className="text-surface-muted text-sm">Select the best caption for each platform.</p>
            </div>

            <div className="space-y-6">
              {selectedPlatforms.map((platformId) => {
                const entry = platformRegistry[platformId];
                const Icon = platformIcons[entry.icon] || Facebook;
                const platformCaptions = captions[platformId]?.captionOptions || [];
                const selected = selectedCaptions[platformId] || '';
                const isEditing = editingPlatform === platformId;

                return (
                  <div key={platformId} className="card p-0 overflow-hidden border-surface-border/50">
                    {/* Platform Header */}
                    <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border/50 bg-surface-card/30">
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ backgroundColor: entry.color }}
                      >
                        <Icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-bold text-white text-sm uppercase tracking-wide">{entry.displayName}</span>
                      <button
                        onClick={() => setEditingPlatform(isEditing ? null : platformId)}
                        className="ml-auto text-xs font-bold text-surface-muted hover:text-white flex items-center gap-1.5 transition-colors uppercase tracking-wider px-2 py-1 rounded hover:bg-surface-border/50"
                      >
                        <Edit3 className="w-3 h-3" />
                        {isEditing ? 'Done' : 'Edit'}
                      </button>
                    </div>

                    {/* Caption Options or Editor */}
                    <div className="p-5">
                      {isEditing ? (
                        <textarea
                          value={selected}
                          onChange={(e) => setSelectedCaptions({ ...selectedCaptions, [platformId]: e.target.value })}
                          className="input min-h-[140px] resize-none text-sm font-normal leading-relaxed"
                          placeholder="Write your custom caption..."
                          autoFocus
                        />
                      ) : (
                        <div className="space-y-3">
                          {platformCaptions.map((caption, i) => (
                            <button
                              key={i}
                              onClick={() => setSelectedCaptions({ ...selectedCaptions, [platformId]: caption })}
                              className={clsx(
                                'w-full text-left p-4 rounded-lg border transition-all text-sm leading-relaxed group relative',
                                selected === caption
                                  ? 'border-brand-primary bg-brand-primary/5 text-white shadow-sm'
                                  : 'border-surface-border/50 bg-surface/30 text-surface-muted hover:border-surface-muted hover:text-white'
                              )}
                            >
                              <p className="line-clamp-3 pr-6">{caption}</p>
                              <div className={clsx(
                                "absolute top-4 right-4 w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                selected === caption ? "bg-brand-primary border-brand-primary" : "border-surface-border group-hover:border-surface-muted"
                              )}>
                                {selected === caption && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-8 pt-6 border-t border-surface-border/50">
              <Button variant="ghost" onClick={() => setStep('context')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button onClick={handleSaveCaptions} isLoading={actionLoading} className="btn-primary">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Schedule */}
        {step === 'schedule' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-headings font-bold text-white mb-1">Ready to Launch?</h2>
              <p className="text-surface-muted text-sm">Review details and schedule your post.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
               {/* Summary Card */}
               <div className="card flex flex-col">
                  <h3 className="label mb-4">Post Preview</h3>
                  <div className="flex gap-4 mb-4">
                    {asset && (
                      <div className="w-20 aspect-[9/16] rounded-lg overflow-hidden bg-black shrink-0 border border-surface-border">
                        <video
                          src={asset.localPreviewUrl || asset.publicUrl}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                       <p className="font-bold text-white text-sm line-clamp-2 mb-2">{context.topic}</p>
                       <div className="flex flex-wrap gap-2">
                          {selectedPlatforms.map((p) => {
                            const entry = platformRegistry[p];
                            const Icon = platformIcons[entry.icon] || Facebook;
                            return (
                              <div
                                key={p}
                                className="flex items-center gap-1.5 px-2 py-1 rounded border border-surface-border bg-surface-card text-[10px] font-bold uppercase tracking-wider text-surface-muted"
                              >
                                <Icon className="w-3 h-3" />
                                {entry.displayName}
                              </div>
                            );
                          })}
                       </div>
                    </div>
                  </div>
               </div>

               {/* Publish Actions */}
               <div className="space-y-4">
                  <button
                    onClick={() => setPublishMode('now')}
                    className={clsx(
                      'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 group',
                      publishMode === 'now'
                        ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_20px_rgba(37,99,235,0.05)]'
                        : 'border-surface-border bg-surface-card/30 hover:border-surface-muted'
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                      publishMode === 'now' ? 'bg-brand-primary text-white' : 'bg-surface-card text-surface-muted group-hover:text-white'
                    )}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={clsx('font-bold text-sm', publishMode === 'now' ? 'text-white' : 'text-surface-muted group-hover:text-white')}>Publish Now</div>
                      <div className="text-xs text-surface-muted">Post immediately to all platforms</div>
                    </div>
                    <div className={clsx(
                      "ml-auto w-5 h-5 rounded-full border flex items-center justify-center",
                      publishMode === 'now' ? "border-brand-primary bg-brand-primary text-white" : "border-surface-border"
                    )}>
                      {publishMode === 'now' && <Check className="w-3 h-3" />}
                    </div>
                  </button>

                  <button
                    onClick={() => setPublishMode('schedule')}
                    className={clsx(
                      'w-full p-4 rounded-xl border text-left transition-all flex items-center gap-4 group',
                      publishMode === 'schedule'
                        ? 'border-brand-primary bg-brand-primary/10 shadow-[0_0_20px_rgba(37,99,235,0.05)]'
                        : 'border-surface-border bg-surface-card/30 hover:border-surface-muted'
                    )}
                  >
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                      publishMode === 'schedule' ? 'bg-brand-primary text-white' : 'bg-surface-card text-surface-muted group-hover:text-white'
                    )}>
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className={clsx('font-bold text-sm', publishMode === 'schedule' ? 'text-white' : 'text-surface-muted group-hover:text-white')}>Schedule</div>
                      <div className="text-xs text-surface-muted">Pick a date and time for later</div>
                    </div>
                    <div className={clsx(
                      "ml-auto w-5 h-5 rounded-full border flex items-center justify-center",
                      publishMode === 'schedule' ? "border-brand-primary bg-brand-primary text-white" : "border-surface-border"
                    )}>
                      {publishMode === 'schedule' && <Check className="w-3 h-3" />}
                    </div>
                  </button>

                  {/* Schedule Form */}
                  {publishMode === 'schedule' && (
                    <div className="p-4 rounded-xl bg-surface-card/30 border border-surface-border animate-enter">
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Date"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                        />
                        <Input
                          label="Time"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                        />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-surface-muted text-center mt-3 flex items-center justify-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {timezone}
                      </div>
                    </div>
                  )}
               </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-surface-border/50">
              <Button variant="ghost" onClick={() => setStep('captions')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handlePublish}
                isLoading={actionLoading}
                disabled={publishMode === 'schedule' && (!scheduledDate || !scheduledTime)}
                className="btn-primary px-8 w-full md:w-auto"
              >
                {publishMode === 'now' ? (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Publish Now
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
