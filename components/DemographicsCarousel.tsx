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
import { ChevronLeft, ChevronRight, Calendar, User, MapPin, Activity, FileText, Shield, ClipboardList, Settings2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
  // Helper to render field
  const renderField = (label: string, value: any, editable = false, fieldKey?: string) => {
    const displayValue = value || 'N/A';
    return (
      <div className="flex items-start justify-between py-2 border-b border-slate-100 last:border-0">
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        {editable && isEditingDemographics && fieldKey ? (
          <input
            type="text"
            value={editedDemographics[fieldKey] ?? displayValue}
            onChange={(e) => setEditedDemographics(prev => ({ ...prev, [fieldKey]: e.target.value }))}
            className="text-xs font-semibold text-slate-900 text-right bg-blue-50 border border-blue-200 rounded px-2 py-1 max-w-[200px]"
          />
        ) : (
          <span className="text-xs font-semibold text-slate-900 text-right max-w-[200px] truncate">{displayValue}</span>
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
        <div className="space-y-1">
          {renderField('Screening Date', patient?.screening_date, true, 'screening_date')}
          {renderField('Submitted On', patient?.submitted_on)}
          {renderField('Facility', patient?.facility_name, true, 'facility_name')}
          {renderField('Screened By', patient?.screened_by, true, 'screened_by')}
        </div>
      )
    },
    {
      id: 'identity',
      title: 'Identity',
      icon: User,
      color: '#8b5cf6',
      children: (
        <div className="space-y-1">
          {renderField('Name', patient?.inmate_name, true, 'inmate_name')}
          {renderField('Age', patient?.age, true, 'age')}
          {renderField('Gender', patient?.gender, true, 'gender')}
          {renderField('Contact', patient?.contact_number, true, 'contact_number')}
        </div>
      )
    },
    {
      id: 'location',
      title: 'Location',
      icon: MapPin,
      color: '#10b981',
      children: (
        <div className="space-y-1">
          {renderField('State', patient?.screening_state, true, 'screening_state')}
          {renderField('District', patient?.screening_district, true, 'screening_district')}
          {renderField('Address', patient?.address, true, 'address')}
          {renderField('GPS', patient?.gps_coordinates)}
        </div>
      )
    },
    {
      id: 'tb-screening',
      title: 'TB Screening',
      icon: Activity,
      color: '#f59e0b',
      children: (
        <div className="space-y-1">
          {renderField('Symptoms (10S)', patient?.symptoms_10s, true, 'symptoms_10s')}
          {renderField('X-Ray Result', patient?.xray_result, true, 'xray_result')}
          {renderField('AI Confidence', patient?.ai_confidence_score)}
          {renderField('Sputum Collected', patient?.sputum_collected, true, 'sputum_collected')}
        </div>
      )
    },
    {
      id: 'referral',
      title: 'Referral/Diagnosis',
      icon: FileText,
      color: '#ef4444',
      children: (
        <div className="space-y-1">
          {renderField('Referral Date', patient?.referral_date, true, 'referral_date')}
          {renderField('Referred To', patient?.referred_to_facility, true, 'referred_to_facility')}
          {renderField('TB Diagnosed', patient?.tb_diagnosed, true, 'tb_diagnosed')}
          {renderField('Diagnosis Date', patient?.diagnosis_date, true, 'diagnosis_date')}
        </div>
      )
    },
    {
      id: 'hiv',
      title: 'HIV/ART',
      icon: Shield,
      color: '#ec4899',
      children: (
        <div className="space-y-1">
          {renderField('HIV Status', patient?.hiv_status, true, 'hiv_status')}
          {renderField('ART Started', patient?.art_started, true, 'art_started')}
          {renderField('ART Center', patient?.art_center, true, 'art_center')}
          {renderField('CPT Given', patient?.cpt_given, true, 'cpt_given')}
        </div>
      )
    },
    {
      id: 'nikshay',
      title: 'Nikshay/Registration',
      icon: ClipboardList,
      color: '#06b6d4',
      children: (
        <div className="space-y-1">
          {renderField('NIKSHAY ID', patient?.nikshay_id, true, 'nikshay_id')}
          {renderField('ABHA ID', patient?.abha_id, true, 'abha_id')}
          {renderField('ATT Start Date', patient?.att_start_date, true, 'att_start_date')}
          {renderField('Treatment Regimen', patient?.treatment_regimen, true, 'treatment_regimen')}
        </div>
      )
    },
    {
      id: 'admin',
      title: 'Administrative',
      icon: Settings2,
      color: '#64748b',
      children: (
        <div className="space-y-1">
          {renderField('Kobo UUID', patient?.kobo_uuid)}
          {renderField('Serial Number', patient?.serial_number)}
          {renderField('Created At', patient?.created_at)}
          {renderField('Updated At', patient?.updated_at)}
        </div>
      )
    }
  ];
  const galleryRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLUListElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const seamlessLoopRef = useRef<gsap.core.Timeline | null>(null);
  const scrubRef = useRef<gsap.core.Tween | null>(null);
  const playheadRef = useRef(0);

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
  }, [snap]);

  const handleNext = useCallback(() => {
    scrubTo(playheadRef.current + spacing);
    setCurrentIndex(prev => (prev + 1) % sections.length);
  }, [scrubTo, spacing, sections.length]);

  const handlePrev = useCallback(() => {
    scrubTo(playheadRef.current - spacing);
    setCurrentIndex(prev => (prev === 0 ? sections.length - 1 : prev - 1));
  }, [scrubTo, spacing, sections.length]);

  const nextSection = sections && sections.length > 0 ? sections[(currentIndex + 1) % sections.length] : null;
  const prevSection = sections && sections.length > 0 ? sections[currentIndex === 0 ? sections.length - 1 : currentIndex - 1] : null;

  // Safety check
  if (!sections || sections.length === 0) {
    return (
      <div className="relative w-full h-[520px] flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading demographics...</div>
      </div>
    );
  }

  return (
    <div ref={galleryRef} className="relative w-full h-[480px] overflow-hidden">
      {/* Navigation Arrows - Fixed Position */}
      <motion.button
        onClick={handlePrev}
        whileHover={{ scale: 1.1, x: -4 }}
        whileTap={{ scale: 0.9 }}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 transition-all duration-300 hover:shadow-2xl flex items-center justify-center"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>

      <motion.button
        onClick={handleNext}
        whileHover={{ scale: 1.1, x: 4 }}
        whileTap={{ scale: 0.9 }}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-12 h-12 bg-slate-900 text-white rounded-full shadow-xl shadow-slate-900/30 transition-all duration-300 hover:shadow-2xl flex items-center justify-center"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>

      {/* Cards Container */}
      <ul ref={cardsRef} className="absolute w-full h-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {sections.map((section, index) => (
          <li
            key={section.id}
            className="demo-card absolute top-0 left-0 w-full h-full opacity-0"
            style={{ listStyle: 'none' }}
          >
            <div className="w-full h-full flex items-center justify-center px-20">
              <div className="w-full max-w-[520px] h-[400px] bg-white rounded-2xl border border-slate-200/60 shadow-xl overflow-hidden">
                {/* Card Header */}
                <div
                  className="px-5 py-3 border-b border-slate-100"
                  style={{
                    background: `linear-gradient(135deg, ${section.color}15 0%, ${section.color}05 100%)`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${section.color}20` }}
                    >
                      <section.icon className="w-4.5 h-4.5" style={{ color: section.color }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">
                        {section.title}
                      </h3>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        {index + 1} of {sections.length}
                      </p>
                    </div>
                    {isEditingDemographics && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">
                          Edit Mode
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Content - No Scroll */}
                <div className="h-[calc(100%-64px)] p-5">
                  {section.children}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Progress Indicator - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-slate-200 shadow-lg">
          {sections && sections.map((_, index) => (
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
      </div>
    </div>
  );
}
