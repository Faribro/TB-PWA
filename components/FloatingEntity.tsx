'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEntityStore } from '@/stores/useEntityStore';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { sonicSounds } from '@/utils/sonicSounds';
import SonicSpeedTrails, { type SonicSpeedTrailsHandle } from './SonicSpeedTrails';

const SonicCanvas = dynamic(() => import('./SonicCanvas'), { ssr: false, loading: () => null });
const SonicAssistantPanelDynamic = dynamic(() => import('./SonicAssistantPanel'), {
  ssr: false,
  loading: () => null,
});

type Edge = 'bottom' | 'right' | 'top' | 'left';
type EdgeDir = 'forward' | 'backward';
type IdleBehaviorType = 'none' | 'dance' | 'impatient' | 'lookup' | 'stretch';
type SonicMood = 'normal' | 'worried' | 'happy' | 'urgent';

const MOOD_SPEED: Record<SonicMood, number> = {
  normal: 0.32,
  worried: 0.22,
  happy: 0.38,
  urgent: 0.55,
};

const CANVAS_SIZE = 160;

const PAGE_SPAWN: Record<string, number> = {
  '/dashboard': 0.4,
  '/dashboard/vertex': 0.6,
  '/dashboard/gis': 0.75,
  '/dashboard/mande': 0.3,
  '/dashboard/follow-up': 0.5,
};

const MOOD_AURA: Record<SonicMood, string | null> = {
  urgent:  'radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)',
  happy:   'radial-gradient(circle, rgba(34,197,94,0.15) 0%, transparent 70%)',
  worried: 'radial-gradient(circle, rgba(234,179,8,0.15) 0%, transparent 70%)',
  normal:  null,
};

