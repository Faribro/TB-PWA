'use client'

import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { useSessionScope } from '@/hooks/useSessionScope'
import { useOfflineSync } from '@/hooks/useOfflineSync'
import confetti from 'canvas-confetti'
import { sounds } from '@/lib/sound'
import { 
  ChevronLeft, Lock, User, MapPin, Activity, ClipboardList, Pill,
  Wind, Thermometer, Moon, TrendingDown, Droplets, Heart, Waves, Circle, Utensils, Plus,
  Check, X
} from 'lucide-react'

// ZOD SCHEMA — COMPLETE
const tbScreeningSchema = z.object({
  // Step 1 — Patient Identity
  serial_no: z.string().min(1, 'Serial number is required'),
  patient_name: z.string().min(2, 'Full name required').max(100),
  age: z.number({ message: 'Age must be a number' }).int().min(0).max(120),
  sex: z.enum(['Male', 'Female', 'Other'], { message: 'Please select sex' }),
  submission_date: z.string().min(1, 'Date is required'),
  contact_number: z.string().optional(),

  // Step 2 — Location & Facility
  screening_state: z.string().min(1, 'State is required'),
  screening_district: z.string().min(1, 'District is required'),
  facility_type: z.enum(['CHC', 'PHC', 'DH', 'Private', 'DRTB Centre', 'Other']),
  facility_name: z.string().min(1, 'Facility name is required'),
  microplan_block: z.string().optional(),

  // Step 3 — Symptom Screening (10S)
  symptom_cough_2weeks: z.boolean().default(false),
  symptom_fever: z.boolean().default(false),
  symptom_night_sweats: z.boolean().default(false),
  symptom_weight_loss: z.boolean().default(false),
  symptom_haemoptysis: z.boolean().default(false),
  symptom_chest_pain: z.boolean().default(false),
  symptom_breathlessness: z.boolean().default(false),
  symptom_lymphadenopathy: z.boolean().default(false),
  symptom_loss_of_appetite: z.boolean().default(false),
  symptom_other: z.boolean().default(false),
  symptom_other_detail: z.string().optional(),
  xray_done: z.boolean().default(false),
  xray_result: z.enum(['Normal', 'Abnormal', 'Not done']).optional(),
  cbnaat_done: z.boolean().default(false),
  cbnaat_result: z.enum(['MTB Detected', 'MTB Not Detected', 'Indeterminate', 'Not done']).optional(),

  // Step 4 — Referral & Diagnosis
  referred_for_diagnosis: z.boolean().default(false),
  referral_date: z.string().optional(),
  referral_facility: z.string().optional(),
  tb_diagnosed: z.enum(['Yes', 'No', 'Pending']).optional(),
  tb_type: z.enum(['Pulmonary', 'Extra-pulmonary', 'Both']).optional(),
  dr_tb: z.boolean().default(false),

  // Step 5 — Treatment
  att_started: z.boolean().default(false),
  att_start_date: z.string().optional(),
  treatment_regimen: z.enum(['Cat I', 'Cat II', 'DRTB Regimen', 'Other']).optional(),
  dots_provider: z.string().optional(),
  treatment_status: z.enum(['Ongoing', 'Completed', 'Defaulted', 'Died', 'Not Started']).optional(),
  remarks: z.string().max(500).optional(),
})

type TBScreeningFormData = z.infer<typeof tbScreeningSchema>

// Step definitions
const STEPS = [
  { id: 1, label: 'Patient',   shortLabel: 'Patient Identity',    icon: 'User' },
  { id: 2, label: 'Location',  shortLabel: 'Facility & Location', icon: 'MapPin' },
  { id: 3, label: 'Screening', shortLabel: 'Symptom Screening',   icon: 'Activity' },
  { id: 4, label: 'Referral',  shortLabel: 'Referral & Diagnosis',icon: 'ClipboardList' },
  { id: 5, label: 'Treatment', shortLabel: 'Treatment Details',   icon: 'Pill' },
]

