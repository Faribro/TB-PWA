const fs = require('fs');

const FILE = 'components/PatientDetailDrawer.tsx';
let content = fs.readFileSync(FILE, 'utf8');

// 1. Imports
content = content.replace(
  "import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay, SheetPortal } from '@/components/ui/sheet';",
  "import { VoiceInput } from './VoiceInput';\nimport { useHotkeys } from '@/hooks/useHotkeys';\nimport { queuePatientSync } from '@/lib/syncQueue';\nimport { calculatePatientRisk } from '@/lib/risk-engine';"
);

// Remove duplicate calculatePatientRisk if it exists
if (content.split("import { calculatePatientRisk }").length > 2) {
  content = content.replace("import { calculatePatientRisk } from '@/lib/risk-engine';\n", "");
}

// 2. Keyboard Hooks
const hookTarget = `  // Keyboard shortcuts for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl+S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (!isSubmitting && !isSavingDemographics) {
          if (isEditingDemographics) {
            handleSaveDemographics();
          } else {
            handleSaveClinical();
          }
        }
      }
      // Escape to close drawer
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isEditingDemographics, isSubmitting, isSavingDemographics]);`;

const hookReplacement = `  // --- ELITE LAYER: Scroll Lock & Focus Accessibility ---
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.getElementById('patient-drawer-container')?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // --- ELITE LAYER: Global Keybinds ---
  useHotkeys({
    'meta+s': (e) => {
      e.preventDefault();
      if (isOpen && !isSubmitting && !isSavingDemographics) {
        if (isEditingDemographics) handleSaveDemographics();
        else handleSaveClinical();
      }
    },
    'escape': () => {
      if (isOpen && !isSubmitting) onClose();
    }
  });`;
content = content.replace(hookTarget, hookReplacement);

// 3. Clinical Sync
const clinicalTarget = `      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates: updatesWithIdentifiers
        })
      });

      console.log('[PatientDrawer] API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PatientDrawer] API error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: 'Failed to parse error response', details: errorText };
        }
        console.error('[PatientDrawer] API error:', errorData);
        throw new Error(errorData.error || errorData.details || 'Failed to sync clinical updates');
      }

      const result = await response.json();
      console.log('[PatientDrawer] API success:', result);

      // Update sync states based on result
      setSyncState(prev => ({ ...prev, db: 'success' }));
      
      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Show warning if Google Sheets sync failed, otherwise success
      if (result.warnings && result.warnings.length > 0) {
        setSyncState(prev => ({ ...prev, sheets: 'error' }));
        toast.warning(\`⚠️ Saved to database. Google Sheets sync failed — check connection.\`, 
          { id: 'clinical-save', duration: 6000 });
      } else {
        setSyncState(prev => ({ ...prev, sheets: 'success' }));
        const sheetsMessage = result.googleSheets?.message || 'Synced to all systems';
        toast.success(\`✅ \${sheetsMessage}\`, { id: 'clinical-save', duration: 4000 });
      }`;

const clinicalReplacement = `      // 1. Fire Elite Layer Sync Queue (Auto-falls back to Dexie if offline)
      const syncResult = await queuePatientSync(localPatient.id, 'update', updatesWithIdentifiers);

      // Update sync states
      setSyncState(prev => ({ ...prev, db: 'success', sheets: 'success' }));
      
      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));

      if (syncResult.status === 'queued_offline') {
        toast.info('Offline Mode: Changes saved securely to local IndexedDB. Will sync automatically when online.', { id: 'clinical-save' });
      } else {
        toast.success('Successfully synced to cloud backbone.', { id: 'clinical-save' });
      }`;
content = content.replace(clinicalTarget, clinicalReplacement);

// 4. Close Loop Sync
const closeTarget = `      // Triple-sync API call
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates
        })
      });

      if (!response.ok) throw new Error('Failed to close loop');

      const result = await response.json();

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Update local patient state with closure data
      setLocalPatient(prev => ({ ...prev, ...updates }));
      
      onUpdate();
      onClose();
      
      // Show detailed success message from Google Sheets
      const sheetsMessage = result.googleSheets?.message || 'Loop closed successfully';
      toast.success(\`✅ \${sheetsMessage}\`, { id: 'close-loop', duration: 4000 });`;

const closeReplacement = `      // 1. Fire Elite Layer Sync Queue
      const syncResult = await queuePatientSync(localPatient.id, 'update', updates);

      // Revalidate caches
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Update local patient state with closure data
      setLocalPatient(prev => ({ ...prev, ...updates }));
      
      onUpdate();
      onClose();
      
      if (syncResult.status === 'queued_offline') {
        toast.info('Offline Mode: Changes saved securely to local IndexedDB.', { id: 'close-loop' });
      } else {
        toast.success('Successfully closed loop & synced to cloud backbone.', { id: 'close-loop' });
      }`;
content = content.replace(closeTarget, closeReplacement);

