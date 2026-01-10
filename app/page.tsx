'use client';

import { Cloud, Calendar, BarChart3, Users, Sparkles, Play, Globe, Zap } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DemoPlayground from '@/components/landing/DemoPlayground';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { clsx } from 'clsx';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';

// Icons as components for cleaner usage
const Icons = {
  Instagram: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.069-4.85.069-3.204 0-3.584-.012-4.849-.069-3.226-.149-4.771-1.664-4.919-4.919-.058-1.265-.07-1.644-.069-4.849 0-3.204.012-3.583.069-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
  ),
  TikTok: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.9 6.24-1.72 1.33-3.92 1.94-6.07 1.79-2.05-.12-4.1-.96-5.64-2.29-1.5-1.3-2.44-3.15-2.55-5.11-.12-2.15.77-4.21 2.24-5.71 1.54-1.59 3.82-2.36 6-2.13v4.14c-2.25-.56-4.66 1.42-4.48 3.73.1 1.54 1.32 2.8 2.85 2.92 1.6.14 3.04-.92 3.28-2.52.05-.34.05-.69.05-1.03l-.03-14.26z"/></svg>
  ),
  Youtube: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
  ),
  LinkedIn: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
  ),
  Facebook: () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current"><path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z"/></svg>
  )
};