export default function FloatingEntity() {
  const divRef        = useRef<HTMLDivElement>(null);
  const trailsRef     = useRef<SonicSpeedTrailsHandle>(null);
  // Safe default — mount useEffect always corrects this before first paint
  const posRef        = useRef({ x: 320, y: 600 });
  const edgeRef       = useRef<Edge>('bottom');
  const dirRef        = useRef<EdgeDir>('forward');
  const rotRef        = useRef(0);
  const targetRotRef  = useRef(0);
  const rafRef        = useRef<number>(0);
  const lastTimeRef   = useRef<number>(0);
  const momentumRef   = useRef({ x: 0, y: 0 });
  const distanceRef   = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 }); // Track start of drag
  const briefingShownRef   = useRef(false);
  const achievementsRef    = useRef<Set<string>>(new Set());
  const processedAlertsRef = useRef<Set<string>>(new Set());
  const lastMouseMoveRef   = useRef(0);
  const lastIdleAlertRef   = useRef(0);

  // ── Parkour physics ───────────────────────────────────────────────────────
  const obstaclesRef  = useRef<{ x: number; y: number; w: number; h: number }[]>([]);
  const vyRef         = useRef(0);    // vertical velocity (px/frame)
  const isJumpingRef  = useRef(false);
  const isFallingRef  = useRef(false);
  const justLandedRef = useRef(false); // fires impact splat once per drop

  // ── Scroll momentum ───────────────────────────────────────────────────────
  const scrollMultRef = useRef(1);    // speed multiplier driven by scroll velocity

  // ── Drag-to-grab ──────────────────────────────────────────────────────────
  const isDraggingRef   = useRef(false);
  const dragOffsetRef   = useRef({ x: 0, y: 0 });
  const lastDragPosRef  = useRef({ x: 0, y: 0 });
  const [isDragging,    setIsDragging]    = useState(false);

  // Refs that mirror state — used inside rAF / event handlers to avoid stale closures
  const sonicMoodRef     = useRef<SonicMood>('normal');
  const isBoostingRef    = useRef(false);
  const isWalkingRef     = useRef(true);
  const isExpandedRef    = useRef(false);
  const justNavigatedRef = useRef(false);

  const [isGreeting,       setIsGreeting]       = useState(false);
  const [greetMsg,         setGreetMsg]         = useState('');
  const [isExpanded,       setIsExpanded]       = useState(false);
  const [idleBehavior,     setIdleBehavior]     = useState<IdleBehaviorType>('none');
  const [returningFromIdle,setReturningFromIdle]= useState(false);
  const [sonicMoodState,   setSonicMoodState]   = useState<SonicMood>('normal');
  const [mouseDirection,   setMouseDirection]   = useState<'left' | 'right' | null>(null);
  const [isBoosting,       setIsBoosting]       = useState(false);
  const [isWalking,        setIsWalking]        = useState(true);
  const [currentEdge,      setCurrentEdge]      = useState<Edge>('bottom');
  const [edgeDir,          setEdgeDir]          = useState<EdgeDir>('forward');
  const [isJumping,        setIsJumping]        = useState(false);
  const [impactSplat,      setImpactSplat]      = useState(false);
  const [showOof,          setShowOof]          = useState(false);
  const [isMounted,        setIsMounted]        = useState(false);

  const pathname      = usePathname();
  const districtData  = useEntityStore((s) => s.districtData);
  const sonicAlerts   = useEntityStore((s) => s.sonicAlerts);
  const globalMode    = useEntityStore((s) => s.mode);
  const globalState   = useEntityStore((s) => s.state);
  const characterType = useEntityStore((s) => s.characterType);

  // ── Stable transform applier (no deps, reads refs directly) ──────────────
  const applyTransform = useCallback(() => {
    if (!divRef.current) return;
    divRef.current.style.transform =
      `translate(${posRef.current.x - CANVAS_SIZE / 2}px, ${posRef.current.y - CANVAS_SIZE / 2}px) rotate(${rotRef.current}deg)`;
  }, []);

  // ── Keep walking ref in sync with state ──────────────────────────────────
  useEffect(() => { isWalkingRef.current = isWalking; }, [isWalking]);

  // ── Keep mood ref in sync ─────────────────────────────────────────────────
  useEffect(() => { sonicMoodRef.current = sonicMoodState; }, [sonicMoodState]);
  useEffect(() => { isBoostingRef.current = isBoosting; }, [isBoosting]);
  useEffect(() => {
    isExpandedRef.current = isExpanded;
    if (!isExpanded) {
      // Resume walking and reset physics when panel closes
      const timer = setTimeout(() => {
        isWalkingRef.current = true;
        setIsWalking(true);
        vyRef.current = 0; // Ensure no ghost gravity
        applyTransform();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // ── Mount + session restore (single effect to avoid flash) ─────────────
  useEffect(() => {
    // 1. Try to restore saved position first
    let startX = 320;
    let startEdge: Edge = 'bottom';
    let startMood: SonicMood = 'normal';

    try {
      const saved = sessionStorage.getItem('sonic-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        startX    = parsed.x    ?? 320;
        startEdge = parsed.edge ?? 'bottom';
        startMood = parsed.mood ?? 'normal';
      }
    } catch { /* ignore corrupt data */ }

    // 2. Apply position atomically — no intermediate default flash
    posRef.current       = { x: startX, y: window.innerHeight - 48 };
    edgeRef.current      = startEdge;
    sonicMoodRef.current = startMood;
    setSonicMoodState(startMood);
    setCurrentEdge(startEdge);
    applyTransform();

    // 3. Reveal Sonic only after position is correct
    setIsMounted(true);

    const handleResize = () => {
      if (edgeRef.current === 'bottom') posRef.current.y = window.innerHeight - 48;
      applyTransform();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyTransform]);

  // ── Persist session state every 5 s ──────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      sessionStorage.setItem('sonic-state', JSON.stringify({
        x: posRef.current.x,
        edge: edgeRef.current,
        mood: sonicMoodRef.current,
      }));
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // ── Grounded mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (globalMode !== 'grounded') return;
    posRef.current = { x: window.innerWidth - 80, y: window.innerHeight - 80 };
    edgeRef.current = 'bottom';
    setCurrentEdge('bottom');
    targetRotRef.current = 0;
    rotRef.current = 0;
    applyTransform();
  }, [globalMode, applyTransform]);

  // ── Page navigation spawn ─────────────────────────────────────────────────
  useEffect(() => {
    const spawnX = PAGE_SPAWN[pathname] ?? 0.5;

    justNavigatedRef.current = true;
    isWalkingRef.current = false;
    setIsWalking(false);

    posRef.current = { x: window.innerWidth * spawnX, y: window.innerHeight - 48 };
    edgeRef.current = 'bottom';
    setCurrentEdge('bottom');
    targetRotRef.current = 0;
    rotRef.current = 0;
    dirRef.current = 'forward';
    setEdgeDir('forward');
    applyTransform();

    isBoostingRef.current = true;
    setIsBoosting(true);
    const boostTimer = setTimeout(() => {
      isBoostingRef.current = false;
      setIsBoosting(false);
    }, 800);

    const walkTimer = setTimeout(() => {
      justNavigatedRef.current = false;
      isWalkingRef.current = true;
      setIsWalking(true);
      dirRef.current = 'forward';
      setEdgeDir('forward');
    }, 1200);

    return () => { clearTimeout(boostTimer); clearTimeout(walkTimer); };
  }, [pathname, applyTransform]);

  // ── Mood from district data ───────────────────────────────────────────────
  useEffect(() => {
    if (!districtData?.length) return;
    const criticalCount = districtData.filter(d => (d.breachRate ?? 0) > 0.7).length;
    const avgBreachRate  = districtData.reduce((s, d) => s + (d.breachRate ?? 0), 0) / districtData.length;
    if      (criticalCount > 5) setSonicMoodState('urgent');
    else if (criticalCount > 2) setSonicMoodState('worried');
    else if (avgBreachRate < 0.2) setSonicMoodState('happy');
    else setSonicMoodState('normal');
  }, [districtData]);

  // ── rAF walk loop ─────────────────────────────────────────────────────────
  const tick = useCallback((timestamp: number) => {
    const dt = Math.min(timestamp - (lastTimeRef.current || timestamp), 40);
    lastTimeRef.current = timestamp;

    if (globalMode === 'grounded' || globalState !== 'idle') {
      applyTransform();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const W = window.innerWidth;
    const H = window.innerHeight;

    const speed = MOOD_SPEED[sonicMoodRef.current] * dt * scrollMultRef.current;
    const edge  = edgeRef.current;
    const prevX = posRef.current?.x ?? 320;
    const prevY = posRef.current?.y ?? 600;

    if (isNaN(prevX) || isNaN(prevY)) {
      posRef.current = { x: 320, y: H - 48 };
      applyTransform();
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // ── Parkour (bottom edge only) + Conditional Gravity ("Spider-Man") ───
    // Gravity MUST NOT apply while patrolling walls/roof. Only apply when
    // Sonic is in-air (jumping/falling), e.g. parkour jump or drag-drop release.
    const inAir = isJumpingRef.current || isFallingRef.current;
    const isOnWallOrRoof = edge === 'left' || edge === 'right' || edge === 'top';

    if (!isDraggingRef.current) {
      // Parkour scanning only makes sense while running the bottom edge.
      if (!inAir && edge === 'bottom' && obstaclesRef.current.length > 0) {
        // Look ahead for obstacles based on movement direction
        const lookX = posRef.current.x + (isWalkingRef.current ? speed * 18 : 0);
        const floor = H - 48;
        const obstacles = obstaclesRef.current || [];
        const hit = obstacles.find(
          b => b && lookX > b.x && lookX < b.x + b.w && b.y + b.h > floor - 80
        );
        if (hit) {
          isJumpingRef.current = true;
          isFallingRef.current = true;
          setIsJumping(true);
          vyRef.current = -14;
          sonicSounds.jump();
          trailsRef.current?.corner && trailsRef.current.corner(posRef.current.x, posRef.current.y);
        }
      }

      if (inAir) {
        // In-air: apply gravity and fall until we hit the bottom edge.
        posRef.current.y += vyRef.current;
        vyRef.current += 0.75;

        if (posRef.current.y >= H - 48) {
          // Edge snap: land on bottom, reset physics, resume normal routing.
          posRef.current.y = H - 48;
          vyRef.current = 0;
          isJumpingRef.current = false;
          isFallingRef.current = false;
          setIsJumping(false);

          if (edgeRef.current !== 'bottom') {
            edgeRef.current = 'bottom';
            setCurrentEdge('bottom');
          }
          targetRotRef.current = 0;
          rotRef.current = 0;

          // — Impact splat: fire once per landing —
          if (!justLandedRef.current) {
            justLandedRef.current = true;
            setImpactSplat(true);
            setShowOof(true);
            sonicSounds.jump?.();
            setTimeout(() => setImpactSplat(false), 400);
            setTimeout(() => setShowOof(false), 900);
            // Re-enable walking after splat settles
            setTimeout(() => {
              justLandedRef.current = false;
              isWalkingRef.current = true;
              setIsWalking(true);
            }, 450);
          }
        } else {
          // While falling, we treat routing as "bottom-oriented" to avoid wall/roof snaps.
          if (edgeRef.current !== 'bottom') {
            edgeRef.current = 'bottom';
            setCurrentEdge('bottom');
          }
          targetRotRef.current = 0;
        }
      } else if (isOnWallOrRoof) {
        // Patrolling surfaces: hard-snap to surface and keep gravity neutralized.
        vyRef.current = 0;
        if (edge === 'right') posRef.current.x = W - 36;
        if (edge === 'left') posRef.current.x = 36;
        if (edge === 'top') posRef.current.y = 36;
      } else {
        // Bottom patrol: stay glued to the floor.
        vyRef.current = 0;
        posRef.current.y = H - 48;
      }
    } else {
      // DRAGGING: suspend gravity, emit trail from center
      vyRef.current = 0;
      const lp = lastDragPosRef.current;
      const ddx = posRef.current.x - lp.x;
      const ddy = posRef.current.y - lp.y;
      if (Math.hypot(ddx, ddy) > 0.5) {
        trailsRef.current?.emit?.(posRef.current.x, posRef.current.y, ddx, ddy, false);
        lastDragPosRef.current = { x: posRef.current.x, y: posRef.current.y };
      }
    }

    // ── Walking movement ──────────────────────────────────────────────────
    if (isWalkingRef.current && !isDraggingRef.current) {
      if (edge === 'bottom') {
        posRef.current.x += speed;
        if (posRef.current.x >= W - 80) {
          posRef.current.x = W - 36; posRef.current.y = H - 80;
          edgeRef.current = 'right'; setCurrentEdge('right');
          targetRotRef.current = -90;
          isJumpingRef.current = false; setIsJumping(false); vyRef.current = 0;
          trailsRef.current?.corner && trailsRef.current.corner(posRef.current.x, posRef.current.y);
        }
      } else if (edge === 'right') {
        posRef.current.x = W - 36;
        posRef.current.y -= speed;
        if (posRef.current.y <= 80) {
          posRef.current.x = W - 80; posRef.current.y = 36;
          edgeRef.current = 'top'; setCurrentEdge('top');
          targetRotRef.current = 180;
          trailsRef.current?.corner && trailsRef.current.corner(posRef.current.x, posRef.current.y);
        }
      } else if (edge === 'top') {
        posRef.current.y = 36;
        posRef.current.x -= speed;
        if (posRef.current.x <= 80) {
          posRef.current.x = 36; posRef.current.y = 80;
          edgeRef.current = 'left'; setCurrentEdge('left');
          targetRotRef.current = 90;
          trailsRef.current?.corner && trailsRef.current.corner(posRef.current.x, posRef.current.y);
        }
      } else if (edge === 'left') {
        posRef.current.x = 36;
        posRef.current.y += speed;
        if (posRef.current.y >= H - 80) {
          posRef.current.x = 80; posRef.current.y = H - 48;
          edgeRef.current = 'bottom'; setCurrentEdge('bottom');
          targetRotRef.current = 0;
          trailsRef.current?.corner && trailsRef.current.corner(posRef.current.x, posRef.current.y);
        }
      }
    }

    const dx = posRef.current.x - prevX;
    const dy = posRef.current.y - prevY;
    momentumRef.current.x = dx / Math.max(dt, 1);
    momentumRef.current.y = dy / Math.max(dt, 1);

    const moved = Math.hypot(dx, dy);
    if (moved > 0.1) {
      distanceRef.current += moved;
      trailsRef.current?.emit?.(posRef.current.x, posRef.current.y, dx, dy, isBoostingRef.current);
    }

    const diff      = targetRotRef.current - rotRef.current;
    const shortDiff = ((diff + 540) % 360) - 180;
    rotRef.current += shortDiff * 0.08;

    applyTransform();
    rafRef.current = requestAnimationFrame(tick);
  }, [globalMode, globalState, applyTransform]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  // ── Tab visibility — use ref to avoid stale closure ──────────────────────
  useEffect(() => {
    const handle = () => {
      if (document.hidden) {
        isWalkingRef.current = false;
        setIsWalking(false);
      } else if (!isExpandedRef.current) {
        // Only restore walking if not expanded (ignore justNavigated check)
        if (!justNavigatedRef.current) {
          isWalkingRef.current = true;
          setIsWalking(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handle);
    return () => document.removeEventListener('visibilitychange', handle);
  }, []); // no deps — reads refs only

  // ── Parkour: DOM obstacle radar ───────────────────────────────────────────
  useEffect(() => {
    const scan = () => {
      const els = document.querySelectorAll('[data-sonic-obstacle]');
      obstaclesRef.current = Array.from(els).map(el => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      });
    };
    scan();
    window.addEventListener('resize', scan, { passive: true });
    window.addEventListener('scroll', scan, { passive: true });
    return () => {
      window.removeEventListener('resize', scan);
      window.removeEventListener('scroll', scan);
    };
  }, [pathname]);

  // ── Scroll momentum ───────────────────────────────────────────────────────
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let decayId: ReturnType<typeof setTimeout>;

    const handle = () => {
      const delta = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      if (isExpandedRef.current) return;

      // Map scroll delta → speed multiplier (1× baseline → 3.5× max)
      const mult = Math.min(1 + delta / 30, 3.5);
      scrollMultRef.current = mult;

      // Boost trail intensity on fast scroll
      if (delta > 60 && !isBoostingRef.current) {
        isBoostingRef.current = true;
        setIsBoosting(true);
        sonicSounds.jump();
      }

      // Decay multiplier back to 1 after scroll stops
      clearTimeout(decayId);
      decayId = setTimeout(() => {
        scrollMultRef.current = 1;
        if (isBoostingRef.current) {
          isBoostingRef.current = false;
          setIsBoosting(false);
        }
      }, 400);
    };
    window.addEventListener('scroll', handle, { passive: true });
    return () => {
      window.removeEventListener('scroll', handle);
      clearTimeout(decayId);
    };
  }, []);

  // ── Drag-to-grab ──────────────────────────────────────────────────────────
  // Stable refs so listeners never go stale across re-renders
  const dragDistanceRef = useRef(0);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.movementX;
      const dy = e.movementY;
      dragDistanceRef.current += Math.hypot(dx, dy);
      posRef.current.x = e.clientX - dragOffsetRef.current.x;
      posRef.current.y = e.clientY - dragOffsetRef.current.y;
      lastDragPosRef.current = { x: posRef.current.x, y: posRef.current.y };
      applyTransform();
      trailsRef.current?.emit?.(posRef.current.x, posRef.current.y, dx, dy, false);
    };

    const onUp = () => {
      if (!isDraggingRef.current) return;
      if (dragDistanceRef.current > 5) {
        isJumpingRef.current = true;
        isFallingRef.current = true;
        setIsJumping(true);
        vyRef.current = 0;
        edgeRef.current = 'bottom';
        setCurrentEdge('bottom');
        targetRotRef.current = 0;
        isWalkingRef.current = false;
        setIsWalking(false);
      }
      isDraggingRef.current = false;
      setIsDragging(false);
      dragDistanceRef.current = 0;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [applyTransform]);

  // ── Search event ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: Event) => {
      if (isExpandedRef.current || justNavigatedRef.current) return;
      const { query, filterType } = (e as CustomEvent).detail || {};
      isBoostingRef.current = true;
      setIsBoosting(true);
      sonicSounds.jump();
      setTimeout(() => { isBoostingRef.current = false; setIsBoosting(false); }, 600);

      if ((query || filterType) && edgeRef.current === 'bottom') {
        const tips = [
          `Searching for ${query || filterType}!`,
          'Filtering data...',
          'Found results!',
          'Narrowing down...',
        ];
        setTimeout(() => {
          isWalkingRef.current = false;
          setIsWalking(false);
          setIsGreeting(true);
          setGreetMsg(tips[Math.floor(Math.random() * tips.length)]);
          setTimeout(() => {
            setIsGreeting(false);
            isWalkingRef.current = true;
            setIsWalking(true);
          }, 1200);
        }, 300);
      }
    };
    window.addEventListener('sonic-search', handle as EventListener);
    return () => window.removeEventListener('sonic-search', handle as EventListener);
  }, []); // no deps — reads refs only

  // ── Mouse idle tracker ────────────────────────────────────────────────────
  useEffect(() => {
    lastMouseMoveRef.current = Date.now(); // Initialize on mount
    const handle = () => { lastMouseMoveRef.current = Date.now(); };
    window.addEventListener('mousemove', handle, { passive: true });
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  // ── Idle alert ────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      if (isExpandedRef.current || justNavigatedRef.current || !isWalkingRef.current) return;
      if (edgeRef.current !== 'bottom') return;
      const now = Date.now();
      const idle = now - (lastMouseMoveRef.current || now);
      const timeSinceLast = now - lastIdleAlertRef.current;
      if (idle < 30000 || timeSinceLast < 60000) return;

      const msgs = [
        'Hey Sir! Still there?', 'Pssst... need help?',
        'I see you Sir!', 'Data needs attention Sir!', 'Anything I can help with?',
      ];
      isWalkingRef.current = false;
      setIsWalking(false);
      setIsGreeting(true);
      setGreetMsg(msgs[Math.floor(Math.random() * msgs.length)]);
      lastIdleAlertRef.current = now;
      setTimeout(() => {
        setIsGreeting(false);
        isWalkingRef.current = true;
        setIsWalking(true);
      }, 2000);
    }, 5000);
    return () => clearInterval(id);
  }, []); // no deps — reads refs only

  // ── Random idle behaviors ─────────────────────────────────────────────────
  useEffect(() => {
    let t: NodeJS.Timeout;
    const schedule = () => {
      t = setTimeout(() => {
        if (edgeRef.current !== 'bottom' || isExpandedRef.current || justNavigatedRef.current) {
          schedule(); return;
        }
        const behavior: IdleBehaviorType =
          sonicMoodRef.current === 'urgent' ? 'impatient' :
          sonicMoodRef.current === 'happy'  ? 'dance' :
          (['impatient', 'stretch', 'lookup', 'dance'] as IdleBehaviorType[])[Math.floor(Math.random() * 4)];

        sonicSounds[behavior]?.();
        isWalkingRef.current = false;
        setIsWalking(false);
        setIdleBehavior(behavior);
        setTimeout(() => {
          setIdleBehavior('none');
          setReturningFromIdle(true);
          setTimeout(() => setReturningFromIdle(false), 600);
          isWalkingRef.current = true;
          setIsWalking(true);
        }, 2500);
      }, 18000 + Math.random() * 22000);
    };
    schedule();
    return () => clearTimeout(t);
  }, []); // no deps — reads refs only

  // ── Achievement milestones ────────────────────────────────────────────────
  useEffect(() => {
    if (!districtData?.length) return;
    const screened  = districtData.reduce((s, d) => s + (d.screened ?? 0), 0);
    const breaches  = districtData.reduce((s, d) => s + (d.breachCount ?? 0), 0);
    const critical  = districtData.filter(d => (d.breachRate ?? 0) > 0.7).length;

    const fire = (key: string, condition: boolean, msg: string, dur = 2000) => {
      if (!condition || achievementsRef.current.has(key)) return;
      achievementsRef.current.add(key);
      isWalkingRef.current = false;
      setIsWalking(false);
      setIsGreeting(true);
      setGreetMsg(msg);
      isBoostingRef.current = true;
      setIsBoosting(true);
      sonicSounds.dance();
      setTimeout(() => { isBoostingRef.current = false; setIsBoosting(false); }, dur);
      setTimeout(() => { setIsGreeting(false); isWalkingRef.current = true; setIsWalking(true); }, dur);
    };

    fire('1k',           screened > 1000,  '1,000 screened milestone Sir!', 2000);
    fire('5k',           screened > 5000,  '5,000 screened! Great work Sir!', 2500);
    fire('10k',          screened > 10000, '10,000 screened! LEGENDARY Sir!', 3000);
    fire('zero-breach',  breaches === 0,   'ZERO breaches! Perfect Sir!', 2500);
    fire('critical-alert', critical > 3,   '3+ critical districts! Action needed!', 2000);
  }, [districtData]);

  // ── Page briefing ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (briefingShownRef.current || !districtData?.length) return;
    if (pathname !== '/dashboard/follow-up' && pathname !== '/dashboard') return;
    briefingShownRef.current = true;

    const breaches = districtData.reduce((s, d) => s + (d.breachCount ?? 0), 0);
    const screened = districtData.reduce((s, d) => s + (d.screened ?? 0), 0);
    const critical = districtData.filter(d => (d.breachRate ?? 0) > 0.7).length;
    const msg = critical > 5
      ? `Sir! ${critical} critical districts today!`
      : breaches > 1000
      ? `${breaches.toLocaleString()} follow-ups pending Sir!`
      : `${screened.toLocaleString()} screened! Looking good Sir!`;

    setTimeout(() => {
      if (edgeRef.current !== 'bottom') return;
      isWalkingRef.current = false;
      setIsWalking(false);
      setIsGreeting(true);
      setGreetMsg(msg);
      setTimeout(() => { setIsGreeting(false); isWalkingRef.current = true; setIsWalking(true); }, 3000);
    }, 4000);
  }, [districtData, pathname]);

  // ── Sonic alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sonicAlerts.length || isExpandedRef.current || justNavigatedRef.current) return;
    const latest = sonicAlerts[sonicAlerts.length - 1];
    if (processedAlertsRef.current.has(latest)) return;
    processedAlertsRef.current.add(latest);
    if (edgeRef.current !== 'bottom' && edgeRef.current !== 'top') return;
    isWalkingRef.current = false;
    setIsWalking(false);
    setIsGreeting(true);
    setGreetMsg(latest);
    setTimeout(() => { setIsGreeting(false); isWalkingRef.current = true; setIsWalking(true); }, 1600);
  }, [sonicAlerts]);

  // ── Dev shortcut Ctrl+A ───────────────────────────────────────────────────
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'a' || !e.ctrlKey || isExpandedRef.current) return;
      e.preventDefault();
      isWalkingRef.current = false; setIsWalking(false);
      setIsGreeting(true); setGreetMsg('TEST ACHIEVEMENT UNLOCKED!');
      isBoostingRef.current = true; setIsBoosting(true);
      sonicSounds.dance();
      setTimeout(() => { isBoostingRef.current = false; setIsBoosting(false); }, 2000);
      setTimeout(() => { setIsGreeting(false); isWalkingRef.current = true; setIsWalking(true); }, 2000);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  // ── Derived mood aura ─────────────────────────────────────────────────────
  const aura = MOOD_AURA[sonicMoodState];

  return (
    <>
      <SonicSpeedTrails
        ref={trailsRef}
        mood={sonicMoodState}
        intensity={2.5}
      />

      <div
        ref={divRef}
        id="sonic-entity"
        data-sonic-entity
        className="fixed top-0 left-0 pointer-events-auto"
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          willChange: 'transform',
          zIndex: 999999,
          cursor: isDragging ? 'grabbing' : 'grab',
          opacity: isMounted ? (isExpanded ? 0 : 1) : 0,
          transition: isMounted ? undefined : 'none',
        }}
        onPointerDown={(e) => {
          if (isExpandedRef.current) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          isDraggingRef.current = true;
          dragDistanceRef.current = 0;
          setIsDragging(true);
          isWalkingRef.current = false;
          setIsWalking(false);
          isJumpingRef.current = false;
          isFallingRef.current = false;
          setIsJumping(false);
          vyRef.current = 0;
          justLandedRef.current = false;
          dragOffsetRef.current = {
            x: e.clientX - posRef.current.x,
            y: e.clientY - posRef.current.y,
          };
          lastDragPosRef.current = { x: posRef.current.x, y: posRef.current.y };
          dragStartPosRef.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={(e) => {
          const dx = e.clientX - dragStartPosRef.current.x;
          const dy = e.clientY - dragStartPosRef.current.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 5) {
            // It was a drag, ignore click
            e.stopPropagation();
            return;
          }
          if (isExpandedRef.current) return;
          isWalkingRef.current = false;
          setIsWalking(false);
          setIdleBehavior('lookup');
          sonicSounds.lookup();
          setTimeout(() => { 
            setIdleBehavior('none'); 
            setIsExpanded(true);
          }, 600);
        }}
      >
        <SonicCanvas
          characterType={characterType}
          edgeDir={edgeDir}
          isWalking={isWalking && globalMode !== 'grounded' && globalState === 'idle' && !isDragging}
          isGreeting={isGreeting || globalState === 'greeting'}
          isBoosting={isBoosting}
          isJumping={isJumping}
          isDragging={isDragging}
          currentEdge={currentEdge}
          momentum={momentumRef.current}
          idleBehavior={globalState === 'idle_ground' ? 'lookup' : idleBehavior}
          returningFromIdle={returningFromIdle}
          sonicMoodState={sonicMoodState}
          mouseDirection={mouseDirection}
          mood={
            globalState === 'excited'      ? 'excited' :
            globalState === 'alerting'     ? 'alert'   :
            globalState === 'investigating'? 'talk'    : 'idle'
          }
        />

        {/* Speech bubble */}
        <AnimatePresence>
          {isGreeting && (
            <motion.div
              key="bubble"
              initial={{ scale: 0, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 10 }}
              className="absolute pointer-events-none"
              style={{ bottom: CANVAS_SIZE + 8, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}
            >
              <div className="bg-white border-[3px] border-cyan-500 rounded-2xl px-4 py-2 shadow-xl shadow-cyan-500/30 whitespace-nowrap">
                <span className="text-sm font-black text-slate-800 tracking-wide">{greetMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ground shadow */}
        {currentEdge === 'bottom' && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: '50%', bottom: -20,
              transform: 'translateX(-50%)',
              width: 60, height: 12,
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.25) 0%, transparent 70%)',
              filter: 'blur(2px)',
              zIndex: 999997,
            }}
          />
        )}

        {/* Impact splat — cartoonish squish on landing */}
        <AnimatePresence>
          {impactSplat && (
            <motion.div
              key="splat"
              initial={{ scaleX: 1, scaleY: 1, opacity: 0.9 }}
              animate={{ scaleX: [1, 1.4, 0.9, 1.0], scaleY: [1, 0.55, 1.15, 1.0], opacity: [0.9, 1, 0.8, 0] }}
              transition={{ duration: 0.38, ease: 'easeOut', times: [0, 0.21, 0.53, 1] }}
              className="absolute pointer-events-none rounded-full"
              style={{
                left: '50%', bottom: -8,
                translateX: '-50%',
                width: 80, height: 16,
                background: 'radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, transparent 70%)',
                filter: 'blur(3px)',
                transformOrigin: 'center bottom',
                zIndex: 999998,
              }}
            />
          )}
        </AnimatePresence>

        {/* "Oof!" impact bubble */}
        <AnimatePresence>
          {showOof && (
            <motion.div
              key="oof"
              initial={{ scale: 0, y: 0, opacity: 1 }}
              animate={{ scale: 1, y: -28, opacity: 1 }}
              exit={{ scale: 0, opacity: 0, y: -40 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              className="absolute pointer-events-none"
              style={{ bottom: CANVAS_SIZE - 20, left: '50%', translateX: '-50%', zIndex: 10 }}
            >
              <div className="bg-white border-2 border-indigo-400 rounded-xl px-2 py-0.5 shadow-lg">
                <span className="text-[11px] font-black text-indigo-600 tracking-wide">Oof!</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mood aura — single element, driven by lookup table */}
        {aura && (
          <div
            className="absolute pointer-events-none rounded-full animate-pulse"
            style={{
              left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 160, height: 160,
              background: aura,
              zIndex: 999997,
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <SonicAssistantPanelDynamic
            onClose={() => {
              isExpandedRef.current = false; // sync immediately so onPointerDown guard works
              setIsExpanded(false);
              setIdleBehavior('none');
              setTimeout(() => {
                isWalkingRef.current = true;
                setIsWalking(true);
              }, 50);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
