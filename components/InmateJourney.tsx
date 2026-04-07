 "use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Activity, Truck, ScanLine, AlertCircle, Microscope, ChevronDown } from "lucide-react";

const W = 480;
const HALF = W / 2;

const FACE_TRANSFORMS = [
`rotateX(-90deg) translateZ(${HALF}px)`, // top
`translateZ(${HALF}px)`, // front
`rotateY(90deg) translateZ(${HALF}px)`, // right
`rotateY(180deg) translateZ(${HALF}px)`, // back
`rotateY(-90deg) translateZ(${HALF}px)`, // left
`rotateX(90deg) translateZ(${HALF}px)`, // bottom
] as const;

// Smooth, industry-standard carousel path:
// - primarily rotates around Y (like a 3D card slider)
// - only flips X when transitioning through top/bottom
// - no animated Z-roll to avoid "tilting" feel
const ROTATION_STOPS = [
{ rx: 90, ry: 0, rz: 0 }, // 0: top
{ rx: 0, ry: 0, rz: 0 }, // 1: front
{ rx: 0, ry: -90, rz: 0 }, // 2: right
{ rx: 0, ry: -180, rz: 0 }, // 3: back
{ rx: 0, ry: -270, rz: 0 }, // 4: left
{ rx: -90, ry: -360, rz: 0 }, // 5: bottom
{ rx: 0, ry: -450, rz: 0 }, // 6: left (loop)
{ rx: 0, ry: -540, rz: 0 }, // 7: back (loop)
{ rx: 0, ry: -630, rz: 0 }, // 8: right (loop)
{ rx: 0, ry: -720, rz: 0 }, // 9: front (loop)
{ rx: 90, ry: -720, rz: 0 }, // 10: top (climb-out)
] as const;

const STOP_FACE_SEQUENCE = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0] as const;
const STEP_STOPS = [1, 2, 3, 4] as const;

const easeIO = (t: number): number =>
t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

const FACE_NAMES = [
"DESCENT",
"BARRACK ACCESS",
"AI SCREENING",
"AI FLAGGING",
"CONFIRMATION",
"ASCENT"
] as const;

const STEPS = [
{
Icon: Truck,
badge: "bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700 shadow-emerald-200/50",
glowColor: "rgba(16, 185, 129, 0.15)",
title: "Barrack-Level Access",
hudLabel: "BARRACK ACCESS",
desc: "Mobile X-Ray units deployed directly to individual barracks for streamlined inmate access.",
stat: "23 Facilities",
},
{
Icon: ScanLine,
badge: "bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-700 shadow-indigo-200/50",
glowColor: "rgba(99, 102, 241, 0.15)",
title: "AI-Assisted Screening",
hudLabel: "AI SCREENING",
desc: "Rapid throughput screening using advanced Mobile X-Ray + AI technology.",
stat: "12,847 Screened",
},
{
Icon: AlertCircle,
badge: "bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 shadow-amber-200/50",
glowColor: "rgba(245, 158, 11, 0.15)",
title: "AI Flagging (TB Suspects)",
hudLabel: "AI FLAGGING",
desc: "Neural network identifies potential TB cases for immediate triage.",
stat: "342 Flagged",
},
{
Icon: Microscope,
badge: "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-700 shadow-rose-200/50",
glowColor: "rgba(244, 63, 94, 0.15)",
title: "Clinical Confirmation",
hudLabel: "CONFIRMATION",
desc: "Flagged patients proceed to CBNAT/Truenat testing for microbiological confirmation.",
stat: "89 Confirmed",
},
] as const;

const WHEEL_SENSITIVITY = 0.0003;
const SMOOTH_FACTOR = 0.085;