export default function HomePage() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -100]);

  return (
    <div className="min-h-screen bg-surface text-white selection:bg-brand-primary/30 font-sans overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 border-b border-surface-border bg-surface/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-white font-headings font-bold tracking-tight text-xl">
              <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-current translate-x-0.5" />
              </div>
              ReelRelay
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-surface-muted hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/login">
              <Button className="btn-primary h-10 px-6 rounded-xl font-bold text-xs">
                Start Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero: High Energy */}
      <section className="relative pt-40 pb-24 border-b border-surface-border overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.2] pointer-events-none" />
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-brand-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <BackgroundBeams className="opacity-30" />
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Persuasive Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-surface-border bg-surface-card/50 text-[11px] font-semibold text-brand-primary mb-6 uppercase tracking-wider backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                System Operational
              </div>
              <h1 className="text-6xl sm:text-7xl font-headings font-bold tracking-tight mb-8 leading-[1.05] text-white">
                Post Once. <br />
                <span className="text-surface-muted">Publish everywhere.</span>
              </h1>
              <p className="text-xl text-surface-muted leading-relaxed mb-10 max-w-md font-light">
                The ultimate video publishing relay for creators. AI-powered captioning, smart scheduling, and cross-platform growth.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-base btn-primary rounded-xl font-bold shadow-[0_0_40px_rgba(37,99,235,0.2)] transition-transform hover:scale-105">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              <div className="flex gap-12 border-t border-surface-border pt-8">
                <div>
                  <div className="text-4xl font-headings font-bold text-white mb-1">5+</div>
                  <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Platforms</div>
                </div>
                <div>
                  <div className="text-4xl font-headings font-bold text-white mb-1">100%</div>
                  <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Automated</div>
                </div>
              </div>
            </motion.div>

            {/* Right: The Demo */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-brand-primary/20 to-brand-accent/20 rounded-2xl blur-2xl opacity-50" />
              <div className="relative rounded-2xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden">
                <div className="h-10 border-b border-surface-border flex items-center px-4 justify-between bg-surface/30 backdrop-blur-md">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                  </div>
                  <div className="text-[10px] text-surface-muted font-mono tracking-widest">REELRELAY_DASHBOARD</div>
                </div>
                <div className="p-1">
                  <DemoPlayground />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marquee: Platform Trust */}
      <section className="py-12 border-b border-surface-border bg-surface-card/20 overflow-hidden flex items-center">
        <div className="w-32 pl-6 text-xs font-semibold text-surface-muted shrink-0 uppercase tracking-widest z-10">
          RELAY TO
        </div>
        <div className="flex relative overflow-hidden flex-1 mask-gradient-x w-full">
           <div className="flex items-center animate-scroll opacity-50 grayscale hover:grayscale-0 transition-all duration-500 w-max">
             
             {/* GROUP 1 */}
             <div className="flex items-center shrink-0">
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
             </div>

             {/* GROUP 2 */}
             <div className="flex items-center shrink-0">
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-16 pr-16 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
             </div>

           </div>
        </div>
      </section>

      {/* Parallax: Feature Breakdown */}
      <section className="py-32 relative overflow-hidden">
        <BackgroundBeams className="opacity-15" />
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="mb-24">
            <h2 className="text-4xl md:text-5xl font-headings font-bold text-white mb-6">Built for speed.</h2>
            <p className="text-xl text-surface-muted max-w-2xl font-light">Scheduled. Shipped. Done. Every interaction is designed to save you time and maximize reach.</p>
          </div>

          <div className="space-y-32">
            <ParallaxSection 
              align="right"
              title="Intelligence, baked in."
              desc="Our engine writes platform-native captions, hashtags, and descriptions that actually perform. Crisp, confident, and conversion-oriented."
              visual={
                <div className="relative w-full aspect-[4/3] rounded-3xl bg-surface-card border border-surface-border overflow-hidden group">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-accent/5" />
                  
                  {/* Dashboard Interface */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[75%] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col group-hover:scale-[1.02] transition-transform duration-500">
                    {/* Header */}
                    <div className="h-10 border-b border-surface-border bg-surface-card/50 flex items-center px-4 gap-3">
                       <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-error" />
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-warning" />
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-accent" />
                       </div>
                       <div className="h-4 w-px bg-surface-border mx-1" />
                       <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-surface-card">
                         <Sparkles className="w-3 h-3 text-brand-primary" />
                         <span className="text-[10px] font-medium text-surface-muted">Analysis in progress...</span>
                       </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex gap-6 h-full relative">
                      {/* Scanning Line */}
                      <div className="absolute top-10 left-0 right-0 h-[2px] bg-brand-primary/50 blur-[2px] animate-scan opacity-0 group-hover:opacity-100 transition-opacity duration-700" style={{ animationDuration: '3s' }} />

                      {/* Video Preview */}
                      <div className="w-1/3 bg-surface-card rounded-lg border border-surface-border relative overflow-hidden group-hover:border-surface-muted transition-colors shrink-0">
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-surface-border">
                               <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                         </div>
                         <div className="absolute bottom-2 left-2 right-2 h-1 bg-surface-border rounded-full overflow-hidden">
                           <div className="h-full w-[60%] bg-brand-primary" />
                         </div>
                      </div>
                      
                      {/* Analysis Results */}
                      <div className="flex-1 flex flex-col gap-3 min-w-0">
                         <div className="flex items-center justify-between mb-2">
                           <div className="h-2 w-24 bg-surface-border rounded-full" />
                           <div className="h-2 w-12 bg-surface-border rounded-full" />
                         </div>
                         
                         <div className="space-y-2">
                            <div className="h-2 w-full bg-surface-card rounded-full" />
                            <div className="h-2 w-[90%] bg-surface-card rounded-full" />
                            <div className="h-2 w-[95%] bg-surface-card rounded-full" />
                         </div>

                         <div className="mt-auto p-3 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                           <div className="flex items-start gap-2">
                             <div className="mt-0.5">
                               <Sparkles className="w-3 h-3 text-brand-primary" />
                             </div>
                             <p className="text-[10px] text-surface-muted leading-relaxed line-clamp-3">
                               <span className="text-white">"Write captions in a crisp, confident tone..."</span> 🚀 Video-first and conversion-oriented. <span className="text-brand-primary">#ReelRelay</span>
                             </p>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            />

            <ParallaxSection 
              align="left"
              title="Universal reach."
              desc="Don't limit your content to one feed. We reformat and optimize your video for Reels, TikTok, Shorts, and LinkedIn automatically."
              visual={
                <div className="relative w-full aspect-[4/3] rounded-3xl bg-surface-card border border-surface-border overflow-hidden flex items-center justify-center p-12 group">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05),transparent_70%)]" />
                  <div className="absolute inset-0 bg-grid opacity-20" />
                  
                  {/* Center Hub */}
                  <div className="relative z-10 w-24 h-24 bg-surface rounded-2xl border border-surface-border shadow-[0_0_30px_rgba(37,99,235,0.1)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl animate-pulse" />
                    <Zap className="w-10 h-10 text-brand-primary" />
                  </div>

                  {/* Platform Satellites */}
                  <div className="absolute top-[15%] left-[15%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500 z-10">
                     <Icons.TikTok />
                  </div>
                  <div className="absolute top-[15%] right-[15%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-500 z-10">
                     <Icons.Instagram />
                  </div>
                  <div className="absolute bottom-[15%] left-[15%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500 z-10">
                     <Icons.Youtube />
                  </div>
                  <div className="absolute bottom-[15%] right-[15%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-500 z-10">
                     <Icons.LinkedIn />
                  </div>
                </div>
              }
            />
          </div>
        </div>
      </section>

      {/* Bento Grid: Clean & Modern */}
      <section className="py-32 border-y border-surface-border bg-surface-card/20">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="mb-16 md:flex justify-between items-end">
            <div className="max-w-xl">
              <h2 className="text-4xl font-headings font-bold text-white mb-6">Everything you need.</h2>
              <p className="text-xl text-surface-muted font-light">Power tools for the modern creator. Built to handle your entire workflow from upload to analysis.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard 
              title="Cloud Vault"
              desc="Unlimited storage for your source files. Access them anywhere, anytime. Secure and redundant."
              icon={Cloud}
              className="md:col-span-2"
            />
            <BentoCard 
              title="Smart Queue"
              desc="Drag-and-drop calendar for visual planning. Scheduled. Shipped. Done."
              icon={Calendar}
            />
            <BentoCard 
              title="Analytics"
              desc="Unified view of your performance across all channels in real-time."
              icon={BarChart3}
            />
            <BentoCard 
              title="Team Access"
              desc="Invite editors to manage your pipeline. Granular permissions and roles."
              icon={Users}
              className="md:col-span-2"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-6 relative overflow-hidden">
        <BackgroundBeams className="opacity-15" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-headings font-bold text-white mb-4">Simple, transparent pricing.</h2>
            <p className="text-surface-muted mb-8">No hidden fees. 7-day free trial on all plans.</p>
            
            {/* Toggle */}
            <div className="inline-flex items-center p-1 bg-surface-card rounded-full border border-surface-border">
              <button
                onClick={() => setIsAnnual(false)}
                className={clsx(
                  "px-6 py-2 rounded-full text-sm font-semibold transition-all",
                  !isAnnual ? "bg-brand-primary text-white shadow-sm" : "text-surface-muted hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={clsx(
                  "px-6 py-2 rounded-full text-sm font-semibold transition-all",
                  isAnnual ? "bg-brand-primary text-white shadow-sm" : "text-surface-muted hover:text-white"
                )}
              >
                Annual <span className="text-brand-accent text-xs ml-1 font-bold">-20%</span>
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 relative overflow-hidden group hover:border-surface-muted transition-all shadow-2xl">
              <div className="absolute top-0 right-0 p-4">
                <div className="px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-wider">
                  Launch Offer
                </div>
              </div>
              
              <h3 className="text-xl font-headings font-bold text-white mb-2">Pro Creator</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-headings font-bold text-white">${isAnnual ? '290' : '29'}</span>
                <span className="text-surface-muted">/{isAnnual ? 'year' : 'mo'}</span>
              </div>
              
              <Link href="/login" className="block mb-8">
                <Button size="lg" className="w-full btn-primary h-12 rounded-xl transition-transform active:scale-95">
                  Start Trial
                </Button>
                <div className="text-center text-[10px] text-surface-muted mt-3 font-medium">
                  Then ${isAnnual ? '290/year' : '29/mo'}. Cancel anytime.
                </div>
              </Link>

              <div className="space-y-4">
                <PricingFeature text="Connect up to 5 profiles" subtext="IG, FB, LinkedIn, TikTok, YouTube" />
                <PricingFeature text="AI Caption Generation" subtext="Multiple viral options per platform" />
                <PricingFeature text="Smart Scheduling & Queue" subtext="Scheduled. Shipped. Done." />
                <PricingFeature text="Unlimited Publishing" subtext="Fair use for individuals & small teams" />
                <PricingFeature text="Analytics Dashboard" subtext="Track performance across channels" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-surface-border bg-surface">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 text-xs text-surface-muted font-medium uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold tracking-tight normal-case text-lg">ReelRelay</span> © 2026
          </div>
          <div className="flex gap-12">
            <a href="#" className="hover:text-white transition-colors">TikTok</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ParallaxSection({ align, title, desc, visual }: { align: 'left' | 'right', title: string, desc: string, visual: React.ReactNode }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className={clsx("grid md:grid-cols-2 gap-16 items-center", align === 'left' ? "direction-rtl" : "")}>
      <motion.div 
        className={clsx(align === 'left' ? "md:order-2" : "")}
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.8 }}
      >
        <h3 className="text-3xl font-headings font-bold text-white mb-6">{title}</h3>
        <p className="text-lg text-surface-muted leading-relaxed font-light">{desc}</p>
      </motion.div>
      <motion.div 
        className={clsx(align === 'left' ? "md:order-1" : "")}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {visual}
      </motion.div>
    </div>
  );
}

function BentoCard({ title, desc, icon: Icon, className }: { title: string, desc: string, icon: any, className?: string }) {
  return (
    <div className={clsx("relative bg-surface-card/40 p-8 rounded-3xl border border-surface-border hover:border-surface-muted transition-all duration-300 group overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative h-full flex flex-col justify-between z-10">
        <div className="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center mb-6 text-surface-muted group-hover:text-white group-hover:scale-110 group-hover:border-surface-muted transition-all duration-300 shadow-inner">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-headings font-bold text-xl text-white mb-3 tracking-tight">{title}</h3>
          <p className="text-sm text-surface-muted leading-relaxed font-light">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ text, subtext }: { text: string, subtext?: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
      </div>
      <div>
        <div className="text-sm font-medium text-white">{text}</div>
        {subtext && <div className="text-xs text-surface-muted mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}
