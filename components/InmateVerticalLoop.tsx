'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { Draggable } from 'gsap/dist/Draggable';
import { InertiaPlugin } from 'gsap/dist/InertiaPlugin';
import { User, Calendar, MapPin, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(Draggable, InertiaPlugin);
}

interface Patient {
  id: string;
  inmate_name?: string;
  unique_id?: string;
  screening_date?: string;
  facility_name?: string;
  xray_result?: string;
  tb_diagnosed?: string;
  [key: string]: any;
}

interface InmateVerticalLoopProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
  className?: string;
}

// Gradient colors for cards (cycling pattern)
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Macha
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Summer Fair
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Orange Crush
];

export function InmateVerticalLoop({ patients, onPatientClick, className }: InmateVerticalLoopProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    if (!wrapperRef.current || patients.length === 0) return;

    const wrapper = wrapperRef.current;
    const boxes = gsap.utils.toArray('.inmate-box') as HTMLElement[];
    
    if (boxes.length === 0) return;

    let activeElement: HTMLElement | null = null;
    const loop = verticalLoop(boxes, {
      paused: false,
      repeat: -1,
      draggable: true,
      center: true,
      onChange: (element: HTMLElement, index: number) => {
        if (activeElement) {
          activeElement.classList.remove('active');
        }
        element.classList.add('active');
        activeElement = element;
        setActiveIndex(index);
      }
    });

    timelineRef.current = loop;

    // Pause on hover
    const handleMouseEnter = () => {
      loop.pause();
      setIsPaused(true);
    };

    const handleMouseLeave = () => {
      loop.play();
      setIsPaused(false);
    };

    wrapper.addEventListener('mouseenter', handleMouseEnter);
    wrapper.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      wrapper.removeEventListener('mouseenter', handleMouseEnter);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
      loop.kill();
    };
  }, [patients]);

  // Vertical loop helper function (adapted from reference)
  function verticalLoop(items: HTMLElement[], config: any) {
    let timeline: gsap.core.Timeline;
    items = gsap.utils.toArray(items) as HTMLElement[];
    config = config || {};
    
    gsap.context(() => {
      let onChange = config.onChange,
        lastIndex = 0,
        tl = gsap.timeline({
          repeat: config.repeat,
          onUpdate: onChange && function() {
            let i = tl.closestIndex();
            if (lastIndex !== i) {
              lastIndex = i;
              onChange(items[i], i);
            }
          },
          paused: config.paused,
          defaults: { ease: 'none' },
          onReverseComplete: () => tl.totalTime(tl.rawTime() + tl.duration() * 100)
        }),
        length = items.length,
        startY = items[0].offsetTop,
        times: number[] = [],
        heights: number[] = [],
        spaceBefore: number[] = [],
        yPercents: number[] = [],
        curIndex = 0,
        indexIsDirty = false,
        center = config.center,
        pixelsPerSecond = (config.speed || 1) * 100,
        snap = config.snap === false ? (v: number) => v : gsap.utils.snap(config.snap || 1),
        timeOffset = 0,
        container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
        totalHeight: number,
        getTotalHeight = () => items[length-1].offsetTop + yPercents[length-1] / 100 * heights[length-1] - startY + spaceBefore[0] + items[length-1].offsetHeight * (gsap.getProperty(items[length-1], 'scaleY') as number) + (parseFloat(config.paddingBottom) || 0),
        populateHeights = () => {
          let b1 = (container as HTMLElement).getBoundingClientRect(), b2;
          items.forEach((el, i) => {
            heights[i] = parseFloat(gsap.getProperty(el, 'height', 'px') as string);
            yPercents[i] = snap(parseFloat(gsap.getProperty(el, 'y', 'px') as string) / heights[i] * 100 + parseFloat(gsap.getProperty(el, 'yPercent') as string));
            b2 = el.getBoundingClientRect();
            spaceBefore[i] = b2.top - (i ? b1.bottom : b1.top);
            b1 = b2;
          });
          gsap.set(items, {
            yPercent: (i: number) => yPercents[i]
          });
          totalHeight = getTotalHeight();
        },
        timeWrap: (value: number) => value,
        populateOffsets = () => {
          timeOffset = center ? tl.duration() * ((container as HTMLElement).offsetHeight / 2) / totalHeight : 0;
          center && times.forEach((t, i) => {
            times[i] = timeWrap(tl.labels['label' + i] + tl.duration() * heights[i] / 2 / totalHeight - timeOffset);
          });
        },
        getClosest = (values: number[], value: number, wrap: number) => {
          let i = values.length,
            closest = 1e10,
            index = 0, d;
          while (i--) {
            d = Math.abs(values[i] - value);
            if (d > wrap / 2) {
              d = wrap - d;
            }
            if (d < closest) {
              closest = d;
              index = i;
            }
          }
          return index;
        },
        populateTimeline = () => {
          let i, item, curY, distanceToStart, distanceToLoop;
          tl.clear();
          for (i = 0; i < length; i++) {
            item = items[i];
            curY = yPercents[i] / 100 * heights[i];
            distanceToStart = item.offsetTop + curY - startY + spaceBefore[0];
            distanceToLoop = distanceToStart + heights[i] * (gsap.getProperty(item, 'scaleY') as number);
            tl.to(item, {yPercent: snap((curY - distanceToLoop) / heights[i] * 100), duration: distanceToLoop / pixelsPerSecond}, 0)
              .fromTo(item, {yPercent: snap((curY - distanceToLoop + totalHeight) / heights[i] * 100)}, {yPercent: yPercents[i], duration: (curY - distanceToLoop + totalHeight - curY) / pixelsPerSecond, immediateRender: false}, distanceToLoop / pixelsPerSecond)
              .add('label' + i, distanceToStart / pixelsPerSecond);
            times[i] = distanceToStart / pixelsPerSecond;
          }
          timeWrap = gsap.utils.wrap(0, tl.duration());
        },
        refresh = (deep?: boolean) => {
          let progress = tl.progress();
          tl.progress(0, true);
          populateHeights();
          deep && populateTimeline();
          populateOffsets();
          deep && (tl as any).draggable && tl.paused() ? tl.time(times[curIndex], true) : tl.progress(progress, true);
        },
        onResize = () => refresh(!((tl as any).draggable && (tl as any).draggable.isDragging)),
        proxy: HTMLDivElement;
      
      gsap.set(items, {y: 0});
      populateHeights();
      populateTimeline();
      populateOffsets();
      window.addEventListener('resize', onResize);
      
      function toIndex(index: number, vars?: any) {
        vars = vars || {};
        (Math.abs(index - curIndex) > length / 2) && (index += index > curIndex ? -length : length);
        let newIndex = gsap.utils.wrap(0, length, index),
          time = times[newIndex];
        if (time > tl.time() !== index > curIndex && index !== curIndex) {
          time += tl.duration() * (index > curIndex ? 1 : -1);
        }
        if (time < 0 || time > tl.duration()) {
          vars.modifiers = {time: timeWrap};
        }
        curIndex = newIndex;
        vars.overwrite = true;
        gsap.killTweensOf(proxy);
        return vars.duration === 0 ? tl.time(timeWrap(time)) : tl.tweenTo(time, vars);
      }
      
      (tl as any).toIndex = (index: number, vars?: any) => toIndex(index, vars);
      (tl as any).closestIndex = (setCurrent?: boolean) => {
        let index = getClosest(times, tl.time(), tl.duration());
        if (setCurrent) {
          curIndex = index;
          indexIsDirty = false;
        }
        return index;
      };
      (tl as any).current = () => indexIsDirty ? (tl as any).closestIndex(true) : curIndex;
      (tl as any).next = (vars?: any) => toIndex((tl as any).current()+1, vars);
      (tl as any).previous = (vars?: any) => toIndex((tl as any).current()-1, vars);
      (tl as any).times = times;
      tl.progress(1, true).progress(0, true);
      
      if (config.reversed) {
        (tl as any).vars.onReverseComplete();
        tl.reverse();
      }
      
      if (config.draggable && typeof(Draggable) === 'function') {
        proxy = document.createElement('div');
        let wrap = gsap.utils.wrap(0, 1),
          ratio: number, startProgress: number, draggable: any, dragSnap: any, lastSnap: number, initChangeY: number, wasPlaying: boolean,
          align = () => tl.progress(wrap(startProgress + (draggable.startY - draggable.y) * ratio)),
          syncIndex = () => (tl as any).closestIndex(true);
        
        typeof(InertiaPlugin) === 'undefined' && console.warn('InertiaPlugin required for momentum-based scrolling and snapping.');
        
        draggable = Draggable.create(proxy, {
          trigger: items[0].parentNode as HTMLElement,
          type: 'y',
          onPressInit() {
            let y = this.y;
            gsap.killTweensOf(tl);
            wasPlaying = !tl.paused();
            tl.pause();
            startProgress = tl.progress();
            refresh();
            ratio = 1 / totalHeight;
            initChangeY = (startProgress / -ratio) - y;
            gsap.set(proxy, {y: startProgress / -ratio});
          },
          onDrag: align,
          onThrowUpdate: align,
          overshootTolerance: 0,
          inertia: true,
          snap(val: number) {
            let time = -(val * ratio) * tl.duration(),
              wrappedTime = timeWrap(time),
              snapTime = times[getClosest(times, wrappedTime, tl.duration())],
              dif = snapTime - wrappedTime;
            Math.abs(dif) > tl.duration() / 2 && (dif += dif < 0 ? tl.duration() : -tl.duration());
            lastSnap = (time + dif) / tl.duration() / -ratio;
            return lastSnap;
          },
          onRelease() {
            syncIndex();
            draggable.isThrowing && (indexIsDirty = true);
          },
          onThrowComplete: () => {
            syncIndex();
            wasPlaying && tl.play();
          }
        })[0];
        (tl as any).draggable = draggable;
      }
      
      (tl as any).closestIndex(true);
      lastIndex = curIndex;
      onChange && onChange(items[curIndex], curIndex);
      timeline = tl;
      
      return () => window.removeEventListener('resize', onResize);
    });
    
    return timeline!;
  }

  if (patients.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <p className="text-sm">No patients to display</p>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div
        ref={wrapperRef}
        className="relative h-[90vh] border-t-2 border-b-2 border-dashed border-slate-200 overflow-hidden flex flex-col items-center"
      >
        {patients.map((patient, index) => {
          const gradient = gradients[index % gradients.length];
          const isHighRisk = patient.xray_result?.toLowerCase().includes('suspected');
          
          return (
            <div
              key={patient.id}
              className="inmate-box flex items-center justify-center p-2 flex-shrink-0 w-[80%] cursor-pointer"
              style={{ height: '20%', minHeight: '100px' }}
              onClick={() => onPatientClick(patient)}
            >
              <div
                className="relative w-full h-full rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: `linear-gradient(#0a0a0a, #0a0a0a) padding-box, ${gradient} border-box`,
                  border: '3px solid transparent'
                }}
              >
                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-center px-6 py-4">
                  {/* Patient Name */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-lg font-bold text-white truncate"
                        style={{
                          background: gradient,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        {patient.inmate_name || 'Unknown Patient'}
                      </h3>
                      <p className="text-xs text-white/60 font-medium">
                        ID: {patient.unique_id || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="truncate">
                        {patient.screening_date ? new Date(patient.screening_date).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{patient.facility_name || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isHighRisk && (
                    <div className="absolute top-3 right-3">
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-rose-500/20 border border-rose-500/40">
                        <Activity className="w-3 h-3 text-rose-400" />
                        <span className="text-[10px] font-bold text-rose-300 uppercase">High Risk</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gradient Overlay */}
                <div
                  className="absolute inset-0 opacity-10 pointer-events-none"
                  style={{ background: gradient }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Pause Indicator */}
      {isPaused && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-900/90 backdrop-blur-sm rounded-full border border-white/20"
        >
          <p className="text-xs font-bold text-white uppercase tracking-wider">
            Paused • Hover to scroll
          </p>
        </motion.div>
      )}

      {/* Active Index Indicator */}
      <div className="absolute top-4 right-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-sm rounded-full border border-white/20">
        <p className="text-xs font-bold text-white tabular-nums">
          {activeIndex + 1} / {patients.length}
        </p>
      </div>
    </div>
  );
}
