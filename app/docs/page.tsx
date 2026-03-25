'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, FileText, Shield, Database, Users, AlertTriangle, 
  CheckCircle, Info, ChevronDown, ChevronRight, Network, 
  Map, GitBranch, Search, Home
} from 'lucide-react';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

function Callout({ type, title, children }: { type: 'info' | 'warning' | 'success'; title: string; children: React.ReactNode }) {
  const config = {
    info: { icon: Info, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', iconColor: 'text-blue-600' },
    warning: { icon: AlertTriangle, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', iconColor: 'text-amber-600' },
    success: { icon: CheckCircle, bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', iconColor: 'text-emerald-600' },
  };

  const { icon: Icon, bg, border, text, iconColor } = config[type];

  return (
    <div className={`${bg} ${border} border-l-4 p-6 rounded-xl mb-6`}>
      <div className="flex items-start gap-4">
        <Icon className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-1`} />
        <div>
          <h4 className={`text-sm font-black uppercase tracking-wider ${text} mb-2`}>{title}</h4>
          <div className={`text-sm ${text} opacity-90`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ activeSection, onSectionChange }: { activeSection: string; onSectionChange: (section: string) => void }) {
  const sections = [
    { id: 'overview', label: 'System Overview', icon: Home },
    { id: 'architecture', label: 'Architecture & Workflow', icon: Network },
    { id: 'protocol', label: '7-Step M&E Protocol', icon: CheckCircle },
    { id: 'vertex', label: 'Vertex Operations', icon: Network },
    { id: 'gis', label: 'GIS Spatial Mapping', icon: Map },
    { id: 'pipeline', label: 'Pipeline Protocol', icon: GitBranch },
    { id: 'security', label: 'Security Protocols', icon: Shield },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'data', label: 'Data Integrity', icon: Database },
  ];

  return (
    <aside className="w-64 flex-shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-slate-200 bg-white p-6">
      <div className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Navigation</h2>
        <nav className="space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="pt-6 border-t border-slate-200">
        <Link href="/dashboard/command-hub">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
            <ChevronRight className="w-3 h-3" />
            Back to Command Hub
          </button>
        </Link>
      </div>
    </aside>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('overview');

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-12">
          <div className="mb-12 border-b border-slate-200 pb-8">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-5xl font-black tracking-[0.4em] text-slate-900 mb-4">KNOWLEDGE VAULT</h1>
              <p className="text-lg text-slate-600">National Health Intelligence Documentation & SOPs</p>
            </motion.div>
          </div>

          <div className="prose prose-slate max-w-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeSection === 'overview' && (
                  <div>
                    <Callout type="info" title="Clinical Urgency Summary">
                      SAMADHAAN is a mission-critical health surveillance platform designed for TB patient tracking
                      in correctional facilities. All personnel must adhere to strict data integrity protocols.
                    </Callout>

                    <h2 className="text-3xl font-black text-slate-900 mb-6">System Architecture</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      SAMADHAAN integrates real-time patient data from multiple sources including KoboToolbox,
                      Google Sheets, and Supabase. The system provides:
                    </p>
                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">Neural network visualization of patient flow</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">Geographic intelligence mapping with 3D choropleth</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">Automated SLA breach detection and triage</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-700">AI-powered voice assistant (Sonic)</span>
                      </li>
                    </ul>

                    <Callout type="warning" title="Security Protocol">
                      All sessions expire after 8 hours (28,800 seconds). Users must re-authenticate to continue.
                      Admin access requires role verification at the middleware level.
                    </Callout>
                  </div>
                )}

                {activeSection === 'architecture' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Introduction to SAMADHAAN Engine</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      SAMADHAAN transforms raw screening data into actionable intelligence through a multi-stage pipeline.
                      The system operates on the principle of <strong>continuous data refinement</strong>, where each stage
                      adds layers of validation, enrichment, and intelligence.
                    </p>

                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Data Flow Architecture</h3>
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black">1</div>
                          <div>
                            <h4 className="font-bold text-slate-900">Data Ingestion</h4>
                            <p className="text-sm text-slate-600">KoboToolbox webhook → Supabase patients table</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-black">2</div>
                          <div>
                            <h4 className="font-bold text-slate-900">Normalization</h4>
                            <p className="text-sm text-slate-600">Geographic key normalization, date parsing, PII sanitization</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white font-black">3</div>
                          <div>
                            <h4 className="font-bold text-slate-900">Enrichment</h4>
                            <p className="text-sm text-slate-600">Phase calculation, SLA breach detection, duplicate flagging</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black">4</div>
                          <div>
                            <h4 className="font-bold text-slate-900">Visualization</h4>
                            <p className="text-sm text-slate-600">Real-time dashboards, 3D maps, neural network graphs</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Callout type="info" title="Pro-Tip for State Program Managers">
                      The system automatically calculates patient phases based on screening date, referral date, and ATT start date.
                      You don't need to manually update phase fields—focus on ensuring accurate date entry.
                    </Callout>
                  </div>
                )}

                {activeSection === 'protocol' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">The 7-Step M&E Protocol</h2>
                    <p className="text-slate-700 leading-relaxed mb-8">
                      This protocol defines the operational workflow for Monitoring & Evaluation teams to maintain
                      data integrity and drive programmatic improvements.
                    </p>

                    <div className="space-y-8">
                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-black flex-shrink-0">1</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Research & Identify</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Begin by understanding the current state of your data. Use the <strong>Vertex Dashboard</strong> to
                              identify temporal patterns and the <strong>GIS Map</strong> to spot geographic anomalies. Look for
                              districts with unusually high breach rates or facilities with zero activity.
                            </p>
                          </div>
                        </div>
                        <Callout type="info" title="Pro-Tip">
                          Use the Magic Lens feature (Alt + Hover) on the GIS map for instant district-level insights without
                          navigating away from the map view.
                        </Callout>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-black flex-shrink-0">2</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Define Goals</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Set measurable targets for your intervention. Examples: "Reduce SLA breach rate in District X from
                              45% to 20% within 30 days" or "Achieve 95% ATT initiation rate for diagnosed cases."
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white font-black flex-shrink-0">3</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">The Master Sync</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Navigate to <strong>Settings → Data & Sync</strong> and trigger a manual sync to pull the latest
                              data from KoboToolbox. This ensures you're working with the most current dataset. The system will
                              automatically revalidate all records and recalculate metrics.
                            </p>
                          </div>
                        </div>
                        <Callout type="warning" title="Important">
                          Master Sync can take 30-60 seconds for large datasets (10,000+ records). Do not navigate away during
                          the sync process.
                        </Callout>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center text-white font-black flex-shrink-0">4</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Iterate Surgically</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Use the <strong>M&E Hub → Duplicate Assassin</strong> to systematically review and merge duplicate
                              records. Process 10-20 duplicates per session to maintain focus. Use the confidence score to
                              prioritize high-probability matches.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-white font-black flex-shrink-0">5</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Isolate Problems</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Use the <strong>Integrity Scanner</strong> to identify data quality issues. Filter by severity
                              (High/Medium) and resolve critical violations first. Common issues include missing referral dates,
                              illogical date sequences, and incomplete facility information.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black flex-shrink-0">6</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Understand the Pipeline</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Analyze the <strong>Care Cascade</strong> to identify drop-off points. If the "Diagnosed → ATT
                              Initiated" conversion rate is below 95%, investigate facility-level barriers. Use the
                              <strong>SLA Kanban</strong> to track aging cases and prioritize interventions.
                            </p>
                          </div>
                        </div>
                        <Callout type="success" title="Success Metric">
                          A healthy cascade shows &gt;90% conversion at each stage. If any stage drops below 70%, immediate
                          programmatic intervention is required.
                        </Callout>
                      </div>

                      <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white font-black flex-shrink-0">7</div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Build in Public</h3>
                            <p className="text-slate-700 leading-relaxed">
                              Document your findings and share insights with stakeholders. Use the <strong>Export to Excel</strong>
                              feature in the M&E Hub to generate reports with verified Client IDs. Schedule weekly review meetings
                              to discuss trends and adjust strategies.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Callout type="info" title="Pro-Tip for State Program Managers">
                      Run the 7-Step Protocol weekly for the first month, then bi-weekly once data quality stabilizes above 85%.
                      Track your Data Health Score in the M&E Hub—aim for 90+ consistently.
                    </Callout>
                  </div>
                )}

                {activeSection === 'vertex' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Vertex Operations Manual</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      The Vertex Dashboard provides a neural network visualization of patient data with an interactive
                      calendar-based timeline. This module is designed for temporal analysis and facility-level drill-down.
                    </p>

                    <Accordion type="single" collapsible className="mb-8">
                      <AccordionItem value="calendar" className="border border-slate-200 rounded-xl px-6 mb-4">
                        <AccordionTrigger className="text-lg font-bold text-slate-900 hover:no-underline">
                          Calendar Navigation
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-700 pt-4">
                          <ol className="list-decimal list-inside space-y-2">
                            <li>Select a date from the calendar grid to view patients screened on that day</li>
                            <li>Use state/district filters to narrow down geographic scope</li>
                            <li>Toggle between "Volume" and "Alerts" view modes using the tab selector</li>
                            <li>Click on facility cards to open the patient pipeline drawer</li>
                          </ol>
                        </AccordionContent>
                      </AccordionItem>

                      <AccordionItem value="metrics" className="border border-slate-200 rounded-xl px-6 mb-4">
                        <AccordionTrigger className="text-lg font-bold text-slate-900 hover:no-underline">
                          Spark Metrics Interpretation
                        </AccordionTrigger>
                        <AccordionContent className="text-slate-700 pt-4">
                          <ul className="space-y-3">
                            <li><strong>Total Screened:</strong> Count of patients screened on selected date</li>
                            <li><strong>On Track:</strong> Patients with referral dates (no SLA breach)</li>
                            <li><strong>Follow-ups:</strong> Patients awaiting sputum test results</li>
                            <li><strong>Positive Diagnosed:</strong> Confirmed TB cases (tb_diagnosed = 'Y')</li>
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}

                {activeSection === 'gis' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">GIS Spatial Mapping Protocol</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      The GIS module provides 3D choropleth visualization using Deck.GL and MapLibre GL.
                    </p>
                  </div>
                )}

                {activeSection === 'pipeline' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Pipeline Protocol</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      The Follow-up Pipeline is a Kanban-style triage board for patient tracking.
                    </p>
                  </div>
                )}

                {activeSection === 'security' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Security Protocols</h2>
                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-8">
                      <h3 className="text-lg font-bold text-slate-900 mb-3">Session Management</h3>
                      <p className="text-slate-700 mb-4">
                        Sessions are enforced at 8 hours (28,800 seconds) with automatic token refresh.
                      </p>
                    </div>
                  </div>
                )}

                {activeSection === 'users' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">User Management</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      User management is restricted to Admin and PM roles.
                    </p>
                  </div>
                )}

                {activeSection === 'data' && (
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 mb-6">Data Integrity</h2>
                    <p className="text-slate-700 leading-relaxed mb-6">
                      SAMADHAAN implements multiple layers of data validation.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <Accordion type="single" collapsible className="mt-12">
              <AccordionItem value="faq" className="border border-slate-200 rounded-xl px-6">
                <AccordionTrigger className="text-lg font-bold text-slate-900 hover:no-underline">
                  Frequently Asked Questions
                </AccordionTrigger>
                <AccordionContent className="text-slate-700 pt-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">How often should I run the Master Sync?</h4>
                      <p>Run Master Sync daily during active screening periods, or whenever you notice data discrepancies.</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 mb-2">What is the Data Health Score threshold?</h4>
                      <p>Aim for 85+ for operational readiness, 90+ for optimal performance.</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-slate-900 text-white p-8 rounded-2xl mt-12">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">System Status</p>
            <p className="text-sm">SAMADHAAN v2.0 | Production Ready | Last Updated: 2024</p>
          </div>
        </div>
      </main>
    </div>
  );
}
