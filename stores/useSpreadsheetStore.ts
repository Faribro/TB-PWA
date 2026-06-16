import { create } from 'zustand';
import { 
  CellKey, 
  ColDef, 
  PatientRow, 
  CellAnnotation, 
  EditEntry, 
  ContextMenuTarget, 
  PasteState,
  MenuAction
} from '@/types/linelist';

interface SpreadsheetState {
  selectedCell: CellKey | null;
  selectedRange: CellKey[];
  selectedRangeSet: Set<CellKey>;
  editingCell: CellKey | null;
  editingOriginalValue: any;
  clipboardBuffer: { data: string[][]; mode: 'copy' | 'cut'; sourceKeys: CellKey[] } | null;
  activeComment: CellKey | null;
  contextMenu: { x: number; y: number; target: ContextMenuTarget } | null;
  openFilterColumn: string | null;
  theme: 'light' | 'dark';
  dynamicOptions: Record<string, string[]>;
  columnSearchFilters: Record<string, string>;
  columnValueFilters: Record<string, Set<string>>;
  filterChips: Array<{ colKey: string; colLabel: string; value: string }>;
  searchQuery: string;
  sortConfig: { colKey: string; dir: 'asc' | 'desc' } | null;
  columnWidths: Record<string, number>;
  pendingChanges: Record<string, Partial<PatientRow>>;
  annotations: Record<CellKey, CellAnnotation>;
  editHistory: Record<string, EditEntry[]>;
  historyDrawerRowId: string | null;
  showDropdownEditor: string | null;
  newDropdownOption: string;
  tbTypeOptions: string[];
  pasteState: PasteState;

