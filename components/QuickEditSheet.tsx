'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './ui/sheet';

interface Patient {
  id: number;
  unique_id: string;
  inmate_name: string;
  tb_diagnosed: string | null;
  referral_date?: string | null;
  remarks?: string | null;
  kobo_uuid?: string;
}

interface QuickEditSheetProps {
  patient: Patient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (updates: Partial<Patient>) => Promise<void>;
}

export function QuickEditSheet({ patient, open, onOpenChange, onSave }: QuickEditSheetProps) {
  const [tbDiagnosed, setTbDiagnosed] = useState(patient?.tb_diagnosed || '');
  const [referralDate, setReferralDate] = useState(patient?.referral_date || '');
  const [remarks, setRemarks] = useState(patient?.remarks || '');
  const [saving, setSaving] = useState(false);

  if (!patient) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        tb_diagnosed: tbDiagnosed,
        referral_date: referralDate,
        remarks
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Quick Edit</SheetTitle>
          <p className="text-sm text-slate-600">{patient.inmate_name} • {patient.unique_id}</p>
        </SheetHeader>

        <div className="mt-6 space-y-4">
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
              value={referralDate ? new Date(referralDate).toISOString().split('T')[0] : ''}
              onChange={(e) => setReferralDate(e.target.value)}
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

        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
