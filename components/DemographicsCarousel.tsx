'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ChevronLeft, ChevronRight, Calendar, User, MapPin, Activity, FileText, Shield, ClipboardList, Settings2, CheckCircle2, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DemographicsCarouselProps {
  patient: any;
  editedDemographics: Record<string, any>;
  setEditedDemographics: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isEditingDemographics: boolean;
  setIsEditingDemographics: (editing: boolean) => void;
}

export function DemographicsCarousel({ 
  patient,
  editedDemographics,
  setEditedDemographics,
  isEditingDemographics,
  setIsEditingDemographics 
}: DemographicsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Helper to render field
  const renderField = (label: string, value: any, editable = false, fieldKey?: string, sectionId?: string) => {
    const displayValue = value || 'N/A';
    const sectionLabelColor: Record<string,string> = {
      'screening': '#3b82f6',
      'identity':  '#8b5cf6',
      'location':  '#10b981',
      'tb-screening': '#f59e0b',
      'referral': '#ef4444',
      'hiv': '#ec4899',
      'nikshay': '#06b6d4',
      'admin': '#64748b'
    };
    
    const labelColor = sectionId && sectionLabelColor[sectionId] ? sectionLabelColor[sectionId] : '#64748b';
    const isEditing = editable && isEditingDemographics && fieldKey;

    return (
      <div className="group flex items-start justify-between py-2.5 border-b border-slate-100/60 last:border-0 transition-all hover:bg-slate-50/80 hover:rounded-lg px-2 -mx-2">
        <span 
          className="text-[10px] uppercase tracking-[0.08em] font-semibold flex items-center gap-1.5"
          style={{ color: labelColor }}
        >
          {label}
          {editable && (
            <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: labelColor }}>
              {isEditingDemographics ? '✎' : '🔒'}
            </span>
          )}
        </span>
        {isEditing ? (
          <input
            type="text"
            value={editedDemographics[fieldKey] ?? displayValue}
            onChange={(e) => setEditedDemographics(prev => ({ ...prev, [fieldKey]: e.target.value }))}
            className="text-xs font-semibold text-slate-900 text-right bg-white border-2 rounded-lg px-3 py-1.5 max-w-[220px] outline-none transition-all shadow-sm"
            style={{
              borderColor: `${labelColor}40`,
              boxShadow: `0 0 0 3px ${labelColor}10`
            }}
            onFocus={(e) => {
              e.target.style.borderColor = labelColor;
              e.target.style.boxShadow = `0 0 0 4px ${labelColor}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = `${labelColor}40`;
              e.target.style.boxShadow = `0 0 0 3px ${labelColor}10`;
            }}
            placeholder={`Enter ${label.toLowerCase()}`}
          />
        ) : (
          <span className="text-xs font-semibold text-slate-800 text-right max-w-[220px] truncate">{displayValue}</span>
        )}
      </div>
    );
  };

  // Build sections from patient data
  const sections = [
    {
      id: 'screening',
      title: 'Screening Details',
      icon: Calendar,
      color: '#3b82f6',
      children: (
        <div className="space-y-0.5">
          {renderField('Screening Date', patient?.screening_date, true, 'screening_date', 'screening')}
          {renderField('Submitted On', patient?.submitted_on, false, undefined, 'screening')}
          {renderField('Facility', patient?.facility_name, true, 'facility_name', 'screening')}
          {renderField('Screened By', patient?.screened_by, true, 'screened_by', 'screening')}
        </div>
      )
    },
    {
      id: 'identity',
      title: 'Identity',
      icon: User,
      color: '#8b5cf6',
      children: (
        <div className="space-y-0.5">
          {renderField('Name', patient?.inmate_name, true, 'inmate_name', 'identity')}
          {renderField('Age', patient?.age, true, 'age', 'identity')}
          {renderField('Gender', patient?.gender, true, 'gender', 'identity')}
          {renderField('Contact', patient?.contact_number, true, 'contact_number', 'identity')}
        </div>
      )
    },
    {
      id: 'location',
      title: 'Location',
      icon: MapPin,
      color: '#10b981',
      children: (
        <div className="space-y-0.5">
          {renderField('State', patient?.screening_state, true, 'screening_state', 'location')}
          {renderField('District', patient?.screening_district, true, 'screening_district', 'location')}
          {renderField('Address', patient?.address, true, 'address', 'location')}
          {renderField('GPS', patient?.gps_coordinates, false, undefined, 'location')}
        </div>
      )
    },
    {
      id: 'tb-screening',
      title: 'TB Screening',
      icon: Activity,
      color: '#f59e0b',
      children: (
        <div className="space-y-0.5">
          {renderField('Symptoms (10S)', patient?.symptoms_10s, true, 'symptoms_10s', 'tb-screening')}
          {renderField('X-Ray Result', patient?.xray_result, true, 'xray_result', 'tb-screening')}
          {renderField('AI Confidence', patient?.ai_confidence_score, false, undefined, 'tb-screening')}
          {renderField('Sputum Collected', patient?.sputum_collected, true, 'sputum_collected', 'tb-screening')}
        </div>
      )
    },
    {
      id: 'referral',
      title: 'Referral/Diagnosis',
      icon: FileText,
      color: '#ef4444',
      children: (
        <div className="space-y-0.5">
          {renderField('Referral Date', patient?.referral_date, true, 'referral_date', 'referral')}
          {renderField('Referred To', patient?.referred_to_facility, true, 'referred_to_facility', 'referral')}
          {renderField('TB Diagnosed', patient?.tb_diagnosed, true, 'tb_diagnosed', 'referral')}
          {renderField('Diagnosis Date', patient?.diagnosis_date, true, 'diagnosis_date', 'referral')}
        </div>
      )
    },
    {
      id: 'hiv',
      title: 'HIV/ART',
      icon: Shield,
      color: '#ec4899',
      children: (
        <div className="space-y-0.5">
          {renderField('HIV Status', patient?.hiv_status, true, 'hiv_status', 'hiv')}
          {renderField('ART Started', patient?.art_started, true, 'art_started', 'hiv')}
          {renderField('ART Center', patient?.art_center, true, 'art_center', 'hiv')}
          {renderField('CPT Given', patient?.cpt_given, true, 'cpt_given', 'hiv')}
        </div>
      )
    },
    {
      id: 'nikshay',
      title: 'Nikshay/Reg',
      icon: ClipboardList,
      color: '#06b6d4',
      children: (
        <div className="space-y-0.5">
          {renderField('NIKSHAY ID', patient?.nikshay_id, true, 'nikshay_id', 'nikshay')}
          {renderField('ABHA ID', patient?.abha_id, true, 'abha_id', 'nikshay')}
          {renderField('ATT Start Date', patient?.att_start_date, true, 'att_start_date', 'nikshay')}
          {renderField('Regimen', patient?.treatment_regimen, true, 'treatment_regimen', 'nikshay')}
        </div>
      )
    },
    {
      id: 'admin',
      title: 'Administrative',
      icon: Settings2,
      color: '#64748b',
      children: (
        <div className="space-y-0.5">
          {renderField('Kobo UUID', patient?.kobo_uuid, false, undefined, 'admin')}
          {renderField('Serial Number', patient?.serial_number, false, undefined, 'admin')}
          {renderField('Created At', patient?.created_at, false, undefined, 'admin')}
          {renderField('Updated At', patient?.updated_at, false, undefined, 'admin')}
        </div>
      )
    }
  ];

  const galleryRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const ribbonRef = useRef<HTMLDivElement>(null);
  
  const seamlessLoopRef = useRef<gsap.core.Timeline | null>(null);
  const scrubRef = useRef<gsap.core.Tween | null>(null);
  const playheadRef = useRef(0);
  
  // Inertial scroll physics state
  const velRef = useRef(0);
  const posRef = useRef(0);
  const rafRef = useRef(0);
  const lastInputRef = useRef(0);

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
    gsap.set(items, { xPercent: 400, opacity: 0, scale: 0 });

    // Create staggered animations
    for (let i = 0; i < l; i++) {
      const index = i % items.length;
      const item = items[index];
      const time = i * spacing;

      rawSequence
        .fromTo(
          item,
          { scale: 0.88, opacity: 0.35, filter: 'blur(2px)' },
          {
            scale: 1,
            opacity: 1,
            filter: 'blur(0px)',
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
    if (!cardsRef.current || !sections || sections.length === 0) return;

    const cards = gsap.utils.toArray<HTMLElement>(
      cardsRef.current?.querySelectorAll('.demo-card') ?? []
    );
    if (cards.length === 0) return;

    // Fade in cards
    gsap.to(cards, { opacity: 1, delay: 0.1, stagger: 0.05 });

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
    };
  }, [buildSeamlessLoop, spacing, sections.length]);

  // Navigation functions
  const scrubTo = useCallback((totalTime: number) => {
    if (!seamlessLoopRef.current || !scrubRef.current) return;
    const dur = seamlessLoopRef.current.duration();
    playheadRef.current = ((totalTime % dur) + dur) % dur;
    scrubRef.current.vars.totalTime = snap(playheadRef.current);
    scrubRef.current.invalidate().restart();
    
    // Update active index
    const normalizedTime = playheadRef.current;
    const rawIndex = Math.round(normalizedTime / spacing) % sections.length;
    setCurrentIndex(rawIndex);
  }, [snap, spacing, sections.length]);

  // Inertial Scroll Physics
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    
    let lastTime = performance.now();
    let isDragging = false;
    let startY = 0;
    
    const tick = (time: number) => {
      const dt = (time - lastTime) / 16.666;
      lastTime = time;
      
      if (Math.abs(velRef.current) > 0.001) {
        posRef.current += velRef.current * dt;
        velRef.current *= Math.pow(0.82, dt); // friction
        
        const idleTime = time - lastInputRef.current;
        if (!isDragging && idleTime > 120) {
          // Snap to nearest
          const nearest = Math.round(posRef.current / spacing) * spacing;
          const diff = nearest - posRef.current;
          posRef.current += diff * 0.1 * dt;
          
          if (Math.abs(diff) < 0.001 && Math.abs(velRef.current) < 0.001) {
            velRef.current = 0;
            posRef.current = nearest;
          }
        }
        
        scrubTo(posRef.current);
      }
      
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY * 0.004;
      velRef.current = Math.max(-3, Math.min(3, velRef.current + delta));
      lastInputRef.current = performance.now();
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      startY = e.clientY;
      velRef.current = 0;
      lastInputRef.current = performance.now();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const delta = (startY - e.clientY) * 0.012;
      velRef.current = delta;
      startY = e.clientY;
      lastInputRef.current = performance.now();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        velRef.current += 0.8;
        lastInputRef.current = performance.now();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        velRef.current -= 0.8;
        lastInputRef.current = performance.now();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    el.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(rafRef.current);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('keydown', onKeyDown);
    };
  }, [scrubTo, spacing]);

  // Sync internal position with currentIndex changes from other sources
  useEffect(() => {
    posRef.current = currentIndex * spacing;
    
    // Auto-scroll ribbon to keep active pill visible
    const activePill = ribbonRef.current?.querySelector(`[data-pill-index="${currentIndex}"]`);
    if (activePill) {
      activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [currentIndex, spacing]);

  const handleNext = useCallback(() => {
    velRef.current += 1.2;
    lastInputRef.current = performance.now();
  }, []);

  const handlePrev = useCallback(() => {
    velRef.current -= 1.2;
    lastInputRef.current = performance.now();
  }, []);

  // Safety check
  if (!sections || sections.length === 0) {
    return (
      <div className="relative w-full h-[520px] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading demographics...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full bg-slate-50/30">
      
      {/* ────────────────────────────────────────────────────── */}
      {/* CHANGE 1: Section Navigation Ribbon */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div 
          ref={ribbonRef}
          className="flex items-center gap-2 px-4 py-3 overflow-x-auto hide-scrollbar w-full"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {sections.map((section, idx) => {
            const isActive = idx === currentIndex;
            const Icon = section.icon;
            
            return (
              <button
                key={section.id}
                data-pill-index={idx}
                onClick={() => {
                  velRef.current = 0;
                  posRef.current = idx * spacing;
                  scrubTo(idx * spacing);
                  lastInputRef.current = performance.now();
                }}
                className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 ${
                  isActive 
                    ? '' 
                    : 'bg-transparent border border-slate-400/25 hover:border-slate-400/40 text-slate-400 hover:text-slate-600'
                }`}
                style={isActive ? {
                  background: `${section.color}25`, // 15% opacity roughly
                  border: `1px solid ${section.color}66`, // 40% opacity
                  color: section.color,
                  fontWeight: 700,
                  transform: 'scale(1.04)',
                  boxShadow: `0 0 0 3px ${section.color}25, 0 4px 16px ${section.color}30`
                } : {}}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-pill-bg"
                    className="absolute inset-0 rounded-full"
                    style={{ background: `${section.color}15`, zIndex: -1 }}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold tracking-wide hidden md:block">
                  {section.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* CHANGE 2 & 4: Carousel Container with specific calc height */}
      {/* ────────────────────────────────────────────────────── */}
      <div 
        ref={galleryRef} 
        tabIndex={0}
        className="relative w-full overflow-hidden flex-shrink-0 touch-none outline-none"
        style={{ 
          height: 'calc(100dvh - 72px - 48px - 56px - 48px - 32px)', 
          minHeight: '320px'
        }}
      >
        
        {/* Ghost Vignettes */}
        <div className="absolute top-0 bottom-0 left-0 w-20 z-10 pointer-events-none" style={{ background: 'linear-gradient(to right, white 0%, transparent 100%)' }} />
        <div className="absolute top-0 bottom-0 right-0 w-20 z-10 pointer-events-none" style={{ background: 'linear-gradient(to left, white 0%, transparent 100%)' }} />

        {/* Navigation Arrows - Moved down */}
        <button
          onClick={handlePrev}
          className="absolute left-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 bg-white border border-slate-200 text-slate-700 rounded-full shadow-md transition-all duration-200 hover:bg-slate-900 hover:text-white hover:border-transparent hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-6 top-1/2 -translate-y-1/2 z-50 w-10 h-10 bg-white border border-slate-200 text-slate-700 rounded-full shadow-md transition-all duration-200 hover:bg-slate-900 hover:text-white hover:border-transparent hover:shadow-xl hover:scale-105 active:scale-95 flex items-center justify-center"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Cards Container */}
        <ul ref={cardsRef} className="absolute w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-0 p-0">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="demo-card absolute top-0 left-0 w-full h-full opacity-0 flex items-center justify-center pointer-events-auto"
              style={{ listStyle: 'none' }}
            >
              <div className="w-full max-w-[460px] h-[340px] perspective-1000 group">
                
                {/* ────────────────────────────────────────────────────── */}
                {/* CHANGE 5: Premium Card Visual Upgrades */}
                {/* ────────────────────────────────────────────────────── */}
                <div 
                  className="w-full h-full rounded-[20px] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(28px) saturate(180%)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    boxShadow: '0 0 0 1px rgba(148,163,184,0.08), 0 8px 32px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 0 0 1px ${section.color}20, 0 20px 60px rgba(15,23,42,0.12), 0 0 40px ${section.color}12`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 0 0 1px rgba(148,163,184,0.08), 0 8px 32px rgba(15,23,42,0.08), 0 2px 8px rgba(15,23,42,0.04)';
                  }}
                >
                  
                  {/* Hover Shine Effect */}
                  <motion.div
                    initial={{ x: '-200%' }}
                    whileHover={{ x: '200%' }}
                    transition={{ duration: 0.6, ease: 'easeInOut' }}
                    className="absolute inset-0 z-20 pointer-events-none"
                    style={{
                      background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.8) 50%, transparent 60%)'
                    }}
                  />

                  {/* Card Header */}
                  <div
                    className="relative px-5 py-4 border-b border-slate-100"
                    style={{
                      background: `linear-gradient(135deg, ${section.color}12 0%, ${section.color}04 60%, transparent 100%)`
                    }}
                  >
                    
                    {/* ────────────────────────────────────────────────────── */}
                    {/* CHANGE 8: Progress Dots -> Arc Indicator */}
                    {/* ────────────────────────────────────────────────────── */}
                    <span className="absolute top-4 right-5 text-[10px] font-black tabular-nums tracking-tight select-none" style={{ color: `${section.color}60` }}>
                      {String(index + 1).padStart(2,'0')} / {String(sections.length).padStart(2,'0')}
                    </span>

                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center p-1.5 rounded-lg"
                        style={{ 
                          backgroundColor: `${section.color}14`, // 8% roughly
                          border: `1px solid ${section.color}33`, // 20% roughly
                        }}
                      >
                        <section.icon className="w-5 h-5" style={{ color: section.color }} />
                      </div>
                      <div className="flex-1 pr-12">
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                          {section.title}
                        </h3>
                      </div>
                      {isEditingDemographics && (
                        <span className="absolute right-5 bottom-4 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">
                            Edit Mode
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="h-[calc(100%-72px)] p-5 overflow-y-auto hide-scrollbar">
                    {section.children}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* ────────────────────────────────────────────────────── */}
      {/* CHANGE 3: Action Bar Layout Fix */}
      {/* ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-slate-200 bg-white/95 backdrop-blur-sm sticky bottom-0 z-30 shrink-0">
        {/* Edit/Lock Toggle — left */}
        <button 
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border transition-all shadow-sm"
          style={{
            borderColor: isEditingDemographics ? '#10b98140' : '#64748b40',
            backgroundColor: isEditingDemographics ? '#10b98110' : 'white',
            color: isEditingDemographics ? '#10b981' : '#64748b'
          }}
          onClick={() => setIsEditingDemographics(!isEditingDemographics)}
        >
          {isEditingDemographics ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-xs font-bold uppercase tracking-wider">Lock</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Edit</span>
            </>
          )}
        </button>

        {/* Close Loop — center, ghost danger */}
        <button 
          className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-red-200/60 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors shadow-sm"
          onClick={() => {
            document.dispatchEvent(new CustomEvent('openCloseLoopModal'));
          }}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Close Loop</span>
        </button>

        {/* Submit — right, primary solid */}
        <button 
          className="flex-[2] flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-[0_8px_16px_rgba(15,23,42,0.15)] hover:shadow-[0_12px_24px_rgba(15,23,42,0.2)]"
          onClick={() => {
            if (isEditingDemographics) {
              document.dispatchEvent(new CustomEvent('saveDemographicsEvent'));
              setIsEditingDemographics(false);
            } else {
              document.dispatchEvent(new CustomEvent('submitClinicalUpdateEvent'));
            }
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          {isEditingDemographics ? 'Save Changes' : 'Submit Update'}
        </button>
      </div>

    </div>
  );
}
