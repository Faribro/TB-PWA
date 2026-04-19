"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Shield, Sparkles, ChevronRight } from "lucide-react";
import mermaid from "mermaid";

export default function PatientTimelineMermaid() {
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidRendered, setMermaidRendered] = useState(false);

  // Ultra-premium Mermaid diagram definition
  const mermaidDiagram = `
%%{
  init: {
    'theme': 'base',
    'themeVariables': {
      'primaryColor': '#ffffff',
      'primaryTextColor': '#0f172a',
      'primaryBorderColor': '#e2e8f0',
      'lineColor': '#cbd5e1',
      'secondaryColor': '#f8fafc',
      'tertiaryColor': '#f1f5f9',
      'background': 'transparent',
      'mainBkg': 'transparent',
      'nodeBorder': '#e2e8f0',
      'clusterBkg': '#f8fafc',
      'clusterBorder': '#cbd5e1',
      'titleColor': '#334155',
      'edgeLabelBackground': '#ffffff',
      'fontFamily': '"Inter", ui-sans-serif, system-ui, sans-serif'
    }
  }
}%%
graph TB
    Start([Day 0: Barrack Deployment]):::complete
    XRay[X-Ray Capture<br/><small class="mermaid-small">&lt; 30 sec</small>]:::complete
    AI[AI Analysis<br/><small class="mermaid-small">99.2% accuracy</small>]:::complete
    Triage{Triage Decision<br/><small class="mermaid-small font-semibold">342 flagged</small>}:::current
    
    subgraph Confirmatory["Confirmatory Testing"]
        CBNAAT[CBNAAT / Truenat<br/><small class="mermaid-small">&lt; 2h result</small>]:::pending
        Merge1[ ]:::merge
    end
    
    Treatment[Treatment Initiated<br/><small class="mermaid-small font-semibold">89 confirmed</small>]:::pending
    End([RNTCP Enrollment]):::pending
    
    Start --> XRay
    XRay --> AI
    AI --> Triage
    Triage -->|High Risk| CBNAAT
    Triage -.->|Normal| Merge1
    CBNAAT --> Merge1
    Merge1 --> Treatment
    Treatment --> End
    
    classDef complete fill:#ecfdf5,stroke:#34d399,stroke-width:2px,color:#065f46,rx:12,ry:12
    classDef current fill:#fffbeb,stroke:#fbbf24,stroke-width:2px,color:#92400e,rx:12,ry:12
    classDef pending fill:#f8fafc,stroke:#cbd5e1,stroke-width:1px,stroke-dasharray: 4 4,color:#64748b,rx:12,ry:12
    classDef merge fill:transparent,stroke:none
    
    style Confirmatory fill:#fdfaed,fill-opacity:0.3,stroke:#fde047,stroke-width:1px,stroke-dasharray: 3 3,rx:20,ry:20
  `;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (!isVisible) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
        padding: 30,
        nodeSpacing: 70,
        rankSpacing: 90,
      },
    });

    const renderDiagram = async () => {
      if (!mermaidRef.current) return;

      try {
        // Use a random ID suffix to force a re-render and avoid cache issues
        const id = `mermaid-timeline-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, mermaidDiagram);
        mermaidRef.current.innerHTML = svg;
        setMermaidRendered(true);
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    renderDiagram();
  }, [isVisible, mermaidDiagram]);

  const completedSteps = 3;
  const totalSteps = 6;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[1400px] mx-auto my-12 group px-6"
    >
      {/* Animated Background Mesh */}
      <div className="absolute inset-x-6 inset-y-0 rounded-[2.5rem] bg-gradient-to-b from-white/80 to-white/40 backdrop-blur-xl border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden transition-all duration-700 group-hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] group-hover:border-white/80">
        
        {/* Glow Spheres */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-emerald-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-60 group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-60 group-hover:opacity-100 transition-opacity duration-1000 delay-100" />
        <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[40%] bg-amber-100/40 rounded-full blur-[100px] pointer-events-none mix-blend-multiply opacity-60 group-hover:opacity-100 transition-opacity duration-1000 delay-200" />
        
        {/* Grain Texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      <div className="relative z-10 p-8 sm:p-12">
        {/* HEADER SECTION */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          
          <div className="flex-1 space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/70 border border-slate-200/60 shadow-sm backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Clinical Protocol
              </span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]"
            >
              From Screening <br className="hidden sm:block" />
              <span className="text-slate-400 font-light">to Treatment</span>
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 15 }}
              animate={isVisible ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-base sm:text-lg text-slate-500 font-medium leading-relaxed max-w-xl"
            >
              A structured 5-day clinical protocol mapping the exact journey from initial barrack deployment to confirmed RNTCP enrollment.
            </motion.p>
          </div>

          {/* Premium Progress Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.3, type: "spring", stiffness: 100 }}
            className="shrink-0 group/card relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 rounded-2xl blur-xl transition-all duration-500 group-hover/card:blur-2xl" />
            <div className="relative bg-white/80 backdrop-blur-xl border border-white shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:min-w-[240px]">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
                    Overall Progress
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                      {progressPercent}
                    </span>
                    <span className="text-xl font-bold text-slate-400">%</span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              
              <div className="relative h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={isVisible ? { width: `${progressPercent}%` } : { width: 0 }}
                  transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                >
                  <div className="absolute top-0 right-0 w-4 h-full bg-white/40 blur-[2px]" />
                </motion.div>
              </div>
              <div className="mt-3 flex justify-between items-center text-xs font-semibold text-slate-500">
                <span>{completedSteps} Steps Completed</span>
                <span>{totalSteps} Total</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* DIAGRAM CONTAINER (Glass Platform) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white/40 backdrop-blur-sm border border-white/60 shadow-inner rounded-3xl p-6 sm:p-10 mb-8 overflow-hidden group/diagram"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#slate-100_1px,transparent_1px),linear-gradient(to_bottom,#slate-100_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_20%,transparent_100%)] opacity-20 pointer-events-none" />
          
          <div className="relative flex justify-center w-full overflow-x-auto diagram-scroll">
             <div
               ref={mermaidRef}
               className="mermaid-container w-full min-w-[700px] max-w-4xl"
               style={{
                 display: "flex",
                 justifyContent: "center",
                 alignItems: "center",
               }}
             />
             
             {!mermaidRendered && (
               <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-2xl">
                 <div className="flex flex-col items-center gap-4">
                   <div className="relative w-12 h-12">
                     <div className="absolute inset-0 border-2 border-emerald-100 rounded-full" />
                     <div className="absolute inset-0 border-2 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                     Rendering Protocol...
                   </span>
                 </div>
               </div>
             )}
          </div>
        </motion.div>

        {/* FOOTER LEGEND */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={isVisible ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-between gap-6 px-4"
        >
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></span>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Complete</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-600">Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full border border-slate-300 bg-slate-50" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Pending</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl flex items-center gap-2 transition-all hover:shadow-md cursor-pointer">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-700">RNTCP Compliant</span>
              <ChevronRight className="w-3 h-3 text-indigo-400" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Global overrides for ultra-premium Mermaid styling */}
      <style jsx global>{`
        .diagram-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .diagram-scroll::-webkit-scrollbar-track {
          background: rgba(241, 245, 249, 0.5);
          border-radius: 4px;
        }
        .diagram-scroll::-webkit-scrollbar-thumb {
          background: rgba(203, 213, 225, 0.8);
          border-radius: 4px;
        }

        .mermaid-container svg {
          max-width: 100%;
          height: auto;
          filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.02));
        }

        /* typography refinement */
        .mermaid-container text {
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif !important;
        }

        .mermaid-container .nodeLabel {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #0f172a !important;
          line-height: 1.4 !important;
        }

        .mermaid-container .mermaid-small {
          font-size: 11px;
          color: #64748b;
          display: block;
          margin-top: 4px;
          font-weight: 500;
        }

        /* Beautiful Subgraph (Confirmatory Testing) */
        .mermaid-container .cluster rect {
          fill: rgba(253, 250, 237, 0.4) !important;
          stroke: rgba(250, 204, 21, 0.4) !important;
          stroke-width: 1.5px !important;
          stroke-dasharray: 4 4 !important;
        }

        .mermaid-container .cluster-label text {
          font-size: 10px !important;
          font-weight: 800 !important;
          fill: #ca8a04 !important; /* amber-600 */
          text-transform: uppercase !important;
          letter-spacing: 0.15em !important;
        }

        /* Edge Labels - Pills */
        .mermaid-container .edgeLabel {
          font-size: 10px !important;
          font-weight: 700 !important;
          color: #475569 !important;
          background-color: rgba(255, 255, 255, 0.95) !important;
          padding: 4px 8px !important;
          border-radius: 6px !important;
          border: 1px solid rgba(226, 232, 240, 0.8) !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }

        /* Smooth Edges */
        .mermaid-container .flowchart-link {
          stroke: #94a3b8 !important;
          stroke-width: 2px !important;
          transition: stroke 0.3s ease;
        }
        
        .mermaid-container .flowchart-link:hover {
          stroke: #3b82f6 !important;
          stroke-width: 3px !important;
        }

        /* Arrow heads */
        .mermaid-container .arrowheadPath {
          fill: #94a3b8 !important;
          stroke: none !important;
        }

        /* Glowing Nodes */
        .mermaid-container .node.current polygon,
        .mermaid-container .node.current rect {
          filter: drop-shadow(0 8px 24px rgba(245, 158, 11, 0.25)) !important;
          transition: all 0.3s ease;
        }
        
        .mermaid-container .node.current:hover polygon,
        .mermaid-container .node.current:hover rect {
          filter: drop-shadow(0 12px 30px rgba(245, 158, 11, 0.4)) !important;
          transform: translateY(-2px);
        }

        .mermaid-container .node.complete rect,
        .mermaid-container .node.complete circle {
          filter: drop-shadow(0 4px 16px rgba(16, 185, 129, 0.15)) !important;
          transition: all 0.3s ease;
        }
        
        .mermaid-container .node.complete:hover rect,
        .mermaid-container .node.complete:hover circle {
          filter: drop-shadow(0 8px 24px rgba(16, 185, 129, 0.25)) !important;
          transform: translateY(-2px);
        }
        
        .mermaid-container .node.pending rect,
        .mermaid-container .node.pending circle {
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.02)) !important;
        }
      `}</style>
    </div>
  );
}
