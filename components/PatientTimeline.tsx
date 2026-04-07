"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Brain,
  CheckCircle,
  Microscope,
  ScanLine,
  Truck,
} from "lucide-react";

const TIMELINE_STEPS = [
  {
    id: 1,
    phase: "Day 0",
    title: "Barrack Deployment",
    desc: "Mobile X-Ray van arrives at barrack. Patient registered, consent taken, biometric ID tagged in real time.",
    stat: "~4 min/patient",
    color: "#10b981",
    Icon: Truck,
  },
  {
    id: 2,
    phase: "Day 0",
    title: "X-Ray Capture",
    desc: "Chest X-Ray acquired on-site. Image compressed and transmitted to AI inference server in under 30 seconds.",
    stat: "< 30 sec",
    color: "#6366f1",
    Icon: ScanLine,
  },
  {
    id: 3,
    phase: "Day 0 +1h",
    title: "AI Analysis",
    desc: "Neural network scores the radiograph. TB probability, confidence band, and lesion heatmap returned to clinician.",
    stat: "99.2% accuracy",
    color: "#8b5cf6",
    Icon: Brain,
  },
  {
    id: 4,
    phase: "Day 1",
    title: "Triage Decision",
    desc: "High-probability suspects surfaced for medical officer review. Priority queue generated. Field team alerted.",
    stat: "342 flagged",
    color: "#f59e0b",
    Icon: AlertCircle,
  },
  {
    id: 5,
    phase: "Day 2–3",
    title: "CBNAAT / Truenat",
    desc: "Sputum sample collected and processed. Microbiological confirmation via WHO-approved rapid molecular test.",
    stat: "< 2h result",
    color: "#f43f5e",
    Icon: Microscope,
  },
  {
    id: 6,
    phase: "Day 3–5",
    title: "Treatment Initiated",
    desc: "Confirmed cases enrolled in RNTCP. DOTS therapy initiated. District nodal officer and NIKSHAY portal notified.",
    stat: "89 confirmed",
    color: "#14b8a6",
    Icon: CheckCircle,
  },
] as const;