export default function InmateJourney() {
const sectionRef = useRef<HTMLDivElement>(null);
const cubeRef = useRef<HTMLDivElement>(null);
const pctRef = useRef<HTMLDivElement>(null);
const labelRef = useRef<HTMLDivElement>(null);
const fillRef = useRef<HTMLDivElement>(null);
const glowRef = useRef<HTMLDivElement>(null);
const lockedRef = useRef(false);
const completedRef = useRef(false);
const releasingRef = useRef(false);
const accumRef = useRef(0);
const smoothRef = useRef(0);
const rafRef = useRef(0);
const lockPosRef = useRef(0);
const [activeStep, setActiveStep] = useState(0);
const [isInView, setIsInView] = useState(false);
const [showHint, setShowHint] = useState(true);

const getSectionAbsoluteTop = useCallback(() => {
if (!sectionRef.current) return window.scrollY;
const rect = sectionRef.current.getBoundingClientRect();
return Math.max(0, rect.top + window.scrollY);
}, []);

const lockToSectionStart = useCallback(() => {
const targetTop = getSectionAbsoluteTop();
lockPosRef.current = targetTop;
lockedRef.current = true;
window.scrollTo({ top: targetTop, behavior: "auto" });
}, [getSectionAbsoluteTop]);

const isSectionFullyVisible = useCallback(() => {
if (!sectionRef.current) return false;
const rect = sectionRef.current.getBoundingClientRect();
return rect.top <= 1 && rect.bottom >= window.innerHeight - 1;
}, []);

const isSectionInFocusZone = useCallback(() => {
if (!sectionRef.current) return false;
const rect = sectionRef.current.getBoundingClientRect();
const topGate = 24;
const bottomGate = window.innerHeight * 0.9;
return rect.top <= topGate && rect.bottom >= bottomGate;
}, []);

const shouldAutoLock = useCallback(() => {
if (!sectionRef.current) return false;
if (completedRef.current) return false;
if (releasingRef.current) return false;
const rect = sectionRef.current.getBoundingClientRect();
return rect.top <= 90 && rect.bottom >= window.innerHeight * 0.72;
}, []);

const isWithinLockWindow = useCallback(() => {
if (completedRef.current || releasingRef.current) return false;
const sectionTop = getSectionAbsoluteTop();
const y = window.scrollY;
return y >= sectionTop - 140 && y <= sectionTop + 140;
}, [getSectionAbsoluteTop]);

const goToStep = useCallback((idx: number) => {
const stop = STEP_STOPS[idx] ?? STEP_STOPS[0];
accumRef.current = stop / (ROTATION_STOPS.length - 1);
if (!lockedRef.current && sectionRef.current) {
lockToSectionStart();
}
}, [lockToSectionStart]);

useEffect(() => {
const observer = new IntersectionObserver(
([entry]) => {
setIsInView(entry.isIntersecting);
if (entry.intersectionRatio >= 0.28 && accumRef.current < 1 && !completedRef.current) {
lockToSectionStart();
}
if (entry.intersectionRatio < 0.1) {
completedRef.current = false;
releasingRef.current = false;
lockedRef.current = false;
accumRef.current = 0;
smoothRef.current = 0;
}
},
{ threshold: [0, 0.1, 0.5, 1] }
);
if (sectionRef.current) observer.observe(sectionRef.current);
return () => observer.disconnect();
}, [lockToSectionStart]);

useEffect(() => {
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reduced) {
if (cubeRef.current) {
cubeRef.current.style.transform = "rotateX(0deg) rotateY(0deg)";
}
return;
}

const onScroll = () => {
if (!lockedRef.current && (isWithinLockWindow() || shouldAutoLock())) {
lockToSectionStart();
return;
}
if (!lockedRef.current) return;
if (completedRef.current) return;
if (releasingRef.current) return;
window.scrollTo(0, lockPosRef.current);
};

const releaseJail = (direction: "forward" | "backward") => {
if (releasingRef.current) return;
releasingRef.current = true;
completedRef.current = true;
lockedRef.current = false;

const targetY = direction === "forward"
? lockPosRef.current + window.innerHeight * 1.1
: Math.max(0, lockPosRef.current - window.innerHeight * 0.1);

requestAnimationFrame(() => {
window.scrollTo({ top: targetY, behavior: "smooth" });
setTimeout(() => { releasingRef.current = false; }, 600);
});
};

const onWheel = (e: WheelEvent) => {
if (!lockedRef.current && !completedRef.current && (isSectionFullyVisible() || isSectionInFocusZone())) {
lockToSectionStart();
}
if (!lockedRef.current) return;
e.preventDefault();

const linePx = 16;
const pagePx = window.innerHeight * 0.9;
const delta = e.deltaMode === 1 ? e.deltaY * linePx : e.deltaMode === 2 ? e.deltaY * pagePx : e.deltaY;

if (Math.abs(delta) < 5) return;

accumRef.current = Math.max(0, Math.min(1, accumRef.current + delta * WHEEL_SENSITIVITY));

if (accumRef.current >= 1) releaseJail("forward");
if (accumRef.current <= 0) releaseJail("backward");
};

let touchStartY = 0;
const onTouchStart = (e: TouchEvent) => {
touchStartY = e.touches[0].clientY;
};

const onTouchMove = (e: TouchEvent) => {
if (!lockedRef.current && !completedRef.current && (isSectionFullyVisible() || isSectionInFocusZone())) {
lockToSectionStart();
}
if (!lockedRef.current) return;
e.preventDefault();
const delta = touchStartY - e.touches[0].clientY;
touchStartY = e.touches[0].clientY;
accumRef.current = Math.max(0, Math.min(1, accumRef.current + delta * 0.003));

if (accumRef.current >= 1) releaseJail("forward");
if (accumRef.current <= 0) releaseJail("backward");
};

const onKeyDown = (e: KeyboardEvent) => {
if (!lockedRef.current && !completedRef.current && (isSectionFullyVisible() || isSectionInFocusZone())) {
lockToSectionStart();
}
if (!lockedRef.current) return;
if (["ArrowDown", "ArrowUp", "Space", "PageDown", "PageUp"].includes(e.key)) {
e.preventDefault();
const dir = ["ArrowUp", "PageUp"].includes(e.key) ? -1 : 1;
accumRef.current = Math.max(0, Math.min(1, accumRef.current + dir * 0.25));

if (accumRef.current >= 1) releaseJail("forward");
if (accumRef.current <= 0) releaseJail("backward");
}
};

const tick = () => {
rafRef.current = requestAnimationFrame(tick);

const delta = accumRef.current - smoothRef.current;
smoothRef.current += delta * SMOOTH_FACTOR;

const p = smoothRef.current;
const pct = Math.round(p * 100);

if (pctRef.current) {
pctRef.current.textContent = String(pct).padStart(3, "0") + "%";
}
if (fillRef.current) {
fillRef.current.style.width = `${pct}%`;
}

const maxStop = ROTATION_STOPS.length - 1;
const t = p * maxStop;
const i = Math.min(Math.floor(t), maxStop - 1);
const fRaw = t - i;
const f = easeIO(fRaw);
const a = ROTATION_STOPS[i];
const b = ROTATION_STOPS[i + 1];
const rx = a.rx + (b.rx - a.rx) * f;
const ry = a.ry + (b.ry - a.ry) * f;
const rz = a.rz + (b.rz - a.rz) * f;

if (cubeRef.current) {
cubeRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
}

// Map progress to face index using the cinematic stop path.
const stopIdx = Math.min(maxStop, Math.round(t));
const faceIdx = STOP_FACE_SEQUENCE[stopIdx] ?? 1;
// Map to step index (0-3 for the 4 content steps)
const s = Math.max(0, Math.min(3, faceIdx - 1));
setActiveStep((prev) => (prev !== s ? s : prev));

if (labelRef.current) {
labelRef.current.textContent = FACE_NAMES[faceIdx];
}
if (glowRef.current) {
const color = faceIdx === 0 || faceIdx === 5 ? "rgba(99, 102, 241, 0.15)" : STEPS[s]?.glowColor || "rgba(139, 92, 246, 0.15)";
glowRef.current.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
}

if (accumRef.current >= 1 && showHint) {
setShowHint(false);
}
};

window.addEventListener("scroll", onScroll, { passive: false });
window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("touchstart", onTouchStart, { passive: true });
window.addEventListener("touchmove", onTouchMove, { passive: false });
window.addEventListener("keydown", onKeyDown);

rafRef.current = requestAnimationFrame(tick);

return () => {
cancelAnimationFrame(rafRef.current);
window.removeEventListener("scroll", onScroll);
window.removeEventListener("wheel", onWheel);
window.removeEventListener("touchstart", onTouchStart);
window.removeEventListener("touchmove", onTouchMove);
window.removeEventListener("keydown", onKeyDown);
};
}, [showHint, isSectionFullyVisible, isSectionInFocusZone, lockToSectionStart, shouldAutoLock, isWithinLockWindow]);

