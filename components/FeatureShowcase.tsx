'use client';

import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Slide {
  readonly id: number;
  readonly title: string[];
  readonly description: string;
  readonly buttonText: string;
  readonly buttonLink: string;
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly gradient: string;
  readonly accentColor: string;
}

const SLIDES: readonly Slide[] = [
  {
    id: 1,
    title: ['Real-Time', 'Intelligence'],
    description: 'Monitor TB screening operations across all facilities with live data synchronization and instant breach alerts.',
    buttonText: 'View Analytics',
    buttonLink: '/dashboard/vertex',
    icon: Activity,
    gradient: 'from-blue-500 to-indigo-600',
    accentColor: 'bg-blue-500',
  },
  {
    id: 2,
    title: ['Predictive', 'Insights'],
    description: 'AI-powered risk assessment and patient triage with neural network visualization for data-driven decisions.',
    buttonText: 'Explore Pipeline',
    buttonLink: '/dashboard/follow-up',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-purple-600',
    accentColor: 'bg-indigo-500',
  },
  {
    id: 3,
    title: ['Secure', 'Infrastructure'],
    description: 'Enterprise-grade security with role-based access control, PII protection, and comprehensive audit trails.',
    buttonText: 'Learn More',
    buttonLink: '/docs',
    icon: Shield,
    gradient: 'from-purple-500 to-pink-600',
    accentColor: 'bg-purple-500',
  },
] as const;

const ProgressBar = memo<{ isActive: boolean; accentColor: string }>(({ isActive, accentColor }) => (
  <motion.div
    className={`absolute top-0 left-0 h-1 ${accentColor} opacity-60`}
    initial={{ scaleX: 0 }}
    animate={{ scaleX: isActive ? 1 : 0 }}
    transition={{ duration: 5, ease: 'linear' }}
    style={{ transformOrigin: '0% 50%' }}
  />
));

ProgressBar.displayName = 'ProgressBar';

const SlideNumber = memo<{ number: number; isActive: boolean; isEven: boolean }>(
  ({ number, isActive, isEven }) => (
    <motion.div
      initial={{ opacity: 0, x: isEven ? 40 : -40 }}
      animate={{
        opacity: isActive ? 1 : 0,
        x: isActive ? 0 : isEven ? 40 : -40,
      }}
      transition={{ duration: 0.4, delay: isActive ? 0.45 : 0 }}
      className={`absolute ${isEven ? 'right-[5%]' : 'left-[5%]'} top-[calc(50%+6rem)] font-mono text-sm font-semibold tracking-wider z-10 ${isEven ? 'text-slate-900' : 'text-white'}`}
    >
      <div className="relative">
        <div className={`absolute left-1/2 -translate-x-1/2 bottom-10 w-px h-16 ${isEven ? 'bg-slate-900' : 'bg-white'}`} />
        0{number}
      </div>
    </motion.div>
  )
);

SlideNumber.displayName = 'SlideNumber';

const SlideDate = memo<{ isActive: boolean; isEven: boolean }>(({ isActive, isEven }) => {
  const [time, setTime] = useState('--:--');
  const [date, setDate] = useState('-- --- ----');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      setDate(now.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? 0 : 40, rotate: -90 }}
      animate={{
        opacity: isActive ? 1 : 0,
        x: isActive ? 0 : isEven ? 0 : 40,
        rotate: -90,
      }}
      transition={{ duration: 0.4, delay: isActive ? 0.45 : 0 }}
      className={`absolute ${isEven ? 'left-[5.5%]' : 'left-[95%]'} top-[83%] font-mono text-xs font-medium tracking-[0.15em] origin-left ${isEven ? 'text-slate-900' : 'text-white'}`}
    >
      <div className="flex items-center gap-6">
        <div className={`w-16 h-px ${isEven ? 'bg-slate-900' : 'bg-white'}`} />
        <span>
          {date}
          <span className="opacity-25 ml-2">{time}</span>
        </span>
      </div>
    </motion.div>
  );
});

SlideDate.displayName = 'SlideDate';

