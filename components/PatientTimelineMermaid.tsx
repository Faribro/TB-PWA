"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Shield } from "lucide-react";
import mermaid from "mermaid";

export default function PatientTimelineMermaid() {
  const [isVisible, setIsVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [mermaidRendered, setMermaidRendered] = useState(false);

  // Mermaid diagram definition
  const mermaidDiagram = `
%%{init: {'theme':'base', 'themeVariables': { 'primaryColor':'#f8fafc','primaryTextColor':'#1e293b','primaryBorderColor':'#cbd5e1','lineColor':'#94a3b8','secondaryColor':'#f1f5f9','tertiaryColor':'#e2e8f0','background':'#ffffff','mainBkg':'#ffffff','nodeBorder':'#cbd5e1','clusterBkg':'#f8fafc','clusterBorder':'#e2e8f0','titleColor':'#0f172a','edgeLabelBackground':'#ffffff','fontFamily':'ui-sans-serif, system-ui, sans-serif'}}}%%
graph TB
    Start([Day 0: Barrack Deployment]):::complete
    XRay[X-Ray Capture<br/><small>&lt; 30 sec</small>]:::complete
    AI[AI Analysis<br/><small>99.2% accuracy</small>]:::complete
    Triage{Triage Decision<br/><small>342 flagged</small>}:::current
    
    subgraph Confirmatory["Confirmatory Testing"]
        CBNAAT[CBNAAT / Truenat<br/><small>&lt; 2h result</small>]:::pending
        Merge1[ ]:::merge
    end
    
    Treatment[Treatment Initiated<br/><small>89 confirmed</small>]:::pending
    End([RNTCP Enrollment]):::pending
    
    Start --> XRay
    XRay --> AI
    AI --> Triage
    Triage -->|High Risk| CBNAAT
    Triage -.->|Normal| Merge1
    CBNAAT --> Merge1
    Merge1 --> Treatment
    Treatment --> End
    
    classDef complete fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef current fill:#fef3c7,stroke:#f59e0b,stroke-width:3px,color:#92400e
    classDef pending fill:#f1f5f9,stroke:#cbd5e1,stroke-width:2px,color:#64748b
    classDef merge fill:#ffffff,stroke:#e2e8f0,stroke-width:1px,stroke-dasharray: 5 5,color:#94a3b8
    
    style Confirmatory fill:#fefce8,stroke:#fde047,stroke-width:1px,stroke-dasharray: 3 3
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

  // Initialize and render Mermaid
  useEffect(() => {
    if (!isVisible || mermaidRendered) return;

    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      securityLevel: "loose",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: "basis",
        padding: 20,
        nodeSpacing: 60,
        rankSpacing: 80,
      },
    });

    const renderDiagram = async () => {
      if (!mermaidRef.current) return;

      try {
        const { svg } = await mermaid.render("mermaid-timeline", mermaidDiagram);
        mermaidRef.current.innerHTML = svg;
        setMermaidRendered(true);
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    renderDiagram();
  }, [isVisible, mermaidRendered, mermaidDiagram]);

  const completedSteps = 3;
  const totalSteps = 6;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
    >
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50/40 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-50/30 to-transparent rounded-full blur-3xl" />
      </div>

      {/* HEADER */}
      <div className="relative px-8 pt-8 pb-6 border-b border-slate-100">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-sm">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-600">
                Clinical Protocol
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight mb-2">
              From Screening to Treatment
            </h2>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-2xl">
              A structured 5-day clinical protocol — barrack deployment to RNTCP enrollment.
            </p>
          </div>

          {/* Progress indicator */}
          <div className="flex-shrink-0">
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-900">
                  {completedSteps}/{totalSteps}
                </span>
                <span className="text-xs font-medium text-slate-500">Complete</span>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {progressPercent}% Progress
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={isVisible ? { width: `${progressPercent}%` } : { width: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </div>
      </div>

      {/* MERMAID DIAGRAM */}
      <div className="relative px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          className="flex justify-center"
        >
          <div
            ref={mermaidRef}
            className="mermaid-container w-full max-w-4xl"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          />
        </motion.div>

        {/* Loading state */}
        {!mermaidRendered && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-xs font-medium text-slate-500">
                Loading clinical flow...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER STRIP */}
      <div className="relative px-8 pb-6 pt-5 border-t border-slate-100">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-slate-600">
                Complete
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-xs font-semibold text-slate-600">
                Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
              <span className="text-xs font-semibold text-slate-600">
                Pending
              </span>
            </div>
          </div>

          {/* RNTCP badge */}
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
              RNTCP Protocol
            </span>
          </div>
        </div>
      </div>

      {/* Custom CSS for Mermaid styling */}
      <style jsx global>{`
        .mermaid-container svg {
          max-width: 100%;
          height: auto;
        }

        /* Hide noisy subgraph labels */
        .mermaid-container .cluster-label {
          font-size: 11px;
          font-weight: 600;
          fill: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Node text styling */
        .mermaid-container .nodeLabel {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
        }

        /* Edge labels */
        .mermaid-container .edgeLabel {
          font-size: 11px;
          font-weight: 500;
          background-color: #ffffff;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Smooth edges */
        .mermaid-container .flowchart-link {
          stroke-width: 2px;
        }

        /* Decision node (diamond) */
        .mermaid-container .node.current polygon {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.3));
        }

        /* Completed nodes glow */
        .mermaid-container .node.complete rect,
        .mermaid-container .node.complete circle {
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.2));
        }
      `}</style>
    </div>
  );
}
