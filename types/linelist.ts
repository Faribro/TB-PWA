export type ColDef = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'select' | 'readonly';
  width: number;
  options?: string[];
  required?: boolean;
  hidden?: boolean;
};

export type PatientRow = Record<string, any> & { 
  id: string;
  _error?: string;
  _deleting?: boolean;
};

export type CellKey = `${string}:${string}`; // `${rowId}:${colKey}`

export type CellAnnotation = {
  type: 'comment' | 'note';
  text: string;
  createdAt: Date;
};

export type EditEntry = {
  ts: Date;
  colKey: string;
  colLabel: string;
  oldVal: any;
  newVal: any;
};

export type ContextMenuTarget = {
  type: 'cell' | 'row' | 'header';
  rowId?: string;
  colKey?: string;
  rowIndex?: number;
};

export type PasteContext = {
  screeningDate: string;
  state: string;
  district: string;
};

export type PasteStateIdle = { status: 'idle' };

export type PasteStateChecking = {
  status: 'checking';
  parsedRows: string[][];
  anchorRowIndex: number;
  anchorColIndex: number;
};

export type PasteStateWarning = {
  status: 'warning';
  parsedRows: string[][];
  anchorRowIndex: number;
  anchorColIndex: number;
  existingCount: number;
  context: PasteContext;
};

export type PasteStateApplying = {
  status: 'applying';
  parsedRows: string[][];
};

export type PasteState = PasteStateIdle | PasteStateChecking | PasteStateWarning | PasteStateApplying;

export type PasteAction =
  | { type: 'PASTE_START'; parsedRows: string[][]; anchorRowIndex: number; anchorColIndex: number }
  | { type: 'COUNT_RESOLVED'; existingCount: number; context: PasteContext }
  | { type: 'COUNT_FAILED' }
  | { type: 'APPLY' }
  | { type: 'CANCEL' };

export type MenuAction =
  | { type: 'cut' | 'copy' | 'paste' | 'paste_values_only' }
  | { type: 'insert_row_above' | 'insert_row_below'; rowId: string }
  | { type: 'delete_row'; rowId: string }
  | { type: 'filter_by_value'; colKey: string; value: string }
  | { type: 'show_history'; rowId: string }
  | { type: 'comment'; rowId: string; colKey: string }
  | { type: 'note'; rowId: string; colKey: string }
  | { type: 'dropdown'; colKey: string }
  | { type: 'shift_cells_right'; rowId: string; colKey: string }
  | { type: 'shift_cells_down'; rowId: string; colKey: string }
  | { type: 'shift_cells_left'; rowId: string; colKey: string }
  | { type: 'shift_cells_up'; rowId: string; colKey: string }
  | { type: 'sync_db' }
  | { type: 'add_row' }
  | { type: 'export_csv' }
  | { type: 'exit_spreadsheet' }
  | { type: 'toggle_theme' };

export interface PatientLinelistProps {
  facilityName?: string;
  screeningDate?: string;
  screeningState?: string;
  screeningDistrict?: string;
  onClose: () => void;
  filters?: {
    searchQuery?: string;
    dateFrom?: string;
    dateTo?: string;
    screeningState?: string;
    screeningDistrict?: string;
    facilityName?: string;
  };
}
