'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, User, MapPin, Activity, ClipboardList, Pill } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useEffect, useState } from 'react'

type Patient = {
  id: string
  serial_no?: string
  patient_name?: string
  age?: number
  sex?: string
  contact_number?: string
  submission_date?: string
  staff_name?: string
  screening_state?: string
  screening_district?: string
  facility_name?: string
  facility_type?: string
  microplan_block?: string
  symptom_cough_2weeks?: boolean
  symptom_fever?: boolean
  symptom_night_sweats?: boolean
  symptom_weight_loss?: boolean
  symptom_haemoptysis?: boolean
  symptom_chest_pain?: boolean
  symptom_breathlessness?: boolean
  symptom_lymphadenopathy?: boolean
  symptom_loss_of_appetite?: boolean
  symptom_other?: boolean
  symptom_other_detail?: string
  xray_done?: boolean
  xray_result?: string
  cbnaat_done?: boolean
  cbnaat_result?: string
  referred_for_diagnosis?: boolean
  referral_date?: string
  referral_facility?: string
  tb_diagnosed?: string
  tb_type?: string
  dr_tb?: boolean
  att_started?: boolean
  att_start_date?: string
  treatment_regimen?: string
  dots_provider?: string
  treatment_status?: string
  remarks?: string
}

interface PatientDetailPanelProps {
  patientId: string | null
  onClose: () => void
  canEdit: boolean
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

export function PatientDetailPanel({ patientId, onClose, canEdit }: PatientDetailPanelProps) {
  const [patient, setPatient] = useState<Patient | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single()
      .then(({ data, error }) => { 
        if (!error && data) {
          setPatient(data as Patient)
        }
        setLoading(false) 
      })
  }, [patientId, supabase])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {patientId && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px]"
          />

          <motion.aside
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-40 h-full w-full max-w-[520px]
                       bg-[#f9f8f5] border-l border-black/[0.08] shadow-2xl
                       overflow-y-auto"
            aria-label="Patient detail"
            role="dialog"
          >
            <div className="sticky top-0 z-10 bg-[#f9f8f5]/95 backdrop-blur-sm
                           border-b border-black/[0.06] px-6 py-4 flex items-center 
                           justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#28251d]">
                  {loading ? 'Loading…' : patient?.patient_name ?? 'Patient Record'}
                </h2>
                {patient && (
                  <p className="text-xs text-[#7a7974] mt-0.5">
                    Serial #{patient.serial_no} · {patient.screening_district}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="p-2 rounded-md text-[#7a7974] hover:bg-[#f3f0ec]
                           hover:text-[#28251d] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6 space-y-6">
              {loading ? (
                <PatientDetailSkeleton />
              ) : patient ? (
                <>
                  <DetailSection icon={User} title="Patient Identity">
                    <DetailRow label="Full Name" value={patient.patient_name} />
                    <DetailRow label="Age" value={patient.age ? `${patient.age} yrs` : '—'} />
                    <DetailRow label="Sex" value={patient.sex} />
                    <DetailRow label="Contact" value={patient.contact_number ?? '—'} />
                    <DetailRow label="Submission Date" value={patient.submission_date} />
                    <DetailRow label="Staff Name" value={patient.staff_name} />
                  </DetailSection>

                  <DetailSection icon={MapPin} title="Facility & Location">
                    <DetailRow label="State" value={patient.screening_state} />
                    <DetailRow label="District" value={patient.screening_district} />
                    <DetailRow label="Facility" value={patient.facility_name} />
                    <DetailRow label="Type" value={patient.facility_type} />
                    <DetailRow label="Block" value={patient.microplan_block ?? '—'} />
                  </DetailSection>

                  <DetailSection icon={Activity} title="Symptom Screening">
                    <SymptomSummary patient={patient} />
                    <DetailRow label="X-Ray Done" value={patient.xray_done ? 'Yes' : 'No'} />
                    {patient.xray_result && (
                      <DetailRow label="X-Ray Result" value={patient.xray_result}
                        highlight={patient.xray_result === 'Abnormal'} />
                    )}
                    <DetailRow label="CBNAAT Done" value={patient.cbnaat_done ? 'Yes' : 'No'} />
                    {patient.cbnaat_result && (
                      <DetailRow label="CBNAAT Result" value={patient.cbnaat_result}
                        highlight={patient.cbnaat_result === 'MTB Detected'} />
                    )}
                  </DetailSection>

                  <DetailSection icon={ClipboardList} title="Referral & Diagnosis">
                    <DetailRow label="Referred" value={patient.referred_for_diagnosis ? 'Yes' : 'No'} />
                    {patient.referral_date && (
                      <DetailRow label="Referral Date" value={patient.referral_date} />
                    )}
                    <DetailRow label="TB Diagnosed" value={patient.tb_diagnosed ?? '—'}
                      highlight={patient.tb_diagnosed === 'Yes'} />
                    {patient.tb_type && (
                      <DetailRow label="TB Type" value={patient.tb_type} />
                    )}
                    <DetailRow label="Drug-Resistant" value={patient.dr_tb ? 'Yes' : 'No'}
                      highlight={!!patient.dr_tb} />
                  </DetailSection>

                  <DetailSection icon={Pill} title="Treatment">
                    <DetailRow label="ATT Started" value={patient.att_started ? 'Yes' : 'No'} />
                    {patient.att_start_date && (
                      <DetailRow label="Start Date" value={patient.att_start_date} />
                    )}
                    {patient.treatment_regimen && (
                      <DetailRow label="Regimen" value={patient.treatment_regimen} />
                    )}
                    {patient.dots_provider && (
                      <DetailRow label="DOTS Provider" value={patient.dots_provider} />
                    )}
                    {patient.treatment_status && (
                      <DetailRow label="Status" value={patient.treatment_status}
                        highlight={['Defaulted', 'Died'].includes(patient.treatment_status ?? '')} />
                    )}
                    {patient.remarks && (
                      <div className="pt-2">
                        <p className="text-xs text-[#7a7974] mb-1">Remarks</p>
                        <p className="text-sm text-[#28251d] bg-[#f3f0ec] rounded-lg px-3 py-2">
                          {patient.remarks}
                        </p>
                      </div>
                    )}
                  </DetailSection>

                  {canEdit && (
                    <div className="pt-2 border-t border-black/[0.06]">
                      <button className="w-full py-3 bg-[#01696f] text-white rounded-lg
                                        text-sm font-medium hover:bg-[#0c4e54] 
                                        transition-colors duration-180">
                        Edit Record
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#7a7974]">Record not found.</p>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function DetailSection({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className="text-[#7a7974]" />
        <h3 className="text-xs font-semibold text-[#7a7974] uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function DetailRow({ label, value, highlight = false }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-4">
      <span className="text-sm text-[#7a7974] shrink-0">{label}</span>
      <span className={cn(
        'text-sm text-right',
        highlight ? 'text-[#a12c7b] font-medium' : 'text-[#28251d]'
      )}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function SymptomSummary({ patient }: { patient: Patient }) {
  const SYMPTOM_LABELS: Record<string, string> = {
    symptom_cough_2weeks: 'Cough ≥ 2wks',
    symptom_fever: 'Fever',
    symptom_night_sweats: 'Night sweats',
    symptom_weight_loss: 'Weight loss',
    symptom_haemoptysis: 'Haemoptysis',
    symptom_chest_pain: 'Chest pain',
    symptom_breathlessness: 'Breathlessness',
    symptom_lymphadenopathy: 'Lymphadenopathy',
    symptom_loss_of_appetite: 'Loss of appetite',
    symptom_other: 'Other',
  }
  const active = Object.entries(SYMPTOM_LABELS)
    .filter(([key]) => patient[key as keyof Patient])
    .map(([, label]) => label)
  
  if (!active.length) return (
    <DetailRow label="Symptoms" value="None reported" />
  )
  return (
    <div>
      <p className="text-xs text-[#7a7974] mb-1.5">
        Symptoms ({active.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {active.map(s => (
          <span key={s} className="text-xs px-2 py-0.5 rounded-full
                                   bg-[#964219]/10 text-[#964219] font-medium">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

function PatientDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-[#e6e4df] rounded" />
          {[0, 1, 2].map((j) => (
            <div key={j} className="flex justify-between">
              <div className="h-4 w-28 bg-[#e6e4df] rounded" />
              <div className="h-4 w-20 bg-[#e6e4df] rounded" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
