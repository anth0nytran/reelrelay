'use client';

import { Cloud, Calendar, BarChart3, Users, Sparkles, Play, Zap, Check } from 'lucide-react';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DemoPlayground from '@/components/landing/DemoPlayground';
import { BackgroundBeams } from '@/components/ui/background-beams';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Icons } from '@/components/ui/icons';
import { clsx } from 'clsx';
import { motion, useInView } from 'framer-motion';

export default function HomePage() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-white selection:bg-brand-primary/30 font-sans overflow-x-hidden">
      
      {/* Navigation */}
      <Navbar />

      {/* Hero: High Energy */}
      <section className="relative pt-40 pb-24 border-b border-surface-border overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-[0.4] pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-brand-primary/10 to-transparent rounded-full blur-[100px] pointer-events-none opacity-50" />
        <BackgroundBeams className="opacity-20" />
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Persuasive Copy */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/20 bg-brand-primary/10 text-[11px] font-semibold text-brand-primary mb-6 uppercase tracking-wider backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                System Operational
              </div>
              <h1 className="text-5xl sm:text-7xl font-headings font-bold tracking-tight mb-8 leading-[1.05] text-white">
                Post Once. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-surface-muted">Publish Everywhere.</span>
              </h1>
              <p className="text-lg sm:text-xl text-surface-muted leading-relaxed mb-10 max-w-md font-light">
                The ultimate video publishing relay for creators. AI-powered captioning, smart scheduling, and cross-platform growth.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-base btn-primary rounded-xl font-bold shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:shadow-[0_0_60px_rgba(37,99,235,0.4)] transition-all hover:scale-105">
                    Start Free Trial
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" className="h-14 px-8 text-base btn-ghost border border-surface-border rounded-xl font-medium hover:bg-surface-card">
                    How it works
                  </Button>
                </Link>
              </div>

              <div className="flex gap-12 border-t border-surface-border pt-8">
                <div>
                  <div className="text-3xl font-headings font-bold text-white mb-1">5+</div>
                  <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Platforms</div>
                </div>
                <div>
                  <div className="text-3xl font-headings font-bold text-white mb-1">100%</div>
                  <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Automated</div>
                </div>
                <div>
                  <div className="text-3xl font-headings font-bold text-white mb-1">24/7</div>
                  <div className="text-xs text-surface-muted uppercase tracking-wider font-semibold">Uptime</div>
                </div>
              </div>
            </motion.div>

            {/* Right: The Demo */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative perspective-1000"
            >
              <div className="absolute -inset-1 bg-gradient-to-tr from-brand-primary/20 to-brand-accent/20 rounded-2xl blur-2xl opacity-40" />
              <div className="relative rounded-2xl border border-surface-border bg-surface-card/80 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-white/5">
                <div className="h-10 border-b border-surface-border flex items-center px-4 justify-between bg-surface/50 backdrop-blur-md">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                    <div className="w-3 h-3 rounded-full bg-surface-border" />
                  </div>
                  <div className="text-[10px] text-surface-muted font-mono tracking-widest opacity-50">REELRELAY_DASHBOARD</div>
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
          Relay To
        </div>
        <div className="flex relative overflow-hidden flex-1 mask-gradient-x w-full group">
           <div className="flex items-center animate-scroll opacity-60 grayscale hover:grayscale-0 transition-all duration-700 w-max hover:opacity-100">
             
             {/* GROUP 1 */}
             <div className="flex items-center shrink-0">
               <div className="flex gap-24 pr-24 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-24 pr-24 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-24 pr-24 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
             </div>

             {/* GROUP 2 */}
             <div className="flex items-center shrink-0">
               <div className="flex gap-24 pr-24 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-24 pr-24 items-center">
                 <Icons.Instagram />
                 <Icons.TikTok />
                 <Icons.Youtube />
                 <Icons.LinkedIn />
                 <Icons.Facebook />
               </div>
               <div className="flex gap-24 pr-24 items-center">
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
      <section id="features" className="py-32 relative overflow-hidden">
        <BackgroundBeams className="opacity-10" />
        <div className="max-w-[1400px] mx-auto px-6 relative z-10">
          <div className="mb-32 text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-headings font-bold text-white mb-6">Built for speed.</h2>
            <p className="text-xl text-surface-muted font-light">Scheduled. Shipped. Done. Every interaction is designed to save you time and maximize reach.</p>
          </div>

          <div className="space-y-40">
            <ParallaxSection 
              align="right"
              title="Intelligence, baked in."
              desc="Our engine writes platform-native captions, hashtags, and descriptions that actually perform. Crisp, confident, and conversion-oriented."
              visual={
                <div className="relative w-full aspect-[16/10] rounded-3xl bg-surface-card border border-surface-border overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px]" />
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-accent/5" />
                  
                  {/* Dashboard Interface */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[75%] bg-surface border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col group-hover:scale-[1.02] transition-transform duration-700">
                    {/* Header */}
                    <div className="h-10 border-b border-surface-border bg-surface-card/50 flex items-center px-4 gap-3">
                       <div className="flex gap-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-error/50" />
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-warning/50" />
                         <div className="w-2.5 h-2.5 rounded-full bg-brand-accent/50" />
                       </div>
                       <div className="h-4 w-px bg-surface-border mx-1" />
                       <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-surface-card border border-surface-border/50">
                         <Sparkles className="w-3 h-3 text-brand-primary" />
                         <span className="text-[10px] font-medium text-surface-muted">AI Analysis</span>
                       </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6 flex gap-6 h-full relative">
                      {/* Scanning Line */}
                      <div className="absolute top-10 left-0 right-0 h-[2px] bg-brand-primary/50 blur-[2px] animate-scan opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                      {/* Video Preview */}
                      <div className="w-1/3 bg-surface-card rounded-lg border border-surface-border relative overflow-hidden group-hover:border-surface-muted transition-colors shrink-0">
                         <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-surface-border group-hover:scale-110 transition-transform">
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

                         <div className="mt-auto p-4 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                           <div className="flex items-start gap-3">
                             <div className="mt-0.5 p-1 bg-brand-primary/20 rounded">
                               <Sparkles className="w-3 h-3 text-brand-primary" />
                             </div>
                             <p className="text-xs text-surface-muted leading-relaxed line-clamp-3">
                               <span className="text-white font-medium">Suggestion:</span> Write captions in a crisp, confident tone. Video-first and conversion-oriented. <span className="text-brand-primary">#ReelRelay</span>
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
                <div className="relative w-full aspect-[16/10] rounded-3xl bg-surface-card border border-surface-border overflow-hidden flex items-center justify-center p-12 group shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.05),transparent_70%)]" />
                  <div className="absolute inset-0 bg-grid opacity-20" />
                  
                  {/* Center Hub */}
                  <div className="relative z-10 w-24 h-24 bg-surface rounded-2xl border border-surface-border shadow-[0_0_50px_rgba(37,99,235,0.15)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                    <div className="absolute inset-0 bg-brand-primary/10 rounded-2xl animate-pulse" />
                    <Zap className="w-10 h-10 text-brand-primary" />
                  </div>

                  {/* Platform Satellites */}
                  <div className="absolute top-[20%] left-[20%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500 z-10 hover:border-brand-primary/50 cursor-default">
                     <Icons.TikTok />
                  </div>
                  <div className="absolute top-[20%] right-[20%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:-translate-x-2 group-hover:translate-y-2 transition-transform duration-500 z-10 hover:border-brand-primary/50 cursor-default">
                     <Icons.Instagram />
                  </div>
                  <div className="absolute bottom-[20%] left-[20%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-500 z-10 hover:border-brand-primary/50 cursor-default">
                     <Icons.Youtube />
                  </div>
                  <div className="absolute bottom-[20%] right-[20%] w-16 h-16 bg-surface rounded-xl border border-surface-border flex items-center justify-center shadow-lg group-hover:-translate-x-2 group-hover:-translate-y-2 transition-transform duration-500 z-10 hover:border-brand-primary/50 cursor-default">
                     <Icons.LinkedIn />
                  </div>
                  
                  {/* Connecting Lines (Simulated) */}
                  <svg className="absolute inset-0 pointer-events-none opacity-20" width="100%" height="100%">
                    <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="white" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="white" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="white" strokeDasharray="4 4" />
                    <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="white" strokeDasharray="4 4" />
                  </svg>
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
      <section id="pricing" className="py-32 px-6 relative overflow-hidden">
        <BackgroundBeams className="opacity-15" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-headings font-bold text-white mb-6">Simple, transparent pricing.</h2>
            <p className="text-surface-muted mb-10 text-lg">No hidden fees. 14-day free trial on all plans.</p>
            
            {/* Toggle */}
            <div className="inline-flex items-center p-1 bg-surface-card rounded-full border border-surface-border">
              <button
                onClick={() => setIsAnnual(false)}
                className={clsx(
                  "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                  !isAnnual ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25" : "text-surface-muted hover:text-white"
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={clsx(
                  "px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300",
                  isAnnual ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25" : "text-surface-muted hover:text-white"
                )}
              >
                Annual <span className="text-brand-accent text-[10px] ml-1.5 font-bold tracking-wide uppercase">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 relative overflow-hidden group hover:border-surface-muted transition-all duration-300 shadow-2xl hover:shadow-[0_0_40px_rgba(37,99,235,0.1)]">
              <div className="absolute top-0 right-0 p-4">
                <div className="px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[10px] font-bold uppercase tracking-wider">
                  Launch Offer
                </div>
              </div>
              
              <h3 className="text-xl font-headings font-bold text-white mb-2">Pro Creator</h3>
              <div className="flex items-baseline gap-1 mb-8">
                <span className="text-5xl font-headings font-bold text-white tracking-tight">${isAnnual ? '290' : '29'}</span>
                <span className="text-surface-muted font-medium">/{isAnnual ? 'year' : 'mo'}</span>
              </div>
              
              <Link href="/login" className="block mb-8">
                <Button size="lg" className="w-full btn-primary h-12 rounded-xl text-sm font-bold tracking-wide transition-transform active:scale-95 shadow-lg shadow-brand-primary/20">
                  Start 14-Day Free Trial
                </Button>
                <div className="text-center text-[10px] text-surface-muted mt-3 font-medium">
                  Then ${isAnnual ? '290/year' : '29/mo'}. Cancel anytime.
                </div>
              </Link>

              <div className="space-y-4 pt-4 border-t border-surface-border/50">
                <PricingFeature text="Connect up to 5 profiles" subtext="IG, FB, LinkedIn, TikTok, YouTube" />
                <PricingFeature text="AI Caption Generation" subtext="Multiple viral options per platform" />
                <PricingFeature text="Smart Scheduling & Queue" subtext="Drag & drop calendar" />
                <PricingFeature text="Unlimited Publishing" subtext="Fair use for individuals & small teams" />
                <PricingFeature text="Analytics Dashboard" subtext="Track performance across channels" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
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
        <h3 className="text-3xl md:text-4xl font-headings font-bold text-white mb-6 leading-tight">{title}</h3>
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
    <div className={clsx("relative bg-surface-card/40 p-8 rounded-3xl border border-surface-border hover:border-surface-muted/50 transition-all duration-500 group overflow-hidden hover:shadow-2xl hover:shadow-brand-primary/5", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative h-full flex flex-col justify-between z-10">
        <div className="w-12 h-12 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mb-6 text-surface-muted group-hover:text-white group-hover:scale-110 group-hover:border-surface-muted group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-all duration-500 shadow-inner">
          <Icon size={24} strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="font-headings font-bold text-xl text-white mb-3 tracking-tight group-hover:translate-x-1 transition-transform duration-300">{title}</h3>
          <p className="text-sm text-surface-muted leading-relaxed font-light">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ text, subtext }: { text: string, subtext?: string }) {
  return (
    <div className="flex items-start gap-3 group">
      <div className="w-5 h-5 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-brand-primary/20 transition-colors">
        <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
      </div>
      <div>
        <div className="text-sm font-medium text-white group-hover:text-white/90 transition-colors">{text}</div>
        {subtext && <div className="text-xs text-surface-muted mt-0.5 group-hover:text-surface-muted/80 transition-colors">{subtext}</div>}
      </div>
    </div>
  );
}