// Symptom definitions
const SYMPTOMS = [
  { key: 'symptom_cough_2weeks',     label: 'Cough ≥ 2 weeks',       icon: Wind },
  { key: 'symptom_fever',            label: 'Fever',                  icon: Thermometer },
  { key: 'symptom_night_sweats',     label: 'Night sweats',           icon: Moon },
  { key: 'symptom_weight_loss',      label: 'Weight loss',            icon: TrendingDown },
  { key: 'symptom_haemoptysis',      label: 'Haemoptysis (blood)',    icon: Droplets },
  { key: 'symptom_chest_pain',       label: 'Chest pain',             icon: Heart },
  { key: 'symptom_breathlessness',   label: 'Breathlessness',         icon: Waves },
  { key: 'symptom_lymphadenopathy',  label: 'Swollen lymph nodes',    icon: Circle },
  { key: 'symptom_loss_of_appetite', label: 'Loss of appetite',       icon: Utensils },
  { key: 'symptom_other',            label: 'Other symptom',          icon: Plus },
]

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// REUSABLE FORM COMPONENTS
interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}

function FormField({ label, required, hint, error, children }: FormFieldProps) {
  const fieldId = label.toLowerCase().replace(/\s+/g, '-')
  
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="form-label">
        {label}
        {required && <span className="text-[#a12c7b] ml-1">*</span>}
      </label>
      {hint && <p className="text-xs text-[#7a7974]">{hint}</p>}
      <div>
        {children}
      </div>
      {error && (
        <motion.p 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="form-error text-[#a12c7b] text-sm font-medium mt-1 flex items-center gap-1"
        >
          <X size={14} />
          {error}
        </motion.p>
      )}
    </div>
  )
}

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

function TextInput({ error, className, ...props }: TextInputProps) {
  return (
    <input
      className={cn(
        'form-input',
        error && 'border-[#a12c7b] shadow-[0_0_0_3px_#e0ced7]',
        className
      )}
      {...props}
    />
  )
}

interface SegmentedControlProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function SegmentedControl({ options, value, onChange, disabled }: SegmentedControlProps) {
  return (
    <div className="flex bg-white border border-black/[0.08] rounded-lg p-1 gap-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-180',
            value === option
              ? 'bg-[#01696f] text-white'
              : 'text-[#7a7974] hover:text-[#28251d] hover:bg-[#f3f0ec]'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

interface ChipSelectorProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  columns?: number
}

function ChipSelector({ options, value, onChange, columns = 2 }: ChipSelectorProps) {
  return (
    <div className={cn('grid gap-2', `grid-cols-${columns}`)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'py-2.5 px-4 rounded-lg border text-sm font-medium transition-all duration-180',
            value === option
              ? 'border-[#01696f] bg-[#cedcd8]/40 text-[#01696f]'
              : 'border-black/[0.08] bg-white text-[#7a7974] hover:border-black/[0.12] hover:text-[#28251d]'
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

interface SymptomRowProps {
  symptom: typeof SYMPTOMS[0]
  checked: boolean
  onChange: (checked: boolean) => void
}

function SymptomRow({ symptom, checked, onChange }: SymptomRowProps) {
  const Icon = symptom.icon
  
  return (
    <motion.button
      type="button"
      onClick={() => onChange(!checked)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full p-4 rounded-lg border transition-all duration-180 flex items-center gap-3',
        checked 
          ? 'bg-[#cedcd8]/30 border-[#01696f]/30' 
          : 'bg-white border-black/[0.08] hover:border-black/[0.12]'
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center',
        checked ? 'bg-[#01696f] text-white' : 'bg-[#f3f0ec] text-[#7a7974]'
      )}>
        <Icon size={20} />
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-[#28251d]">{symptom.label}</p>
      </div>
      <div className={cn(
        'w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-180',
        checked 
          ? 'border-[#01696f] bg-[#01696f]' 
          : 'border-black/[0.2]'
      )}>
        {checked && <Check size={12} color="white" />}
      </div>
    </motion.button>
  )
}

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full"
    >
      <div className={cn(
        'w-12 h-6 rounded-full transition-all duration-300 relative',
        checked ? 'bg-[#01696f]' : 'bg-black/[0.2]'
      )}>
        <motion.div
          layout
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white',
            checked ? 'left-7' : 'left-1'
          )}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      <span className="text-sm font-medium text-[#28251d]">{label}</span>
    </button>
  )
}

