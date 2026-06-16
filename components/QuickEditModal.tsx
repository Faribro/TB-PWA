'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';
import { Button } from './ui/button';

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  tb_diagnosed: string | null;
  date_of_referral?: string | null;
  referral_date?: string | null;
  remarks?: string | null;
  kobo_uuid?: string;
  current_phase?: string;
  submitted_on?: string;
}

interface QuickEditModalProps {
  patient: Patient | null;
  onClose: () => void;
  onSave: (updates: Partial<Patient>) => Promise<void>;
}

export function QuickEditModal({ patient, onClose, onSave }: QuickEditModalProps) {
  const [tbDiagnosed, setTbDiagnosed] = useState(patient?.tb_diagnosed || '');
  const [dateOfReferral, setDateOfReferral] = useState(patient?.date_of_referral || patient?.referral_date || '');
  const [remarks, setRemarks] = useState(patient?.remarks || '');
  const [saving, setSaving] = useState(false);

  if (!patient) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        tb_diagnosed: tbDiagnosed,
        referral_date: dateOfReferral,
        remarks
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Quick Edit</h2>
              <p className="text-sm text-slate-600">{patient.inmate_name} • {patient.unique_id}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                TB Diagnosed
              </label>
              <select
                value={tbDiagnosed}
                onChange={(e) => setTbDiagnosed(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Not Set</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Date of Referral
              </label>
              <input
                type="date"
                value={dateOfReferral ? new Date(dateOfReferral).toISOString().split('T')[0] : ''}
                onChange={(e) => setDateOfReferral(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                placeholder="Add any notes or remarks..."
                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
            <Button
              onClick={onClose}
              variant="outline"
              disabled={saving}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full mr-2"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
