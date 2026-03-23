import { create } from 'zustand';
import { createClient } from '@/lib/supabase-client';

export type EntityType = 'patient' | 'district' | 'facility' | 'coordinator';

export interface PendingChange {
  id: string; // Unique identifier for the change (e.g., "patient-123-phone")
  entityType: EntityType;
  entityId: string | number; // The ID of the entity being modified
  field: string; // Field name being changed
  oldValue: any;
  newValue: any;
  timestamp: number;
}

interface CommitStore {
  pendingChanges: PendingChange[];
  isCommitting: boolean;
  lastCommitError: string | null;
  
  stageChange: (change: Omit<PendingChange, 'id' | 'timestamp'>) => void;
  unstageChange: (id: string) => void;
  discardAll: () => void;
  commitAll: () => Promise<void>;
}

export const useCommitStore = create<CommitStore>((set, get) => ({
  pendingChanges: [],
  isCommitting: false,
  lastCommitError: null,

  /**
   * Stage a change for commit
   * If a change for the same entity+field exists, it updates the newValue
   */
  stageChange: (change) => {
    const changeId = `${change.entityType}-${change.entityId}-${change.field}`;
    const existing = get().pendingChanges.find(c => c.id === changeId);

    if (existing) {
      // Update existing change with new value
      set({
        pendingChanges: get().pendingChanges.map(c =>
          c.id === changeId
            ? { ...c, newValue: change.newValue, timestamp: Date.now() }
            : c
        ),
      });
    } else {
      // Add new change
      set({
        pendingChanges: [
          ...get().pendingChanges,
          {
            ...change,
            id: changeId,
            timestamp: Date.now(),
          },
        ],
      });
    }
  },

  /**
   * Remove a specific change from staging
   */
  unstageChange: (id) => {
    set({
      pendingChanges: get().pendingChanges.filter(c => c.id !== id),
    });
  },

  /**
   * Discard all pending changes
   */
  discardAll: () => {
    set({ pendingChanges: [], lastCommitError: null });
  },

  /**
   * Commit all pending changes to Supabase in a single transaction
   */
  commitAll: async () => {
    const { pendingChanges } = get();
    if (pendingChanges.length === 0) return;

    set({ isCommitting: true, lastCommitError: null });

    try {
      const supabase = createClient();

      // Group changes by entity type and ID
      const groupedChanges = pendingChanges.reduce((acc, change) => {
        const key = `${change.entityType}-${change.entityId}`;
        if (!acc[key]) {
          acc[key] = {
            entityType: change.entityType,
            entityId: change.entityId,
            updates: {},
          };
        }
        acc[key].updates[change.field] = change.newValue;
        return acc;
      }, {} as Record<string, { entityType: EntityType; entityId: string | number; updates: Record<string, any> }>);

      // Execute bulk updates
      const updatePromises = Object.values(groupedChanges).map(async (group) => {
        const tableName = group.entityType === 'patient' ? 'patients' : group.entityType;
        
        const { error } = await supabase
          .from(tableName)
          .update(group.updates)
          .eq('id', group.entityId);

        if (error) throw error;
      });

      await Promise.all(updatePromises);

      // Clear pending changes on success
      set({ pendingChanges: [], isCommitting: false });
      
      // Optional: Show success toast
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('commit-success', {
          detail: { count: pendingChanges.length },
        });
        window.dispatchEvent(event);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to commit changes';
      set({ lastCommitError: errorMessage, isCommitting: false });
      
      // Optional: Show error toast
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('commit-error', {
          detail: { error: errorMessage },
        });
        window.dispatchEvent(event);
      }
      
      throw error;
    }
  },
}));
