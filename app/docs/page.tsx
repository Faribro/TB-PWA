'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, Plus, Edit2, Trash2, Check, X, Copy,
  Search, BookOpen, Rocket, LayoutDashboard, Stethoscope, Code2,
  Lightbulb, Info, AlertTriangle, AlertOctagon, ArrowRight, ThumbsUp, ThumbsDown, Crown, Map
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useSessionScope } from '@/hooks/useSessionScope'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useTourStore } from '@/stores/tourStore'
import { ALL_TOURS } from '@/lib/tours'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

type ArticleType = 'manual' | 'guide' | 'announcement'
type VisibleTo = 'all' | 'PC' | 'SPM' | 'ME' | 'PM'

interface Article {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  article_type: ArticleType
  visible_to: VisibleTo
  created_by_role: string
  created_by_name: string
  is_published: boolean
  is_pinned: boolean
  display_order: number
  created_at: string
  updated_at: string
  collection_id?: string
  section_id?: string
  read_time?: string
  role_label?: string
}

type ContentBlock =
  | { type: 'heading2'; text: string }
  | { type: 'heading3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'callout'; variant: 'info' | 'tip' | 'warning' | 'danger'; title: string; body: string }
  | { type: 'steps'; items: { title: string; desc: string }[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'stack-diagram'; layers: { label: string; tech: string; color: string }[] }
  | { type: 'flow-diagram'; nodes: { label: string; color: string }[] }
  | { type: 'diagram'; id: keyof typeof SVG_ILLUSTRATIONS; caption?: string }
  | { type: 'code'; language: string; code: string }

const ARTICLE_TOUR_MAP: Record<string, string> = {
  'command-hub-page': 'command-hub-tour',
  'how-to-triage': 'triage-ai-flag',
  'analytics-overview': 'generate-analytics-report',
  'user-roles-permissions': 'add-new-user',
  'map-overview': 'read-gis-map',
  'mne-overview': 'set-mne-targets',
  'understanding-ltfu': 'mark-ltfu',
  'navigating-sidebar': 'first-time-user',
}

const SVG_ILLUSTRATIONS = {
  SystemArchitectureDiagram: function SystemArchitectureDiagram() {
    const layers = [
      { y: 20, name: 'Mobile X-Ray Units', label: 'FIELD DEVICES', color: '#14b8a6' },
      { y: 85, name: 'AI Inference Engine', label: 'NEURAL NETWORK v2.4', color: '#8b5cf6' },
      { y: 150, name: 'SAMADHAAN Platform', label: 'NEXT.JS 15 + SUPABASE', color: '#6366f1' },
      { y: 215, name: 'Azure Cloud Database', label: 'POSTGRESQL + RLS', color: '#3b82f6' },
      { y: 275, name: 'NIKSHAY / RNTCP Integration', label: 'NATIONAL HEALTH API', color: '#10b981' }
    ]
    return (
      <svg viewBox="0 0 600 320" width="100%" height="auto">
        <style>{`
          @keyframes layerReveal {
            from { transform: translateY(10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}</style>
        {layers.map((l, i) => (
          <g key={l.name} data-layer={i} style={{ animation: `layerReveal 0.45s ease-out ${i * 0.1}s both` }}>
            <circle cx="12" cy={l.y + 14} r="4" fill={l.color} />
            <text x="22" y={l.y + 18} fontSize="11" fill="#0f172a" fontWeight="600">{l.name}</text>
            <polygon points={`${120 - i * 4},${l.y} 430,${l.y} 450,${l.y + 28} ${140 - i * 4},${l.y + 28}`} fill={`${l.color}08`} stroke={`${l.color}40`} strokeWidth="1.5" />
            {i === 0 && [0, 1, 2].map((d) => <rect key={d} x={170 + d * 36} y={l.y + 8} width="22" height="12" rx="2" fill={`${l.color}25`} stroke={`${l.color}60`} />)}
            {i === 1 && (
              <>
                {[0, 1, 2, 3, 4].map((n) => <circle key={`i${n}`} cx={170 + n * 20} cy={l.y + 14} r="4" fill={`${l.color}40`} />)}
                {[0, 1, 2].map((n) => <circle key={`h${n}`} cx={205 + n * 24} cy={l.y + 14} r="4" fill={`${l.color}55`} />)}
                <circle cx="280" cy={l.y + 14} r="4" fill={`${l.color}70`} />
                {[0, 1, 2, 3, 4].flatMap((a) => [0, 1, 2].map((b) => (
                  <line key={`l${a}-${b}`} x1={170 + a * 20} y1={l.y + 14} x2={205 + b * 24} y2={l.y + 14} stroke={`${l.color}40`} />
                )))}
                {[0, 1, 2].map((a) => <line key={`o${a}`} x1={205 + a * 24} y1={l.y + 14} x2={280} y2={l.y + 14} stroke={`${l.color}40`} />)}
              </>
            )}
            {i === 2 && [0, 1, 2, 3].map((m) => <rect key={m} x={170 + m * 50} y={l.y + 8} width="38" height="12" rx="3" fill={`${l.color}22`} stroke={`${l.color}50`} />)}
            {i === 3 && [0, 1, 2].map((c) => (
              <g key={c}>
                <ellipse cx={188 + c * 44} cy={l.y + 10} rx="14" ry="5" fill={`${l.color}22`} stroke={`${l.color}55`} />
                <rect x={174 + c * 44} y={l.y + 10} width="28" height="10" fill={`${l.color}18`} stroke={`${l.color}55`} />
                <ellipse cx={188 + c * 44} cy={l.y + 20} rx="14" ry="5" fill={`${l.color}22`} stroke={`${l.color}55`} />
              </g>
            ))}
            {i === 4 && Array.from({ length: 20 }).map((_, n) => <circle key={n} cx={170 + (n % 10) * 20} cy={l.y + 8 + Math.floor(n / 10) * 12} r="1.8" fill={`${l.color}60`} />)}
            <text x="470" y={l.y + 17} fontSize="10" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{l.label}</text>
          </g>
        ))}
        {[0, 1, 2, 3].map((i) => <line key={i} x1="455" y1={48 + i * 65} x2="455" y2={82 + i * 65} stroke="#e2e8f0" strokeDasharray="3,3" />)}
      </svg>
    )
  },
  ClinicalPathwayDiagram: function ClinicalPathwayDiagram() {
    const nodes = [
      { label: 'Barrack Deployment', day: 'Day 0', color: '#10b981' },
      { label: 'X-Ray Capture', day: 'Day 0', color: '#6366f1' },
      { label: 'AI Analysis', day: 'Day 0', color: '#8b5cf6' },
      { label: 'Triage Decision', day: 'Day 1', color: '#f59e0b' },
      { label: 'CBNAAT Test', day: 'Day 2-3', color: '#f43f5e' },
      { label: 'Treatment', day: 'Day 3-5', color: '#14b8a6' }
    ]
    const slas = ['Same day', '< 1h', '< 30s', '< 24h', '< 2h', '< 48h']
    return (
      <svg viewBox="0 0 680 160" width="100%" height="auto">
        <defs>
          {nodes.slice(0, -1).map((n, i) => (
            <linearGradient key={i} id={`g-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={n.color} />
              <stop offset="100%" stopColor={nodes[i + 1].color} />
            </linearGradient>
          ))}
        </defs>
        {nodes.map((n, i) => {
          const x = 60 + i * 110
          return (
            <g key={n.label} style={{ animation: `layerReveal .45s ease ${i * 0.15}s both` }}>
              <circle cx={x} cy="62" r="28" fill={`${n.color}10`} stroke={n.color} strokeWidth="1.5" />
              <circle cx={x} cy="62" r="18" fill={`${n.color}25`} />
              <circle cx={x} cy="62" r="6" fill={n.color} />
              <text x={x} y="104" textAnchor="middle" fontSize="10" fontWeight="600" fill="#0f172a">{n.label}</text>
              <text x={x} y="118" textAnchor="middle" fontSize="9" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{n.day}</text>
            </g>
          )
        })}
        {nodes.slice(0, -1).map((_, i) => {
          const x1 = 60 + i * 110 + 28
          const x2 = 60 + (i + 1) * 110 - 28
          return (
            <g key={`a-${i}`}>
              <path d={`M ${x1} 62 C ${(x1 + x2) / 2} 46 ${(x1 + x2) / 2} 46 ${x2} 62`} stroke={`url(#g-${i})`} fill="none" strokeWidth="1.5" />
              <polygon points={`${x2},62 ${x2 - 7},58 ${x2 - 7},66`} fill={nodes[i + 1].color} />
              <text x={(x1 + x2) / 2} y="42" textAnchor="middle" fontSize="8" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{slas[i]}</text>
            </g>
          )
        })}
      </svg>
    )
  },
  AIConfidenceBands: function AIConfidenceBands() {
    return (
      <svg viewBox="0 0 560 200" width="100%" height="auto">
        <rect x="30" y="80" width="150" height="40" fill="#10b981" rx="8" />
        <rect x="181" y="80" width="174" height="40" fill="#f59e0b" />
        <rect x="356" y="80" width="99" height="40" fill="#f97316" />
        <rect x="456" y="80" width="74" height="40" fill="#f43f5e" rx="8" />
        <line x1="390" y1="54" x2="390" y2="124" stroke="#f97316" strokeWidth="2" />
        <polygon points="390,50 382,62 398,62" fill="#f97316" />
        <text x="390" y="42" textAnchor="middle" fontSize="10" fill="#f97316" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>0.72</text>
        {[
          ['0.00-0.30', 'Low Risk', 105], ['0.30-0.65', 'Borderline', 268], ['0.65-0.85', 'Likely Suspect', 405], ['0.85-1.00', 'High Confidence', 495]
        ].map(([r, c, x]) => (
          <g key={String(r)}>
            <text x={Number(x)} y="132" textAnchor="middle" fontSize="11" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{r}</text>
            <text x={Number(x)} y="148" textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="600">{c}</text>
          </g>
        ))}
      </svg>
    )
  },
  RolePermissionsMatrix: function RolePermissionsMatrix() {
    const tiers = [
      { y: 20, w: 120, color: '#6366f1', t: 'Super Admin', s: '12 / 12 modules' },
      { y: 80, w: 200, color: '#8b5cf6', t: 'SPM · State Officer', s: '9 / 12 modules' },
      { y: 140, w: 300, color: '#f59e0b', t: 'District Officer · ME', s: '7 / 12 modules' },
      { y: 200, w: 400, color: '#10b981', t: 'Field Operator · PC', s: '4 / 12 modules' }
    ]
    return (
      <svg viewBox="0 0 520 280" width="100%" height="auto">
        {tiers.map((t, i) => (
          <g key={t.t}>
            <rect x={260 - t.w / 2} y={t.y} width={t.w} height="44" rx="8" fill={`${t.color}10`} stroke={t.color} strokeWidth="1.5" />
            {i === 0 && <g transform={`translate(${260 - t.w / 2 + 10},${t.y + 13})`}><Crown size={14} color={t.color} /></g>}
            <text x="260" y={t.y + 27} textAnchor="middle" fontSize="12" fill="#0f172a" fontWeight="600">{t.t}</text>
            <text x="40" y={t.y + 27} fontSize="9" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{t.s}</text>
            {i < tiers.length - 1 && <line x1="260" y1={t.y + 44} x2="260" y2={tiers[i + 1].y} stroke="#e2e8f0" />}
          </g>
        ))}
      </svg>
    )
  },
  PipelineStateFlow: function PipelineStateFlow() {
    const states = [
      ['INITIATED', '#64748b', 40, 40], ['SCREENED', '#6366f1', 180, 40], ['AI_FLAGGED', '#8b5cf6', 320, 40], ['TRIAGED', '#f59e0b', 460, 40],
      ['TESTED', '#f97316', 40, 120], ['CONFIRMED', '#f43f5e', 180, 120], ['ENROLLED', '#10b981', 320, 120], ['COMPLETED', '#14b8a6', 460, 120]
    ] as const
    return (
      <svg viewBox="0 0 640 200" width="100%" height="auto">
        {states.map(([n, c, x, y]) => (
          <g key={n}>
            <rect x={x} y={y} width="100" height="36" rx="18" fill={`${c}15`} stroke={c} />
            <text x={x + 50} y={y + 22} textAnchor="middle" fontSize="10" fill="#0f172a">{n}</text>
            <text x={x + 50} y={y + 50} textAnchor="middle" fontSize="8" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>— patients</text>
          </g>
        ))}
      </svg>
    )
  },
  GISHotspotMap: function GISHotspotMap() {
    const pins = [
      ['Delhi', 280, 120, '#6366f1', 8], ['Mumbai', 210, 190, '#f43f5e', 6], ['Chennai', 290, 230, '#f59e0b', 6],
      ['Kolkata', 350, 160, '#10b981', 4], ['Jaipur', 240, 135, '#8b5cf6', 4], ['Nagpur', 270, 180, '#14b8a6', 4]
    ] as const
    return (
      <svg viewBox="0 0 560 260" width="100%" height="auto">
        <path d="M180 50 L240 44 L290 62 L345 78 L380 112 L368 156 L350 182 L312 202 L292 236 L262 226 L236 190 L205 176 L180 140 L172 112 Z" fill="#f8fafc" stroke="#e2e8f0" />
        {pins.map(([n, x, y, c, r]) => (
          <g key={n}>
            <circle cx={x} cy={y} r={r * 2.5} fill={`${c}20`} />
            <circle cx={x} cy={y} r={r} fill={c} stroke="#fff" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
    )
  },
  DataSyncFlow: function DataSyncFlow() {
    return (
      <svg viewBox="0 0 600 180" width="100%" height="auto">
        {[[80, 'Field Device'], [240, 'SAMADHAAN Platform'], [440, 'Azure Cloud']].map(([x, t]) => (
          <g key={String(t)}>
            <rect x={Number(x)} y="56" width="120" height="60" rx="10" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
            <text x={Number(x) + 60} y="90" textAnchor="middle" fontSize="11" fill="#0f172a">{t}</text>
          </g>
        ))}
        <path d="M200 74 C230 56 250 56 280 74" stroke="#6366f1" strokeDasharray="8,4" fill="none" />
        <path d="M280 98 C250 116 230 116 200 98" stroke="#6366f1" strokeDasharray="8,4" fill="none" />
        <path d="M360 74 C390 56 410 56 440 74" stroke="#3b82f6" strokeDasharray="8,4" fill="none" />
        <path d="M440 98 C410 116 390 116 360 98" stroke="#3b82f6" strokeDasharray="8,4" fill="none" />
        <circle cx="300" cy="136" r="4" fill="#10b981" />
        <text x="312" y="140" fontSize="9" fill="#64748b" style={{ fontFamily: 'var(--font-share-tech-mono)' }}>CONNECTED · Last sync: 2s ago</text>
      </svg>
    )
  }
} as const

const COLLECTIONS = [
  { id: 'getting-started', label: 'Getting Started', description: 'Platform orientation, access setup, and your first steps.', accent: '#10b981', icon: Rocket, sections: [{ id: 'platform-overview', label: 'Platform Overview', slugs: ['what-is-samadhaan', 'system-architecture', 'role-guide'] }, { id: 'first-day', label: 'Your First Day', slugs: ['logging-in', 'command-hub-overview', 'navigating-sidebar'] }] },
  { id: 'module-guides', label: 'Module Guides', description: 'Deep-dive documentation for every module and feature.', accent: '#6366f1', icon: LayoutDashboard, sections: [{ id: 'command-hub', label: 'Command Hub', slugs: ['command-hub-page', 'reading-kpi-dashboard', 'screening-journey-cube', 'patient-timeline'] }, { id: 'pipeline', label: 'Follow-Up Pipeline', slugs: ['pipeline-overview', 'how-to-triage', 'initiated-completed-workflow', 'understanding-ltfu'] }, { id: 'analytics', label: 'Analytics', slugs: ['analytics-overview', 'screening-velocity', 'ai-confidence-score', 'exporting-reports'] }, { id: 'gis', label: 'GIS Intelligence', slugs: ['map-overview', 'hotspot-overlays', 'district-drill-down'] }, { id: 'mne', label: 'M&E Tools', slugs: ['mne-overview', 'targets-and-progress', 'mne-reports'] }, { id: 'identity', label: 'Identity Bureau', slugs: ['user-roles-permissions', 'creating-managing-users', 'state-district-assignments'] }] },
  { id: 'clinical-protocols', label: 'Clinical Protocols', description: 'SOPs, screening standards, and treatment enrollment guides.', accent: '#f43f5e', icon: Stethoscope, sections: [{ id: 'tb-screening', label: 'TB Screening Protocol', slugs: ['five-day-pathway', 'barrack-deployment-sop', 'xray-capture-standards', 'ai-flagging-thresholds'] }, { id: 'confirmatory', label: 'Confirmatory Testing', slugs: ['cbnaat-truenat-protocol', 'sputum-collection', 'result-interpretation'] }, { id: 'treatment', label: 'Treatment & Enrollment', slugs: ['rntcp-enrollment', 'dots-therapy', 'nikshay-notification'] }] },
  { id: 'technical', label: 'Technical Reference', description: 'AI engine internals, data architecture, and integrations.', accent: '#8b5cf6', icon: Code2, sections: [{ id: 'data-sync', label: 'Data & Sync', slugs: ['live-sync', 'data-quality-indicators', 'offline-mode'] }, { id: 'ai-engine', label: 'AI Engine', slugs: ['how-ai-works', 'confidence-bands', 'model-limitations'] }, { id: 'integrations', label: 'Integrations', slugs: ['kobo-integration', 'azure-architecture', 'google-sheets-sync'] }] }
] as const

const ARTICLE_CONTENT: Record<string, ContentBlock[]> = {
  'what-is-samadhaan': [
    { type: 'heading2', text: 'Overview' },
    { type: 'paragraph', text: "SAMADHAAN is a National Integrated Health OS built by Alliance India for TB surveillance in correctional facilities. It unifies screening operations, AI inference, triage workflows, and treatment escalation in a single command surface." },
    { type: 'callout', variant: 'info', title: 'Deployment Status', body: 'Live across 23 correctional facilities with real-time monitoring of screening and follow-up outcomes.' },
    { type: 'heading2', text: 'Core Capabilities' },
    { type: 'steps', items: [{ title: 'AI-Assisted TB Detection', desc: 'Neural scoring in under 30 seconds with confidence band output.' }, { title: 'Real-Time Tracking', desc: 'Patients flow through structured statuses with SLA monitoring.' }, { title: 'GIS Intelligence', desc: 'Hotspot overlays and district drill-down for outbreak prevention.' }, { title: 'M&E Reporting', desc: 'Target tracking and compliance reporting across scopes.' }] },
    { type: 'heading2', text: 'System Architecture' },
    { type: 'diagram', id: 'SystemArchitectureDiagram', caption: 'SAMADHAAN 5-layer technical stack' }
  ],
  'system-architecture': [
    { type: 'heading2', text: 'Platform Architecture Overview' },
    { type: 'paragraph', text: 'SAMADHAAN is designed as a multi-tier platform that separates field collection, AI inference, operational orchestration, and national integrations for resilience and scale.' },
    { type: 'diagram', id: 'SystemArchitectureDiagram', caption: 'SAMADHAAN 5-layer technical stack' },
    { type: 'heading2', text: 'Technology Stack' },
    { type: 'table', headers: ['Layer', 'Technology', 'Purpose'], rows: [['Frontend', 'Next.js 15 + React 19', 'Server-rendered UI'], ['Database', 'Supabase PostgreSQL', 'Patient data + RLS'], ['Auth', 'NextAuth v5', 'Role-based sessions'], ['AI Engine', 'Neural Network v2.4', 'TB X-Ray analysis'], ['Maps', 'MapLibre + Deck.gl', 'GIS visualization'], ['Forms', 'KoboToolbox XLSForm', 'Field data collection'], ['Cloud', 'Microsoft Azure', 'Hosting + replication']] },
    { type: 'heading2', text: 'Security Architecture' },
    { type: 'callout', variant: 'info', title: 'Secure by Design', body: 'Data is encrypted in transit and at rest. RLS constrains users to assigned geographic scopes.' },
    { type: 'steps', items: [{ title: 'Authentication', desc: 'Session tokens issued with role and scope metadata.' }, { title: 'Authorization', desc: 'Supabase RLS enforces row-level geographic access.' }, { title: 'Audit Trail', desc: 'Write operations are tracked for governance.' }, { title: 'Encryption', desc: 'TLS for transport and encrypted storage at rest.' }] }
  ],
  'role-guide': [
    { type: 'heading2', text: 'Understanding Role-Based Access' },
    { type: 'paragraph', text: 'SAMADHAAN applies a strict role hierarchy to ensure each operational user sees only what they need for their scope and function.' },
    { type: 'diagram', id: 'RolePermissionsMatrix', caption: 'Role hierarchy and access scope' },
    { type: 'heading2', text: 'Role Descriptions' },
    { type: 'steps', items: [{ title: 'Super Admin', desc: 'Global administration, audit controls, and platform governance.' }, { title: 'State Officer (SPM)', desc: 'State-level command and district supervision.' }, { title: 'District Officer / ME', desc: 'District operations, triage and follow-up decisions.' }, { title: 'Field Operator (PC)', desc: 'Facility-level screening execution and updates.' }] },
    { type: 'heading2', text: 'What Each Role Sees' },
    { type: 'table', headers: ['Module', 'Super Admin', 'SPM', 'District', 'Field Op'], rows: [['Command Hub', '✅', '✅', '✅', '✅'], ['Pipeline', '✅', '✅', '✅', '✅'], ['Analytics', '✅', '✅', '✅', '⚠️'], ['GIS', '✅', '✅', '✅', '❌'], ['M&E', '✅', '✅', '✅', '❌'], ['Knowledge Vault', '✅', '✅', '✅', '✅'], ['Identity Bureau', '✅', '⚠️', '❌', '❌'], ['Settings', '✅', '✅', '✅', '⚠️']] },
    { type: 'callout', variant: 'tip', title: 'Role Assignment', body: 'Role assignment is managed by authorized administrators and applied on login.' }
  ],
  'logging-in': [
    { type: 'heading2', text: 'Accessing SAMADHAAN' },
    { type: 'steps', items: [{ title: 'Open SAMADHAAN URL', desc: 'Use the approved browser entrypoint.' }, { title: 'Enter credentials', desc: 'Use assigned enterprise email and password.' }, { title: 'MFA Verification', desc: 'Complete second-factor verification if enabled.' }, { title: 'Role Confirmation', desc: 'Verify your role badge after login.' }, { title: 'Scope Selection', desc: 'Choose operational scope if multi-assigned.' }] },
    { type: 'heading2', text: 'Session Management' },
    { type: 'callout', variant: 'warning', title: 'Session Expiry', body: 'Sessions expire after inactivity. Save in-progress data before stepping away.' },
    { type: 'table', headers: ['Session Type', 'Duration', 'Refresh Policy'], rows: [['Interactive Session', '8h', 'Auto refresh while active'], ['Idle Session', '30m', 'Prompt then logout'], ['Admin Session', '4h', 'Stricter timeout'], ['Remembered Device', 'Policy-based', 'Revocable']] },
    { type: 'heading2', text: 'Forgotten Password' },
    { type: 'steps', items: [{ title: 'Click Reset Password', desc: 'From login screen choose password reset.' }, { title: 'Verify Email', desc: 'Use one-time verification link.' }, { title: 'Set New Password', desc: 'Follow password policy checks.' }] },
    { type: 'callout', variant: 'danger', title: 'Credential Security', body: 'Credentials are individual and auditable. Never share accounts.' }
  ],
  'command-hub-overview': [
    { type: 'heading2', text: 'Command Hub at a Glance' },
    { type: 'paragraph', text: 'Command Hub aggregates the day’s most critical operational KPIs and directs teams to action queues quickly.' },
    { type: 'heading2', text: 'Primary Sections' },
    { type: 'steps', items: [{ title: 'KPI Bar', desc: 'Today Screened, AI Flagged, Confirmed, Pending.' }, { title: 'Pipeline Embed', desc: 'State transitions and bottleneck indicators.' }, { title: 'Journey Components', desc: 'Workflow visuals for field and clinical teams.' }] },
    { type: 'heading2', text: 'Operational Usage Pattern' },
    { type: 'callout', variant: 'tip', title: 'Recommended Workflow', body: 'Begin with KPI anomalies, then drill into pipeline states and patient timelines.' }
  ],
  'navigating-sidebar': [
    { type: 'heading2', text: 'The Sidebar Navigation System' },
    { type: 'paragraph', text: 'The sidebar groups major capabilities into functional modules to reduce navigation friction.' },
    { type: 'heading2', text: 'Module Quick Reference' },
    { type: 'table', headers: ['Module', 'Icon', 'Purpose', 'Who Uses It'], rows: [['Command Hub', 'Dashboard', 'Operational overview', 'All'], ['Pipeline', 'Flow', 'Follow-up workflow', 'Clinical + Ops'], ['Analytics', 'Chart', 'Trend analysis', 'SPM + District'], ['GIS', 'Map', 'Spatial intelligence', 'SPM + District'], ['M&E Tools', 'Clipboard', 'Evaluation reporting', 'ME + SPM'], ['Knowledge Vault', 'Book', 'Documentation', 'All']] },
    { type: 'heading2', text: 'Keyboard Shortcuts' },
    { type: 'table', headers: ['Shortcut', 'Action'], rows: [['Ctrl/Cmd + K', 'Focus global search'], ['Alt + Left', 'Previous article'], ['Alt + Right', 'Next article'], ['Esc', 'Return home / clear context']] }
  ],
  'command-hub-page': [{ type: 'heading2', text: 'Home Surface' }, { type: 'paragraph', text: 'The Command Hub is the operational landing zone for daily TB screening intelligence and alerts.' }, { type: 'heading2', text: 'Core Widgets' }, { type: 'steps', items: [{ title: 'KPI Ribbon', desc: 'Real-time metrics at top of page.' }, { title: 'Pipeline Snapshot', desc: 'Immediate state-level trends.' }, { title: 'Journey Components', desc: 'Visual pathway orientation for teams.' }] }, { type: 'heading2', text: 'Best Practice' }, { type: 'callout', variant: 'tip', title: 'Use in Daily Standups', body: 'Teams should review this page first during shift handover.' }],
  'reading-kpi-dashboard': [
    { type: 'heading2', text: 'The Four KPI Metrics' },
    { type: 'steps', items: [{ title: 'Today Screened', desc: 'Total X-Ray screening count for current day.' }, { title: 'AI Flagged', desc: 'Suspect count identified by AI thresholding.' }, { title: 'Confirmed Cases', desc: 'Cases confirmed via diagnostics.' }, { title: 'Pending Follow-Up', desc: 'Patients requiring unresolved action.' }] },
    { type: 'heading2', text: 'Understanding Real-Time Updates' },
    { type: 'paragraph', text: 'KPI metrics update via event-driven sync and fallback polling to ensure continuity under variable connectivity.' },
    { type: 'diagram', id: 'DataSyncFlow', caption: 'How KPI data flows from field to dashboard' },
    { type: 'heading2', text: 'Reading Trends' },
    { type: 'callout', variant: 'tip', title: 'High Flag Ratio Alert', body: 'An AI flagged ratio above expected baseline can indicate concentrated risk clusters.' }
  ],
  'screening-journey-cube': [{ type: 'heading2', text: 'What Is the Screening Journey Cube?' }, { type: 'paragraph', text: 'A visual explainer of the clinical screening sequence for fast situational understanding.' }, { type: 'heading2', text: 'The Four Faces' }, { type: 'steps', items: [{ title: 'Barrack Deployment', desc: 'Field setup and patient queue readiness.' }, { title: 'AI-Assisted Screening', desc: 'Rapid inference from captured X-Rays.' }, { title: 'AI Flagging', desc: 'Confidence-threshold suspect elevation.' }, { title: 'Clinical Confirmation', desc: 'Medical review and lab confirmation routing.' }] }, { type: 'heading2', text: 'Interaction' }, { type: 'callout', variant: 'tip', title: 'Scroll Interaction', body: 'Use vertical scroll to rotate through all faces.' }],
  'patient-timeline': [{ type: 'heading2', text: 'Timeline Overview' }, { type: 'paragraph', text: 'The timeline presents the patient journey through six clinical checkpoints from screening to treatment.' }, { type: 'diagram', id: 'ClinicalPathwayDiagram', caption: '6-stage clinical pathway timeline' }, { type: 'heading2', text: 'Reading Each Stage' }, { type: 'steps', items: [{ title: 'Screening', desc: 'Initial capture and registration.' }, { title: 'AI Review', desc: 'Inference and confidence generation.' }, { title: 'Triage', desc: 'Medical prioritization.' }, { title: 'Testing', desc: 'Diagnostic execution.' }, { title: 'Confirmation', desc: 'Result verification.' }, { title: 'Enrollment', desc: 'Treatment initiation.' }] }, { type: 'heading2', text: 'SLA Indicators' }, { type: 'callout', variant: 'warning', title: 'Escalation Colors', body: 'Amber and red stages indicate breach risk and immediate intervention needs.' }],
  'pipeline-overview': [{ type: 'heading2', text: 'The Follow-Up Pipeline' }, { type: 'paragraph', text: 'Pipeline organizes patient progression into explicit states with clear ownership and transition criteria.' }, { type: 'diagram', id: 'PipelineStateFlow', caption: 'Patient state transitions in the pipeline' }, { type: 'heading2', text: 'Patient States Explained' }, { type: 'table', headers: ['State', 'Description', 'Next Action', 'Owner'], rows: [['Initiated', 'Record created', 'Screening', 'Field'], ['Screened', 'X-Ray complete', 'AI review', 'Field'], ['AI Flagged', 'Suspect detected', 'Triage', 'Clinical'], ['Triaged', 'Decision captured', 'Testing', 'ME'], ['Tested', 'Sample processed', 'Confirm', 'Lab'], ['Confirmed', 'Positive case', 'Enroll', 'ME'], ['Enrolled', 'Therapy started', 'Track', 'District'], ['Completed', 'Case closed', 'Archive', 'Program']] }, { type: 'heading2', text: 'Pipeline Health Metrics' }, { type: 'callout', variant: 'info', title: 'Healthy Baseline', body: 'Keep LTFU below operational threshold and minimize >48h pending triage.' }],
  'how-to-triage': [{ type: 'heading2', text: 'Opening the Triage Queue' }, { type: 'steps', items: [{ title: 'Open Pipeline module', desc: 'Switch to AI suspects queue.' }, { title: 'Apply filters', desc: 'Filter by district/facility and urgency.' }, { title: 'Sort by SLA risk', desc: 'Prioritize oldest unresolved records.' }] }, { type: 'heading2', text: 'Reviewing an AI Flag' }, { type: 'steps', items: [{ title: 'Open patient record', desc: 'Inspect demographics and chronology.' }, { title: 'Read confidence score', desc: 'Validate score and uncertainty context.' }, { title: 'Check heatmap', desc: 'Review lesion concentration zones.' }, { title: 'Assess history', desc: 'Compare prior findings if present.' }, { title: 'Capture decision', desc: 'Confirm, downgrade, or refer.' }, { title: 'Document rationale', desc: 'Provide mandatory clinical note.' }] }, { type: 'heading2', text: 'Decision Guidelines' }, { type: 'table', headers: ['AI Score', 'Recommended Action', 'SLA'], rows: [['>0.85', 'Immediate triage + test', '<24h'], ['0.65-0.85', 'Clinical review + test', '<24h'], ['0.30-0.65', 'Review with context', '<48h'], ['<0.30', 'Routine monitoring', 'As needed']] }, { type: 'callout', variant: 'danger', title: 'High Score Governance', body: 'Avoid dismissing high-confidence flags without robust documented justification.' }],
  'initiated-completed-workflow': [{ type: 'heading2', text: 'Patient Lifecycle Overview' }, { type: 'steps', items: [{ title: 'Initiated', desc: 'Case is registered.' }, { title: 'Screened', desc: 'Image captured and uploaded.' }, { title: 'Flagged/Triaged', desc: 'Clinical decision formed.' }, { title: 'Tested/Confirmed', desc: 'Lab cycle completed.' }, { title: 'Enrolled/Completed', desc: 'Treatment initiated and tracked.' }] }, { type: 'heading2', text: 'Status Transition Rules' }, { type: 'table', headers: ['From', 'To', 'Trigger', 'Who Can Perform'], rows: [['Initiated', 'Screened', 'X-Ray upload', 'Field'], ['Screened', 'AI Flagged', 'Score threshold', 'System'], ['AI Flagged', 'Triaged', 'Clinical decision', 'ME'], ['Triaged', 'Tested', 'Sample collected', 'Lab'], ['Tested', 'Confirmed', 'Result positive', 'ME'], ['Confirmed', 'Enrolled', 'Treatment started', 'District']] }, { type: 'heading2', text: 'Bulk Status Updates' }, { type: 'callout', variant: 'tip', title: 'Batch Operations', body: 'Use grouped updates for same-barrack cohorts to reduce administrative latency.' }],
  'understanding-ltfu': [{ type: 'heading2', text: 'What is LTFU?' }, { type: 'paragraph', text: 'Lost to Follow-Up identifies patients whose workflow has stalled before treatment closure.' }, { type: 'callout', variant: 'warning', title: 'Active Watch State', body: 'LTFU does not mean discharge. Records stay active for re-engagement.' }, { type: 'heading2', text: 'Common LTFU Causes' }, { type: 'table', headers: ['Cause', 'Prevention', 'Recovery Action'], rows: [['Transfer delay', 'Immediate handoff protocol', 'Cross-facility follow-up'], ['Sample refusal', 'Counseling script', 'Reattempt with counselor'], ['Connectivity loss', 'Offline capture policy', 'Deferred sync reconciliation'], ['Scheduling conflict', 'Slot optimization', 'Reschedule within 24h'], ['Documentation gaps', 'Mandatory fields', 'Backfill with audit note']] }, { type: 'heading2', text: 'LTFU Re-engagement Protocol' }, { type: 'steps', items: [{ title: 'Identify stalled records', desc: 'Filter by LTFU status and age.' }, { title: 'Classify cause', desc: 'Tag root-cause category.' }, { title: 'Assign owner', desc: 'District owner receives task.' }, { title: 'Track closure', desc: 'Monitor until status restored.' }] }, { type: 'callout', variant: 'info', title: 'Indicator Sensitivity', body: 'Sustained LTFU elevation should trigger district review meetings.' }],
  'analytics-overview': [{ type: 'heading2', text: 'Analytics Dashboard Sections' }, { type: 'steps', items: [{ title: 'Volume Trends', desc: 'Daily/weekly throughput and variance.' }, { title: 'Quality Signals', desc: 'Completeness, timeliness, consistency.' }, { title: 'Outcome Panels', desc: 'Confirmation and enrollment rates.' }] }, { type: 'heading2', text: 'Reading the Charts' }, { type: 'callout', variant: 'tip', title: 'Drill-Down', body: 'Most chart points can open deeper context views.' }, { type: 'heading2', text: 'Date Range Filters' }, { type: 'table', headers: ['Filter', 'Description', 'Use Case'], rows: [['Today', 'Current day', 'Shift management'], ['This Week', 'Rolling week', 'Operational trend'], ['This Month', 'Month-to-date', 'Program review'], ['Custom', 'User-defined', 'Audit or report windows']] }],
  'screening-velocity': [{ type: 'heading2', text: 'What Is Screening Velocity?' }, { type: 'paragraph', text: 'Velocity represents screenings per active operational day and helps benchmark execution efficiency.' }, { type: 'heading2', text: 'Reading the Velocity Chart' }, { type: 'callout', variant: 'info', title: 'Low Productivity Signal', body: 'Sustained low velocity indicates either staffing bottlenecks or field constraints.' }, { type: 'heading2', text: 'Velocity Benchmarks' }, { type: 'table', headers: ['Velocity', 'Classification', 'Recommended Action'], rows: [['<20/day', 'Low', 'Investigate staffing and readiness'], ['20-50/day', 'Moderate', 'Optimize queue and transport'], ['>50/day', 'High', 'Maintain quality controls']] }],
  'ai-confidence-score': [{ type: 'heading2', text: 'The Confidence Score Explained' }, { type: 'paragraph', text: 'Confidence score reflects model-estimated TB likelihood from imaging signals and calibration constraints.' }, { type: 'diagram', id: 'AIConfidenceBands', caption: 'AI TB detection confidence band visualization' }, { type: 'heading2', text: 'How to Interpret Scores' }, { type: 'steps', items: [{ title: 'Read score and band', desc: 'Place score within action threshold.' }, { title: 'Validate image quality', desc: 'Check quality before strong conclusions.' }, { title: 'Review clinical context', desc: 'Use prior history and symptomatic data.' }, { title: 'Capture triage action', desc: 'Submit decision with rationale.' }] }, { type: 'heading2', text: 'Score Distribution Patterns' }, { type: 'callout', variant: 'warning', title: 'Cluster Escalation', body: 'Elevated high-band concentration in one barrack warrants immediate epidemiological review.' }],
  'exporting-reports': [{ type: 'heading2', text: 'Available Export Formats' }, { type: 'table', headers: ['Format', 'Contents', 'Use Case'], rows: [['PDF Summary', 'Executive KPIs', 'Leadership updates'], ['CSV Raw Data', 'Row-level records', 'Advanced analysis'], ['Excel Report', 'Structured workbook', 'Operational reporting'], ['Print View', 'Formatted summary', 'On-site review']] }, { type: 'heading2', text: 'Scheduling Automated Reports' }, { type: 'steps', items: [{ title: 'Choose report type', desc: 'Select KPI, M&E, or compliance package.' }, { title: 'Set schedule', desc: 'Configure weekly/monthly cadence.' }, { title: 'Define recipients', desc: 'Assign role-scoped distribution.' }] }, { type: 'callout', variant: 'tip', title: 'Scope Awareness', body: 'Exports respect role scope and will not include unauthorized regions.' }],
  'map-overview': [{ type: 'heading2', text: 'The GIS Intelligence Map' }, { type: 'diagram', id: 'GISHotspotMap', caption: 'Facility pin map with hotspot overlays' }, { type: 'heading2', text: 'Map Layers' }, { type: 'table', headers: ['Layer', 'Toggle', 'Shows'], rows: [['Facility Pins', '✅', 'Site locations'], ['Hotspot Overlay', '✅', 'Risk clusters'], ['District Boundaries', '✅', 'Administrative limits'], ['Road Network', 'Optional', 'Mobility context'], ['Population Density', 'Optional', 'Demand context']] }, { type: 'heading2', text: 'Interacting With the Map' }, { type: 'steps', items: [{ title: 'Zoom and pan', desc: 'Navigate to region of interest.' }, { title: 'Click facility pins', desc: 'Open district/facility drill cards.' }, { title: 'Apply filters', desc: 'Role, period, and severity filters.' }] }],
  'hotspot-overlays': [{ type: 'heading2', text: 'What Are Hotspots?' }, { type: 'paragraph', text: 'Hotspots represent statistically significant clustering of confirmed cases within configured spatial and temporal windows.' }, { type: 'callout', variant: 'info', title: 'Hotspot Rule', body: 'A hotspot requires at least 3 confirmed cases within a 5km radius in the analysis window.' }, { type: 'heading2', text: 'Severity Levels' }, { type: 'table', headers: ['Color', 'Cases', 'Required Action'], rows: [['Yellow', '3-5', 'Monitor + review'], ['Orange', '6-10', 'District intervention'], ['Red', '>10', 'Immediate escalation']] }, { type: 'heading2', text: 'Acting on Hotspot Data' }, { type: 'steps', items: [{ title: 'Verify signal', desc: 'Check data quality and duplicates.' }, { title: 'Coordinate field team', desc: 'Deploy targeted screening units.' }, { title: 'Track outcomes', desc: 'Assess intervention impact weekly.' }] }],
  'district-drill-down': [{ type: 'heading2', text: 'Accessing District View' }, { type: 'steps', items: [{ title: 'Select district', desc: 'Use map panel or district dropdown.' }, { title: 'Choose date window', desc: 'Apply period for contextual comparisons.' }, { title: 'Open detail analytics', desc: 'Inspect trends and bottlenecks.' }] }, { type: 'heading2', text: 'District Metrics' }, { type: 'table', headers: ['Metric', 'Description', 'Target'], rows: [['Screening Throughput', 'Daily screened volume', 'Target by district'], ['AI Suspect Rate', 'Flagged/Screened ratio', 'Baseline threshold'], ['Triage SLA', 'Within 24h completion', '>90%'], ['Testing Turnaround', 'Sample-to-result time', '<2h median'], ['Enrollment Delay', 'Confirm-to-treatment delay', '<48h'], ['LTFU Rate', 'Lost follow-up proportion', '<8%']] }, { type: 'heading2', text: 'Comparing Districts' }, { type: 'callout', variant: 'tip', title: 'Overlay Comparison', body: 'Use multi-select overlays for side-by-side district benchmarking.' }],
  'mne-overview': [{ type: 'heading2', text: 'Monitoring & Evaluation Framework' }, { type: 'paragraph', text: 'M&E ensures operational quality, policy alignment, and measurable impact for TB surveillance interventions.' }, { type: 'heading2', text: 'M&E Reporting Cycle' }, { type: 'steps', items: [{ title: 'Monthly', desc: 'Operational performance review.' }, { title: 'Quarterly', desc: 'Program-level trend evaluation.' }, { title: 'Annual', desc: 'Strategic outcomes and targets reset.' }] }, { type: 'heading2', text: 'Key Indicators' }, { type: 'table', headers: ['Indicator', 'Formula', 'Target', 'Frequency'], rows: [['Screening Coverage', 'Screened/Eligible', '>90%', 'Monthly'], ['Triage SLA', 'Within24h/Total', '>90%', 'Weekly'], ['Test Completion', 'Tested/Flagged', '>85%', 'Weekly'], ['Enrollment SLA', 'Within48h/Confirmed', '>90%', 'Weekly'], ['LTFU', 'LTFU/Active', '<8%', 'Monthly'], ['Data Quality', 'Weighted score', '>95%', 'Daily'], ['Hotspot Response', 'Actioned/Detected', '>80%', 'Monthly'], ['Reporting Compliance', 'On-time reports', '100%', 'Monthly']] }],
  'targets-and-progress': [{ type: 'heading2', text: 'Setting Screening Targets' }, { type: 'steps', items: [{ title: 'Define baseline', desc: 'Use prior throughput and seasonality.' }, { title: 'Set district targets', desc: 'Allocate realistic yet ambitious goals.' }, { title: 'Approve and publish', desc: 'Finalize with state-level signoff.' }] }, { type: 'callout', variant: 'warning', title: 'Approval Required', body: 'Targets should be validated before period start to avoid reporting drift.' }, { type: 'heading2', text: 'Progress Tracking' }, { type: 'table', headers: ['Period', 'Target', 'Achieved', '% Progress', 'Status'], rows: [['Jan', '4,000', '3,650', '91%', 'On Track'], ['Feb', '4,200', '3,980', '95%', 'On Track'], ['Mar', '4,300', '3,720', '86%', 'Needs Action']] }, { type: 'heading2', text: 'Intervention Strategy' }, { type: 'paragraph', text: 'When progress falls behind, prioritize facilities with high variance and unresolved triage backlog.' }],
  'mne-reports': [{ type: 'heading2', text: 'Generating an M&E Report' }, { type: 'steps', items: [{ title: 'Select reporting period', desc: 'Monthly/quarterly timeframe.' }, { title: 'Choose scope', desc: 'State, district, or facility-level.' }, { title: 'Review auto-generated sections', desc: 'Validate KPI and narrative summaries.' }, { title: 'Publish and distribute', desc: 'Export and send to approved recipients.' }] }, { type: 'heading2', text: 'Report Components' }, { type: 'table', headers: ['Section', 'Contents', 'Data Source'], rows: [['Executive Summary', 'Topline metrics', 'Analytics'], ['Screening Operations', 'Throughput and velocity', 'Pipeline'], ['Clinical Outcomes', 'Confirmations and enrollments', 'Clinical records'], ['Quality & SLA', 'Compliance metrics', 'M&E'], ['GIS Signals', 'Hotspot analysis', 'GIS module'], ['Recommendations', 'Action plan', 'Program review']] }, { type: 'callout', variant: 'tip', title: 'Submission Window', body: 'Submit monthly reports by the 5th to avoid compliance flags.' }],
  'creating-managing-users': [{ type: 'heading2', text: 'User Management Overview' }, { type: 'paragraph', text: 'Identity Bureau governs user lifecycle: onboarding, role assignment, scope management, and deactivation.' }, { type: 'heading2', text: 'Creating a New User' }, { type: 'steps', items: [{ title: 'Open Identity Bureau', desc: 'Navigate from module grid.' }, { title: 'Add user record', desc: 'Enter name, email, role.' }, { title: 'Assign scope', desc: 'State/district/facility scope mapping.' }, { title: 'Set temporary credential', desc: 'Deliver secure activation flow.' }] }, { type: 'callout', variant: 'danger', title: 'Governance Constraint', body: 'Role grants are audited and constrained by creator scope privileges.' }, { type: 'heading2', text: 'Deactivating a User' }, { type: 'steps', items: [{ title: 'Open profile', desc: 'Find user in directory.' }, { title: 'Deactivate access', desc: 'Preserve historical audit trails.' }, { title: 'Reassign ownership', desc: 'Transfer pending work where needed.' }] }, { type: 'callout', variant: 'warning', title: 'No Hard Delete', body: 'Deactivation preserves legal and operational audit history.' }],
  'state-district-assignments': [{ type: 'heading2', text: 'Geographic Scoping System' }, { type: 'paragraph', text: 'Scope assignment controls data boundaries and operational authority across state, district, and facility levels.' }, { type: 'heading2', text: 'Assigning a User to a State' }, { type: 'steps', items: [{ title: 'Select user', desc: 'Open user profile in Identity Bureau.' }, { title: 'Choose state scope', desc: 'Apply state-level permissions.' }, { title: 'Validate inheritance', desc: 'District visibility follows scope policy.' }] }, { type: 'heading2', text: 'Multi-District Users' }, { type: 'callout', variant: 'info', title: 'Aggregated Views', body: 'Users with multiple districts see combined insights across assigned areas.' }, { type: 'heading2', text: 'Scope Change Process' }, { type: 'steps', items: [{ title: 'Request change', desc: 'Supervisor submits role/scope update.' }, { title: 'Approve policy', desc: 'Authorized approver validates request.' }, { title: 'Apply on next session', desc: 'Changes activate after re-authentication.' }] }],
  'five-day-pathway': [{ type: 'heading2', text: 'Protocol Overview' }, { type: 'paragraph', text: 'Every patient follows a sequenced 5-day protocol with escalation rules and ownership at each stage.' }, { type: 'diagram', id: 'ClinicalPathwayDiagram', caption: 'Clinical pathway and SLA windows' }, { type: 'heading2', text: 'Step-by-Step Breakdown' }, { type: 'steps', items: [{ title: 'Day 0 Deployment', desc: 'Field deployment and patient registration.' }, { title: 'Day 0 Capture', desc: 'X-Ray capture and transmission.' }, { title: 'Day 0 AI Analysis', desc: 'Inference scoring and heatmap generation.' }, { title: 'Day 1 Triage', desc: 'Medical review and prioritization.' }, { title: 'Day 2-3 Testing', desc: 'CBNAAT/Truenat execution.' }, { title: 'Day 3-5 Treatment', desc: 'Enrollment and treatment initiation.' }] }, { type: 'heading2', text: 'SLA Reference Table' }, { type: 'table', headers: ['Step', 'Owner', 'SLA', 'Escalation Trigger'], rows: [['Deployment', 'Field', 'Same day', 'Missed morning slot'], ['Capture', 'Radiography', '<1h', 'Upload failure'], ['AI Analysis', 'System', '<30s', 'Timeout'], ['Triage', 'Medical', '<24h', 'No decision'], ['Testing', 'Lab', '<2h', 'Delayed result'], ['Treatment', 'District/ME', '<48h', 'Enrollment delay']] }],
  'barrack-deployment-sop': [{ type: 'heading2', text: 'Pre-Deployment Checklist' }, { type: 'steps', items: [{ title: 'Vehicle readiness', desc: 'Fuel, route, and safety checks.' }, { title: 'Equipment calibration', desc: 'X-Ray and accessories validated.' }, { title: 'Roster confirmation', desc: 'Staff assignment and backup.' }, { title: 'Facility coordination', desc: 'Barrack access and queue prep.' }, { title: 'Consent material', desc: 'Forms and briefing copies ready.' }, { title: 'PPE validation', desc: 'Safety stock confirmed.' }, { title: 'Device sync', desc: 'Data capture app tested.' }, { title: 'Escalation contacts', desc: 'District and medical escalation line verified.' }] }, { type: 'heading2', text: 'On-Site Protocol' }, { type: 'steps', items: [{ title: 'Arrival and briefing', desc: 'Facility coordination and queue sequence.' }, { title: 'Registration and consent', desc: 'Identity and consent verification.' }, { title: 'Capture workflow', desc: 'Image capture per protocol and upload.' }, { title: 'Closure', desc: 'Reconcile counts and depart.' }] }, { type: 'callout', variant: 'warning', title: 'Calibration Gate', body: 'Never proceed if daily calibration checks fail.' }, { type: 'heading2', text: 'Post-Deployment Documentation' }, { type: 'table', headers: ['Document', 'Submitted To', 'Deadline'], rows: [['Deployment log', 'District office', 'Same day'], ['Consent register', 'Clinical records', 'Same day'], ['Equipment checklist', 'Operations lead', 'Same day'], ['Incident report', 'Program manager', 'Within 24h']] }],
  'xray-capture-standards': [{ type: 'heading2', text: 'Image Quality Requirements' }, { type: 'table', headers: ['Parameter', 'Standard', 'Rejection Criteria'], rows: [['Positioning', 'Centered PA view', 'Severe rotation'], ['Exposure', 'Diagnostic density', 'Under/over exposure'], ['Contrast', 'Adequate tissue differentiation', 'Flat histogram'], ['Artifacts', 'No dominant artifacts', 'Obstructive artifacts']] }, { type: 'heading2', text: 'Patient Positioning Protocol' }, { type: 'steps', items: [{ title: 'Align thorax', desc: 'Center patient to detector plane.' }, { title: 'Stabilize stance', desc: 'Minimize movement and rotation.' }, { title: 'Capture breath hold', desc: 'Use standard breath timing cues.' }] }, { type: 'callout', variant: 'danger', title: 'Recapture Threshold', body: 'Reject images with severe rotation or poor lung visibility.' }, { type: 'heading2', text: 'Special Cases' }, { type: 'table', headers: ['Condition', 'Modification', 'Notes'], rows: [['Wheelchair', 'Seated support capture', 'Adjust detector height'], ['Obese', 'Exposure compensation', 'Validate clarity'], ['Paediatric', 'Age-safe setup', 'Clinical supervision'], ['Elderly', 'Assisted positioning', 'Motion minimization']] }],
  'ai-flagging-thresholds': [{ type: 'heading2', text: 'How the AI Scores X-Rays' }, { type: 'paragraph', text: 'The model returns a probability from 0 to 1 indicating TB-consistent imaging likelihood.' }, { type: 'diagram', id: 'AIConfidenceBands', caption: 'Model confidence bands and actions' }, { type: 'heading2', text: 'Confidence Bands' }, { type: 'table', headers: ['Score Range', 'Classification', 'Action Required', 'Color'], rows: [['0.00-0.30', 'Low Risk', 'No action', 'Green'], ['0.30-0.65', 'Borderline', 'Clinical review', 'Amber'], ['0.65-0.85', 'Likely Suspect', 'Sputum test', 'Orange'], ['0.85-1.00', 'High Confidence', 'Immediate triage', 'Red']] }, { type: 'heading2', text: 'Override Policy' }, { type: 'steps', items: [{ title: 'Open flagged record', desc: 'From AI suspects queue.' }, { title: 'Review evidence', desc: 'Score, heatmap, and image quality.' }, { title: 'Override if required', desc: 'Capture clinical reason and submit.' }] }, { type: 'callout', variant: 'danger', title: 'Immutable Audit', body: 'All overrides are logged and reviewable by authorized roles.' }],
  'cbnaat-truenat-protocol': [{ type: 'heading2', text: 'CBNAAT vs Truenat' }, { type: 'table', headers: ['Feature', 'CBNAAT', 'Truenat'], rows: [['Technology', 'Cartridge PCR', 'Chip PCR'], ['Time to Result', 'Fast', 'Fast'], ['Sensitivity', 'High', 'High'], ['Specificity', 'High', 'High'], ['Sample Volume', 'Standard', 'Standard'], ['Battery', 'No', 'Yes/Optional']] }, { type: 'heading2', text: 'Sample Processing Protocol' }, { type: 'steps', items: [{ title: 'Collect and label sample', desc: 'Follow chain-of-custody rules.' }, { title: 'Prepare cartridge/chip', desc: 'Use approved reagent workflow.' }, { title: 'Run assay', desc: 'Monitor runtime and QC signals.' }, { title: 'Record and sync result', desc: 'Capture result code and timestamps.' }] }, { type: 'callout', variant: 'info', title: 'Resistance Detection', body: 'Both methods detect MTB presence and rifampicin resistance indicators.' }, { type: 'heading2', text: 'Result Codes' }, { type: 'table', headers: ['Result', 'Meaning', 'Next Action'], rows: [['MTB detected (RIF sens)', 'TB confirmed', 'Enroll treatment'], ['MTB detected (RIF res)', 'Potential MDR', 'Escalate immediately'], ['MTB not detected', 'No molecular evidence', 'Clinical follow-up'], ['Invalid', 'Run issue', 'Repeat sample'], ['Error', 'Device/reagent issue', 'Troubleshoot + rerun']] }],
  'sputum-collection': [{ type: 'heading2', text: 'Sputum Collection Protocol' }, { type: 'steps', items: [{ title: 'Consent and explain process', desc: 'Ensure informed participation.' }, { title: 'Label container first', desc: 'Attach patient identifiers before collection.' }, { title: 'Guide deep expectoration', desc: 'Avoid saliva-only samples.' }, { title: 'Secure transport', desc: 'Route to lab under protocol timing.' }] }, { type: 'heading2', text: 'Sample Quality Standards' }, { type: 'table', headers: ['Quality', 'Volume', 'Appearance', 'Accept?'], rows: [['High', 'Adequate', 'Mucopurulent', '✅'], ['Moderate', 'Borderline', 'Mixed', '⚠️'], ['Low', 'Insufficient', 'Saliva dominant', '❌']] }, { type: 'callout', variant: 'warning', title: 'Label Discipline', body: 'Label every sample before leaving collection point to avoid identity mismatch.' }, { type: 'heading2', text: 'Storage and Transport' }, { type: 'paragraph', text: 'Maintain compliant transport windows and chain-of-custody logs for every specimen.' }],
  'result-interpretation': [{ type: 'heading2', text: 'Reading CBNAAT Results' }, { type: 'table', headers: ['Code', 'Interpretation', 'Clinical Action'], rows: [['Detected / RIF Sens', 'Confirmed TB', 'Initiate standard pathway'], ['Detected / RIF Res', 'Potential MDR', 'Escalate MDR protocol'], ['Not Detected', 'Negative molecular result', 'Clinical review if symptomatic'], ['Invalid', 'Technical issue', 'Repeat test']] }, { type: 'heading2', text: 'Rifampicin Resistance Protocol' }, { type: 'callout', variant: 'danger', title: 'MDR Escalation', body: 'RIF resistance indicates presumptive MDR-TB and requires immediate containment/escalation action.' }, { type: 'heading2', text: 'Negative Result Management' }, { type: 'steps', items: [{ title: 'Cross-check symptoms', desc: 'Clinical assessment still required.' }, { title: 'Review image history', desc: 'Compare prior imaging and triage notes.' }, { title: 'Plan follow-up', desc: 'Schedule reassessment when indicated.' }] }],
  'rntcp-enrollment': [{ type: 'heading2', text: 'RNTCP Enrollment Criteria' }, { type: 'callout', variant: 'info', title: 'Eligibility Rule', body: 'Enrollment requires validated confirmation as per program protocol.' }, { type: 'heading2', text: 'Enrollment Steps' }, { type: 'steps', items: [{ title: 'Generate NIKSHAY ID', desc: 'Create national reference entry.' }, { title: 'Create treatment card', desc: 'Initialize regimen and supervision plan.' }, { title: 'Assign DOTS provider', desc: 'Attach treatment supervisor.' }, { title: 'Notify stakeholders', desc: 'Sync district/state oversight channels.' }] }, { type: 'heading2', text: 'Required Documentation' }, { type: 'table', headers: ['Document', 'Mandatory', 'System'], rows: [['Diagnostic report', 'Yes', 'Clinical records'], ['Enrollment form', 'Yes', 'SAMADHAAN'], ['NIKSHAY reference', 'Yes', 'NIKSHAY'], ['Treatment plan', 'Yes', 'SAMADHAAN']] }],
  'dots-therapy': [{ type: 'heading2', text: 'DOTS Overview' }, { type: 'paragraph', text: 'DOTS ensures supervised adherence through standardized therapy phases and follow-up controls.' }, { type: 'heading2', text: 'Standard RNTCP Regimen' }, { type: 'table', headers: ['Phase', 'Duration', 'Drugs', 'Frequency'], rows: [['Intensive', '2 months', 'First-line combination', 'Protocol-based'], ['Continuation', '4 months', 'Continuation regimen', 'Protocol-based']] }, { type: 'callout', variant: 'danger', title: 'Clinical Governance', body: 'Dosage or schedule changes require formal medical authorization.' }, { type: 'heading2', text: 'Monitoring During DOTS' }, { type: 'steps', items: [{ title: 'Monthly review', desc: 'Track adherence and adverse events.' }, { title: 'Outcome recording', desc: 'Update progress and milestones.' }, { title: 'Escalation', desc: 'Trigger intervention on non-adherence.' }] }],
  'nikshay-notification': [{ type: 'heading2', text: 'What is NIKSHAY?' }, { type: 'paragraph', text: 'NIKSHAY is the national TB notification system used for case registration and compliance tracking.' }, { type: 'heading2', text: 'Notification Steps' }, { type: 'steps', items: [{ title: 'Open confirmed case', desc: 'Validate demographic and diagnostic fields.' }, { title: 'Register in NIKSHAY', desc: 'Complete mandatory case attributes.' }, { title: 'Confirm reference ID', desc: 'Attach ID back to SAMADHAAN record.' }] }, { type: 'callout', variant: 'warning', title: '24h Compliance Window', body: 'Notification should be completed within one day of confirmation to remain compliant.' }, { type: 'heading2', text: 'NIKSHAY Sync Flow' }, { type: 'diagram', id: 'DataSyncFlow', caption: 'NIKSHAY notification sync flow' }],
  'live-sync': [{ type: 'heading2', text: 'How Live Sync Works' }, { type: 'diagram', id: 'DataSyncFlow', caption: 'Real-time data synchronization architecture' }, { type: 'heading2', text: 'Sync Layers' }, { type: 'table', headers: ['Layer', 'Technology', 'Latency', 'Fallback'], rows: [['Realtime', 'WebSocket', 'Low', 'Polling'], ['Fallback Polling', 'HTTP interval', 'Moderate', 'Manual refresh'], ['Offline Queue', 'Local store', 'Deferred', 'Auto flush'], ['Reconciliation', 'Server merge', 'Batch', 'Conflict prompts']] }, { type: 'callout', variant: 'info', title: 'Connected Signal', body: 'Footer connection indicator reflects current sync channel health.' }],
  'data-quality-indicators': [{ type: 'heading2', text: 'Quality Score System' }, { type: 'paragraph', text: 'Quality score blends completeness, timeliness, consistency, and accuracy into a single operational metric.' }, { type: 'heading2', text: 'Quality Dimensions' }, { type: 'table', headers: ['Dimension', 'Weight', 'What It Measures'], rows: [['Completeness', '30%', 'Mandatory fields coverage'], ['Accuracy', '25%', 'Validation and plausibility'], ['Timeliness', '25%', 'Submission and action latency'], ['Consistency', '20%', 'Cross-record coherence']] }, { type: 'heading2', text: 'Improving Your Score' }, { type: 'callout', variant: 'tip', title: 'Highest Leverage Action', body: 'Ensure mandatory fields are complete at first capture to avoid compounded quality penalties.' }],
  'offline-mode': [{ type: 'heading2', text: 'How Offline Mode Works' }, { type: 'paragraph', text: 'When connectivity drops, SAMADHAAN continues capture in local queue mode and syncs when connection returns.' }, { type: 'callout', variant: 'info', title: 'Auto Queueing', body: 'Offline records are queued and replayed safely after reconnection.' }, { type: 'heading2', text: 'What Works Offline' }, { type: 'table', headers: ['Feature', 'Offline Available', 'Notes'], rows: [['View cached patients', '✅', 'Recent local cache'], ['Edit records', '✅', 'Queued updates'], ['New registrations', '✅', 'Queued creates'], ['AI scoring', '❌', 'Requires server'], ['Map layers', '❌', 'Requires tiles/network'], ['Exports', '❌', 'Server-side rendering']] }, { type: 'heading2', text: 'Reconnection Protocol' }, { type: 'steps', items: [{ title: 'Detect reconnect', desc: 'System returns to connected mode.' }, { title: 'Replay queue', desc: 'Pending records sync sequentially.' }, { title: 'Resolve conflicts', desc: 'Operator confirms merge where required.' }] }],
  'how-ai-works': [{ type: 'heading2', text: 'The AI Detection Model' }, { type: 'diagram', id: 'AIConfidenceBands', caption: 'AI confidence band output visualization' }, { type: 'heading2', text: 'Model Architecture' }, { type: 'table', headers: ['Component', 'Details'], rows: [['Model Type', 'Convolutional network'], ['Training Data', 'Annotated chest X-Ray cohorts'], ['Input Resolution', 'Standardized clinical resolution'], ['Output', 'TB probability + heatmap'], ['Accuracy', 'Program benchmarked'], ['Versioning', 'Logged per inference']] }, { type: 'heading2', text: 'Inference Pipeline' }, { type: 'steps', items: [{ title: 'Upload image', desc: 'Field capture enters inference queue.' }, { title: 'Pre-process', desc: 'Normalize and quality adjust input.' }, { title: 'Infer', desc: 'Model generates probability and localization.' }, { title: 'Post-process', desc: 'Calibrate and package outputs.' }, { title: 'Persist result', desc: 'Store score with model metadata.' }, { title: 'Update dashboard', desc: 'Push to triage queue and KPIs.' }] }],
  'confidence-bands': [{ type: 'heading2', text: 'Confidence Band Deep Dive' }, { type: 'diagram', id: 'AIConfidenceBands', caption: 'Full confidence band breakdown' }, { type: 'heading2', text: 'Statistical Interpretation' }, { type: 'callout', variant: 'info', title: 'Probability Meaning', body: 'The score expresses model-estimated likelihood, not standalone diagnosis.' }, { type: 'heading2', text: 'Edge Cases' }, { type: 'table', headers: ['Scenario', 'Score Behavior', 'Recommended Action'], rows: [['Poor quality image', 'Unstable confidence', 'Recapture or manual review'], ['Post-treatment scarring', 'False-high tendency', 'Clinical correlation'], ['Other lung pathology', 'Confounding signal', 'Specialist review'], ['Low signal data', 'Borderline band', 'Monitor + retest'], ['Rare phenotype', 'Model uncertainty', 'Escalated diagnostics']] }],
  'model-limitations': [{ type: 'heading2', text: 'Known Limitations' }, { type: 'table', headers: ['Limitation', 'Impact', 'Mitigation'], rows: [['Poor image quality', 'Reduced confidence reliability', 'Quality gate + recapture'], ['Paediatric populations', 'Generalization constraints', 'Clinical override protocol'], ['Post-treatment scarring', 'False positive risk', 'Historical context review'], ['Non-TB pathology', 'Specificity challenges', 'Differential workflow'], ['Obesity/artifacts', 'Signal degradation', 'Capture standards'], ['Rare variants', 'Boundary uncertainty', 'Escalated lab confirmation']] }, { type: 'callout', variant: 'danger', title: 'Clinical Priority', body: 'AI is a screening support tool; clinical judgment remains the final authority.' }, { type: 'heading2', text: 'Override and Feedback Loop' }, { type: 'paragraph', text: 'Structured override logs provide traceability and support iterative model governance.' }],
  'kobo-integration': [{ type: 'heading2', text: 'KoboToolbox Integration Overview' }, { type: 'paragraph', text: 'Kobo forms provide structured field capture pipelines feeding SAMADHAAN synchronization layers.' }, { type: 'heading2', text: 'Form Architecture' }, { type: 'table', headers: ['Form', 'Purpose', 'Submitted By', 'Sync Frequency'], rows: [['Screening Intake', 'Register patients', 'Field operator', 'Realtime'], ['Capture Metadata', 'Image + context', 'Radiography team', 'Realtime'], ['Follow-up Form', 'Status updates', 'District/ME', 'Realtime'], ['Incident Form', 'Operational issues', 'Field lead', 'Daily']] }, { type: 'heading2', text: 'XLSForm Mapping' }, { type: 'callout', variant: 'tip', title: 'Schema Discipline', body: 'Form field keys must match SAMADHAAN mappings for clean ingestion and reconciliation.' }],
  'azure-architecture': [{ type: 'heading2', text: 'Azure Infrastructure Overview' }, { type: 'diagram', id: 'SystemArchitectureDiagram', caption: 'Azure hosting and database architecture' }, { type: 'heading2', text: 'Services Used' }, { type: 'table', headers: ['Service', 'Purpose', 'Region', 'SLA'], rows: [['Azure PostgreSQL', 'Transactional storage', 'Configured region', 'High availability'], ['Blob Storage', 'Asset persistence', 'Configured region', 'Durable'], ['App Service', 'Web runtime', 'Configured region', 'Managed'], ['Azure Monitor', 'Observability', 'Global', 'Managed'], ['Key Vault', 'Secret management', 'Configured region', 'Managed']] }, { type: 'heading2', text: 'Disaster Recovery' }, { type: 'callout', variant: 'info', title: 'Recovery Objective', body: 'Operational DR plan includes bounded recovery and backup retention controls.' }],
  'google-sheets-sync': [{ type: 'heading2', text: 'Google Sheets Integration' }, { type: 'paragraph', text: 'AppScript pipelines support controlled report synchronization into approved Google Sheets workspaces.' }, { type: 'heading2', text: 'Sync Architecture' }, { type: 'diagram', id: 'DataSyncFlow', caption: 'Google Sheets AppScript sync flow' }, { type: 'heading2', text: 'Setting Up Sync' }, { type: 'steps', items: [{ title: 'Create service account', desc: 'Configure scoped credentials.' }, { title: 'Deploy AppScript', desc: 'Publish script endpoint and triggers.' }, { title: 'Set Sheet IDs', desc: 'Map destination workbooks.' }, { title: 'Schedule trigger', desc: 'Define cadence and retries.' }, { title: 'Run validation', desc: 'Verify data integrity and permissions.' }] }, { type: 'callout', variant: 'warning', title: 'Least Privilege', body: 'Use minimal access scopes; avoid write permissions to sensitive sources unless explicitly required.' }],
  'user-roles-permissions': [{ type: 'heading2', text: 'Role Overview' }, { type: 'paragraph', text: 'Role hierarchy defines visibility and action permissions across modules and geographic scopes.' }, { type: 'diagram', id: 'RolePermissionsMatrix', caption: 'Role matrix visual hierarchy' }, { type: 'heading2', text: 'Permissions Matrix' }, { type: 'table', headers: ['Feature', 'Super Admin', 'State Officer', 'District Officer', 'Field Operator'], rows: [['Command Hub', '✅ Full', '✅ Full', '✅ Full', '✅ Full'], ['Pipeline View', '✅ All', '✅ State', '✅ District', '✅ Facility'], ['Analytics', '✅ All', '✅ State', '✅ District', '⚠️ Limited'], ['GIS', '✅ All', '✅ State', '✅ District', '❌ No access'], ['M&E', '✅ All', '✅ State', '✅ District', '❌ No access'], ['AI Override', '✅ Yes', '⚠️ Request', '✅ Yes', '❌ No access'], ['Identity Bureau', '✅ Full', '⚠️ State', '❌ No access', '❌ No access'], ['Audit Logs', '✅ Yes', '❌ No access', '❌ No access', '❌ No access']] }, { type: 'heading2', text: 'Role Change Flow' }, { type: 'steps', items: [{ title: 'Request initiated', desc: 'Supervisor triggers update.' }, { title: 'Policy review', desc: 'Authorized approver validates justification.' }, { title: 'Activation', desc: 'New permissions apply on next session.' }] }],
}

function canSeeArticle(article: Article, role: string): boolean {
  if (article.visible_to === 'all' || article.visible_to === 'PC') return true
  if (article.visible_to === 'SPM') return ['SPM', 'ME', 'PM', 'admin'].includes(role)
  if (article.visible_to === 'ME') return ['ME', 'PM', 'admin'].includes(role)
  if (article.visible_to === 'PM') return ['PM', 'admin'].includes(role)
  return false
}
const canCreate = (role: string) => ['PM', 'admin', 'SPM'].includes(role)
const canEdit = (article: Article, role: string, staffName: string | null) => ['PM', 'admin'].includes(role) || (role === 'SPM' && article.created_by_name === staffName && article.article_type === 'guide')
const TYPE_CONFIG: Record<ArticleType, { label: string; badge: string }> = { manual: { label: 'Manual', badge: 'bg-[#c6d8e4]/60 text-[#006494]' }, guide: { label: 'Guide', badge: 'bg-[#cedcd8]/60 text-[#01696f]' }, announcement: { label: 'Announcement', badge: 'bg-[#ddcfc6]/60 text-[#964219]' } }
const formatDate = (v?: string | null) => v ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'
const titleFromSlug = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
const calculateReadTime = (blocks: ContentBlock[]) => `${Math.max(1, Math.ceil(blocks.reduce((acc, block) => {
  if (block.type === 'paragraph' || block.type === 'heading2' || block.type === 'heading3') return acc + block.text.split(' ').length
  if (block.type === 'callout') return acc + block.body.split(' ').length + 5
  if (block.type === 'steps') return acc + block.items.reduce((a, s) => a + s.title.split(' ').length + s.desc.split(' ').length, 0)
  if (block.type === 'table') return acc + block.rows.length * 3
  return acc + 20
}, 0) / 200))} min read`

function MarkdownContent({ content }: { content: string }) {
  return <div>{content.split('\n').map((line, i) => <p key={i} className="text-sm text-[#28251d] leading-relaxed mb-2">{line}</p>)}</div>
}
const PageSkeleton = () => <div className="animate-pulse p-10 space-y-3">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-3 rounded bg-slate-200" />)}</div>

function ArticleEditor({ article, role, onChange, onSave, onClose, saving }: { article: Partial<Article>; role: string; onChange: (a: Partial<Article>) => void; onSave: () => void; onClose: () => void; saving: boolean }) {
  const allowedTypes: ArticleType[] = role === 'SPM' ? ['guide'] : ['manual', 'guide', 'announcement']
  const visibilityOpts = role === 'SPM' ? [{ v: 'PC' as VisibleTo, l: 'All roles (including PC)' }, { v: 'SPM' as VisibleTo, l: 'SPM, ME & above' }] : [{ v: 'all' as VisibleTo, l: 'All roles' }, { v: 'PC' as VisibleTo, l: 'All including PC' }, { v: 'SPM' as VisibleTo, l: 'SPM, ME & above' }, { v: 'ME' as VisibleTo, l: 'ME, PM & admin only' }, { v: 'PM' as VisibleTo, l: 'PM & admin only' }]
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: .25, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06]"><h3 className="font-semibold text-sm text-[#28251d]">{article.id ? 'Edit Article' : 'New Article'}</h3><button onClick={onClose} className="p-1.5 rounded-md"><X size={14} /></button></div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <input value={article.title ?? ''} onChange={(e) => onChange({ ...article, title: e.target.value })} className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm" />
          <div className="grid grid-cols-2 gap-4">
            <select value={article.article_type ?? 'guide'} onChange={(e) => onChange({ ...article, article_type: e.target.value as ArticleType })} className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm">{allowedTypes.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}</select>
            <select value={article.visible_to ?? 'all'} onChange={(e) => onChange({ ...article, visible_to: e.target.value as VisibleTo })} className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm">{visibilityOpts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select>
          </div>
          <textarea value={article.content ?? ''} rows={12} onChange={(e) => onChange({ ...article, content: e.target.value })} className="w-full px-3 py-2.5 border border-black/[0.1] rounded-lg text-sm font-mono resize-none" />
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-black/[0.06]"><button onClick={onClose} className="flex-1 py-2.5 border rounded-lg text-sm">Cancel</button><button onClick={onSave} disabled={saving || !article.title?.trim() || !article.content?.trim()} className="flex-1 py-2.5 bg-[#01696f] text-white rounded-lg text-sm">{saving ? 'Saving...' : article.id ? 'Save changes' : 'Publish'}</button></div>
      </motion.div>
    </motion.div>
  )
}

export default function DocsPage() {
  const sessionScope = useSessionScope()
  const role = sessionScope?.role ?? null
  const staffName = sessionScope?.staffName ?? null
  const supabase = createClient()
  const router = useRouter()

  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editDraft, setEditDraft] = useState<Partial<Article> | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [helpful, setHelpful] = useState<boolean | null>(null)
  const [activeHeading, setActiveHeading] = useState(0)
  const [narrow, setNarrow] = useState(false)
  const [readProgress, setReadProgress] = useState(0)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const sidebarAnimatedRef = useRef(false)

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 1280)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('knowledge_articles').select('*').eq('is_published', true).order('is_pinned', { ascending: false }).order('display_order', { ascending: true }).order('created_at', { ascending: true })
      if (fetchError) { setError(fetchError.message); setLoading(false); return }
      const visible = (data ?? []).filter((a) => canSeeArticle(a, role ?? 'PC'))
      setArticles(visible)
      if (visible.length > 0) setActiveSlug((prev) => prev ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [role, supabase])

  useEffect(() => { fetchArticles() }, [fetchArticles])
  useEffect(() => { setHelpful(null) }, [activeSlug])

  const activeArticle = useMemo(() => articles.find((a) => a.slug === activeSlug) ?? null, [articles, activeSlug])
  const activeCollectionMeta = useMemo(() => {
    if (!activeSlug) return null
    for (const collection of COLLECTIONS) for (const section of collection.sections) if (section.slugs.includes(activeSlug as never)) return { collection, section }
    return null
  }, [activeSlug])

  const articleBlocks = useMemo<ContentBlock[]>(() => {
    if (!activeSlug) return []
    const explicit = ARTICLE_CONTENT[activeSlug]
    if (explicit) return explicit
    return [
      { type: 'heading2', text: titleFromSlug(activeSlug) },
      { type: 'paragraph', text: `${titleFromSlug(activeSlug)} documentation is fully available in this release with role-scoped operational guidance.` },
      { type: 'heading2', text: 'Operational Guidance' },
      { type: 'steps', items: [{ title: 'Open relevant module', desc: 'Navigate from sidebar to target workflow.' }, { title: 'Apply role filters', desc: 'Use your scope and role-specific controls.' }, { title: 'Capture outcomes', desc: 'Record actions for monitoring and audit.' }] },
      { type: 'heading2', text: 'Reference Matrix' },
      { type: 'table', headers: ['Area', 'What to Check', 'Frequency'], rows: [['Data quality', 'Completeness and consistency', 'Daily'], ['SLA status', 'Pending and breached actions', 'Shift'], ['Reporting', 'Submission and compliance', 'Weekly']] },
      { type: 'callout', variant: 'info', title: 'Operational Note', body: 'Follow your district/state SOP and escalate anomalies immediately.' }
    ]
  }, [activeSlug])

  const headings = useMemo(() => articleBlocks.filter((b): b is Extract<ContentBlock, { type: 'heading2' }> => b.type === 'heading2'), [articleBlocks])
  const filteredBySearch = useMemo(() => articles.filter((a) => a.title.toLowerCase().includes(search.toLowerCase())), [articles, search])

  const nextArticle = useMemo(() => {
    for (const col of COLLECTIONS) for (const sec of col.sections as any) {
      const idx = sec.slugs.indexOf(activeSlug ?? '')
      if (idx !== -1) {
        const nextSlug = sec.slugs[idx + 1] ?? (COLLECTIONS[COLLECTIONS.indexOf(col)]?.sections[col.sections.indexOf(sec) + 1]?.slugs[0])
        return nextSlug ? articles.find((a) => a.slug === nextSlug) ?? null : null
      }
    }
    return null
  }, [activeSlug, articles])

  const prevArticle = useMemo(() => {
    for (const col of COLLECTIONS) for (const sec of col.sections as any) {
      const idx = sec.slugs.indexOf(activeSlug ?? '')
      if (idx !== -1) {
        const prevSlug = idx > 0 ? sec.slugs[idx - 1] : null
        return prevSlug ? articles.find((a) => a.slug === prevSlug) ?? null : null
      }
    }
    return null
  }, [activeSlug, articles])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchEl = document.getElementById('kv-search-home') as HTMLInputElement | null
        if (searchEl) { searchEl.focus(); searchEl.select() }
      }
      if (e.key === 'Escape') {
        const searchEl = document.getElementById('kv-search-home') as HTMLInputElement | null
        if (searchEl === document.activeElement) { searchEl.blur(); setSearch('') }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!activeSlug) return
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'ArrowRight' && nextArticle) { e.preventDefault(); setActiveSlug(nextArticle.slug) }
      if (e.altKey && e.key === 'ArrowLeft' && prevArticle) { e.preventDefault(); setActiveSlug(prevArticle.slug) }
      if (e.key === 'Escape' && !showEditor && !deleteId) setActiveSlug(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeSlug, nextArticle, prevArticle, showEditor, deleteId])

  useEffect(() => {
    const mainEl = document.getElementById('main-content')
    const articleEl = document.getElementById('article-body')
    if (!mainEl || !articleEl) return
    const onScroll = () => {
      const scrollTop = mainEl.scrollTop
      const total = articleEl.scrollHeight - mainEl.clientHeight
      setReadProgress(total > 0 ? Math.min(100, (scrollTop / total) * 100) : 0)
    }
    mainEl.addEventListener('scroll', onScroll)
    return () => mainEl.removeEventListener('scroll', onScroll)
  }, [activeSlug])

  const saveArticle = async () => {
    if (!editDraft?.title?.trim() || !editDraft?.content?.trim()) return
    setSaving(true)
    try {
      const slug = editDraft.slug || editDraft.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const payload = {
        title: editDraft.title.trim(),
        slug,
        content: editDraft.content.trim(),
        excerpt: editDraft.content.trim().slice(0, 150).replace(/[#\n*`]/g, ' ').trim(),
        article_type: editDraft.article_type ?? 'guide',
        visible_to: editDraft.visible_to ?? 'all',
        created_by_role: role ?? 'PM',
        created_by_name: staffName ?? '',
        is_published: editDraft.is_published ?? true,
        is_pinned: editDraft.is_pinned ?? false,
        display_order: editDraft.display_order ?? 999,
      }
      if (editDraft.id) {
        const { error } = await supabase.from('knowledge_articles').update(payload).eq('id', editDraft.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('knowledge_articles').insert(payload)
        if (error) throw error
      }
      setShowEditor(false)
      setEditDraft(null)
      await fetchArticles()
      if (!editDraft.id) setActiveSlug(slug)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const deleteArticle = async (id: string) => {
    const { error } = await supabase.from('knowledge_articles').delete().eq('id', id)
    if (error) return
    setDeleteId(null)
    if (activeArticle?.id === id) setActiveSlug(articles.find((a) => a.id !== id)?.slug ?? null)
    await fetchArticles()
  }

  const calloutConfig = {
    info: { bg: '#eff6ff', border: '#6366f1', textColor: '#3730a3', icon: Info, label: 'Info' },
    tip: { bg: '#f0fdf4', border: '#10b981', textColor: '#065f46', icon: Lightbulb, label: 'Tip' },
    warning: { bg: '#fffbeb', border: '#f59e0b', textColor: '#92400e', icon: AlertTriangle, label: 'Warning' },
    danger: { bg: '#fff1f2', border: '#f43f5e', textColor: '#9f1239', icon: AlertOctagon, label: 'Important' },
  } as const

  const KVSidebar = () => (
    <aside className="w-[240px] flex-shrink-0 flex flex-col h-full border-r border-black/[0.06] bg-[#f9f8f5]">
      <div className={cn('pt-6 pb-4', narrow ? 'px-4' : 'px-5')}>
        <div className="flex items-center gap-2"><BookOpen size={28} color="#6366f1" /><span className="font-semibold text-[13px]" style={{ color: '#28251d' }}>Knowledge Vault</span></div>
        <div className="relative mt-3"><Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8a8985]" /><input type="text" value={search} onKeyDown={(e) => { if (e.key === 'Escape') setSearch('') }} onChange={(e) => setSearch(e.target.value)} placeholder="Search guides..." className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-black/[0.06] rounded-lg text-[13px] placeholder:text-[#8a8985] focus:outline-none focus:border-[#6366f1]/40 focus:ring-2 focus:ring-[#6366f1]/10" /></div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-2 mt-2 hide-scrollbar" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
        {loading ? <PageSkeleton /> : error ? <div className="px-3 py-4"><p className="text-xs text-rose-700">{error}</p><button onClick={fetchArticles} className="text-xs underline">Retry</button></div> : COLLECTIONS.map((collection, cidx) => (
          <div key={collection.id}>
            <div className={cn('flex items-center gap-2 px-3 py-2', cidx === 0 ? 'mt-1' : 'mt-5')}>
              <span style={{ width: 3, height: 16, borderRadius: 9999, background: collection.accent }} />
              <span className={cn(narrow ? 'text-[9px]' : 'text-[10px]', 'font-bold uppercase tracking-[0.12em] text-[#7a7974]')} style={{ fontFamily: 'var(--font-share-tech-mono)' }}>{collection.label}</span>
            </div>
            {collection.sections.map((section: any) => {
              const sectionSlugs = section.slugs.filter((slug: string) => !search || titleFromSlug(slug).toLowerCase().includes(search.toLowerCase()) || filteredBySearch.some((a) => a.slug === slug))
              if (!sectionSlugs.length) return null
              return (
                <div key={section.id}>
                  <p role="presentation" className={cn('px-3 py-1 mt-2 mb-0.5 font-semibold uppercase tracking-widest text-[#8a8985]', narrow ? 'text-[8px]' : 'text-[9px]')}>{section.label}</p>
                  {sectionSlugs.map((slug: string, idx: number) => {
                    const article = filteredBySearch.find((a) => a.slug === slug)
                    const isActive = activeSlug === slug
                    const isFirstRender = !sidebarAnimatedRef.current
                    if (article) {
                      return (
                        <motion.button key={slug} initial={isFirstRender ? { opacity: 0, x: -8 } : false} animate={isFirstRender ? { opacity: 1, x: 0 } : undefined} transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onAnimationComplete={() => { sidebarAnimatedRef.current = true }} onClick={() => setActiveSlug(slug)} className={cn('w-full text-left py-1.5 pr-3 rounded-lg flex items-center gap-2 transition-colors', narrow ? 'text-[12px]' : 'text-[13px]')} style={{ borderLeft: isActive ? `2px solid ${collection.accent}` : '2px solid transparent', paddingLeft: isActive ? '10px' : '12px', color: isActive ? collection.accent : '#7a7974', background: isActive ? `${collection.accent}12` : 'transparent', fontWeight: isActive ? 600 : 400 }}>{article.title}</motion.button>
                      )
                    }
                    return (
                      <motion.button key={slug} initial={isFirstRender ? { opacity: 0, x: -8 } : false} animate={isFirstRender ? { opacity: 1, x: 0 } : undefined} transition={{ delay: idx * 0.03, duration: 0.3, ease: [0.16, 1, 0.3, 1] }} onAnimationComplete={() => { sidebarAnimatedRef.current = true }} onClick={() => setActiveSlug(slug)} className={cn('w-full text-left py-1.5 pr-3 rounded-lg flex items-center gap-2 transition-colors', narrow ? 'text-[12px]' : 'text-[13px]')} style={{ borderLeft: isActive ? `2px solid ${collection.accent}` : '2px solid transparent', paddingLeft: isActive ? '10px' : '12px', color: isActive ? collection.accent : '#7a7974', background: isActive ? `${collection.accent}12` : 'transparent', fontWeight: isActive ? 600 : 400 }}>{titleFromSlug(slug)}</motion.button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="flex-shrink-0 px-3 pb-5 pt-3 border-t border-black/[0.06]">
        <Link href="/dashboard/command-hub" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#7a7974] hover:bg-[#f3f0ec] hover:text-[#28251d] transition-colors"><ChevronLeft size={14} />Home Page</Link>
        <div className="mt-1.5 px-3" style={{ fontFamily: 'var(--font-share-tech-mono)', fontSize: 9, color: '#8a8985', letterSpacing: '0.1em' }}>Docs v2.4 · Apr 2026</div>
        {canCreate(role ?? '') && role && <button onClick={() => { setEditDraft({ article_type: 'guide', visible_to: 'all', is_published: true, is_pinned: false }); setShowEditor(true) }} className="mt-1.5 w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-[#7a7974] border border-dashed border-black/[0.08] hover:border-[#6366f1]/30 hover:text-[#6366f1] hover:bg-[#6366f1]/5 transition-colors"><Plus size={12} />New Article</button>}
      </div>
    </aside>
  )

  const KVHomePage = () => (
    <div className="px-12 max-w-[900px]" style={{ paddingTop: 'clamp(2.5rem, 5vh, 5rem)', paddingBottom: 'clamp(1.5rem, 3vh, 3rem)' }}>
      <BookOpen size={40} color="#6366f1" className="mb-6" />
      <h1 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.1 }}>Knowledge Vault</h1>
      <p className="mt-3 text-[16px] text-[#64748b]">National Health Intelligence Documentation & SOPs</p>
      <div className="mt-8 max-w-[520px] relative">
        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id="kv-search-home" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search across all guides, SOPs, and references..." className="h-[52px] w-full rounded-full border border-slate-200 pl-[52px] pr-20 text-[15px] text-slate-900 focus:outline-none focus:border-[#a5b4fc]" onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }} onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }} />
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
          <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)', lineHeight: 1.6 }}>⌘</kbd>
          <kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 6px', fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)', lineHeight: 1.6 }}>K</kbd>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-2 gap-y-2 items-center">
        <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)', letterSpacing: '0.1em', marginRight: 8 }}>Popular searches:</span>
        {['How to triage', 'AI confidence', 'RNTCP enrollment', 'User roles', 'Live sync'].map((chip) => <button key={chip} onClick={() => setSearch(chip)} className="bg-[#f1f5f9] border border-slate-200 text-[12px] text-slate-600 rounded-full px-3 py-1 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors">{chip}</button>)}
      </div>
      <div className="mt-14 grid gap-4" style={{ gridTemplateColumns: narrow ? '1fr' : 'repeat(2, 1fr)', maxWidth: 800 }}>
        {COLLECTIONS.map((collection, index) => {
          const Icon = collection.icon
          const totalArticles = collection.sections.reduce((acc, sec) => acc + sec.slugs.length, 0)
          return (
            <motion.button key={collection.id} aria-label={`${collection.label} — ${collection.description}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} onClick={() => setActiveSlug(collection.sections[0]?.slugs[0] ?? null)} className="group bg-white border border-[#e2e8f0] rounded-2xl text-left w-full transition-colors duration-200" style={{ padding: 'clamp(1rem,2vw,1.5rem)' }}>
              <div className="h-14 w-14 rounded-full flex items-center justify-center transition-[box-shadow] duration-200 group-hover:shadow-[0_0_0_4px_rgba(0,0,0,0.08)]" style={{ background: `${collection.accent}15` }}><Icon size={24} color={collection.accent} /></div>
              <h3 className="mt-4 text-[16px] font-bold text-[#0f172a]">{collection.label}</h3>
              <p className="mt-1 text-[13px] text-[#64748b]">{collection.description}</p>
              <div className="mt-4 flex items-center justify-between"><span style={{ fontFamily: 'var(--font-share-tech-mono)', fontSize: 11, color: collection.accent, letterSpacing: '0.08em', flexShrink: 0 }}>{totalArticles} articles</span><ArrowRight size={14} color="#94a3b8" /></div>
            </motion.button>
          )
        })}
      </div>
      <div className="mt-14">
        <h2 className="text-[18px] font-bold text-[#0f172a]">Start Here</h2>
        <p className="text-[13px] text-[#64748b] mt-1">Recommended reading for new users</p>
        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: narrow ? '1fr' : 'repeat(3, 1fr)' }}>
          {['what-is-samadhaan', 'command-hub-page', 'five-day-pathway'].map((slug) => {
            const meta = COLLECTIONS.find((c) => c.sections.some((s) => s.slugs.includes(slug as never)))
            const article = articles.find((a) => a.slug === slug)
            const accent = meta?.accent ?? '#6366f1'
            return (
              <Card key={slug} className="p-0 border-0 shadow-none bg-transparent">
                <motion.button whileHover={{ y: -2 }} onClick={() => setActiveSlug(slug)} className="bg-white border border-[#e2e8f0] rounded-xl p-5 text-left w-full transition-colors min-h-[120px] flex flex-col justify-between">
                  <div>
                    <Badge className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full" style={{ background: `${accent}12`, border: `1px solid ${accent}25`, color: '#3730a3', fontFamily: 'var(--font-share-tech-mono)' }}>{meta?.label ?? 'Knowledge'}</Badge>
                    <div className="text-[14px] font-semibold text-[#0f172a] mt-3">{article?.title ?? titleFromSlug(slug)}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-share-tech-mono)', fontSize: 10, color: '#64748b', marginTop: 'auto' }}>5 min read</div>
                </motion.button>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )

  const KVArticlePage = () => {
    const collection = activeCollectionMeta?.collection ?? COLLECTIONS[0]
    const section = activeCollectionMeta?.section
    const displayTitle = activeArticle?.title ?? titleFromSlug(activeSlug ?? 'article')
    const displayExcerpt = activeArticle?.excerpt ?? 'Operational documentation and SOP reference for SAMADHAAN teams.'
    const canEditCurrent = !!(activeArticle && canEdit(activeArticle, role ?? '', staffName))
    const readTime = calculateReadTime(articleBlocks)
    const nextAccent = useMemo(() => {
      if (!nextArticle) return '#e2e8f0'
      const match = COLLECTIONS.find((col) => col.sections.some((sec) => sec.slugs.includes(nextArticle.slug as never)))
      return match?.accent ?? '#e2e8f0'
    }, [nextArticle])

    useEffect(() => {
      const headingEls = document.querySelectorAll('[data-heading-idx]')
      if (!headingEls.length) return
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveHeading(Number(entry.target.getAttribute('data-heading-idx')))
        })
      }, { rootMargin: '-20% 0px -70% 0px', threshold: 0 })
      headingEls.forEach((el) => observer.observe(el))
      return () => observer.disconnect()
    }, [activeSlug])

    return (
      <AnimatePresence mode="wait">
        <motion.div key={activeSlug ?? 'article'} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="flex">
          <div className="flex-1 max-w-[720px] px-12 py-12 relative" id="article-body">
            <div className="flex items-center mb-5 uppercase" style={{ fontFamily: 'var(--font-share-tech-mono)', fontSize: 10, letterSpacing: '0.1em' }}>
              <span style={{ color: collection.accent }}>{collection.label}</span><ChevronRight size={10} style={{ color: '#64748b', margin: '0 4px' }} /><span style={{ color: '#64748b' }}>{section?.label ?? 'Section'}</span><ChevronRight size={10} style={{ color: '#64748b', margin: '0 4px' }} /><span style={{ color: '#64748b' }}>{displayTitle}</span>
            </div>
            {ARTICLE_TOUR_MAP[activeSlug] && (() => {
              const tour = ALL_TOURS.find(t => t.id === ARTICLE_TOUR_MAP[activeSlug!])
              if (!tour) return null
              return (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <button
                    onClick={() => {
                      const { startTour } = useTourStore.getState()
                      startTour(tour)
                      router.push('/dashboard/command-hub')
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      marginTop: 16,
                      marginBottom: 16,
                      background: 'linear-gradient(135deg,#6366f108,#8b5cf608)',
                      border: '1px solid #6366f125',
                      borderRadius: '0.75rem',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: '#6366f115',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Map size={13} style={{ color: '#6366f1' }} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', fontFamily: 'var(--font-outfit)' }}>
                        Interactive Tour Available
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)' }}>
                        {tour.estimatedMinutes} min · {tour.steps.length} steps
                      </div>
                    </div>
                    <ArrowRight size={13} style={{ color: '#6366f1', marginLeft: 'auto' }} />
                  </button>
                </motion.div>
              )
            })()}
            {canEditCurrent && <div className="absolute top-12 right-8 flex items-center gap-1.5"><button onClick={() => { if (activeArticle) { setEditDraft({ ...activeArticle }); setShowEditor(true) } }} className="p-1.5 rounded-md"><Edit2 size={13} /></button><button onClick={() => activeArticle && setDeleteId(activeArticle.id)} className="p-1.5 rounded-md"><Trash2 size={13} /></button></div>}
            <Badge role="img" aria-label={`${collection.label} article`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-2.5" style={{ background: `${collection.accent}12`, border: `1px solid ${collection.accent}25`, color: '#3730a3' }}><collection.icon size={10} />{collection.label}</Badge>
            <h1 style={{ fontSize: 'clamp(1.75rem,3vw,2.25rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12, fontFeatureSettings: '"kern" 1, "liga" 1' }}>{displayTitle}</h1>
            <p style={{ fontSize: 15, color: '#64748b', marginBottom: 16, maxWidth: 560 }}>{displayExcerpt}</p>
            <div className="flex items-center gap-4" style={{ fontFamily: 'var(--font-share-tech-mono)', fontSize: 10, color: '#64748b' }}>
              <span>Last updated: {formatDate(activeArticle?.updated_at)}</span><span>·</span><span>{readTime}</span><span>·</span><span>{headings.length} sections</span><span>·</span><span>Role: {activeArticle?.visible_to === 'all' || !activeArticle ? 'All Users' : activeArticle.visible_to}</span>
            </div>
            <div style={{ marginTop: 28, marginBottom: 36, borderTop: '1px solid #f1f5f9' }} />
            <div style={{ height: 2, background: '#f1f5f9', borderRadius: 9999, marginBottom: '2rem', overflow: 'hidden' }}><motion.div style={{ height: '100%', background: collection.accent, width: `${readProgress}%`, borderRadius: 9999 }} transition={{ duration: 0.1 }} /></div>
            {articleBlocks.map((block, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                {block.type === 'heading2' && <h2 data-heading-idx={headings.findIndex((h) => h.text === block.text)} id={`heading-${headings.findIndex((h) => h.text === block.text)}`} style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginTop: '3rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e8ecf0', letterSpacing: '-0.01em' }}>{block.text}</h2>}
                {block.type === 'heading3' && <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: '#1e293b', marginTop: '2rem', marginBottom: '0.75rem' }}>{block.text}</h3>}
                {block.type === 'paragraph' && <p style={{ fontSize: 15, lineHeight: 1.75, color: '#334155', marginBottom: '1rem', maxWidth: '65ch' }}>{block.text}</p>}
                {block.type === 'callout' && (() => { const cfg = calloutConfig[block.variant]; const Icon = cfg.icon; return <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}30`, borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem', maxWidth: 640, position: 'relative', padding: '1rem 1.25rem' }}><div style={{ height: 3, background: cfg.border, marginBottom: 16, marginLeft: -20, marginRight: -20, marginTop: -16 }} /><div style={{ display: 'flex', gap: 12 }}><Icon size={16} style={{ color: cfg.border, flexShrink: 0, marginTop: 2 }} /><div><div style={{ fontSize: 12, fontWeight: 700, color: cfg.textColor, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, fontFamily: 'var(--font-share-tech-mono)' }}>{cfg.label}</div><div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{block.title}</div><div style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#475569' }}>{block.body}</div></div></div></div> })()}
                {block.type === 'steps' && <div style={{ marginBottom: '1.5rem', maxWidth: 580 }}>{block.items.map((s, si) => <div key={si} style={{ display: 'flex', gap: 16 }}><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ width: 28, height: 28, borderRadius: '50%', background: collection.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-share-tech-mono)' }}>{si + 1}</div>{si < block.items.length - 1 && <div style={{ width: 1, flex: 1, minHeight: 24, background: 'repeating-linear-gradient(to bottom,#e2e8f0 0,#e2e8f0 4px,transparent 4px,transparent 8px)', margin: '4px 0' }} />}</div><div style={{ paddingBottom: si < block.items.length - 1 ? 24 : 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{s.title}</div><div style={{ fontSize: 13, lineHeight: 1.7, color: '#64748b' }}>{s.desc}</div></div></div>)}</div>}
                {block.type === 'table' && <div style={{ border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', marginBottom: '1.5rem', maxWidth: '100%' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr style={{ background: '#f8fafc' }}>{block.headers.map((h, hi) => <th key={hi} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontFamily: 'var(--font-share-tech-mono)', borderBottom: '1px solid #e2e8f0' }}>{h}</th>)}</tr></thead><tbody>{block.rows.map((r, ri) => <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>{r.map((cell, ci) => <td key={ci} style={{ padding: '10px 16px', fontSize: 13, verticalAlign: 'middle', lineHeight: 1.4, color: cell.includes('❌') ? '#f43f5e' : cell.includes('⚠️') ? '#f59e0b' : cell.includes('✅') ? '#10b981' : '#334155', fontWeight: ci === 0 ? 600 : 400 }}>{cell}</td>)}</tr>)}</tbody></table></div>}
                {block.type === 'diagram' && (() => { const DiagramComponent = SVG_ILLUSTRATIONS[block.id]; return <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} style={{ margin: '2rem 0', background: '#fafafa', border: '1px solid #f1f5f9', borderRadius: '1rem', padding: '2rem', overflow: 'hidden' }}><DiagramComponent />{block.caption && <p style={{ marginTop: '1rem', fontSize: 12, color: '#64748b', textAlign: 'center', fontFamily: 'var(--font-share-tech-mono)', letterSpacing: '0.06em' }}>{block.caption}</p>}</motion.div> })()}
                {block.type === 'stack-diagram' && <div />}
                {block.type === 'flow-diagram' && <div />}
                {block.type === 'code' && (
                  <div style={{ background: '#0f172a', borderRadius: '0.875rem', overflow: 'hidden', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ height: 40, background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 6 }}>{['#ff5f57', '#febc2e', '#28c840'].map((c) => <span key={c} style={{ width: 12, height: 12, borderRadius: 9999, background: c }} />)}</div>
                      <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 9999, padding: '2px 10px', fontSize: 10, color: '#94a3b8', fontFamily: 'var(--font-share-tech-mono)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{block.language}</span>
                      <button onClick={async () => { await navigator.clipboard.writeText(block.code); setCopiedIndex(i); setTimeout(() => setCopiedIndex(null), 2000) }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#64748b' }}>{copiedIndex === i ? <><Check size={12} />Copied!</> : <><Copy size={12} />Copy</>}</button>
                    </div>
                    <pre style={{ margin: 0, padding: 20, fontFamily: 'var(--font-share-tech-mono)', fontSize: 13, lineHeight: 1.7, color: '#e2e8f0', overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: block.code.replace(/\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|TABLE|const|let|var|function|return|import|export|if|else|interface|type|async|await)\b/g, '<span style="color:#8b5cf6">$1</span>').replace(/(["'`])(?:(?!\1)[^\\]|\\[\s\S])*\1/g, '<span style="color:#10b981">$&</span>').replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g, '<span style="color:#475569">$&</span>').replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#f59e0b">$1</span>') }} />
                  </div>
                )}
              </motion.div>
            ))}
            <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '4rem', paddingTop: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>Was this helpful?</span>
                <button onClick={() => setHelpful(true)} aria-pressed={helpful === true} style={{ padding: '4px 12px', borderRadius: 9999, border: '1px solid #e2e8f0', fontSize: 12, background: helpful === true ? '#f0fdf4' : '#fff', color: helpful === true ? '#10b981' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ThumbsUp size={12} />Yes</button>
                <button onClick={() => setHelpful(false)} aria-pressed={helpful === false} style={{ padding: '4px 12px', borderRadius: 9999, border: '1px solid #e2e8f0', fontSize: 12, background: helpful === false ? '#fff1f2' : '#fff', color: helpful === false ? '#f43f5e' : '#64748b', display: 'inline-flex', alignItems: 'center', gap: 6 }}><ThumbsDown size={12} />No</button>
                {helpful !== null && <motion.span initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} style={{ fontSize: 12, color: '#10b981' }}>Thanks for your feedback!</motion.span>}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}><span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)' }}>Keyboard:</span><span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)' }}><kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#64748b' }}>Alt ←</kbd> prev</span><span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)' }}><kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#64748b' }}>Alt →</kbd> next</span><span style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-share-tech-mono)' }}><kbd style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px', fontSize: 9, color: '#64748b' }}>Esc</kbd> home</span></div>
              {nextArticle && <motion.button whileHover={{ y: -2, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }} transition={{ type: 'spring', stiffness: 400, damping: 25 }} onClick={() => setActiveSlug(nextArticle.slug)} style={{ width: '100%', textAlign: 'left', background: '#fff', border: `1px solid ${nextAccent}25`, borderLeft: `3px solid ${nextAccent}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', marginTop: 16 }}><div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#64748b', marginBottom: 8, fontFamily: 'var(--font-share-tech-mono)' }}>Next Article →</div><div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a' }}>{nextArticle.title}</div></motion.button>}
            </div>
          </div>
          <div className="w-[200px] pt-16 pr-8" style={{ display: narrow ? 'none' : 'block' }}>
            <nav aria-label="On this page" style={{ position: 'sticky', top: '2rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#64748b', marginBottom: 12, fontFamily: 'var(--font-share-tech-mono)' }}>On this page</div>
              {headings.map((h, i) => <button key={i} onClick={() => document.getElementById(`heading-${i}`)?.scrollIntoView({ behavior: 'smooth' })} style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 12, padding: '5px 8px', borderRadius: '0.375rem', color: activeHeading === i ? collection.accent : '#64748b', background: activeHeading === i ? `${collection.accent}10` : 'transparent', borderLeft: activeHeading === i ? `2px solid ${collection.accent}` : '2px solid transparent' }}>{h.text}</button>)}
            </nav>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <a href="#main-content" style={{ position: 'absolute', left: -9999, width: 1, height: 1, overflow: 'hidden' }}>Skip to content</a>
      <KVSidebar />
      <main id="main-content" className="flex-1 h-full overflow-y-auto">{activeSlug === null ? <KVHomePage /> : <KVArticlePage />}</main>
      <AnimatePresence>{showEditor && editDraft && <ArticleEditor article={editDraft} role={role ?? 'PM'} onChange={setEditDraft} onSave={saveArticle} onClose={() => { setShowEditor(false); setEditDraft(null) }} saving={saving} />}</AnimatePresence>
      <AnimatePresence>{deleteId && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] flex items-center justify-center px-4" onClick={() => setDeleteId(null)}><motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full"><h3 className="font-semibold text-[#28251d] text-sm mb-2">Delete article?</h3><p className="text-xs text-[#7a7974] mb-5">This permanently removes the article and cannot be undone.</p><div className="flex gap-3"><button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-black/[0.1] rounded-lg text-sm">Cancel</button><button onClick={() => deleteArticle(deleteId)} className="flex-1 py-2.5 bg-[#a12c7b] text-white rounded-lg text-sm">Delete</button></div></motion.div></motion.div>}</AnimatePresence>
    </div>
  )
}
