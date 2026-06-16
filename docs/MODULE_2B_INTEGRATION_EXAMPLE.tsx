/**
 * MODULE 2B: GIT-FLOW DATA COMMITS - INTEGRATION EXAMPLE
 * 
 * This file demonstrates how to replace immediate Supabase updates
 * with the new transactional commit system.
 */

import { useCommitStore } from '@/stores/useCommitStore';

// ═══════════════════════════════════════════════════════════════════════════
// BEFORE: Immediate Save Pattern (OLD - DON'T USE)
// ═══════════════════════════════════════════════════════════════════════════

const PatientDetailDrawer_OLD = ({ patient }) => {
  const handlePhoneChange = async (newPhone: string) => {
    // ❌ OLD: Immediately fires a Supabase update on every change
    const { error } = await supabase
      .from('patients')
      .update({ phone: newPhone })
      .eq('id', patient.id);
    
    if (error) toast.error('Failed to save');
  };

  return (
    <input
      value={patient.phone}
      onChange={(e) => handlePhoneChange(e.target.value)}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// AFTER: Transactional Commit Pattern (NEW - USE THIS)
// ═══════════════════════════════════════════════════════════════════════════

const PatientDetailDrawer_NEW = ({ patient }) => {
  // 1. Import the stageChange function from the commit store
  const stageChange = useCommitStore((state) => state.stageChange);

  // 2. Replace immediate save with stageChange
  const handlePhoneChange = (newPhone: string) => {
    // ✅ NEW: Stage the change in memory (no network call yet)
    stageChange({
      entityType: 'patient',
      entityId: patient.id,
      field: 'phone',
      oldValue: patient.phone, // Capture the original value for diff
      newValue: newPhone,
    });
  };

  return (
    <input
      value={patient.phone}
      // 3. Use onBlur instead of onChange for better UX (stage on field exit)
      onBlur={(e) => handlePhoneChange(e.target.value)}
      // Or use onChange for real-time staging:
      // onChange={(e) => handlePhoneChange(e.target.value)}
    />
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// ADVANCED: Multiple Fields Example
// ═══════════════════════════════════════════════════════════════════════════

const PatientForm_ADVANCED = ({ patient }) => {
  const stageChange = useCommitStore((state) => state.stageChange);

  // Helper function to stage any field change
  const stageFieldChange = (field: string, oldValue: any, newValue: any) => {
    stageChange({
      entityType: 'patient',
      entityId: patient.id,
      field,
      oldValue,
      newValue,
    });
  };

  return (
    <div>
      {/* Phone Field */}
      <input
        type="tel"
        defaultValue={patient.phone}
        onBlur={(e) => stageFieldChange('phone', patient.phone, e.target.value)}
      />

      {/* Address Field */}
      <input
        type="text"
        defaultValue={patient.address}
        onBlur={(e) => stageFieldChange('address', patient.address, e.target.value)}
      />

      {/* Status Dropdown */}
      <select
        defaultValue={patient.status}
        onChange={(e) => stageFieldChange('status', patient.status, e.target.value)}
      >
        <option value="active">Active</option>
        <option value="completed">Completed</option>
      </select>

      {/* 
        Note: No "Save" button needed!
        The CommitDock will automatically appear when changes are staged.
        User can review and commit all changes at once.
      */}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// BONUS: Programmatic Commit (for special cases)
// ═══════════════════════════════════════════════════════════════════════════

const BulkEditExample = () => {
  const { stageChange, commitAll } = useCommitStore();

  const handleBulkStatusUpdate = async (patientIds: number[], newStatus: string) => {
    // Stage multiple changes
    patientIds.forEach(id => {
      stageChange({
        entityType: 'patient',
        entityId: id,
        field: 'status',
        oldValue: 'pending', // You'd fetch this from your data
        newValue: newStatus,
      });
    });

    // Optionally commit immediately (bypasses the dock)
    await commitAll();
  };

  return <button onClick={() => handleBulkStatusUpdate([1, 2, 3], 'completed')}>
    Bulk Update
  </button>;
};

export { PatientDetailDrawer_NEW, PatientForm_ADVANCED, BulkEditExample };
