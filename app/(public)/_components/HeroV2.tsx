"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, ChevronDown, Sparkles } from "lucide-react";

// Floating particle component
function Particle({ x, y, size, duration, delay }: {
  x: number; y: number; size: number; duration: number; delay: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full bg-white pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1, 0.5],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// Horizontal marquee ticker
const TICKER_ITEMS = [
  "🏥 50,000+ Lives Impacted",
  "🗺️ 28 States Reached",
  "📚 200+ Training Modules",
  "⭐ 92% Satisfaction Rate",
  "🤝 500+ Staff Members",
  "🏆 15+ Years of Impact",
  "🔬 TB Screening Certified",
  "💊 HIV/AIDS Prevention",
];

export function HeroV2() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const [particles] = useState(() =>
    Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 4 + 3,
      delay: Math.random() * 4,
    }))
  );

  // Parallax
  const y = useTransform(scrollY, [0, 500], [0, 150]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);
  const scale = useTransform(scrollY, [0, 500], [1, 0.92]);

  // GSAP — y only, never opacity
  useEffect(() => {
    (async () => {
      try {
        const { gsap } = await import("gsap");
        if (!containerRef.current) return;
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({ delay: 0.15 });
          tl.from(".hero-headline", {
            y: 90,
            duration: 1.1,
            stagger: 0.14,
            ease: "power4.out",
            clearProps: "transform",
          })
          .from(".hero-sub", {
            y: 35,
            duration: 0.9,
            ease: "power3.out",
            clearProps: "transform",
          }, "-=0.5")
          .from(".hero-cta-item", {
            y: 28,
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out",
            clearProps: "transform",
          }, "-=0.5")
          .from(".hero-stat-bar", {
            y: 22,
            duration: 0.7,
            ease: "power2.out",
            clearProps: "transform",
          }, "-=0.4");
        }, containerRef);
        return () => ctx.revert();
      } catch (e) {
        // silent — content always visible
      }
    })();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "#020209" }}
    >
      {/* ══ BACKGROUND SYSTEM ══ */}
      <div className="absolute inset-0 z-0 pointer-events-none">

        {/* Base gradient */}
        <div className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 120% 80% at 50% -10%, #0f0a3a 0%, #020209 60%)",
          }}
        />

        {/* Orb 1 — Large blue top-left */}
        <motion.div
          animate={{ x: [0, 45, 0], y: [0, -45, 0], scale: [1, 1.18, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[5%] w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(79,70,229,0.22) 0%, rgba(59,130,246,0.08) 50%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />

        {/* Orb 2 — Red brand bottom-right */}
        <motion.div
          animate={{ x: [0, -45, 0], y: [0, 45, 0], scale: [1.12, 1, 1.12] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-[10%] -right-[5%] w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle at 60% 60%, rgba(220,38,38,0.18) 0%, rgba(239,68,68,0.06) 50%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />

        {/* Orb 3 — Cyan accent center */}
        <motion.div
          animate={{ x: [0, 35, -25, 0], y: [0, -30, 35, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[35%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        {/* Orb 4 — Gold shimmer top-right */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[5%] right-[15%] w-[250px] h-[250px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(251,191,36,0.08) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* Fine dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            opacity: 0.35,
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)",
          }}
        />

        {/* Horizontal light beam */}
        <motion.div
          animate={{ scaleX: [0.8, 1.2, 0.8], opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[38%] left-0 right-0 h-px"
          style={{
            background: "linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.6) 30%, rgba(99,102,241,0.8) 50%, rgba(139,92,246,0.6) 70%, transparent 100%)",
          }}
        />

        {/* Floating particles */}
        {particles.map((p) => (
          <Particle key={p.id} {...p} />
        ))}

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Deep vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_50%,_transparent_20%,_rgba(2,2,9,0.6)_100%)]" />
      </div>

      {/* ══ SCROLLING TICKER ══ */}
      <div className="absolute top-0 left-0 right-0 z-30 overflow-hidden
        border-b border-white/5 bg-white/2 backdrop-blur-sm py-2.5">
        <motion.div
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex items-center gap-0 w-max"
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="flex items-center gap-6 px-8 text-xs text-white/30 font-medium whitespace-nowrap">
              {item}
              <span className="text-white/10">|</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <motion.div
        style={{ y, opacity, scale }}
        className="relative z-20 max-w-7xl mx-auto px-6 pt-28 pb-24 w-full
          flex flex-col items-center text-center"
      >
        {/* Eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full
            border border-white/10 bg-gradient-to-r from-white/6 to-white/3
            backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <Sparkles className="h-3.5 w-3.5 text-yellow-400/80" />
            <span className="text-sm text-white/55 font-medium tracking-wide">
              Alliance India — Staff Development Platform
            </span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
          </div>
        </motion.div>

        {/* ── HEADLINE ── */}
        <h1 className="text-[clamp(3.8rem,10vw,10.5rem)] font-black tracking-tight mb-6"
          style={{ lineHeight: 0.88 }}>

          {/* Line 1 */}
          <span className="hero-headline block text-white mb-1 relative">
            Empower
            {/* Decorative underline shimmer */}
            <motion.span
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full origin-left"
              style={{
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%)",
              }}
            />
          </span>

          {/* Line 2 — gradient highlight */}
          <span className="hero-headline block mb-1 relative">
            <span
              className="relative inline-block"
              style={{
                background: "linear-gradient(135deg, #ff6b6b 0%, #ffa3a3 35%, #fff 50%, #ff8080 65%, #e53e3e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Through
            </span>
          </span>

          {/* Line 3 — outlined ghost style */}
          <span
            className="hero-headline block"
            style={{
              WebkitTextStroke: "2px rgba(255,255,255,0.2)",
              color: "transparent",
              textShadow: "0 0 80px rgba(139,92,246,0.3)",
            }}
          >
            Learning
          </span>
        </h1>

        {/* Subheading */}
        <p className="hero-sub text-lg md:text-xl text-white/45 max-w-xl mb-12
          leading-relaxed font-light">
          India HIV/AIDS Alliance — building healthcare capacity through
          world-class professional training that reaches every corner of India.
        </p>

        {/* ── CTA BUTTONS ── */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">

          {/* Primary CTA */}
          <Link href="/login" className="hero-cta-item">
            <motion.button
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              className="group relative flex items-center gap-2.5 px-8 py-4 rounded-2xl
                font-semibold text-white text-base overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #dc2626 0%, #e11d48 50%, #dc2626 100%)",
                boxShadow: "0 0 0 1px rgba(220,38,38,0.5), 0 0 40px rgba(220,38,38,0.35), 0 8px 32px rgba(220,38,38,0.25)",
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
              />
              Start Learning
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>

          {/* Secondary CTA */}
          <Link href="#orientation" className="hero-cta-item">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold
                text-white/75 text-base transition-all duration-300
                hover:text-white"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                backdropFilter: "blur(12px)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center
                ring-1 ring-white/10">
                <Play className="h-3.5 w-3.5 text-white ml-0.5" fill="white" />
              </div>
              Orientation Program
            </motion.button>
          </Link>
        </div>

        {/* ── LIQUID GLASS STAT BAR ── */}
        <div className="hero-stat-bar">
          <div
            className="inline-flex rounded-2xl overflow-hidden divide-x divide-white/[0.06]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.3)",
            }}
          >
            {[
              { value: "500+", label: "Staff Members",    accent: "rgba(59,130,246,0.5)" },
              { value: "50K+", label: "Lives Impacted",   accent: "rgba(220,38,38,0.5)" },
              { value: "92%",  label: "Completion Rate",  accent: "rgba(16,185,129,0.5)" },
              { value: "28",   label: "States Reached",   accent: "rgba(139,92,246,0.5)" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ backgroundColor: "rgba(255,255,255,0.04)" }}
                className="px-9 py-5 text-center cursor-default relative group"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {/* Accent dot */}
                <div
                  className="absolute top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ background: stat.accent }}
                />
                <p className="text-2xl md:text-3xl font-black text-white leading-none">
                  {stat.value}
                </p>
                <p className="text-[11px] text-white/30 font-medium mt-2 whitespace-nowrap uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          className="flex items-center gap-6 mt-12"
        >
          {["🏛️ NACO Certified", "🌍 WHO Partner", "🇮🇳 Govt. of India"].map((badge, i) => (
            <span key={i} className="text-xs text-white/20 font-medium">
              {badge}
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* ══ SCROLL INDICATOR ══ */}
      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20
          flex flex-col items-center gap-2.5"
      >
        {/* Animated line */}
        <motion.div
          animate={{ scaleY: [1, 0.4, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.8, repeat: Infinity }}
          className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent rounded-full"
        />
        <span className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-medium">
          Scroll
        </span>
      </motion.div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48
        bg-gradient-to-t from-white to-transparent z-10 pointer-events-none" />
    </section>
  );
}