export const FeatureShowcase = memo(() => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goToSlide = useCallback((index: number) => {
    if (!isTransitioning && index !== activeIndex) {
      setIsTransitioning(true);
      setActiveIndex(index);
      setTimeout(() => setIsTransitioning(false), 2000);
    }
  }, [activeIndex, isTransitioning]);

  useEffect(() => {
    const interval = setInterval(() => {
      goToSlide((activeIndex + 1) % SLIDES.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activeIndex, goToSlide]);

  const activeSlide = SLIDES[activeIndex];
  const isEven = activeIndex % 2 === 0;

  return (
    <div className="relative w-full h-[600px] overflow-hidden rounded-[2rem]">
      {/* Neon Glow Border */}
      <div className="absolute inset-0 rounded-[2rem] p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse" style={{ animationDuration: '3s' }}>
        <div className="absolute inset-0 rounded-[2rem] bg-slate-50" />
      </div>

      {/* Outer Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-[2rem] blur-xl" />

      {/* Background Slides */}
      <div className="absolute inset-[2px] rounded-[2rem] overflow-hidden">
        {SLIDES.map((slide, index) => (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: index === activeIndex ? 1 : 0 }}
            transition={{ duration: 0.3, delay: index === activeIndex ? 0.4 : 0 }}
            className={`absolute inset-0 ${isEven ? 'bg-white' : 'bg-slate-900'}`}
          >
            <ProgressBar isActive={index === activeIndex} accentColor={slide.accentColor} />

            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${slide.gradient} opacity-5`} />

            {/* Decorative Pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Card */}
      <div className="absolute inset-[2px] flex items-center justify-center p-12 rounded-[2rem]">
        <div className="relative w-full max-w-5xl h-full">
          {/* Inner Card with Neon Border */}
          <div className="absolute inset-0 rounded-[2rem] p-[1px] bg-gradient-to-br from-blue-400/50 via-purple-400/50 to-pink-400/50">
            <div className="w-full h-full bg-white/80 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_80px_rgba(139,92,246,0.3)] relative overflow-hidden">
              {/* Animated Border Glow */}
              <div className="absolute inset-0 rounded-[2rem] opacity-50">
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" style={{ animationDuration: '2s' }} />
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" style={{ animationDuration: '2s', animationDelay: '1s' }} />
                <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-pink-400 to-transparent animate-pulse" style={{ animationDuration: '2s', animationDelay: '0.5s' }} />
                <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-indigo-400 to-transparent animate-pulse" style={{ animationDuration: '2s', animationDelay: '1.5s' }} />
              </div>
              {/* Slide Numbers */}
              {SLIDES.map((slide, index) => (
                <SlideNumber
                  key={`number-${slide.id}`}
                  number={slide.id}
                  isActive={index === activeIndex}
                  isEven={isEven}
                />
              ))}

              {/* Slide Dates */}
              {SLIDES.map((slide, index) => (
                <SlideDate
                  key={`date-${slide.id}`}
                  isActive={index === activeIndex}
                  isEven={isEven}
                />
              ))}

              {/* Icon Section */}
              <div className="absolute left-0 top-0 w-[45%] h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0, scale: 0.8, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: -40 }}
                    transition={{ duration: 0.6, delay: 0.5, type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative"
                  >
                    {/* Icon Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${activeSlide.gradient} opacity-30 blur-3xl rounded-full scale-150`} />

                    {/* Icon Container with Neon Border */}
                    <div className="relative w-48 h-48 rounded-3xl p-[2px] bg-gradient-to-br from-white via-blue-200 to-purple-200">
                      <div className={`w-full h-full rounded-3xl bg-gradient-to-br ${activeSlide.gradient} flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.6)]`}>
                        <div className="absolute inset-0 bg-white/20 rounded-3xl" />
                        <activeSlide.icon className="w-24 h-24 text-white relative z-10" />
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Content Section */}
              <div className="absolute right-0 top-0 w-[55%] h-full flex flex-col justify-center px-12">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-8"
                  >
                    {/* Title */}
                    <div className="space-y-2">
                      {activeSlide.title.map((line, i) => (
                        <div key={i} className="relative inline-block">
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5, delay: 0.8 + i * 0.1, ease: 'easeOut' }}
                            className={`absolute inset-0 bg-gradient-to-r ${activeSlide.gradient} opacity-20 -z-10 -left-4 -right-4`}
                            style={{ transformOrigin: '100% 50%' }}
                          />
                          <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
                            className="text-5xl font-black text-slate-900 tracking-tight"
                          >
                            {line}
                          </motion.h2>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.9 }}
                      className="text-base text-slate-600 leading-relaxed"
                    >
                      {activeSlide.description}
                    </motion.p>

                    {/* Button with Neon Glow */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 1 }}
                    >
                      <Link href={activeSlide.buttonLink}>
                        <motion.button
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.98 }}
                          className="group relative px-8 py-4 rounded-xl overflow-hidden"
                        >
                          {/* Neon Border */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${activeSlide.gradient} opacity-100 rounded-xl`} />
                          <div className="absolute inset-[2px] bg-slate-900 rounded-[10px]" />

                          {/* Glow Effect */}
                          <div className={`absolute inset-0 bg-gradient-to-r ${activeSlide.gradient} opacity-50 blur-xl`} />

                          {/* Hover Overlay */}
                          <motion.div
                            className={`absolute inset-[2px] bg-gradient-to-r ${activeSlide.gradient} rounded-[10px]`}
                            initial={{ scaleX: 0 }}
                            whileHover={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                            style={{ transformOrigin: '0% 50%' }}
                          />

                          <span className="relative z-10 flex items-center gap-2 text-white font-semibold text-sm uppercase tracking-wider">
                            {activeSlide.buttonText}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </motion.button>
                      </Link>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                {/* Slide Indicators with Glow */}
                <div className="absolute bottom-12 right-12 flex gap-3">
                  {SLIDES.map((slide, index) => (
                    <button
                      key={slide.id}
                      onClick={() => goToSlide(index)}
                      className="relative group"
                      aria-label={`Go to slide ${slide.id}`}
                    >
                      {index === activeIndex && (
                        <div className={`absolute inset-0 ${slide.accentColor} opacity-50 blur-md rounded-full scale-150`} />
                      )}
                      <div
                        className={`relative w-2 h-2 rounded-full transition-all duration-300 ${index === activeIndex
                            ? `${slide.accentColor} w-8 shadow-[0_0_20px_currentColor]`
                            : 'bg-slate-300 hover:bg-slate-400 group-hover:shadow-[0_0_10px_currentColor]'
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

FeatureShowcase.displayName = 'FeatureShowcase';
