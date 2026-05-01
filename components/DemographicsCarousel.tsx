/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DEMOGRAPHICS CAROUSEL - AWWWARDS-GRADE GSAP ANIMATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Architecture: Seamless Loop with GSAP ScrollTrigger
 * Performance: Hardware-accelerated transforms, 60fps
 * UX: Smooth transitions, intuitive navigation, section previews
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronLeft, ChevronRight, Calendar, User, MapPin, Activity, FileText, Shield, ClipboardList, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface DemographicsSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  children: React.ReactNode;
}

interface DemographicsCarouselProps {
  sections: DemographicsSection[];
  isEditMode: boolean;
}

export function DemographicsCarousel({ sections, isEditMode }: DemographicsCarouselProps) {
  const galleryRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const seamlessLoopRef = useRef<gsap.core.Timeline | null>(null);
  const scrubRef = useRef<gsap.core.Tween | null>(null);
  const iterationRef = useRef(0);

  const spacing = 0.1;
  const snap = gsap.utils.snap(spacing);

  // Build seamless loop animation
  const buildSeamlessLoop = useCallback((items: HTMLElement[], spacing: number) => {
    const overlap = Math.ceil(1 / spacing);
    const startTime = items.length * spacing + 0.5;
    const loopTime = (items.length + overlap) * spacing + 1;
    const rawSequence = gsap.timeline({ paused: true });
    const seamlessLoop = gsap.timeline({
      paused: true,
      repeat: -1,
      onRepeat() {
        // @ts-ignore
        this._time === this._dur && (this._tTime += this._dur - 0.01);
      }
    });

    const l = items.length + overlap * 2;

    // Set initial state
    gsap.set(items, { xPercent: 400, opacity: 0, scale: 0.85 });

    // Create staggered animations
    for (let i = 0; i < l; i++) {
      const index = i % items.length;
      const item = items[index];
      const time = i * spacing;

      rawSequence
        .fromTo(
          item,
          { scale: 0.85, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            zIndex: 100,
            duration: 0.5,
            yoyo: true,
            repeat: 1,
            ease: 'power2.inOut',
            immediateRender: false
          },
          time
        )
        .fromTo(
          item,
          { xPercent: 400 },
          {
            xPercent: -400,
            duration: 1,
            ease: 'none',
            immediateRender: false
          },
          time
        );

      if (i <= items.length) {
        seamlessLoop.add('label' + i, time);
      }
    }

    rawSequence.time(startTime);
    seamlessLoop
      .to(rawSequence, {
        time: loopTime,
        duration: loopTime - startTime,
        ease: 'none'
      })
      .fromTo(
        rawSequence,
        { time: overlap * spacing + 1 },
        {
          time: startTime,
          duration: startTime - (overlap * spacing + 1),
          immediateRender: false,
          ease: 'none'
        }
      );

    return seamlessLoop;
  }, []);

  // Initialize GSAP animation
  useEffect(() => {
    if (!cardsRef.current) return;

    const cards = gsap.utils.toArray<HTMLElement>('.demo-card');
    if (cards.length === 0) return;

    // Fade in cards
    gsap.to('.demo-card', { opacity: 1, delay: 0.1, stagger: 0.05 });

    const seamlessLoop = buildSeamlessLoop(cards, spacing);
    seamlessLoopRef.current = seamlessLoop;

    const scrub = gsap.to(seamlessLoop, {
      totalTime: 0,
      duration: 0.5,
      ease: 'power3',
      paused: true
    });
    scrubRef.current = scrub;

    return () => {
      seamlessLoop.kill();
      scrub.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [buildSeamlessLoop, spacing, sections.length]);

  // Navigation functions
  const scrubTo = useCallback((totalTime: number) => {
    if (!seamlessLoopRef.current || !scrubRef.current) return;

    const seamlessLoop = seamlessLoopRef.current;
    const scrub = scrubRef.current;
    const iteration = iterationRef.current;

    let progress = (totalTime - seamlessLoop.duration() * iteration) / seamlessLoop.duration();

    if (progress > 1) {
      iterationRef.current++;
      progress = 0;
    } else if (progress < 0) {
      iterationRef.current--;
      if (iterationRef.current < 0) {
        iterationRef.current = 9;
        seamlessLoop.totalTime(seamlessLoop.totalTime() + seamlessLoop.duration() * 10);
      }
      progress = 1;
    }

    scrub.vars.totalTime = snap(totalTime);
    scrub.invalidate().restart();
  }, [snap]);

  const handleNext = useCallback(() => {
    if (isAnimating || !scrubRef.current) return;
    setIsAnimating(true);
    const nextIndex = (currentIndex + 1) % sections.length;
    setCurrentIndex(nextIndex);
    scrubTo(scrubRef.current.vars.totalTime + spacing);
    setTimeout(() => setIsAnimating(false), 500);
  }, [currentIndex, sections.length, spacing, scrubTo, isAnimating]);

  const handlePrev = useCallback(() => {
    if (isAnimating || !scrubRef.current) return;
    setIsAnimating(true);
    const prevIndex = currentIndex === 0 ? sections.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    scrubTo(scrubRef.current.vars.totalTime - spacing);
    setTimeout(() => setIsAnimating(false), 500);
  }, [currentIndex, sections.length, spacing, scrubTo, isAnimating]);

  const nextSection = sections[(currentIndex + 1) % sections.length];
  const prevSection = sections[currentIndex === 0 ? sections.length - 1 : currentIndex - 1];

  return (
    <div ref={galleryRef} className="relative w-full h-[520px] overflow-hidden">
      {/* Cards Container */}
      <ul ref={cardsRef} className="absolute w-full h-[420px] top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2">
        {sections.map((section, index) => (
          <li
            key={section.id}
            className="demo-card absolute top-0 left-0 w-full h-full opacity-0"
            style={{ listStyle: 'none' }}
          >
            <div className="w-full h-full flex items-center justify-center px-8">
              <div className="w-full max-w-[580px] h-full bg-white rounded-3xl border-2 border-slate-200/60 shadow-2xl shadow-slate-900/10 overflow-hidden">
                {/* Card Header */}
                <div
                  className="px-6 py-4 border-b border-slate-100"
                  style={{
                    background: `linear-gradient(135deg, ${section.color}15 0%, ${section.color}05 100%)`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${section.color}20` }}
                    >
                      <section.icon className="w-5 h-5" style={{ color: section.color }} />
                    </div>
                    <div>
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                        {section.title}
                      </h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                        Section {index + 1} of {sections.length}
                      </p>
                    </div>
                    {isEditMode && (
                      <div className="ml-auto">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                            Editing
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Content */}
                <div className="h-[calc(100%-80px)] overflow-y-auto p-6">
                  {section.children}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Navigation Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-3">
          {/* Previous Button */}
          <motion.button
            onClick={handlePrev}
            disabled={isAnimating}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/30"
          >
            <ChevronLeft className="w-5 h-5" />
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                Previous
              </span>
              <span className="text-xs font-black uppercase tracking-tight">
                {prevSection.title}
              </span>
            </div>
          </motion.button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
            {sections.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'w-8 bg-slate-900'
                    : 'w-1.5 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <motion.button
            onClick={handleNext}
            disabled={isAnimating}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/30"
          >
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">
                Next
              </span>
              <span className="text-xs font-black uppercase tracking-tight">
                {nextSection.title}
              </span>
            </div>
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Keyboard Hint */}
      <AnimatePresence>
        {!isAnimating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-6 right-6 flex items-center gap-2 px-3 py-2 bg-slate-900/90 backdrop-blur-sm text-white rounded-lg text-[10px] font-bold uppercase tracking-wider"
          >
            <span className="opacity-60">Use</span>
            <kbd className="px-2 py-0.5 bg-white/20 rounded">←</kbd>
            <kbd className="px-2 py-0.5 bg-white/20 rounded">→</kbd>
            <span className="opacity-60">to navigate</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
