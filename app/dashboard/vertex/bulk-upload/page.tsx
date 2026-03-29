'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useSessionScope, isSuperuser } from '@/hooks/useSessionScope'
import { 
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, 
  Download, ChevronRight, X, Loader2, Eye, EyeOff
} from 'lucide-react'
import * as XLSX from 'xlsx'

// Types
type UploadState = 'idle' | 'parsing' | 'uploading' | 'complete' | 'error'
type ParsedData = {
  rows: Record<string, unknown>[]
  columns: string[]
  preview: Record<string, unknown>[]
  mappedColumns: string[]
  unmappedColumns: string[]
}
type UploadResult = {
  success: boolean
  total: number
  processed: number
  inserted: number
  updated: number
  errors: number
  validationErrors: Array<{ row: number; reason: string }>
  batchErrors: Array<{ batch: number; error: string }>
  batches: number
}

// Utility function for className merging
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ')
}

// File parsing function
async function parseFile(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        let data: Record<string, unknown>[] = []
        
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          // Parse XLSX
          const workbook = XLSX.read(e.target?.result, { type: 'array' })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          data = XLSX.utils.sheet_to_json(worksheet, { defval: null })
        } else if (file.name.endsWith('.csv')) {
          // Parse CSV
          const text = e.target?.result as string
          const lines = text.split('\n').filter(line => line.trim())
          if (lines.length < 2) {
            reject(new Error('CSV file must have at least a header row and one data row'))
            return
          }
          
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
            const row: Record<string, unknown> = {}
            headers.forEach((header, index) => {
              row[header] = values[index] || null
            })
            data.push(row)
          }
        } else {
          reject(new Error('Unsupported file format. Please use CSV or XLSX files.'))
          return
        }
        
        if (data.length === 0) {
          reject(new Error('No data found in file'))
          return
        }
        
        // Extract columns and preview
        const allColumns = Object.keys(data[0] || {})
        const preview = data.slice(0, 5)
        
        // Check for common column mappings
        const knownColumns = [
          'serial_no', 'patient_name', 'age', 'sex', 'submission_date', 'contact_number',
          'screening_state', 'screening_district', 'facility_type', 'facility_name',
          'microplan_block', 'symptom_cough_2weeks', 'symptom_fever', 'symptom_night_sweats',
          'symptom_weight_loss', 'symptom_haemoptysis', 'symptom_chest_pain', 'symptom_breathlessness',
          'symptom_lymphadenopathy', 'symptom_loss_of_appetite', 'symptom_other', 'symptom_other_detail',
          'xray_done', 'xray_result', 'cbnaat_done', 'cbnaat_result', 'referred_for_diagnosis',
          'referral_date', 'referral_facility', 'tb_diagnosed', 'tb_type', 'dr_tb', 'att_started',
          'att_start_date', 'treatment_regimen', 'dots_provider', 'treatment_status', 'remarks'
        ]
        
        const mappedColumns = allColumns.filter(col => 
          knownColumns.includes(col.toLowerCase().replace(/\s+/g, '_')) ||
          knownColumns.some(known => col.toLowerCase().includes(known))
        )
        
        const unmappedColumns = allColumns.filter(col => !mappedColumns.includes(col))
        
        resolve({
          rows: data,
          columns: allColumns,
          preview,
          mappedColumns,
          unmappedColumns
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file)
    }
  })
}