interface ConditionalRevealProps {
  show: boolean
  children: React.ReactNode
}

function ConditionalReveal({ show, children }: ConditionalRevealProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// STEP COMPONENTS
function Step1PatientIdentity({ form }: { form: any }) {
  return (
    <div className="space-y-6">
      <FormField 
        label="Serial Number" 
        required 
        hint="Auto-incremented patient identifier"
        error={form.formState.errors.serial_no?.message}
      >
        <TextInput
          id="serial-no"
          placeholder="e.g., 001"
          {...form.register('serial_no')}
          aria-invalid={!!form.formState.errors.serial_no}
          aria-describedby={form.formState.errors.serial_no ? 'serial-no-error' : 'serial-no-hint'}
        />
      </FormField>

      <FormField 
        label="Patient Name" 
        required 
        error={form.formState.errors.patient_name?.message}
      >
        <TextInput
          id="patient-name"
          placeholder="Enter full name"
          {...form.register('patient_name')}
          aria-invalid={!!form.formState.errors.patient_name}
          aria-describedby={form.formState.errors.patient_name ? 'patient-name-error' : undefined}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-4">
        <FormField 
          label="Age" 
          required 
          error={form.formState.errors.age?.message}
        >
          <TextInput
            id="age"
            type="number"
            placeholder="Years"
            {...form.register('age', { valueAsNumber: true })}
            aria-invalid={!!form.formState.errors.age}
            aria-describedby={form.formState.errors.age ? 'age-error' : undefined}
          />
        </FormField>

        <FormField 
          label="Sex" 
          required 
          error={form.formState.errors.sex?.message}
        >
          <Controller
            control={form.control}
            name="sex"
            render={({ field }) => (
              <SegmentedControl
                options={['Male', 'Female', 'Other']}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormField 
          label="Submission Date" 
          required 
          error={form.formState.errors.submission_date?.message}
        >
          <TextInput
            id="submission-date"
            type="date"
            {...form.register('submission_date')}
            aria-invalid={!!form.formState.errors.submission_date}
            aria-describedby={form.formState.errors.submission_date ? 'submission-date-error' : undefined}
          />
        </FormField>

        <FormField 
          label="Contact Number" 
          hint="Optional"
          error={form.formState.errors.contact_number?.message}
        >
          <TextInput
            id="contact-number"
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            {...form.register('contact_number')}
            aria-invalid={!!form.formState.errors.contact_number}
            aria-describedby={form.formState.errors.contact_number ? 'contact-number-error' : undefined}
          />
        </FormField>
      </div>
    </div>
  )
}

function Step2Location({ form }: { form: any }) {
  const stateValue = form.watch('screening_state') || ''
  const districtValue = form.watch('screening_district') || ''
  
  return (
    <div className="space-y-6">
      <FormField 
        label="Screening State" 
        required 
        error={form.formState.errors.screening_state?.message}
      >
        <div className="relative">
          <TextInput
            id="screening-state"
            readOnly
            value={stateValue || 'Loading...'}
            onChange={() => {}} // Controlled input needs onChange
            className="bg-[#f3f0ec] cursor-not-allowed"
            aria-invalid={!!form.formState.errors.screening_state}
          />
          <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
        </div>
        <p className="text-xs text-[#7a7974] flex items-center gap-1 mt-1">
          <Lock size={11} /> Pre-filled from your profile · Contact admin to change
        </p>
      </FormField>

      <FormField 
        label="Screening District" 
        required 
        error={form.formState.errors.screening_district?.message}
      >
        <div className="relative">
          <TextInput
            id="screening-district"
            readOnly
            value={districtValue || 'Loading...'}
            onChange={() => {}} // Controlled input needs onChange
            className="bg-[#f3f0ec] cursor-not-allowed"
            aria-invalid={!!form.formState.errors.screening_district}
          />
          <Lock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7974]" />
        </div>
        <p className="text-xs text-[#7a7974] flex items-center gap-1 mt-1">
          <Lock size={11} /> Pre-filled from your profile · Contact admin to change
        </p>
      </FormField>

      <FormField 
        label="Facility Type" 
        required 
        error={form.formState.errors.facility_type?.message}
      >
        <Controller
          control={form.control}
          name="facility_type"
          render={({ field }) => (
            <ChipSelector
              options={['CHC', 'PHC', 'DH', 'Private', 'DRTB Centre', 'Other']}
              value={field.value || ''}
              onChange={field.onChange}
              columns={2}
            />
          )}
        />
      </FormField>

      <FormField 
        label="Facility Name" 
        required 
        error={form.formState.errors.facility_name?.message}
      >
        <TextInput
          id="facility-name"
          placeholder="Enter facility name"
          {...form.register('facility_name')}
          aria-invalid={!!form.formState.errors.facility_name}
          aria-describedby={form.formState.errors.facility_name ? 'facility-name-error' : undefined}
        />
      </FormField>

      <FormField 
        label="Microplan Block" 
        hint="Optional"
        error={form.formState.errors.microplan_block?.message}
      >
        <TextInput
          id="microplan-block"
          placeholder="Enter block name"
          {...form.register('microplan_block')}
          aria-invalid={!!form.formState.errors.microplan_block}
          aria-describedby={form.formState.errors.microplan_block ? 'microplan-block-error' : undefined}
        />
      </FormField>
    </div>
  )
}

function Step3Symptoms({ form }: { form: any }) {
  const selectedSymptoms = SYMPTOMS.filter(s => form.watch(s.key as keyof TBScreeningFormData) as boolean)
  
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {selectedSymptoms.length > 0 && (
          <div className="bg-[#cedcd8]/20 rounded-lg px-3 py-2 text-center">
            <p className="text-sm font-medium text-[#01696f]">
              {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
        
        {SYMPTOMS.map((symptom) => (
          <Controller
            key={symptom.key}
            control={form.control}
            name={symptom.key as keyof TBScreeningFormData}
            render={({ field }) => (
              <SymptomRow
                symptom={symptom}
                checked={field.value as boolean}
                onChange={field.onChange}
              />
            )}
          />
        ))}

        {form.watch('symptom_other') && (
          <ConditionalReveal show={form.watch('symptom_other') as boolean}>
            <FormField 
              label="Please specify other symptoms" 
              error={form.formState.errors.symptom_other_detail?.message}
            >
              <TextInput
                id="symptom-other-detail"
                placeholder="Describe other symptoms..."
                {...form.register('symptom_other_detail')}
                aria-invalid={!!form.formState.errors.symptom_other_detail}
                aria-describedby={form.formState.errors.symptom_other_detail ? 'symptom-other-detail-error' : undefined}
              />
            </FormField>
          </ConditionalReveal>
        )}
      </div>

      <div className="border-t border-black/[0.06] pt-6 space-y-6">
        <div>
          <Controller
            control={form.control}
            name="xray_done"
            render={({ field }) => (
              <ToggleSwitch
                checked={field.value as boolean}
                onChange={field.onChange}
                label="X-ray done?"
              />
            )}
          />
          
          <ConditionalReveal show={form.watch('xray_done') as boolean}>
            <FormField 
              label="X-ray Result" 
              error={form.formState.errors.xray_result?.message}
            >
              <Controller
                control={form.control}
                name="xray_result"
                render={({ field }) => (
                  <select
                    id="xray-result"
                    {...field}
                    className="form-input"
                    aria-invalid={!!form.formState.errors.xray_result}
                    aria-describedby={form.formState.errors.xray_result ? 'xray-result-error' : undefined}
                  >
                    <option value="">Select result</option>
                    <option value="Normal">Normal</option>
                    <option value="Abnormal">Abnormal</option>
                    <option value="Not done">Not done</option>
                  </select>
                )}
              />
            </FormField>
          </ConditionalReveal>
        </div>

        <div>
          <Controller
            control={form.control}
            name="cbnaat_done"
            render={({ field }) => (
              <ToggleSwitch
                checked={field.value as boolean}
                onChange={field.onChange}
                label="CBNAAT done?"
              />
            )}
          />
          
          <ConditionalReveal show={form.watch('cbnaat_done') as boolean}>
            <FormField 
              label="CBNAAT Result" 
              error={form.formState.errors.cbnaat_result?.message}
            >
              <Controller
                control={form.control}
                name="cbnaat_result"
                render={({ field }) => (
                  <select
                    id="cbnaat-result"
                    {...field}
                    className="form-input"
                    aria-invalid={!!form.formState.errors.cbnaat_result}
                    aria-describedby={form.formState.errors.cbnaat_result ? 'cbnaat-result-error' : undefined}
                  >
                    <option value="">Select result</option>
                    <option value="MTB Detected">MTB Detected</option>
                    <option value="MTB Not Detected">MTB Not Detected</option>
                    <option value="Indeterminate">Indeterminate</option>
                    <option value="Not done">Not done</option>
                  </select>
                )}
              />
            </FormField>
          </ConditionalReveal>
        </div>
      </div>
    </div>
  )
}

function Step4Referral({ form }: { form: any }) {
  return (
    <div className="space-y-6">
      <div>
        <Controller
          control={form.control}
          name="referred_for_diagnosis"
          render={({ field }) => (
            <ToggleSwitch
              checked={field.value as boolean}
              onChange={field.onChange}
              label="Referred for diagnosis?"
            />
          )}
        />
        
        <ConditionalReveal show={form.watch('referred_for_diagnosis') as boolean}>
          <div className="space-y-4">
            <FormField 
              label="Referral Date" 
              error={form.formState.errors.referral_date?.message}
            >
              <TextInput
                id="referral-date"
                type="date"
                {...form.register('referral_date')}
                aria-invalid={!!form.formState.errors.referral_date}
                aria-describedby={form.formState.errors.referral_date ? 'referral-date-error' : undefined}
              />
            </FormField>

            <FormField 
              label="Referral Facility" 
              error={form.formState.errors.referral_facility?.message}
            >
              <TextInput
                id="referral-facility"
                placeholder="Enter referral facility name"
                {...form.register('referral_facility')}
                aria-invalid={!!form.formState.errors.referral_facility}
                aria-describedby={form.formState.errors.referral_facility ? 'referral-facility-error' : undefined}
              />
            </FormField>
          </div>
        </ConditionalReveal>
      </div>

      <div className="border-t border-black/[0.06] pt-6">
        <FormField 
          label="TB Diagnosis Status" 
          error={form.formState.errors.tb_diagnosed?.message}
        >
          <Controller
            control={form.control}
            name="tb_diagnosed"
            render={({ field }) => (
              <ChipSelector
                options={['Yes', 'No', 'Pending']}
                value={field.value || ''}
                onChange={field.onChange}
                columns={3}
              />
            )}
          />
        </FormField>

        <ConditionalReveal show={form.watch('tb_diagnosed') === 'Yes'}>
          <div className="space-y-4">
            <FormField 
              label="Type of TB" 
              error={form.formState.errors.tb_type?.message}
            >
              <Controller
                control={form.control}
                name="tb_type"
                render={({ field }) => (
                  <ChipSelector
                    options={['Pulmonary', 'Extra-pulmonary', 'Both']}
                    value={field.value || ''}
                    onChange={field.onChange}
                    columns={3}
                  />
                )}
              />
            </FormField>

            <div>
              <Controller
                control={form.control}
                name="dr_tb"
                render={({ field }) => (
                  <ToggleSwitch
                    checked={field.value as boolean}
                    onChange={field.onChange}
                    label="Drug-resistant TB?"
                  />
                )}
              />
            </div>
          </div>
        </ConditionalReveal>
      </div>
    </div>
  )
}

function Step5Treatment({ form }: { form: any }) {
  const formData = form.watch()
  const selectedSymptoms = SYMPTOMS.filter(s => form.watch(s.key as keyof TBScreeningFormData) as boolean)
  
  return (
    <div className="space-y-6">
      <div>
        <Controller
          control={form.control}
          name="att_started"
          render={({ field }) => (
            <ToggleSwitch
              checked={field.value as boolean}
              onChange={field.onChange}
              label="Anti-TB Treatment (ATT) started?"
            />
          )}
        />
        
        <ConditionalReveal show={form.watch('att_started') as boolean}>
          <div className="space-y-4">
            <FormField 
              label="ATT Start Date" 
              error={form.formState.errors.att_start_date?.message}
            >
              <TextInput
                id="att-start-date"
                type="date"
                {...form.register('att_start_date')}
                aria-invalid={!!form.formState.errors.att_start_date}
                aria-describedby={form.formState.errors.att_start_date ? 'att-start-date-error' : undefined}
              />
            </FormField>

            <FormField 
              label="Treatment Regimen" 
              error={form.formState.errors.treatment_regimen?.message}
            >
              <Controller
                control={form.control}
                name="treatment_regimen"
                render={({ field }) => (
                  <select
                    id="treatment-regimen"
                    {...field}
                    className="form-input"
                    aria-invalid={!!form.formState.errors.treatment_regimen}
                    aria-describedby={form.formState.errors.treatment_regimen ? 'treatment-regimen-error' : undefined}
                  >
                    <option value="">Select regimen</option>
                    <option value="Cat I">Cat I</option>
                    <option value="Cat II">Cat II</option>
                    <option value="DRTB Regimen">DRTB Regimen</option>
                    <option value="Other">Other</option>
                  </select>
                )}
              />
            </FormField>

            <FormField 
              label="DOTS Provider" 
              error={form.formState.errors.dots_provider?.message}
            >
              <TextInput
                id="dots-provider"
                placeholder="Enter DOTS provider name"
                {...form.register('dots_provider')}
                aria-invalid={!!form.formState.errors.dots_provider}
                aria-describedby={form.formState.errors.dots_provider ? 'dots-provider-error' : undefined}
              />
            </FormField>
          </div>
        </ConditionalReveal>
      </div>

      <div className="border-t border-black/[0.06] pt-6">
        <FormField 
          label="Treatment Status" 
          error={form.formState.errors.treatment_status?.message}
        >
          <Controller
            control={form.control}
            name="treatment_status"
            render={({ field }) => (
              <ChipSelector
                options={['Ongoing', 'Completed', 'Defaulted', 'Died', 'Not Started']}
                value={field.value || ''}
                onChange={field.onChange}
                columns={2}
              />
            )}
          />
        </FormField>

        <FormField 
          label="Remarks" 
          hint="Max 500 characters"
          error={form.formState.errors.remarks?.message}
        >
          <div className="relative">
            <textarea
              id="remarks"
              rows={4}
              maxLength={500}
              placeholder="Add any additional notes..."
              className="form-input resize-none"
              {...form.register('remarks')}
              aria-invalid={!!form.formState.errors.remarks}
              aria-describedby={form.formState.errors.remarks ? 'remarks-error' : 'remarks-hint'}
            />
            <div className="absolute bottom-2 right-2 text-xs text-[#7a7974]">
              {formData.remarks?.length || 0}/500
            </div>
          </div>
        </FormField>
      </div>

      {/* Summary Card */}
      <div className="bg-[#f3f0ec] rounded-lg p-4 border border-black/[0.06]">
        <h3 className="text-sm font-semibold text-[#28251d] mb-3">Review before submitting</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[#7a7974]">Patient:</span>
            <span className="text-[#28251d] font-medium">
              {formData.patient_name}, {formData.age}y, {formData.sex}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7a7974]">Facility:</span>
            <span className="text-[#28251d] font-medium">
              {formData.facility_name}, {formData.screening_district}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7a7974]">TB Diagnosed:</span>
            <span className="text-[#28251d] font-medium">
              {formData.tb_diagnosed || 'Not specified'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#7a7974]">Symptoms:</span>
            <span className="text-[#28251d] font-medium">
              {selectedSymptoms.length} reported
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessOverlay({ offline }: { offline: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-[#f7f6f2]/95 backdrop-blur-sm flex flex-col items-center justify-center text-center px-8"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-[#01696f] flex items-center justify-center mb-6"
      >
        <Check size={40} color="white" strokeWidth={2.5} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-xl font-semibold text-[#28251d] mb-2"
      >
        {offline ? 'Saved locally' : 'Record submitted'}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="text-[#7a7974] text-sm max-w-xs"
      >
        {offline
          ? "No internet detected. This record will auto-sync when you're back online."
          : 'The patient record has been saved. Redirecting to your submissions…'}
      </motion.p>
    </motion.div>
  )
}

// MAIN COMPONENT
export default function SubmitNewPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [savedOffline, setSavedOffline] = useState(false)
  const router = useRouter()
  const sessionScope = useSessionScope()
  const { isOnline, pendingCount, isSyncing, saveOffline, syncPending } = useOfflineSync()
  const supabase = createClient()

  const form = useForm<TBScreeningFormData>({
    resolver: zodResolver(tbScreeningSchema) as any,
    defaultValues: {
      screening_state: '',
      screening_district: '',
      submission_date: new Date().toISOString().split('T')[0],
      // all booleans default false via schema
    },
    mode: 'onChange',
  })

  // Pre-fill state and district when sessionScope loads
  useEffect(() => {
    if (sessionScope?.state) {
      form.setValue('screening_state', sessionScope.state, { shouldValidate: true })
    }
    if (sessionScope?.district) {
      form.setValue('screening_district', sessionScope.district, { shouldValidate: true })
    }
  }, [sessionScope, form])

  // Step field groups for per-step validation
  const STEP_FIELDS: Record<number, (keyof TBScreeningFormData)[]> = {
    1: ['serial_no', 'patient_name', 'age', 'sex', 'submission_date'],
    2: ['screening_state', 'screening_district', 'facility_type', 'facility_name'],
    3: [], // symptoms are all optional checkboxes
    4: [], // referral is optional
    5: [], // treatment is optional
  }

  const selectedSymptoms = SYMPTOMS.filter(s => form.watch(s.key as keyof TBScreeningFormData) as boolean)

  const goNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    if (fields.length > 0) {
      const valid = await form.trigger(fields)
      if (!valid) {
        // Scroll to first error
        const firstError = Object.keys(form.formState.errors)[0]
        const element = document.getElementById(firstError.toLowerCase().replace(/_/g, '-'))
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
    }
    sounds.buttonClick()
    setDirection('forward')
    setCurrentStep(s => Math.min(s + 1, 5))
  }

  const goBack = () => {
    setDirection('back')
    setCurrentStep(s => Math.max(s - 1, 1))
  }

  const onSubmit = async (data: TBScreeningFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        staff_name: sessionScope?.staffName,
        created_at: new Date().toISOString(),
      }

      if (!navigator.onLine) {
        await saveOffline(payload as Record<string, unknown>, sessionScope?.staffName ?? '')
        setSavedOffline(true)
        setSubmitSuccess(true)
        sounds.success()
        setTimeout(() => router.push('/dashboard/my-submissions'), 2800)
        return
      }

      const { error } = await supabase.from('patients').insert(payload)
      if (error) throw error

      setSubmitSuccess(true)
      sounds.formSubmit()
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#01696f', '#0c4e54', '#cedcd8', '#f7f6f2'],
      })
      setTimeout(() => router.push('/dashboard/my-submissions'), 2800)
    } catch (err) {
      console.error(err)
      form.setError('root', { message: 'Submission failed. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      {/* Skip link for accessibility */}
      <a href="#step-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-[#01696f] text-white px-4 py-2 rounded">
        Skip to form
      </a>

      {/* Sticky header with progress */}
      <header className="sticky top-0 z-40 bg-[#f9f8f5]/90 backdrop-blur-sm border-b border-black/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-4">
          {/* Back button + title */}
          <div className="flex items-center gap-3 mb-4">
            <button 
              onClick={() => router.back()} 
              className="p-2 hover:bg-[#f3f0ec] rounded-lg transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-[--text-lg] font-semibold text-[#28251d]">
                New Screening Record
              </h1>
              <p className="text-[--text-xs] text-[#7a7974]">
                Step {currentStep} of 5 · {STEPS[currentStep-1].shortLabel}
              </p>
              {!isOnline && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full
                             bg-[#964219]/10 text-[#964219] font-medium ml-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#964219] animate-pulse" />
                  Offline — saves locally
                </motion.span>
              )}
              {pendingCount > 0 && isOnline && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  type="button"
                  onClick={syncPending}
                  disabled={isSyncing}
                  className="text-xs text-[#01696f] underline underline-offset-2 ml-2
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing ? 'Syncing…' : `${pendingCount} unsynced · Sync now`}
                </motion.button>
              )}
            </div>
          </div>

          {/* Step pill indicators */}
          <div className="flex gap-2">
            {STEPS.map(step => (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                className={cn(
                  'flex-1 h-1.5 rounded-full transition-all duration-300',
                  step.id <= currentStep ? 'bg-[#01696f]' : 'bg-[#e6e4df]',
                  step.id < currentStep && 'cursor-pointer hover:bg-[#0c4e54]',
                  step.id === currentStep && 'bg-[#01696f]',
                )}
                aria-label={`Go to step ${step.id}`}
                disabled={step.id >= currentStep}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Animated step content */}
      <main id="step-content" className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={form.handleSubmit(onSubmit as any)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction === 'forward' ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction === 'forward' ? -40 : 40 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {currentStep === 1 && <Step1PatientIdentity form={form} />}
              {currentStep === 2 && <Step2Location form={form} />}
              {currentStep === 3 && <Step3Symptoms form={form} />}
              {currentStep === 4 && <Step4Referral form={form} />}
              {currentStep === 5 && <Step5Treatment form={form} />}
            </motion.div>
          </AnimatePresence>

          {/* Root-level error */}
          {form.formState.errors.root && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[#a12c7b] text-sm mt-2"
              role="alert"
            >
              {form.formState.errors.root.message}
            </motion.p>
          )}

          {/* Navigation buttons — sticky bottom on mobile */}
          <div className="flex gap-3 mt-8 pt-6 border-t border-black/[0.06] md:static md:mt-8">
            {currentStep > 1 && (
              <button 
                type="button" 
                onClick={goBack} 
                className="btn-ghost flex-1 py-3 px-6 bg-transparent text-[#7a7974] rounded-lg font-medium text-sm border border-black/[0.1] hover:bg-[#f3f0ec] transition-all duration-180"
              >
                Back
              </button>
            )}
            {currentStep < 5 ? (
              <button 
                type="button" 
                onClick={goNext} 
                className="btn-primary flex-1 py-3 px-6 bg-[#01696f] text-white rounded-lg font-medium text-sm tracking-wide hover:bg-[#0c4e54] active:bg-[#0f3638] transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex-1 py-3 px-6 bg-[#01696f] text-white rounded-lg font-medium text-sm tracking-wide hover:bg-[#0c4e54] active:bg-[#0f3638] transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed relative"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Submit Record'
                )}
              </button>
            )}
          </div>
        </form>
      </main>

      {/* Success overlay */}
      <AnimatePresence>
        {submitSuccess && <SuccessOverlay offline={savedOffline} />}
      </AnimatePresence>

      {/* Mobile sticky footer */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-[#f9f8f5]/95 backdrop-blur-sm border-t border-black/[0.06] p-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {currentStep > 1 && (
            <button 
              type="button" 
              onClick={goBack} 
              className="btn-ghost flex-1 py-3 px-6 bg-transparent text-[#7a7974] rounded-lg font-medium text-sm border border-black/[0.1] hover:bg-[#f3f0ec] transition-all duration-180"
            >
              Back
            </button>
          )}
          {currentStep < 5 ? (
            <button 
              type="button" 
              onClick={goNext} 
              className="btn-primary flex-1 py-3 px-6 bg-[#01696f] text-white rounded-lg font-medium text-sm tracking-wide hover:bg-[#0c4e54] active:bg-[#0f3638] transition-all duration-180"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => form.handleSubmit(onSubmit as any)()}
              disabled={isSubmitting}
              className="btn-primary flex-1 py-3 px-6 bg-[#01696f] text-white rounded-lg font-medium text-sm tracking-wide hover:bg-[#0c4e54] active:bg-[#0f3638] transition-all duration-180 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                'Submit Record'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