  // Actions
  setSelectedCell: (cell: CellKey | null) => void;
  setSelectedRange: (range: CellKey[]) => void;
  setEditingCell: (cell: CellKey | null) => void;
  setEditingOriginalValue: (val: any) => void;
  setClipboardBuffer: (buf: { data: string[][]; mode: 'copy' | 'cut'; sourceKeys: CellKey[] } | null) => void;
  setActiveComment: (cell: CellKey | null) => void;
  setContextMenu: (menu: { x: number; y: number; target: ContextMenuTarget } | null) => void;
  setOpenFilterColumn: (col: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setDynamicOptions: (opts: Record<string, string[]>) => void;
  setColumnSearchFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setColumnValueFilters: (filters: Record<string, Set<string>> | ((prev: Record<string, Set<string>>) => Record<string, Set<string>>)) => void;
  setFilterChips: (chips: Array<{ colKey: string; colLabel: string; value: string }> | ((prev: Array<{ colKey: string; colLabel: string; value: string }>) => Array<{ colKey: string; colLabel: string; value: string }>)) => void;
  setSearchQuery: (q: string) => void;
  setSortConfig: (cfg: { colKey: string; dir: 'asc' | 'desc' } | null | ((prev: { colKey: string; dir: 'asc' | 'desc' } | null) => { colKey: string; dir: 'asc' | 'desc' } | null)) => void;
  setColumnWidth: (colKey: string, w: number) => void;
  resetColumnWidths: () => void;
  setPendingChanges: (changes: Record<string, Partial<PatientRow>> | ((prev: Record<string, Partial<PatientRow>>) => Record<string, Partial<PatientRow>>)) => void;
  clearPendingChanges: () => void;
  setAnnotations: (annotations: Record<CellKey, CellAnnotation> | ((prev: Record<CellKey, CellAnnotation>) => Record<CellKey, CellAnnotation>)) => void;
  setEditHistory: (history: Record<string, EditEntry[]> | ((prev: Record<string, EditEntry[]>) => Record<string, EditEntry[]>)) => void;
  setHistoryDrawerRowId: (id: string | null) => void;
  setShowDropdownEditor: (colKey: string | null) => void;
  setNewDropdownOption: (opt: string) => void;
  setTbTypeOptions: (opts: string[] | ((prev: string[]) => string[])) => void;
  setPasteState: (state: PasteState) => void;

  updateCellValue: (rowId: string, colKey: string, value: any, colLabel: string, oldVal: any) => void;
  undoLastChange: () => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set) => ({
  selectedCell: null,
  selectedRange: [],
  selectedRangeSet: new Set<CellKey>(),
  editingCell: null,
  editingOriginalValue: null,
  clipboardBuffer: null,
  activeComment: null,
  contextMenu: null,
  openFilterColumn: null,
  theme: 'light',
  dynamicOptions: {},
  columnSearchFilters: {},
  columnValueFilters: {},
  filterChips: [],
  searchQuery: '',
  sortConfig: null,
  columnWidths: {},
  pendingChanges: {},
  annotations: {},
  editHistory: {},
  historyDrawerRowId: null,
  showDropdownEditor: null,
  newDropdownOption: '',
  tbTypeOptions: ['Pulmonary', 'Extrapulmonary Tuberculosis'],
  pasteState: { status: 'idle' },

  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setSelectedRange: (range) => set({ 
    selectedRange: range, 
    selectedRangeSet: new Set(range) 
  }),
  setEditingCell: (cell) => set({ editingCell: cell }),
  setEditingOriginalValue: (val) => set({ editingOriginalValue: val }),
  setClipboardBuffer: (buf) => set({ clipboardBuffer: buf }),
  setActiveComment: (cell) => set({ activeComment: cell }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setOpenFilterColumn: (col) => set({ openFilterColumn: col }),
  setTheme: (theme) => set({ theme }),
  setDynamicOptions: (opts) => set({ dynamicOptions: opts }),
  setColumnSearchFilters: (filters) => set((state) => ({ 
    columnSearchFilters: typeof filters === 'function' ? filters(state.columnSearchFilters) : filters 
  })),
  setColumnValueFilters: (filters) => set((state) => ({ 
    columnValueFilters: typeof filters === 'function' ? filters(state.columnValueFilters) : filters 
  })),
  setFilterChips: (chips) => set((state) => ({ 
    filterChips: typeof chips === 'function' ? chips(state.filterChips) : chips 
  })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSortConfig: (cfg) => set((state) => ({
    sortConfig: typeof cfg === 'function' ? cfg(state.sortConfig) : cfg
  })),
  setColumnWidth: (colKey, w) => set((state) => ({ 
    columnWidths: { ...state.columnWidths, [colKey]: w } 
  })),
  resetColumnWidths: () => set({ columnWidths: {} }),
  setPendingChanges: (changes) => set((state) => ({ 
    pendingChanges: typeof changes === 'function' ? changes(state.pendingChanges) : changes 
  })),
  clearPendingChanges: () => set({ pendingChanges: {} }),
  setAnnotations: (annotations) => set((state) => ({ 
    annotations: typeof annotations === 'function' ? annotations(state.annotations) : annotations 
  })),
  setEditHistory: (history) => set((state) => ({ 
    editHistory: typeof history === 'function' ? history(state.editHistory) : history 
  })),
  setHistoryDrawerRowId: (id) => set({ historyDrawerRowId: id }),
  setShowDropdownEditor: (colKey) => set({ showDropdownEditor: colKey }),
  setNewDropdownOption: (opt) => set({ newDropdownOption: opt }),
  setTbTypeOptions: (opts) => set((state) => ({ 
    tbTypeOptions: typeof opts === 'function' ? opts(state.tbTypeOptions) : opts 
  })),
  setPasteState: (state) => set({ pasteState: state }),

  updateCellValue: (rowId, colKey, value, colLabel, oldVal) => set((state) => {
    if (oldVal === value) return {};

    const rowChanges = state.pendingChanges[rowId] || {};
    const nextPending = {
      ...state.pendingChanges,
      [rowId]: { ...rowChanges, [colKey]: value }
    };

    const rowHistory = state.editHistory[rowId] || [];
    const nextHistory = {
      ...state.editHistory,
      [rowId]: [
        ...rowHistory,
        {
          ts: new Date(),
          colKey,
          colLabel,
          oldVal,
          newVal: value
        }
      ]
    };

    return {
      pendingChanges: nextPending,
      editHistory: nextHistory
    };
  }),

  undoLastChange: () => set((state) => {
    const keys = Object.keys(state.pendingChanges);
    if (keys.length === 0) return {};
    const lastKey = keys[keys.length - 1];
    
    const nextPending = { ...state.pendingChanges };
    delete nextPending[lastKey];

    return {
      pendingChanges: nextPending
    };
  })
}));