// Download error CSV
function downloadErrorCSV(errors: Array<{ row: number; reason: string }>, fileName: string) {
  const csv = 'Row,Error\n' + errors.map(e => `${e.row},"${e.reason}"`).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}_errors.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function BulkUploadPage() {
  const [state, setState] = useState<UploadState>('idle')
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [showPreview, setShowPreview] = useState(true)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const sessionScope = useSessionScope()
  
  // Check if user has permission
  const hasPermission = sessionScope && ['PM', 'admin', 'SPM'].includes(sessionScope.role)
  
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    
    // Validate file type
    const validTypes = ['.csv', '.xlsx', '.xls']
    const isValidType = validTypes.some(type => file.name.toLowerCase().endsWith(type))
    
    if (!isValidType) {
      setError('Please upload a CSV or XLSX file')
      setState('error')
      return
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      setState('error')
      return
    }
    
    setState('parsing')
    setError(null)
    
    try {
      const data = await parseFile(file)
      setParsedData(data)
      setState('idle') // Go back to idle to show preview
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
      setState('error')
    }
  }, [])
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])
  
  const handleUpload = useCallback(async () => {
    if (!parsedData) return
    
    setState('uploading')
    setProgress(0)
    setError(null)
    
    try {
      const response = await fetch('/api/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rows: parsedData.rows
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }
      
      const result = await response.json() as UploadResult
      setUploadResult(result)
      setProgress(100)
      
      if (result.success) {
        setState('complete')
      } else {
        setState('error')
        setError(`Upload completed with errors: ${result.batchErrors.length} batch failures`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }, [parsedData])
  
  const handleReset = useCallback(() => {
    setState('idle')
    setParsedData(null)
    setUploadResult(null)
    setError(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])
  
  if (!sessionScope) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#01696f]" />
      </div>
    )
  }
  
  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#a12c7b] mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-[#28251d] mb-2">Access Denied</h1>
          <p className="text-[#7a7974]">Only PM, admin, and SPM roles can access bulk upload.</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-[#f7f6f2]">
      {/* Header */}
      <header className="bg-white border-b border-black/[0.06]">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-[#f3f0ec] rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-[#28251d]">Bulk Upload Patients</h1>
              <p className="text-sm text-[#7a7974]">
                Upload patient data from CSV or XLSX files
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* STATE 1: Idle / Drop Zone */}
          {state === 'idle' && !parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-black/[0.14] rounded-xl p-12 text-center hover:border-[#01696f]/50 hover:bg-[#f3f0ec] transition-all duration-300 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-16 h-16 text-[#01696f] mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-[#28251d] mb-2">
                  Drop your CSV or XLSX here, or click to browse
                </h2>
                <p className="text-sm text-[#7a7974] mb-4">
                  Accepted formats: .csv, .xlsx, .xls (Max 10MB)
                </p>
                <button className="px-6 py-2 bg-[#01696f] text-white rounded-lg font-medium hover:bg-[#0c4e54] transition-colors">
                  Select File
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
              
              {/* Instructions */}
              <div className="bg-white rounded-lg p-6 border border-black/[0.06]">
                <h3 className="font-semibold text-[#28251d] mb-4">Required Columns</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-[#28251d] mb-2">Patient Information:</p>
                    <ul className="space-y-1 text-[#7a7974]">
                      <li>• Serial No / serial_no</li>
                      <li>• Patient Name / patient_name</li>
                      <li>• Age</li>
                      <li>• Sex / Gender</li>
                      <li>• Submission Date</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-[#28251d] mb-2">Location & Facility:</p>
                    <ul className="space-y-1 text-[#7a7974]">
                      <li>• Screening State</li>
                      <li>• Screening District</li>
                      <li>• Facility Type</li>
                      <li>• Facility Name</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 2: Parsing Preview */}
          {state === 'idle' && parsedData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg p-6 border border-black/[0.06]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[#28251d]">File Preview</h2>
                    <p className="text-sm text-[#7a7974]">
                      {parsedData.rows.length} rows detected • {parsedData.columns.length} columns
                    </p>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 hover:bg-[#f3f0ec] rounded-lg transition-colors"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* Column Mapping Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-[#cedcd8]/20 rounded-lg p-3">
                    <p className="text-sm font-medium text-[#01696f]">
                      ✓ {parsedData.mappedColumns.length} columns mapped
                    </p>
                  </div>
                  {parsedData.unmappedColumns.length > 0 && (
                    <div className="bg-[#f3c5c5]/20 rounded-lg p-3">
                      <p className="text-sm font-medium text-[#a12c7b]">
                        ⚠ {parsedData.unmappedColumns.length} columns ignored
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Preview Table */}
                {showPreview && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-black/[0.06]">
                          {parsedData.columns.slice(0, 8).map(col => (
                            <th key={col} className="text-left py-2 px-2 font-medium text-[#28251d]">
                              {col}
                            </th>
                          ))}
                          {parsedData.columns.length > 8 && (
                            <th className="text-left py-2 px-2 font-medium text-[#7a7974]">
                              +{parsedData.columns.length - 8} more
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.preview.slice(0, 3).map((row, idx) => (
                          <tr key={idx} className="border-b border-black/[0.03]">
                            {parsedData.columns.slice(0, 8).map(col => (
                              <td key={col} className="py-2 px-2 text-[#7a7974]">
                                {String(row[col] || '').substring(0, 20)}
                                {String(row[col] || '').length > 20 && '...'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={handleUpload}
                  className="flex-1 px-6 py-3 bg-[#01696f] text-white rounded-lg font-medium hover:bg-[#0c4e54] transition-colors"
                >
                  Proceed with Upload
                </button>
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-transparent text-[#7a7974] rounded-lg font-medium border border-black/[0.1] hover:bg-[#f3f0ec] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* STATE 3: Uploading Progress */}
          {state === 'uploading' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg p-8 border border-black/[0.06] text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#01696f] mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-[#28251d] mb-2">Uploading Data</h2>
                <p className="text-sm text-[#7a7974] mb-6">
                  Processing {parsedData?.rows.length} records in batches...
                </p>
                
                {/* Progress Bar */}
                <div className="w-full bg-black/[0.06] rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-[#01696f]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  />
                </div>
                
                <p className="text-xs text-[#7a7974] mt-2">
                  {progress < 33 ? 'Validating data...' : 
                   progress < 66 ? 'Uploading batches...' : 
                   'Finalizing...'}
                </p>
              </div>
            </motion.div>
          )}

          {/* STATE 4: Complete */}
          {state === 'complete' && uploadResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg p-8 border border-black/[0.06]">
                <div className="text-center mb-6">
                  <CheckCircle className="w-16 h-16 text-[#01696f] mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-[#28251d] mb-2">Upload Complete!</h2>
                </div>
                
                {/* Results Summary */}
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center py-2 border-b border-black/[0.06]">
                    <span className="text-[#7a7974]">Total Records:</span>
                    <span className="font-medium text-[#28251d]">{uploadResult.total}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/[0.06]">
                    <span className="text-[#7a7974]">Successfully Processed:</span>
                    <span className="font-medium text-[#01696f]">{uploadResult.processed}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-black/[0.06]">
                    <span className="text-[#7a7974]">Records Inserted/Updated:</span>
                    <span className="font-medium text-[#01696f]">{uploadResult.inserted}</span>
                  </div>
                  {uploadResult.errors > 0 && (
                    <div className="flex justify-between items-center py-2 border-b border-black/[0.06]">
                      <span className="text-[#7a7974]">Records with Errors:</span>
                      <span className="font-medium text-[#a12c7b]">{uploadResult.errors}</span>
                    </div>
                  )}
                </div>
                
                {/* Error Download */}
                {uploadResult.errors > 0 && (
                  <div className="bg-[#f3c5c5]/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-[#a12c7b]">
                          {uploadResult.errors} records failed validation
                        </p>
                        <p className="text-sm text-[#7a7974]">
                          Download the error report to review and fix issues
                        </p>
                      </div>
                      <button
                        onClick={() => downloadErrorCSV(uploadResult.validationErrors, 'bulk_upload')}
                        className="px-4 py-2 bg-[#a12c7b] text-white rounded-lg font-medium hover:bg-[#8a2362] transition-colors"
                      >
                        <Download className="w-4 h-4 inline mr-2" />
                        Download Errors
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => router.push('/dashboard/vertex')}
                    className="flex-1 px-6 py-3 bg-[#01696f] text-white rounded-lg font-medium hover:bg-[#0c4e54] transition-colors"
                  >
                    View in Vertex
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-transparent text-[#7a7974] rounded-lg font-medium border border-black/[0.1] hover:bg-[#f3f0ec] transition-colors"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 5: Error */}
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-lg p-8 border border-black/[0.06]">
                <div className="text-center mb-6">
                  <XCircle className="w-16 h-16 text-[#a12c7b] mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-[#28251d] mb-2">Upload Failed</h2>
                </div>
                
                <div className="bg-[#f3c5c5]/20 rounded-lg p-4 mb-6">
                  <p className="text-[#a12c7b] font-medium">{error}</p>
                </div>
                
                {/* Batch Errors */}
                {uploadResult?.batchErrors && uploadResult.batchErrors.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-[#28251d] mb-2">Batch Errors:</h3>
                    <div className="space-y-2">
                      {uploadResult.batchErrors.slice(0, 5).map((batchErr, idx) => (
                        <div key={idx} className="text-sm text-[#7a7974] bg-[#f3f0ec] rounded p-2">
                          <span className="font-medium">Batch {batchErr.batch}:</span> {batchErr.error}
                        </div>
                      ))}
                      {uploadResult.batchErrors.length > 5 && (
                        <p className="text-sm text-[#7a7974]">
                          ...and {uploadResult.batchErrors.length - 5} more batch errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <button
                    onClick={handleReset}
                    className="flex-1 px-6 py-3 bg-[#01696f] text-white rounded-lg font-medium hover:bg-[#0c4e54] transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/vertex')}
                    className="px-6 py-3 bg-transparent text-[#7a7974] rounded-lg font-medium border border-black/[0.1] hover:bg-[#f3f0ec] transition-colors"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