const hexToRgb = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export default function PatientTimeline() {
  const [lineVisible, setLineVisible] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState<Set<number>>(new Set());

  const sectionRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const sectionEl = sectionRef.current;
    if (!sectionEl) return;
    if (reducedMotion) {
      setLineVisible(true);
      setHeaderVisible(true);
      return;
    }

    const sectionObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLineVisible(true);
          setHeaderVisible(true);
          sectionObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.05 }
    );

    sectionObserver.observe(sectionEl);

    return () => sectionObserver.disconnect();
  }, [reducedMotion]);

  useEffect(() => {
    if (reducedMotion) {
      cardRefs.current.forEach((card, idx) => {
        card?.classList.add("card-visible");
        dotRefs.current[idx]?.classList.add("dot-visible");
      });
      setVisibleSteps(new Set(TIMELINE_STEPS.map((_, idx) => idx)));
      return;
    }

    const cardObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = Number(entry.target.getAttribute("data-idx") ?? -1);
          if (idx >= 0) {
            entry.target.classList.add("card-visible");
            dotRefs.current[idx]?.classList.add("dot-visible");
            setVisibleSteps((prev) => {
              const next = new Set(prev);
              next.add(idx);
              return next;
            });
          }
          cardObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );

    cardRefs.current.forEach((card) => {
      if (card) cardObserver.observe(card);
    });

    return () => cardObserver.disconnect();
  }, [reducedMotion]);

  return (
    <section
      aria-label="Patient timeline from screening to treatment"
      style={{
        width: "100%",
        padding: "120px 24px 140px",
        background: "transparent",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style jsx>{`
        @keyframes dot-ring-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.6);
            opacity: 0;
          }
        }
        @keyframes card-shimmer {
          0% {
            transform: translateX(-100%) skewX(-15deg);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          100% {
            transform: translateX(200%) skewX(-15deg);
            opacity: 0;
          }
        }
        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .pt-header-enter {
          opacity: 0;
          transform: translateY(24px);
          transition: all 0.9s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pt-header-enter.header-visible {
          opacity: 1;
          transform: translateY(0);
        }

        .pt-dot-enter {
          opacity: 0;
          transform: scale(0);
        }
        .pt-dot-enter.dot-visible {
          opacity: 1;
          transform: scale(1);
        }

        .pt-card-enter {
          opacity: 0;
          transform: translateX(50px);
        }
        .pt-card-enter.card-left {
          transform: translateX(-50px);
        }
        .pt-card-enter.card-visible {
          opacity: 1;
          transform: translateX(0);
        }
        .pt-card {
          transition:
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.25s ease,
            opacity 0.5s ease,
            filter 0.5s ease;
        }
        .pt-card-enter.card-visible::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: -30%;
          width: 60%;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.06) 50%,
            transparent 100%
          );
          animation: card-shimmer 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: var(--shimmer-delay, 0s);
          pointer-events: none;
          border-radius: 1.25rem;
          overflow: hidden;
        }

        .pt-center-line {
          display: block;
        }
        .pt-mobile-line {
          display: none;
        }

        @media (max-width: 767px) {
          .pt-center-line {
            display: none;
          }
          .pt-mobile-line {
            display: block;
          }
          .pt-card-enter,
          .pt-card-enter.card-left {
            transform: translateX(50px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pt-header-enter,
          .pt-dot-enter,
          .pt-card-enter {
            opacity: 1 !important;
            transform: none !important;
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.12) 0%, transparent 58%),
            radial-gradient(ellipse at 80% 50%, rgba(139,92,246,0.12) 0%, transparent 58%)
          `,
        }}
      />

      <div
        ref={sectionRef}
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          className={`pt-header-enter ${headerVisible ? "header-visible" : ""}`}
          style={{ textAlign: "center" }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                flex: 1,
                height: "1px",
                background:
                  "linear-gradient(to right, transparent, rgba(139,92,246,0.3))",
              }}
            />
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.4em",
                textTransform: "uppercase",
                color: "rgba(139,92,246,0.7)",
                margin: "0 16px",
              }}
            >
              CLINICAL PATHWAY
            </span>
            <div
              style={{
                flex: 1,
                height: "1px",
                background:
                  "linear-gradient(to left, transparent, rgba(139,92,246,0.3))",
              }}
            />
          </div>

          <h2
            style={{
              fontWeight: 900,
              fontSize: "clamp(2rem, 4vw, 3rem)",
              color: "rgba(255,255,255,0.96)",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              marginTop: "20px",
              textAlign: "center",
              textShadow: "0 10px 34px rgba(15,23,42,0.32)",
            }}
          >
            From Screening to Treatment
          </h2>

          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.78)",
              marginTop: "12px",
              textAlign: "center",
              maxWidth: "480px",
              margin: "12px auto 0",
            }}
          >
            A structured 5-day clinical protocol — from barrack to RNTCP
            enrollment.
          </p>
        </div>

        <div style={{ position: "relative", marginTop: "80px" }}>
          <div
            className="pt-center-line"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "1px",
              height: "100%",
              background:
                "linear-gradient(to bottom, transparent 0%, rgba(139,92,246,0.15) 8%, rgba(139,92,246,0.15) 92%, transparent 100%)",
            }}
          />
          <div
            className="pt-center-line"
            style={{
              position: "absolute",
              left: "50%",
              transform: "translateX(-50%)",
              width: "2px",
              top: 0,
              height: lineVisible ? "100%" : "0%",
              background:
                "linear-gradient(to bottom, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.6) 40%, rgba(139,92,246,0.5) 70%, rgba(20,184,166,0.8) 100%)",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)",
              transition: "height 2.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s",
            }}
          />
          <div
            className="pt-mobile-line"
            style={{
              position: "absolute",
              left: "20px",
              top: 0,
              width: "2px",
              height: "100%",
              background:
                "linear-gradient(to bottom, rgba(139,92,246,0.8) 0%, rgba(99,102,241,0.6) 40%, rgba(139,92,246,0.5) 70%, rgba(20,184,166,0.8) 100%)",
              boxShadow: "0 0 12px rgba(139,92,246,0.4)",
            }}
          />

          {TIMELINE_STEPS.map((s, i) => {
            const leftSide = i % 2 === 0;
            const iconRgb = hexToRgb(s.color);
            const hovered = hoveredId === s.id;
            const delay = `${i * 0.12 + 0.1}s`;
            const dotDelay = `${i * 0.12}s`;

            return (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  justifyContent: isMobile
                    ? "flex-end"
                    : leftSide
                      ? "flex-end"
                      : "flex-start",
                  alignItems: "center",
                  position: "relative",
                  marginBottom: "64px",
                  paddingLeft: isMobile ? "48px" : 0,
                }}
              >
                <div
                  className={`pt-dot-enter`}
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  style={{
                    position: "absolute",
                    left: isMobile ? "20px" : "50%",
                    top: "50%",
                    transform: isMobile
                      ? "translate(-50%, -50%)"
                      : "translate(-50%, -50%)",
                    zIndex: 3,
                    transition:
                      "transform 0.6s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
                    transitionDelay: dotDelay,
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      border: `1px solid ${s.color}40`,
                      animation: "dot-ring-pulse 2.5s ease-in-out infinite",
                      animationDelay: `${i * 0.4}s`,
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%,-50%)",
                    }}
                  />
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: s.color,
                      boxShadow: `0 0 0 3px rgba(${iconRgb},0.2), 0 0 20px ${s.color}99`,
                      position: "relative",
                      zIndex: 2,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0px",
                    flexDirection: isMobile ? "row" : leftSide ? "row-reverse" : "row",
                  }}
                >
                  <div
                    style={{
                      height: "2px",
                      width: "48px",
                      background:
                        isMobile
                          ? `linear-gradient(to left, transparent, ${s.color}80)`
                          : leftSide
                            ? `linear-gradient(to right, transparent, ${s.color}80)`
                            : `linear-gradient(to left, transparent, ${s.color}80)`,
                    }}
                  />

                  <div
                    data-idx={i}
                    ref={(el) => {
                      cardRefs.current[i] = el;
                    }}
                    className={`pt-card pt-card-enter ${!isMobile && leftSide ? "card-left" : ""}`}
                    onMouseEnter={() => setHoveredId(s.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      ["--shimmer-delay" as string]: delay,
                      maxWidth: isMobile ? "calc(100vw - 80px)" : "440px",
                      flexShrink: 0,
                      background: "rgba(28, 24, 66, 0.86)",
                      backdropFilter: "blur(24px) saturate(180%)",
                      WebkitBackdropFilter: "blur(24px) saturate(180%)",
                      borderWidth: "1px",
                      borderStyle: "solid",
                      borderRadius: "1.25rem",
                      padding: "1.5rem",
                      position: "relative",
                      overflow: "hidden",
                      cursor: "default",
                      transition:
                        "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: delay,
                      opacity: visibleSteps.has(i) ? 1 : 0.88,
                      filter: visibleSteps.has(i) ? "none" : "grayscale(0.22)",
                      borderColor: hovered ? `${s.color}33` : "rgba(255,255,255,0.07)",
                      boxShadow: hovered
                        ? `0 0 50px ${s.color}18, 0 16px 40px rgba(0,0,0,0.4)`
                        : "none",
                      transform: hovered && !reducedMotion ? "translateY(-4px)" : undefined,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: "-40px",
                        left: "-40px",
                        width: "120px",
                        height: "120px",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${s.color}20, transparent 70%)`,
                        filter: "blur(30px)",
                        pointerEvents: "none",
                      }}
                    />

                    <div
                      style={{
                        position: "absolute",
                        bottom: "-10px",
                        right: "16px",
                        fontSize: "6rem",
                        fontWeight: 900,
                        lineHeight: 1,
                        color: "rgba(255,255,255,0.025)",
                        userSelect: "none",
                        fontVariantNumeric: "tabular-nums",
                        pointerEvents: "none",
                      }}
                    >
                      {`0${s.id}`}
                    </div>

                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "0.75rem",
                            background: `${s.color}18`,
                            border: `1px solid ${s.color}30`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <s.Icon size={20} color={s.color} strokeWidth={2} />
                        </div>
                        <div
                          style={{
                            fontSize: "9px",
                            fontWeight: 700,
                            letterSpacing: "0.3em",
                            textTransform: "uppercase",
                            fontFamily: "monospace",
                            color: s.color,
                            background: `${s.color}12`,
                            border: `1px solid ${s.color}25`,
                            borderRadius: "9999px",
                            padding: "4px 10px",
                          }}
                        >
                          {s.phase}
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          letterSpacing: "0.25em",
                          color: "rgba(255,255,255,0.45)",
                          textTransform: "uppercase",
                          marginTop: "14px",
                        }}
                      >
                        {`STEP 0${s.id} OF 06`}
                      </div>

                      <h3
                        style={{
                          fontSize: "1.125rem",
                          fontWeight: 900,
                          color: "rgba(255,255,255,0.98)",
                          letterSpacing: "-0.02em",
                          lineHeight: 1.3,
                          marginTop: "6px",
                        }}
                      >
                        {s.title}
                      </h3>

                      <p
                        style={{
                          fontSize: "0.8125rem",
                          lineHeight: 1.75,
                          color: "rgba(255,255,255,0.76)",
                          marginTop: "10px",
                          maxWidth: "360px",
                        }}
                      >
                        {s.desc}
                      </p>

                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                          marginTop: "16px",
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: "9999px",
                          padding: "5px 12px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: s.color,
                            boxShadow: `0 0 6px ${s.color}`,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.82)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {s.stat}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "48px",
            paddingTop: "32px",
            borderTop: "1px solid rgba(139,92,246,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "6px",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            {TIMELINE_STEPS.map((step, idx) => (
              <div
                key={step.id}
                style={{
                  height: "3px",
                  flex: 1,
                  maxWidth: "60px",
                  borderRadius: "9999px",
                  background: visibleSteps.has(idx) ? step.color : "rgba(255,255,255,0.08)",
                  boxShadow: visibleSteps.has(idx) ? `0 0 8px ${step.color}` : "none",
                  transition: "background 0.4s ease, box-shadow 0.4s ease",
                  transitionDelay: `${idx * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "#14b8a6",
              boxShadow:
                "0 0 0 4px rgba(20,184,166,0.15), 0 0 20px rgba(20,184,166,0.5)",
              display: "inline-block",
              marginBottom: "14px",
              animation: "dot-ring-pulse 2.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "rgba(20,184,166,0.5)",
              lineHeight: 2,
            }}
          >
            <div>▸ TREATMENT INITIATED · RNTCP ENROLLMENT VERIFIED</div>
            <div>▸ NIKSHAY SYNCHRONIZED · DOTS PROTOCOL ACTIVATED</div>
            <div style={{ marginTop: "8px", color: "rgba(139,92,246,0.4)" }}>
              ▸ READY FOR NEXT FIELD ESCALATION
              <span
                style={{
                  animation: "blink 1s step-end infinite",
                  borderRight: "2px solid rgba(139,92,246,0.6)",
                  marginLeft: "4px",
                }}
              >
                &nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}