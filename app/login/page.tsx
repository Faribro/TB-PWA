'use client';

import { signIn } from "next-auth/react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Terminal, ShieldAlert, Cpu, Activity, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MatrixRain } from "@/components/MatrixRain";
import { verifyOverrideKey } from "@/app/actions/verify-override-key";

function AshokaChakra({ className, style }: { className?: string, style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="8"/>
      <circle cx="100" cy="100" r="16" fill="currentColor"/>
      {Array.from({ length: 24 }).map((_, i) => (
        <path
          key={i}
          d="M 100 100 L 97 12 L 103 12 Z"
          fill="currentColor"
          transform={`rotate(${i * 15} 100 100)`}
        />
      ))}
      <circle cx="100" cy="100" r="82" fill="none" stroke="currentColor" strokeWidth="1"/>
    </svg>
  );
}

function WavingFlagBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Deep Background Opacity Controller */}
      <div className="absolute inset-0 opacity-[0.08]">
        {/* Saffron Flow */}
        <div 
          className="absolute top-[-30%] left-[-20%] w-[140%] h-[70%] bg-[#FF9933] blur-[120px] rounded-[100%]"
          style={{ animation: 'flagWaveSaffron 14s ease-in-out infinite alternate' }}
        />
        {/* White Center Flow (Represented entirely by the negative space and base bg) */}
        
        {/* Green Flow */}
        <div 
          className="absolute bottom-[-30%] right-[-20%] w-[140%] h-[70%] bg-[#138808] blur-[120px] rounded-[100%]"
          style={{ animation: 'flagWaveGreen 18s ease-in-out infinite alternate' }}
        />
      </div>

      {/* Central Rotating Chakra Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] blur-[1px]">
        <AshokaChakra className="w-[120vw] md:w-[90vw] max-w-[800px] h-auto text-[#000080]" style={{ animation: 'spin 120s linear infinite' }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes flagWaveSaffron {
          0% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(40px) scale(1.05) rotate(2deg); }
          100% { transform: translateY(-20px) scale(0.95) rotate(-1deg); }
        }
        @keyframes flagWaveGreen {
          0% { transform: translateY(0px) scale(1) rotate(0deg); }
          50% { transform: translateY(-40px) scale(1.05) rotate(-2deg); }
          100% { transform: translateY(20px) scale(0.95) rotate(1deg); }
        }
      `}} />
    </div>
  );
}

function Masthead() {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    // Generate IST specific time string
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col z-50">
      {/* Top Strip */}
      <div className="h-8 bg-slate-100/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-xs">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest truncate max-w-[40%] sm:max-w-none">
          Government of India | Ministry of Health &amp; Family Welfare
        </span>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-[9px] font-mono opacity-50 text-slate-600 font-bold uppercase tracking-tight">
             Status: <span className="text-emerald-500">🟢 Secure</span> | Server: National Hub | Latency: 24ms
          </div>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <div className="relative flex items-center justify-center w-1.5 h-1.5 sm:w-2 sm:h-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-emerald-500"></span>
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-slate-600 font-bold tracking-tight">
              IST: {time || '--:--:--'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="h-24 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 sm:px-12 shadow-sm">
        
        {/* Left Branding Title */}
        <div className="flex flex-col items-start">
          <h1 className="text-xl font-black text-slate-800 tracking-[0.4em] uppercase">S A M A D H A A N</h1>
          <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase text-center w-full">Track and Chase</p>
        </div>

        {/* Right Grouped Logos with Dividers */}
        <div className="hidden lg:flex items-center gap-6">
          <Image 
            src="/Images/Ministry_of_Health_India.svg" 
            alt="MoHFW" 
            width={180} 
            height={48} 
            className="h-12 w-auto object-contain" 
          />
          <div className="w-[1px] h-10 bg-slate-200" />
          <Image 
            src="/Images/NacoLogo.png" 
            alt="NACO" 
            width={120} 
            height={48} 
            className="h-12 w-auto object-contain bg-white mix-blend-multiply" 
          />
          <div className="w-[1px] h-10 bg-slate-200" />
          <Image 
            src="/Images/Ministry_of_Law_and_Justice.png" 
            alt="Ministry of Law and Justice" 
            width={180} 
            height={48} 
            className="h-12 w-auto object-contain" 
          />
        </div>
        
        {/* Mobile Fallback layout */}
        <div className="flex lg:hidden items-center">
            <Image 
              src="/Images/Ministry_of_Health_India.svg" 
              alt="MoHFW" 
              width={140} 
              height={40} 
              className="h-10 w-auto object-contain" 
            />
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  const [isHovering, setIsHovering] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [logoFlash, setLogoFlash] = useState(false);
  const [overrideRole, setOverrideRole] = useState<string>('PM');
  const [overrideState, setOverrideState] = useState<string>('');
  const [overrideDistrict, setOverrideDistrict] = useState<string>('');
  const [masterKey, setMasterKey] = useState<string>('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'expired' || reason === 'session_expired') {
      setSessionExpired(true);
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowOverrideModal(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    if (masterKey.length < 5) {
      setKeyStatus('idle');
      setIsUnlocked(false);
      return;
    }
    const timer = setTimeout(async () => {
      setKeyStatus('checking');
      const valid = await verifyOverrideKey(masterKey);
      setKeyStatus(valid ? 'valid' : 'invalid');
      setIsUnlocked(valid);
    }, 400);
    return () => clearTimeout(timer);
  }, [masterKey]);

  const handleLogoClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);

    if (clickTimer) clearTimeout(clickTimer);

    if (newCount === 5) {
      setLogoFlash(true);
      setTimeout(() => {
        setLogoFlash(false);
        setShowOverrideModal(true);
        setClickCount(0);
      }, 600);
    } else {
      const timer = setTimeout(() => setClickCount(0), 3000);
      setClickTimer(timer);
    }
  };

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleOverrideSignIn = () => {
    const override = {
      role: overrideRole,
      state: overrideState || null,
      district: overrideDistrict || null,
    };
    document.cookie = `__samadhaan_override=${JSON.stringify(override)}; path=/; max-age=60; SameSite=Lax`;
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start overflow-hidden font-outfit bg-slate-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      
      {/* High-End Atmospheric Waving Flag Layer */}
      <WavingFlagBackground />

      <Masthead />
      
      <main className="flex-1 flex flex-col items-center justify-center w-full px-4 pt-10 pb-24 relative z-10">
        
        {/* Session Expired Banner */}
        <AnimatePresence>
          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-4 py-3 rounded-xl shadow-lg"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Your 8-hour shift has ended. Please authenticate again to continue.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command Vault Card */}
        <Card 
          className={`w-full max-w-md bg-white border-0 border-t-4 transition-all duration-500 transform
            ${isHovering 
                ? 'border-t-blue-500 shadow-[0_30px_60px_rgba(59,130,246,0.15)] -translate-y-1' 
                : 'border-t-[#004a99] shadow-[0_20px_50px_rgba(0,0,0,0.05)]'} 
            rounded-2xl overflow-hidden mb-8 relative`}
          style={{ boxShadow: isHovering ? '0 30px 60px rgba(59,130,246,0.15), inset 0 0 0 1px rgba(0,0,0,0.04)' : '0 20px 50px rgba(0,0,0,0.05), inset 0 0 0 1px rgba(0,0,0,0.04)' }}
        >
          {/* Beveled Inner Top Highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-blue-100/10 via-blue-200/60 to-blue-100/10 z-10" />
          
          <CardContent className="p-10 flex flex-col items-center relative z-20 overflow-hidden">
            {/* Identity Scan Animation */}
            <AnimatePresence>
              {isHovering && (
                <motion.div 
                  initial={{ top: "-10%" }}
                  animate={{ top: "110%" }}
                  exit={{ opacity: 0 }}
                  transition={{ 
                    duration: 2, 
                    repeat: Infinity, 
                    ease: "linear",
                    repeatDelay: 0.5
                  }}
                  className="absolute left-0 right-0 h-[2px] bg-blue-400/30 z-30 pointer-events-none shadow-[0_0_8px_rgba(96,165,250,0.5)]"
                />
              )}
            </AnimatePresence>
            
            <div className="mb-6 w-full flex justify-center relative">
              <motion.div
                animate={logoFlash ? {
                  filter: ['brightness(1)', 'brightness(2) hue-rotate(30deg)', 'brightness(1)', 'brightness(2) hue-rotate(30deg)', 'brightness(1)', 'brightness(2) hue-rotate(30deg)', 'brightness(1)']
                } : {}}
                transition={{ duration: 0.6, times: [0, 0.14, 0.28, 0.42, 0.56, 0.7, 1] }}
                className="relative cursor-pointer"
                onClick={handleLogoClick}
              >
                {/* Ripple effect on each click */}
                <AnimatePresence>
                  {clickCount > 0 && (
                    <motion.div
                      key={clickCount}
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 2, opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                      className="absolute inset-0 rounded-full border-2 border-amber-400"
                    />
                  )}
                </AnimatePresence>
                <Image 
                  src="/Images/Logo/AllianceIndia-Logo.png" 
                  alt="Alliance India" 
                  width={280} 
                  height={100} 
                  className="h-28 w-auto object-contain drop-shadow-sm" 
                  priority 
                />
              </motion.div>
            </div>

            <div className="text-center mb-10 w-full flex flex-col items-center">
              <p className="uppercase tracking-[0.2em] text-[10px] font-bold text-slate-400 w-full text-center">National Monitoring &amp; Evaluation Portal</p>
            </div>

            <button 
              onClick={handleGoogleSignIn}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onFocus={() => setIsHovering(true)}
              onBlur={() => setIsHovering(false)}
              className="w-full h-14 bg-white flex items-center justify-center gap-4 border border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-blue-50/50 hover:border-blue-400 hover:text-blue-700 hover:shadow-md transition-all duration-300 group/btn relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-blue-50/0 group-hover/btn:bg-blue-50/50 transition-colors duration-300" />
              <ShieldCheck className="w-5 h-5 text-slate-400 group-hover/btn:text-blue-500 transition-colors z-10" />
              <div className="w-px h-6 bg-slate-200 group-hover/btn:bg-blue-200 transition-colors z-10" />
              <svg className="w-5 h-5 z-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="z-10 tracking-tight">Sign in with Google</span>
            </button>

          </CardContent>
        </Card>

        {/* Official Footer Space */}
        <footer className="text-center w-full max-w-lg mt-4 flex flex-col items-center gap-4">
          <p className="text-xs text-slate-400 font-medium leading-relaxed tracking-wide">
            Authorized Access Only. This system is monitored and intended for use by MoHFW, NACO, and Ministry of Law &amp; Justice personnel.
          </p>
          <div className="flex items-center gap-3 bg-white/60 backdrop-blur-sm border border-slate-200/60 shadow-sm px-4 py-2 rounded-full mt-2 transition-all hover:bg-white/80">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Supported by MoHFW, NACO &amp; SACS
            </span>
          </div>
        </footer>

      </main>

      {/* VANGUARD System Override Modal */}
      <AnimatePresence>
        {showOverrideModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOverrideModal(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[9998]"
            />
            
            {/* VANGUARD Terminal Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 font-mono"
            >
              <div className="w-full max-w-5xl h-[80vh] border-2 border-[#33ff99]/30 bg-[#0a0f0a] shadow-[0_0_50px_rgba(51,255,153,0.2)] overflow-hidden flex flex-col relative crt-overlay">
                
                {/* Top Header Bar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-[#33ff99]/30 bg-[#1a2e1a]/50 text-[#33ff99] text-xs font-bold tracking-widest relative z-10">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-4 h-4 animate-pulse" />
                    <span className="animate-flicker">SAMADHAAN_CORE_V2.4 // ROOT_ACCESS</span>
                  </div>
                  <button 
                    onClick={() => setShowOverrideModal(false)} 
                    className="hover:bg-red-500 hover:text-black transition-colors px-2 py-1 rounded"
                  >
                    [X]
                  </button>
                </div>

                {/* 4-Quadrant Grid Layout */}
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-0.5 bg-[#33ff99]/10 relative z-10">
                  
                  {/* Quadrant 1: Neural Bypass (Matrix Rain) */}
                  <div className="relative bg-[#0c130c] p-4 overflow-hidden border border-[#33ff99]/20">
                    <MatrixRain />
                    <div className="relative z-10">
                      <h3 className="text-[#33ff99] terminal-glow mb-2 flex items-center gap-2 text-sm">
                        <Cpu className="w-4 h-4" /> NEURAL_BYPASS_INITIALIZED
                      </h3>
                      <div className="text-[10px] text-[#33ff99]/60 leading-tight space-y-1">
                        <div>&gt; BYPASSING_SUPABASE_AUTH_GATES... <span className="text-[#33ff99]">DONE</span></div>
                        <div>&gt; INJECTING_OVERRIDE_COOKIE... <span className="text-[#33ff99]">ACTIVE</span></div>
                        <div>&gt; TARGET_ROLE: <span className="text-white font-bold">[{overrideRole}]</span></div>
                        {overrideState && <div>&gt; TARGET_STATE: <span className="text-white font-bold">[{overrideState}]</span></div>}
                        {overrideDistrict && <div>&gt; TARGET_DISTRICT: <span className="text-white font-bold">[{overrideDistrict}]</span></div>}
                      </div>
                    </div>
                  </div>

                  {/* Quadrant 2: Override Parameters */}
                  <div className="bg-[#0c130c] p-6 border border-[#33ff99]/20">
                    <h3 className="text-[#33ff99] text-sm mb-4 tracking-tighter terminal-glow">SELECT_OVERRIDE_PARAMETERS:</h3>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {['PM', 'SPM', 'ME', 'PC'].map((role) => (
                        <button
                          key={role}
                          onClick={() => setOverrideRole(role)}
                          className={`py-2 text-xs border transition-all ${
                            overrideRole === role 
                              ? 'bg-[#33ff99] text-black border-[#33ff99] shadow-[0_0_10px_rgba(51,255,153,0.5)]' 
                              : 'border-[#33ff99]/30 text-[#33ff99] hover:bg-[#33ff99]/10'
                          }`}
                        >
                          :: {role}
                        </button>
                      ))}
                    </div>
                    <input 
                      placeholder="[--override-state]" 
                      className="w-full bg-black border-b border-[#33ff99]/30 text-[#33ff99] p-2 text-xs outline-none focus:border-[#33ff99] mb-2 placeholder:text-[#33ff99]/30"
                      value={overrideState} 
                      onChange={(e) => setOverrideState(e.target.value)}
                    />
                    <input 
                      placeholder="[--override-district]" 
                      className="w-full bg-black border-b border-[#33ff99]/30 text-[#33ff99] p-2 text-xs outline-none focus:border-[#33ff99] placeholder:text-[#33ff99]/30"
                      value={overrideDistrict} 
                      onChange={(e) => setOverrideDistrict(e.target.value)}
                    />
                  </div>

                  {/* Quadrant 3 & 4: System Log + Execute (Combined) */}
                  <div className="bg-[#0c130c] p-6 border border-[#33ff99]/20 col-span-2 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[#33ff99] text-sm mb-4">
                        <Terminal className="w-4 h-4" /> <span className="terminal-glow">CONSOLE_OUTPUT</span>
                      </div>
                      <p className="text-[#33ff99]/80 text-[11px]">SAMADHAAN OS [Version 10.0.2026]</p>
                      <p className="text-[#33ff99]/80 text-[11px]">(c) 2026 Alliance India. All rights reserved.</p>
                      <p className="text-[#33ff99]/60 text-[10px] mt-2">NextAuth v5 (Auth.js) | Supabase RLS | JWT Strategy</p>
                      <p className="text-[#33ff99] text-[11px] mt-4 flex items-center gap-2">
                        root@vanguard:~$ <span className="animate-pulse">_</span>
                      </p>
                      
                      <div className="mt-4 space-y-2">
                        <input
                          type="password"
                          value={masterKey}
                          onChange={(e) => setMasterKey(e.target.value)}
                          placeholder="[SYSTEM_AUTH_CHALLENGE]"
                          className="w-full bg-black border border-[#33ff99]/30 text-[#33ff99] p-3 text-xs outline-none focus:border-[#33ff99] placeholder:text-[#33ff99]/30 terminal-glow"
                        />
                        {keyStatus === 'valid' && (
                          <p className="text-green-400 text-[10px] terminal-glow">
                            &gt; AUTH_SUCCESS: VANGUARD_MODE_ENGAGED
                          </p>
                        )}
                        {keyStatus === 'invalid' && (
                          <p className="text-red-400 text-[10px]">
                            &gt; AUTH_FAILURE: INVALID_ACCESS_KEY
                          </p>
                        )}
                        {keyStatus === 'checking' && (
                          <p className="text-yellow-400 text-[10px] animate-pulse">
                            &gt; VERIFYING_KEY...
                          </p>
                        )}
                      </div>
                    </div>

                    <motion.button
                      onClick={handleOverrideSignIn}
                      disabled={!isUnlocked}
                      animate={{
                        boxShadow: isUnlocked
                          ? ['0 0 0px #33ff99', '0 0 30px #33ff99', '0 0 10px #33ff99']
                          : '0 0 0px transparent'
                      }}
                      transition={{ duration: 0.6, repeat: isUnlocked ? 2 : 0 }}
                      className={`w-full mt-6 py-4 font-black text-sm tracking-[0.3em] transition-all ${
                        isUnlocked
                          ? 'bg-[#33ff99] text-black hover:bg-white shadow-[0_0_20px_rgba(51,255,153,0.5)] hover:shadow-[0_0_30px_rgba(51,255,153,0.8)] cursor-pointer'
                          : 'bg-[#33ff99]/20 text-[#33ff99]/20 cursor-not-allowed'
                      }`}
                    >
                      {isUnlocked ? '[ EXECUTE_SYSTEM_BREACH_SIGN_IN ]' : '[ ACCESS_RESTRICTED_ENTER_KEY ]'}
                    </motion.button>
                  </div>
                </div>

                {/* Bottom Status Bar */}
                <div className="bg-[#0d1f0d] border-t border-[#33ff99]/30 p-2 flex gap-6 text-[10px] text-[#33ff99]/80 font-bold uppercase overflow-hidden relative z-10">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> SYSTEM: UNSTABLE</span>
                  <span>CPU: 89%</span>
                  <span>NET: ENCRYPTED_TUNNEL</span>
                  <span className="ml-auto flex items-center gap-1"><Globe className="w-3 h-3" /> LOCATION: {overrideState || 'NATIONAL'}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}