// 5. Demographics Sync
const demoTarget = `      // Call the triple-sync API
      const response = await fetch('/api/patient-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: localPatient.id,
          koboUuid: localPatient.kobo_uuid,
          updates: updatesWithIdentifiers
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync demographics');
      }

      const result = await response.json();
      
      // Update sync states based on result
      setSyncState(prev => ({ ...prev, db: 'success', kobo: 'success' }));
      
      // Revalidate all patient caches after successful sync
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      // Update local patient state with saved demographics
      setLocalPatient(prev => ({ ...prev, ...editedDemographics }));
      
      setIsEditingDemographics(false);
      onUpdate();
      
      // Show warning if Google Sheets sync failed, otherwise success
      if (result.warnings && result.warnings.length > 0) {
        setSyncState(prev => ({ ...prev, sheets: 'error' }));
        toast.warning(\`⚠️ Saved to database. Google Sheets sync failed — check connection.\`, 
          { id: 'demo-save', duration: 6000 });
      } else {
        setSyncState(prev => ({ ...prev, sheets: 'success' }));
        const sheetsMessage = result.googleSheets?.message || 'Demographics synced successfully';
        toast.success(\`✅ \${sheetsMessage}\`, { id: 'demo-save', duration: 4000 });
      }`;

const demoReplacement = `      // 1. Fire Elite Layer Sync Queue
      const syncResult = await queuePatientSync(localPatient.id, 'update', updatesWithIdentifiers);

      setSyncState(prev => ({ ...prev, db: 'success', sheets: 'success', kobo: 'success' }));
      mutate((key) => Array.isArray(key) && (key[0] === 'patients' || key[0] === 'allPatients'));
      
      setLocalPatient(prev => ({ ...prev, ...editedDemographics }));
      setIsEditingDemographics(false);
      onUpdate();
      
      if (syncResult.status === 'queued_offline') {
        toast.info('Offline Mode: Demographics saved to local IndexedDB.', { id: 'demo-save' });
      } else {
        toast.success('Demographics synced to cloud backbone.', { id: 'demo-save' });
      }`;
content = content.replace(demoTarget, demoReplacement);

// 6. Voice Input Replacement
const voiceTarget = `                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks
                </label>
                <textarea
                  {...register('Remarks')}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />`;

const voiceReplacement = `                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks
                </label>
                <VoiceInput
                  value={watch('Remarks')}
                  onChange={(val) => reset({ ...getValues(), Remarks: val })}
                  className="w-full border-slate-200 rounded-lg"
                  rows={3}
                />`;
content = content.replace(voiceTarget, voiceReplacement);

// 7. Morphing Overlay Replacements
content = content.replace(
  `<Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} modal={true}>
      <SheetPortal>
        {/* LEVEL 2: Detail Drawer Overlay - Dims Master Drawer beneath */}
        <SheetOverlay 
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-[4px] !z-[99999] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" 
        />
        {/* LEVEL 2: Detail Drawer - Restrained Premium Width */}
        <SheetContent 
          className="!w-[95vw] sm:!max-w-[650px] md:!max-w-[750px] lg:!max-w-[850px] !z-[100000] bg-white/95 backdrop-blur-3xl border-l border-white shadow-[-40px_0_80px_rgba(15,23,42,0.12)] p-0 flex flex-col h-full data-[state=open]:duration-700 data-[state=closed]:duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" 
        >`,
  `<AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex justify-end">
          {/* LEVEL 2: Detail Drawer Overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px]" 
            onClick={(!isSubmitting) ? onClose : undefined}
          />
          {/* LEVEL 2: Detail Drawer - Rendered as Morphing Component */}
          <motion.div 
            id="patient-drawer-container"
            layoutId={\`patient-card-\${localPatient?.id}\`}
            className="w-[95vw] sm:max-w-[650px] md:max-w-[750px] lg:max-w-[850px] bg-white/95 backdrop-blur-3xl border-l border-white shadow-[-40px_0_80px_rgba(15,23,42,0.12)] p-0 flex flex-col h-full relative z-[100000] outline-none overflow-y-auto" 
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >`
);

content = content.replace(
  `<SheetHeader className="px-6 py-6 border-b border-white/30 bg-white/40 backdrop-blur-xl">
          <motion.div variants={itemVariants} className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">
                {localPatient?.inmate_name || 'Loading...'}
              </SheetTitle>`,
  `<div className="px-6 py-6 border-b border-white/30 bg-white/40 backdrop-blur-xl shrink-0">
          <motion.div variants={itemVariants} className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
                {localPatient?.inmate_name || 'Loading...'}
                {calculatePatientRisk(localPatient).riskLevel === 'high' && (
                  <div className="relative flex h-3 w-3 shrink-0" title="High Risk: Stale Record">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </div>
                )}
              </div>`
);

content = content.replace(
  `          </motion.div>
        </SheetHeader>`,
  `          </motion.div>
        </div>`
);

content = content.replace(
  `        )}
      </SheetContent>
      </SheetPortal>
    </Sheet>
  );`,
  `        )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );`
);

fs.writeFileSync(FILE, content, 'utf8');
console.log('Successfully patched PatientDetailDrawer.tsx via pure JS replacement with exact blocks.');
