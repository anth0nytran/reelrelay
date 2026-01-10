'use client';

import { useState, useEffect } from 'react';
import { Upload, Sparkles, Check, Clock, ChevronRight, Play, Zap, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const platforms = [
  { id: 'instagram', name: 'Instagram', color: '#E1306C', icon: '📸' },
  { id: 'tiktok', name: 'TikTok', color: '#00f2ea', icon: '🎵' },
  { id: 'youtube', name: 'YouTube', color: '#FF0000', icon: '▶️' },
  { id: 'linkedin', name: 'LinkedIn', color: '#0A66C2', icon: '💼' },
  { id: 'facebook', name: 'Facebook', color: '#1877F2', icon: '👥' },
];

const sampleCaptions = {
  instagram: [
    '✨ Luxury meets location. This Tribeca penthouse redefines city living. #NYCRealEstate #LuxuryHomes',
    '🏙️ Views that command attention. Private showings available. DM for details. #TriBeCa #DreamHome',
    'Where skyline views meet sophisticated design. Your next chapter starts here. 🗽 #NewYorkLiving',
  ],
  tiktok: [
    'POV: You just found your dream apartment 🔥 #fyp #luxuryrealestate #nycapartment',
    'Wait for the view... 😱 #apartmenttour #luxuryhome #tribeca #realestate',
    'This penthouse hits different 🏙️ #newyork #luxury #dreamhome',
  ],
  youtube: [
    '🏠 FULL TOUR: $8.5M Tribeca Penthouse with 360° Views | NYC Real Estate',
    'Inside a Stunning Tribeca Penthouse | Luxury NYC Apartment Tour 2024',
    'Manhattan Skyline Views: Exclusive Penthouse Walkthrough | Real Estate Tour',
  ],
  linkedin: [
    'Excited to present this exceptional Tribeca residence. A testament to what modern luxury living can be.',
    'New listing alert: This penthouse represents the pinnacle of NYC real estate. Contact me for private viewings.',
    'The NYC luxury market continues to impress. Just listed this stunning Tribeca property.',
  ],
  facebook: [
    '🏠 NEW LISTING! This breathtaking Tribeca penthouse features panoramic city views and world-class finishes.',
    'Just listed! ✨ Stunning penthouse in the heart of Tribeca. Schedule your private showing today!',
    'Dream home alert! 🗽 This Tribeca gem is now available. Click to learn more.',
  ],
};

type DemoStep = 'upload' | 'generating' | 'captions' | 'scheduling' | 'done';

export default function DemoPlayground() {
  const [step, setStep] = useState<DemoStep>('upload');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [selectedCaptions, setSelectedCaptions] = useState<Record<string, number>>({});
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance through demo
  useEffect(() => {
    if (!isAutoPlaying) return;

    const timers: Record<DemoStep, number> = {
      upload: 2500,
      generating: 2000,
      captions: 4000,
      scheduling: 2500,
      done: 3000,
    };

    const timer = setTimeout(() => {
      if (step === 'upload') setStep('generating');
      else if (step === 'generating') setStep('captions');
      else if (step === 'captions') setStep('scheduling');
      else if (step === 'scheduling') setStep('done');
      else if (step === 'done') {
        setStep('upload');
        setSelectedCaptions({});
      }
    }, timers[step]);

    return () => clearTimeout(timer);
  }, [step, isAutoPlaying]);

  // Auto-select captions during demo
  useEffect(() => {
    if (step === 'captions' && isAutoPlaying) {
      const timer = setTimeout(() => {
        setSelectedCaptions({
          instagram: 0,
          tiktok: 1,
          youtube: 0,
          linkedin: 2,
          facebook: 0,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, isAutoPlaying]);

  const handlePlatformClick = (platformId: string) => {
    setSelectedPlatform(platformId);
    setIsAutoPlaying(false);
  };

  return (
    <div 
      className="bg-surface p-6 min-h-[400px] relative overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Progress indicator */}
      <div className="absolute top-4 right-4 flex gap-2">
        {['upload', 'generating', 'captions', 'scheduling', 'done'].map((s, i) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all duration-500 ${
              step === s ? 'bg-brand-primary scale-125 shadow-[0_0_8px_rgba(37,99,235,0.6)]' : 
              ['upload', 'generating', 'captions', 'scheduling', 'done'].indexOf(step) > i ? 'bg-brand-primary/20' : 'bg-surface-border'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 'upload' && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Upload className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">Upload Content</span>
            </div>
            
            <div className="border-2 border-dashed border-surface-border rounded-2xl p-10 text-center hover:border-brand-primary/50 transition-all bg-surface-card/30">
              <div className="w-14 h-14 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Upload className="w-6 h-6 text-surface-muted" />
              </div>
              <div className="animate-pulse space-y-2">
                <div className="h-2.5 w-32 bg-surface-border rounded-full mx-auto" />
                <div className="h-2 w-20 bg-surface-border/50 rounded-full mx-auto" />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10">
              <div className="w-10 h-10 rounded-lg bg-surface border border-surface-border flex items-center justify-center animate-pulse">
                <Play className="w-4 h-4 text-brand-primary fill-current translate-x-0.5" />
              </div>
              <div className="flex-1">
                <div className="h-2 w-24 bg-white/10 rounded-full mb-2" />
                <div className="h-1.5 w-full bg-surface-border rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 2 }}
                    className="h-full bg-brand-primary" 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'generating' && (
          <motion.div
            key="generating"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-brand-primary animate-pulse" />
              <span className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">AI Analyzing Content...</span>
            </div>

            <div className="relative h-44 rounded-2xl bg-surface-card border border-surface-border overflow-hidden shadow-inner">
              <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(37,99,235,0.05),transparent)] animate-shimmer" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-4 border border-brand-primary/20">
                    <Sparkles className="w-6 h-6 text-brand-primary animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <div className="text-xs font-bold text-white tracking-tight">Generating crisp captions for 5 platforms...</div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className="shrink-0 px-4 py-2 rounded-xl bg-surface border border-surface-border text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                >
                  <span>{p.icon}</span>
                  <span className="text-surface-muted">{p.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'captions' && (
          <motion.div
            key="captions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">Select Captions</span>
            </div>

            {/* Platform tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePlatformClick(p.id)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all border ${
                    selectedPlatform === p.id
                      ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20'
                      : 'bg-surface border-surface-border text-surface-muted hover:border-surface-muted hover:text-white'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  {selectedCaptions[p.id] !== undefined && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
              ))}
            </div>

            {/* Caption options */}
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
              {sampleCaptions[selectedPlatform as keyof typeof sampleCaptions]?.map((caption, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedCaptions({ ...selectedCaptions, [selectedPlatform]: i });
                    setIsAutoPlaying(false);
                  }}
                  className={`w-full text-left p-4 rounded-xl border text-xs transition-all font-medium leading-relaxed ${
                    selectedCaptions[selectedPlatform] === i
                      ? 'bg-brand-primary/5 border-brand-primary/40 text-white ring-1 ring-brand-primary/20'
                      : 'bg-surface border-surface-border text-surface-muted hover:border-surface-muted hover:bg-surface-card/50'
                  }`}
                >
                  <div className="line-clamp-2">{caption}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'scheduling' && (
          <motion.div
            key="scheduling"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-brand-primary" />
              <span className="text-[10px] font-bold text-surface-muted uppercase tracking-widest">Schedule Relay</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="p-5 rounded-2xl border border-surface-border bg-surface text-center hover:border-brand-primary/30 transition-all group">
                <div className="w-10 h-10 rounded-xl bg-surface-card flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-primary/10 transition-all">
                  <Zap className="w-5 h-5 text-surface-muted group-hover:text-brand-primary transition-colors fill-current" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-surface-muted group-hover:text-white">Publish Now</div>
              </button>
              <button className="p-5 rounded-2xl border border-brand-primary/30 bg-brand-primary/10 text-center shadow-lg shadow-brand-primary/10">
                <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-primary/20">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-white">Schedule</div>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-surface border border-surface-border flex items-center justify-between shadow-inner">
              <div>
                <div className="text-xs font-bold text-white mb-0.5">Tomorrow, 10:00 AM</div>
                <div className="text-[9px] font-bold text-brand-primary uppercase tracking-[0.1em]">Optimal engagement time</div>
              </div>
              <ChevronRight className="w-4 h-4 text-surface-muted" />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {platforms.map((p) => (
                <div
                  key={p.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-surface border border-surface-border text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"
                >
                  <span>{p.icon}</span>
                  <Check className="w-3 h-3 text-brand-primary" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center justify-center min-h-[300px]"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
                className="w-20 h-20 rounded-3xl bg-brand-primary/10 flex items-center justify-center mx-auto mb-6 border border-brand-primary/20 shadow-[0_0_30px_rgba(37,99,235,0.2)]"
              >
                <Check className="w-10 h-10 text-brand-primary" />
              </motion.div>
              <div className="text-2xl font-headings font-bold text-white mb-2">Relay Ready</div>
              <div className="text-xs font-bold text-surface-muted uppercase tracking-[0.2em]">Scheduled. Shipped. Done.</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