return (
<>
<style jsx>{`
@keyframes float {
0%, 100% { transform: translateY(0px); }
50% { transform: translateY(-10px); }
}
@keyframes ambient-shift {
0% { transform: translate3d(-2%, -1%, 0) scale(1); opacity: 0.65; }
50% { transform: translate3d(2%, 1%, 0) scale(1.03); opacity: 0.85; }
100% { transform: translate3d(-2%, -1%, 0) scale(1); opacity: 0.65; }
}
@keyframes pulse-ring {
0% { transform: scale(0.95); opacity: 1; }
100% { transform: scale(1.3); opacity: 0; }
}
@keyframes shimmer {
0% { background-position: -1000px 0; }
100% { background-position: 1000px 0; }
}
@keyframes fadeIn {
from { opacity: 0; }
to { opacity: 1; }
}
.animate-float {
animation: float 6s ease-in-out infinite;
}
.animate-pulse-ring {
animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.shimmer {
background: linear-gradient(
90deg,
transparent 0%,
rgba(255, 255, 255, 0.3) 50%,
transparent 100%
);
background-size: 1000px 100%;
animation: shimmer 3s infinite;
}
.animate-fadeIn {
animation: fadeIn 1s ease-in-out;
}
.ambient-shift {
animation: ambient-shift 14s ease-in-out infinite;
}
`}</style>

<section
ref={sectionRef}
style={{ height: "100vh" }}
className="relative w-full"
aria-label="Inmate screening journey cinematic walkthrough"
>
<div
className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center"
style={{
background: "radial-gradient(1200px 700px at 20% 10%, rgba(199, 210, 254, 0.5), transparent 55%), radial-gradient(1000px 620px at 85% 80%, rgba(216, 180, 254, 0.28), transparent 52%), linear-gradient(135deg, #f7f7ff 0%, #ede9fe 48%, #e5e9ff 100%)",
}}
>
<div className="absolute inset-0 ambient-shift pointer-events-none opacity-70" />
<div
className="absolute inset-0 pointer-events-none"
style={{
background: "radial-gradient(circle at 50% 50%, transparent 58%, rgba(67, 56, 202, 0.08) 100%)",
}}
/>
<div
className="absolute inset-0 opacity-[0.015]"
style={{
backgroundImage: `
repeating-linear-gradient(0deg, rgba(79,70,229,0.5) 0px, transparent 1px, transparent 48px),
repeating-linear-gradient(90deg, rgba(79,70,229,0.5) 0px, transparent 1px, transparent 48px)
`,
backgroundSize: "48px 48px",
}}
/>

{isInView &&
[0, 1, 2, 3, 4].map((i) => (
<div
key={i}
className="absolute rounded-full bg-indigo-300/20 animate-float"
style={{
width: `${8 + i * 4}px`,
height: `${8 + i * 4}px`,
left: `${15 + i * 18}%`,
top: `${20 + i * 15}%`,
animationDelay: `${i * 0.8}s`,
animationDuration: `${6 + i * 2}s`,
}}
aria-hidden="true"
/>
))}

<div className="absolute top-6 left-6 md:left-14 z-10">
<div className="flex items-center gap-3 mb-2">
<Activity size={18} className="text-indigo-500" />
<span className="text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-500">
Inmate Screening Journey
</span>
</div>
<div className="flex items-center gap-2 text-[9px] text-indigo-400 font-mono">
<ChevronDown size={12} className="animate-bounce" />
<span>Scroll to explore</span>
</div>
</div>

<div className="absolute top-6 right-6 z-10 text-right pointer-events-none">
<div
className="backdrop-blur-md bg-white/40 border border-indigo-100/60 rounded-2xl px-4 py-3 shadow-lg"
aria-hidden="true"
>
<div
ref={pctRef}
className="text-2xl font-black tracking-tight text-indigo-600 mb-1 tabular-nums"
>
000%
</div>
<div className="w-32 h-1 bg-indigo-100 rounded-full relative overflow-hidden mb-2">
<div
ref={fillRef}
className="absolute inset-y-0 left-0 w-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
style={{
transition: "width 100ms cubic-bezier(0.4, 0, 0.2, 1)",
boxShadow: "0 0 14px rgba(99, 102, 241, 0.58)",
}}
/>
</div>
<div ref={labelRef} className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500">
BARRACK ACCESS
</div>
</div>
</div>

<div
className="transform scale-[0.8] sm:scale-90 md:scale-100 transition-transform duration-500 ease-out"
style={{
perspective: "1300px",
perspectiveOrigin: "50% 50%",
width: `${W}px`,
height: `${W}px`,
display: "flex",
alignItems: "center",
justifyContent: "center",
position: "relative",
}}
>
<div
ref={glowRef}
className="absolute rounded-full pointer-events-none transition-all duration-700"
style={{
width: `${W + 160}px`,
height: `${W + 160}px`,
background: `radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)`,
filter: "blur(72px)",
}}
/>

<div
className="absolute rounded-full border border-indigo-200/30 pointer-events-none"
style={{
width: `${W + 80}px`,
height: `${W + 80}px`,
}}
/>
<div
className="absolute rounded-full border border-indigo-200/20 pointer-events-none animate-pulse-ring"
style={{
width: `${W + 120}px`,
height: `${W + 120}px`,
}}
/>

<div
ref={cubeRef}
style={{
width: `${W}px`,
height: `${W}px`,
position: "relative",
transformStyle: "preserve-3d",
transformOrigin: "50% 50%",
transform: "rotateX(90deg) rotateY(0deg)",
willChange: "transform",
transition: "none",
}}
>
{/* TOP FACE - DESCENT */}
<div
style={{
position: "absolute",
inset: 0,
transform: FACE_TRANSFORMS[0],
backfaceVisibility: "hidden",
background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), linear-gradient(135deg, #e0e7ff, #ede9fe)",
border: "1px solid rgba(79,70,229,0.15)",
borderRadius: "1.5rem",
display: "flex",
alignItems: "center",
justifyContent: "center",
boxShadow: "inset 0 0 40px rgba(79,70,229,0.05)",
}}
>
<span className="text-5xl font-black text-indigo-950/[0.06] tracking-[0.08em]">DESCENT</span>
</div>

{/* 4 MAIN CONTENT FACES */}
{STEPS.map((step, i) => {
const { Icon } = step;
const isActive = activeStep === i;
return (
<div
key={step.title}
style={{
position: "absolute",
inset: 0,
transform: FACE_TRANSFORMS[i + 1],
backfaceVisibility: "hidden",
background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), rgba(255,255,255,0.95)",
backdropFilter: "blur(20px) saturate(160%)",
WebkitBackdropFilter: "blur(20px) saturate(160%)",
border: "1px solid rgba(79,70,229,0.2)",
borderRadius: "1.5rem",
boxShadow: `
0 12px 44px rgba(79,70,229,0.14),
inset 0 1px 0 rgba(255,255,255,0.8),
inset 0 -1px 0 rgba(79,70,229,0.05)
`,
display: "flex",
flexDirection: "column",
alignItems: "center",
justifyContent: "center",
padding: "3rem",
overflow: "hidden",
}}
>
{isActive && (
<div
className="absolute inset-0 shimmer pointer-events-none"
style={{ opacity: 0.3 }}
/>
)}

<span
style={{
position: "absolute",
bottom: "1.5rem",
left: "2rem",
fontSize: "clamp(4rem,12vw,8rem)",
fontWeight: 900,
color: "rgba(79,70,229,0.04)",
lineHeight: 1,
userSelect: "none",
fontVariantNumeric: "tabular-nums",
}}
>
0{i + 1}
</span>

<div
className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 ${step.badge} shadow-lg transition-transform duration-300 ${
isActive ? "scale-110" : "scale-100"
}`}
>
<Icon size={32} strokeWidth={2.5} />
</div>

<div className="flex items-center gap-2 mb-3">
<div className="w-8 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
<p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
STEP 0{i + 1}
</p>
<div className="w-8 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
</div>

<h3 className="text-2xl font-black text-indigo-950 text-center tracking-tight mb-3 leading-tight">
{step.title}
</h3>

<p className="text-sm text-slate-600 text-center leading-relaxed max-w-[280px] mb-4">
{step.desc}
</p>

<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-indigo-100/60 backdrop-blur-sm">
<div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
<span className="text-xs font-bold text-indigo-700">{step.stat}</span>
</div>
</div>
);
})}

{/* BOTTOM FACE - ASCENT */}
<div
style={{
position: "absolute",
inset: 0,
transform: FACE_TRANSFORMS[5],
backfaceVisibility: "hidden",
background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 48px), linear-gradient(135deg, #ede9fe, #e0e7ff)",
border: "1px solid rgba(79,70,229,0.15)",
borderRadius: "1.5rem",
display: "flex",
alignItems: "center",
justifyContent: "center",
boxShadow: "inset 0 0 40px rgba(79,70,229,0.05)",
}}
>
<span className="text-5xl font-black text-indigo-950/[0.06] tracking-[0.08em]">ASCENT</span>
</div>
</div>
</div>

<div className="absolute left-8 top-1/2 -translate-y-1/2 z-10 hidden md:flex flex-col gap-4">
{STEPS.map((step, i) => (
<button
key={i}
onClick={() => goToStep(i)}
aria-label={`Step ${i + 1}: ${step.title}`}
className="relative group"
>
<span
className={`block w-2.5 h-2.5 rounded-full transition-all duration-300 ${
activeStep === i
? "bg-indigo-600 scale-125 shadow-lg shadow-indigo-500/50"
: "bg-indigo-200 hover:bg-indigo-300 hover:scale-110"
}`}
/>
{activeStep === i && (
<>
<span className="absolute inset-[-6px] rounded-full border-2 border-indigo-400 animate-pulse-ring" />
<span className="absolute inset-[-6px] rounded-full border border-indigo-300 opacity-50" />
</>
)}
<span className="absolute left-8 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-indigo-950 text-white text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
{step.title}
</span>
</button>
))}
</div>

<div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 text-center pointer-events-none select-none">
<div className="flex items-center justify-center gap-3 mb-2">
<div className="w-12 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
<p className="text-[10px] font-black tracking-[0.3em] uppercase text-indigo-500 tabular-nums">
0{activeStep + 1} / 04
</p>
<div className="w-12 h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent" />
</div>
<p
className="font-black uppercase tracking-[0.08em] leading-none text-indigo-950/[0.05]"
style={{
fontSize: "clamp(2.5rem,8vw,5.5rem)",
textShadow: "0 4px 30px rgba(79,70,229,0.12)",
}}
>
{STEPS[activeStep]?.title || ""}
</p>
</div>

{showHint && (
<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 animate-fadeIn">
<p className="text-[9px] font-mono tracking-[0.2em] uppercase text-indigo-400">
↓ Scroll to explore all 4 steps ↓
</p>
</div>
)}
</div>
</section>
</>
);
}