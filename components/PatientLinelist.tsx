'use client';

// ─── 1. IMPORTS ───────────────────────────────────────────
import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSpreadsheetStore } from '@/stores/useSpreadsheetStore';
import {
  Info, AlertTriangle, X, Check, ArrowUp, ArrowDown, ChevronRight,
  Plus, Trash2, Filter, History, MessageSquare, StickyNote, ChevronDown, Download, Save, Copy, Sun, Scissors, Clipboard, Filter as FilterIcon
} from 'lucide-react';
import { 
  ColDef, 
  PatientRow, 
  CellKey, 
  CellAnnotation, 
  EditEntry, 
  ContextMenuTarget, 
  PasteState, 
  MenuAction,
  PatientLinelistProps
} from '@/types/linelist';

// ─── 2. CONSTANTS & DEFS ──────────────────────────────────
const ROW_HEIGHT = 21; // px
const HEADER_HEIGHT = 41; // px
const ROW_NUMBER_WIDTH = 40; // px

export const COLUMN_DEFS: readonly ColDef[] = [
  { key: 'id', label: 'ID', type: 'readonly', width: 80, hidden: true },
  { key: 'created_at', label: 'Created At', type: 'readonly', width: 130, hidden: true },
  { key: 'updated_at', label: 'Updated At', type: 'readonly', width: 130, hidden: true },
  { key: 'kobo_uuid', label: 'Kobo UUID', type: 'readonly', width: 140, hidden: true },
  { key: 'unique_id', label: 'Unique ID', type: 'readonly', width: 140 },
  { key: 'inmate_name', label: 'Inmate Name', type: 'text', width: 120, required: true },
  { key: 'age', label: 'Age', type: 'number', width: 60 },
  { key: 'sex', label: 'Sex', type: 'select', width: 90, options: ['Male', 'Female', 'Transgender', 'Other'] },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', width: 110 },
  { key: 'contact_number', label: 'Contact Number', type: 'text', width: 132 },
  { key: 'address', label: 'Address', type: 'text', width: 88 },
  { key: 'father_husband_name', label: 'Father/Husband Name', type: 'text', width: 176 },
  { key: 'facility_name', label: 'Facility Name', type: 'text', width: 128, required: true },
  { key: 'facility_type', label: 'Facility Type', type: 'select', width: 120, options: ['Prison', 'Borstal', 'Detention Centre', 'Other'] },
  { key: 'screening_state', label: 'Screening State', type: 'text', width: 136 },
  { key: 'screening_district', label: 'Screening District', type: 'text', width: 152 },
  { key: 'staff_name', label: 'Staff Name', type: 'text', width: 108 },
  { key: 'inmate_type', label: 'Inmate Type', type: 'select', width: 120, options: ['Convicted', 'Under Trial', 'Other'] },
  { key: 'screening_date', label: 'Screening Date', type: 'date', width: 120, required: true },
  { key: 'submitted_on', label: 'Submitted On', type: 'readonly', width: 130, hidden: true },
  { key: 'symptoms_10s', label: 'Symptoms 10s', type: 'text', width: 120 },
  { key: 'symptoms_present', label: 'Symptoms Present', type: 'text', width: 152 },
  { key: 'tb_past_history', label: 'TB Past History', type: 'text', width: 136 },
  { key: 'xray_result', label: 'X-Ray Result', type: 'text', width: 112 },
  { key: 'chest_x_ray_result', label: 'Chest X-Ray Result', type: 'text', width: 152 },
  { key: 'referral_date', label: 'Referral Date', type: 'date', width: 120 },
  { key: 'referred_facility', label: 'Referred Facility', type: 'text', width: 144 },
  { key: 'other_facility_name', label: 'Other Facility Name', type: 'text', width: 168 },
  { key: 'tb_diagnosed', label: 'TB Diagnosed', type: 'select', width: 120, options: ['Yes', 'No'] },
  { key: 'tb_diagnosis_date', label: 'TB Diagnosis Date', type: 'date', width: 152 },
  { key: 'tb_type', label: 'TB Type', type: 'select', width: 120, options: ['Pulmonary', 'Extrapulmonary Tuberculosis'] },
  { key: 'att_start_date', label: 'ATT Start Date', type: 'date', width: 140 },
  { key: 'att_completion_date', label: 'ATT Completion Date', type: 'date', width: 160 },
  { key: 'treatment_regimen', label: 'Treatment Regimen', type: 'text', width: 160 },
  { key: 'hiv_status', label: 'HIV Status', type: 'select', width: 104, options: ['Positive', 'Negative', 'Unknown'] },
  { key: 'art_status', label: 'ART Status', type: 'select', width: 104, options: ['On ART', 'Pre ART'] },
  { key: 'art_number', label: 'ART Number', type: 'text', width: 104 },
  { key: 'nikshay_abha_id', label: 'Nikshay Abha ID', type: 'text', width: 136 },
  { key: 'registration_date', label: 'Registration Date', type: 'date', width: 144 },
  { key: 'closure_reason', label: 'Closure Reason', type: 'text', width: 128 },
  { key: 'remarks', label: 'Remarks', type: 'text', width: 88 },
  { key: 'date_corrected', label: 'Date Corrected', type: 'readonly', width: 128, hidden: true },
  { key: 'ai_link_status', label: 'AI Link Status', type: 'readonly', width: 128, hidden: true },
  { key: 'synced_to_sheets', label: 'Synced to Sheets', type: 'readonly', width: 136, hidden: true },
  { key: 'sheets_sync_attempts', label: 'Sheets Sync Attempts', type: 'readonly', width: 168, hidden: true },
  { key: 'sheets_synced_at', label: 'Sheets Synced At', type: 'readonly', width: 136, hidden: true },
  { key: 'serial_number', label: 'Serial Number', type: 'number', width: 108 }
] as const;

// ─── 3. SUBCOMPONENTS (REFACTORED WITH ZUSTAND) ───────────

// 3a. PasteWarningBanner
interface PasteWarningBannerProps {
  pastedRowCount: number;
  existingCount: number;
  screeningDate: string;
  state: string;
  district: string;
  onConfirm: (mode: 'immediate' | 'review') => void;
  onCancel: () => void;
}

function PasteWarningBanner({
  pastedRowCount,
  existingCount,
  screeningDate,
  state,
  district,
  onConfirm,
  onCancel
}: PasteWarningBannerProps) {
  const isDanger = existingCount >= pastedRowCount;
  const isWarning = existingCount > 0 && !isDanger;
  const totalAfterPaste = existingCount + pastedRowCount;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (isDanger) onCancel();
        else onConfirm('immediate');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDanger, onConfirm, onCancel]);

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(screeningDate);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    } catch (_) {}
    return screeningDate;
  }, [screeningDate]);

  let containerClass = 'border-l-[3px] p-3 text-[12px] flex flex-col gap-2 transition-transform duration-[180ms] ease-[cubic-bezier(0.16,1,0.3,1)] ';
  let icon = <Info className="w-4 h-4" />;
  let message = '';
  let confirmLabel = 'Paste & Save';

  if (isDanger) {
    containerClass += 'bg-[#fce8e6] border-l-[#ea4335] text-[#c5221f]';
    icon = <AlertTriangle className="w-4 h-4 text-[#ea4335]" />;
    confirmLabel = 'Paste anyway';
    message = `Possible duplicate paste detected. You are pasting ${pastedRowCount} rows but ${existingCount} records already exist for State: ${state}, District: ${district}, Date: ${formattedDate}. This may create duplicate patient records. Are you sure you want to continue?`;
  } else if (isWarning) {
    containerClass += 'bg-[#fef9e7] border-l-[#f59e0b] text-[#b45309]';
    icon = <AlertTriangle className="w-4 h-4 text-[#f59e0b]" />;
    message = `Pasting ${pastedRowCount} rows into ${state} · ${district} · ${formattedDate}. ${existingCount} records already exist for this screening date and location. Total after paste: ${totalAfterPaste} records. Duplicate detection will run on save.`;
  } else {
    containerClass += 'bg-[#e8f0fe] border-l-[#1a73e8] text-[#1a73e8]';
    icon = <Info className="w-4 h-4 text-[#1a73e8]" />;
    message = `Pasting ${pastedRowCount} rows. No existing records found for ${state} · ${district} on ${formattedDate}. These will be added as new entries.`;
  }

  return (
    <div className={containerClass} style={{ transform: 'translateY(0)' }}>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">{icon}</span>
        <div className="flex-1 font-medium">{message}</div>
      </div>
      <div className="flex gap-2 justify-end mt-1">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-gray-700 hover:bg-black/5 font-semibold rounded border border-gray-300 bg-white"
        >
          {isDanger ? 'Cancel paste' : 'Cancel'}
        </button>
        <button
          onClick={() => onConfirm('review')}
          className="px-2.5 py-1 text-gray-700 hover:bg-black/5 font-semibold rounded border border-gray-300 bg-white"
        >
          Review first
        </button>
        <button
          onClick={() => onConfirm('immediate')}
          className={`px-2.5 py-1 text-white font-semibold rounded ${
            isDanger ? 'bg-[#ea4335] hover:bg-[#d93025]' : 'bg-[#1a73e8] hover:bg-[#1557b0]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}

// 3b. ContextMenu
interface ContextMenuProps {
  x: number;
  y: number;
  target: ContextMenuTarget;
  onAction: (action: MenuAction) => void;
  onClose: () => void;
  colDefs: readonly ColDef[];
}

const IconMap: Record<string, React.ComponentType<any>> = {
  Cut: Scissors,
  Copy: Copy,
  Paste: Clipboard,
  ArrowUp: ArrowUp,
  ArrowDown: ArrowDown,
  Trash2: Trash2,
  History: History,
  Comment: MessageSquare,
  StickyNote: StickyNote,
  ChevronDown: ChevronDown,
  Save: Save,
  Plus: Plus,
  Download: Download,
  X: X,
  Theme: Sun
};

function ContextMenu({ x, y, target, onAction, onClose, colDefs }: ContextMenuProps) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [menuSearch, setMenuSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const selection = useSpreadsheetStore(state => state.selectedRange);
  const theme = useSpreadsheetStore(state => state.theme);
  const hasUnsavedChanges = Object.keys(useSpreadsheetStore(state => state.pendingChanges)).length > 0;

  const [coords, setCoords] = useState({ left: x, top: y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menuW = rect.width || 240;
      const menuH = rect.height || 300;
      const left = x + menuW > window.innerWidth ? x - menuW : x;
      const top = y + menuH > window.innerHeight ? y - menuH : y;
      setCoords({ left, top });
    }
  }, [x, y]);

  const menuItems = useMemo<any[]>(() => {
    const isCell = target.type === 'cell';
    const isRow = target.type === 'row';
    const colDef = colDefs.find(c => c.key === target.colKey);
    const isSelect = colDef?.type === 'select';
    const isReadonly = colDef?.type === 'readonly';

    const items: any[] = [];

    items.push({
      id: 'sync_db',
      label: 'Sync to Database (Save)',
      shortcut: 'Ctrl+S',
      icon: 'Save',
      disabled: !hasUnsavedChanges,
      action: { type: 'sync_db' }
    });
    items.push({
      id: 'add_row',
      label: 'Add new inmate row',
      icon: 'Plus',
      action: { type: 'add_row' }
    });
    items.push({
      id: 'export_csv',
      label: 'Export spreadsheet to CSV',
      icon: 'Download',
      action: { type: 'export_csv' }
    });
    items.push({
      id: 'exit_spreadsheet',
      label: 'Exit Spreadsheet View',
      icon: 'X',
      action: { type: 'exit_spreadsheet' }
    });
    items.push({
      id: 'toggle_theme',
      label: theme === 'light' ? 'Switch to Dark Theme' : 'Switch to Light Theme',
      icon: 'Theme',
      action: { type: 'toggle_theme' }
    });
    items.push({ id: 'div_global', label: '-', icon: '' });

    if (isCell || isRow) {
      items.push({
        id: 'cut',
        label: 'Cut',
        shortcut: 'Ctrl+X',
        icon: 'Cut',
        disabled: isReadonly,
        action: { type: 'cut' }
      });
    }
    items.push({
      id: 'copy',
      label: 'Copy',
      shortcut: 'Ctrl+C',
      icon: 'Copy',
      action: { type: 'copy' }
    });
    if (isCell || isRow) {
      items.push({
        id: 'paste',
        label: 'Paste',
        shortcut: 'Ctrl+V',
        icon: 'Paste',
        disabled: isReadonly,
        action: { type: 'paste' }
      });
      items.push({
        id: 'paste_special',
        label: 'Paste special',
        icon: 'Paste',
        submenu: [
          { id: 'paste_val', label: 'Paste values only', shortcut: 'Ctrl+Shift+V', action: { type: 'paste_values_only' } }
        ]
      });
    }

    items.push({ id: 'div1', label: '-', icon: '' });

    if (isCell || isRow) {
      const count = selection.length > 1 ? selection.length : 1;
      items.push({
        id: 'ins_above',
        label: `Insert ${count} row${count > 1 ? 's' : ''} above`,
        icon: 'ArrowUp',
        action: { type: 'insert_row_above', rowId: target.rowId || '' }
      });
      items.push({
        id: 'ins_below',
        label: `Insert ${count} row${count > 1 ? 's' : ''} below`,
        icon: 'ArrowDown',
        action: { type: 'insert_row_below', rowId: target.rowId || '' }
      });
    }

    items.push({ id: 'div2', label: '-', icon: '' });

    if (isCell || isRow) {
      const count = selection.length > 1 ? selection.length : 1;
      items.push({
        id: 'del_row',
        label: `Delete ${count} row${count > 1 ? 's' : ''}`,
        icon: 'Trash2',
        danger: true,
        action: { type: 'delete_row', rowId: target.rowId || '' }
      });
    }

    items.push({ id: 'div3', label: '-', icon: '' });

    if (target.colKey) {
      items.push({
        id: 'filter_cell',
        label: 'Filter by cell value',
        icon: 'Filter',
        action: { type: 'filter_by_value', colKey: target.colKey || '', value: '' }
      });
    }
    if (isCell || isRow) {
      items.push({
        id: 'row_history',
        label: 'Show edit history',
        icon: 'History',
        action: { type: 'show_history', rowId: target.rowId || '' }
      });
    }

    items.push({ id: 'div4', label: '-', icon: '' });

    if (isCell) {
      items.push({
        id: 'comment',
        label: 'Comment',
        shortcut: 'Ctrl+Alt+M',
        icon: 'Comment',
        disabled: isReadonly,
        action: { type: 'comment', rowId: target.rowId || '', colKey: target.colKey || '' }
      });
      items.push({
        id: 'note',
        label: 'Insert note',
        icon: 'StickyNote',
        disabled: isReadonly,
        action: { type: 'note', rowId: target.rowId || '', colKey: target.colKey || '' }
      });
      items.push({
        id: 'dropdown_config',
        label: 'Dropdown options',
        icon: 'ChevronDown',
        disabled: !isSelect,
        action: { type: 'dropdown', colKey: target.colKey || '' }
      });
    }

    return items;
  }, [target, selection, colDefs, hasUnsavedChanges, theme]);

  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return menuItems;
    return menuItems.filter(item => 
      item.label !== '-' && 
      item.label?.toLowerCase().includes(menuSearch.toLowerCase())
    );
  }, [menuItems, menuSearch]);

  const nonDividerItems = useMemo(() => filteredMenuItems.filter(item => item.label !== '-'), [filteredMenuItems]);

  useEffect(() => {
    const firstIdx = nonDividerItems.findIndex(item => !item.disabled);
    setFocusedIndex(firstIdx);
  }, [nonDividerItems]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (focusedIndex === -1) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let next = focusedIndex;
      do {
        next = (next + 1) % nonDividerItems.length;
      } while (nonDividerItems[next].disabled && next !== focusedIndex);
      setFocusedIndex(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let prev = focusedIndex;
      do {
        prev = (prev - 1 + nonDividerItems.length) % nonDividerItems.length;
      } while (nonDividerItems[prev].disabled && prev !== focusedIndex);
      setFocusedIndex(prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = nonDividerItems[focusedIndex];
      if (item.action && !item.disabled) {
        onAction(item.action);
        onClose();
      }
    }
  }, [focusedIndex, nonDividerItems, onAction, onClose]);

  const isDark = theme === 'dark';

  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`fixed border rounded shadow-[0_4px_16px_rgba(0,0,0,0.35)] py-1.5 min-w-[220px] max-w-[280px] z-[9999] outline-none font-sans text-[13px] ${
        isDark 
          ? 'bg-[#202124] border-[#3c4043] text-[#e8eaed]' 
          : 'bg-white border-[#dadce0] text-[#3c4043]'
      }`}
      style={{ left: coords.left, top: coords.top }}
    >
      <div className={`px-3 py-1.5 border-b mb-1 ${isDark ? 'border-[#3c4043]' : 'border-[#dadce0]'}`}>
        <input
          type="text"
          placeholder="Search items..."
          value={menuSearch}
          onChange={(e) => setMenuSearch(e.target.value)}
          className={`w-full px-2 py-1 rounded text-xs focus:outline-none ${
            isDark 
              ? 'bg-[#2b2c2f] border border-[#4a4d51] text-[#e8eaed]' 
              : 'bg-white border border-[#dadce0] text-[#3c4043]'
          }`}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {filteredMenuItems.map((item, idx) => {
          if (item.label === '-') {
            return <div key={`div-${idx}`} className={`h-[1px] my-1 ${isDark ? 'bg-[#3c4043]' : 'bg-[#e8eaed]'}`} />;
          }

          const isFocused = nonDividerItems[focusedIndex]?.id === item.id;
          const IconComponent = IconMap[item.icon];

          return (
            <div
              key={item.id}
              onClick={() => {
                if (!item.disabled && item.action) {
                  onAction(item.action);
                  onClose();
                }
              }}
              className={`h-8 px-3 flex items-center gap-3 cursor-pointer select-none transition-colors relative ${
                item.disabled
                  ? isDark ? 'text-[#5f6368]' : 'text-[#bdc1c6]'
                  : isFocused
                  ? isDark ? 'bg-[#3c4043]' : 'bg-[#f1f3f4]'
                  : isDark ? 'hover:bg-[#3c4043]' : 'hover:bg-[#f1f3f4]'
              }`}
            >
              <span className="w-4 flex items-center justify-center">
                {IconComponent && (
                  <IconComponent className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && (
                <span className={`text-[11px] font-medium pl-4 ${isDark ? 'text-[#9aa0a6]' : 'text-[#80868b]'}`}>
                  {item.shortcut}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// 3c. EditHistoryDrawer
interface EditHistoryDrawerProps {
  rowId: string;
  inmateName: string;
  history: EditEntry[];
  onClose: () => void;
}

function EditHistoryDrawer({ rowId, inmateName, history, onClose }: EditHistoryDrawerProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/10 z-[9990]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-80 bg-white shadow-[-2px_0_10px_rgba(0,0,0,0.1)] z-[9995] flex flex-col font-sans text-gray-700">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-bold text-[14px]">Session Edit History</h3>
            <p className="text-[11px] text-gray-500 truncate max-w-[220px]">
              Inmate: {inmateName || 'Unnamed'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {history.length === 0 ? (
            <div className="text-center text-gray-400 text-[12px] mt-10">
              No edits recorded for this row in this session.
            </div>
          ) : (
            history.map((entry, idx) => (
              <div key={idx} className="border-b border-slate-100 pb-2.5 text-[11px] space-y-1">
                <div className="flex justify-between text-[#80868b] font-medium">
                  <span>{entry.colLabel}</span>
                  <span>
                    {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="font-mono bg-slate-50 p-1.5 rounded truncate">
                  <span className="text-red-500 font-bold">{String(entry.oldVal ?? 'null')}</span>
                  <span className="text-gray-400 mx-1">→</span>
                  <span className="text-emerald-600 font-bold">{String(entry.newVal ?? 'null')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

// 3d. CommentPopover
interface CommentPopoverProps {
  anchorEl: HTMLElement | null;
  type: 'comment' | 'note';
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

function CommentPopover({ anchorEl, type, text, onSave, onCancel }: CommentPopoverProps) {
  const [commentText, setCommentText] = useState(text);
  const [coords, setCoords] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      setCoords({
        left: Math.min(rect.left, window.innerWidth - 250),
        top: Math.min(rect.bottom + window.scrollY, window.innerHeight - 180)
      });
    }
  }, [anchorEl]);

  return (
    <>
      <div className="fixed inset-0 z-[9980]" onClick={onCancel} />
      <div
        className="fixed bg-white border border-[#dadce0] rounded shadow-[0_4px_16px_rgba(0,0,0,0.2)] p-3 w-[240px] z-[9985] font-sans flex flex-col gap-2"
        style={{ left: coords.left, top: coords.top }}
      >
        <div className="font-bold text-[12px] text-gray-700 uppercase tracking-wider">
          {type === 'comment' ? '💬 Cell Comment' : '📝 Cell Note'}
        </div>
        <textarea
          autoFocus
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Type annotation..."
          className="w-full h-20 p-1.5 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-green-500 resize-none font-sans"
        />
        <div className="flex justify-end gap-1.5">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-gray-600 hover:bg-gray-100 rounded text-[11px] font-semibold border border-gray-300 bg-white"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(commentText)}
            className="px-2.5 py-1 text-white bg-green-600 hover:bg-green-700 rounded text-[11px] font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

// ─── 4. OPTIMIZED CELLS (WITH DETAILED SUBSCRIBERS) ────────

interface OptimizedCellProps {
  row: PatientRow;
  col: ColDef;
  cellKey: CellKey;
  rowIndex: number;
  colIndex: number;
  isFrozen: boolean;
  top: number;
  left: number;
  width: number;
  height: number;
  optionsList: string[];
  handleCellContextMenu: (e: React.MouseEvent, rowIndex: number, rowId: string, colKey: string) => void;
  cellRefMap: React.MutableRefObject<Map<CellKey, HTMLElement>>;
  rowIdToIndex: Map<string, number>;
  colKeyToIndex: Map<string, number>;
  sortedRows: readonly PatientRow[];
  visibleColumns: readonly ColDef[];
  activeInputRef: React.RefObject<HTMLInputElement | HTMLSelectElement | null>;
  onMouseEnter: (cellKey: CellKey) => void;
}

const OptimizedCell = React.memo(function OptimizedCell({
  row,
  col,
  cellKey,
  rowIndex,
  colIndex,
  isFrozen,
  top,
  left,
  width,
  height,
  optionsList,
  handleCellContextMenu,
  cellRefMap,
  rowIdToIndex,
  colKeyToIndex,
  sortedRows,
  visibleColumns,
  activeInputRef,
  onMouseEnter
}: OptimizedCellProps) {
  const rowId = row.id;
  const colKey = col.key;

  // Zustand Slices (minimizes parent re-renders)
  const isSelected = useSpreadsheetStore(state => state.selectedCell === cellKey);
  const inRange = useSpreadsheetStore(state => state.selectedRangeSet.has(cellKey));
  const isEditing = useSpreadsheetStore(state => state.editingCell === cellKey);
  const editingOriginalValue = useSpreadsheetStore(state => state.editingOriginalValue);
  
  const isDirty = useSpreadsheetStore(state => {
    const changes = state.pendingChanges[rowId];
    return changes ? (colKey in changes) : false;
  });

  const cellVal = useSpreadsheetStore(useCallback(state => {
    const changes = state.pendingChanges[rowId];
    if (changes && colKey in changes) {
      return changes[colKey];
    }
    const val = row[colKey];
    if (col.type === 'date' && val) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {}
    }
    return val;
  }, [rowId, colKey, row, col.type]));

  const annotation = useSpreadsheetStore(state => state.annotations[cellKey]);
  const isCutSource = useSpreadsheetStore(state => 
    state.clipboardBuffer?.mode === 'cut' && state.clipboardBuffer.sourceKeys.includes(cellKey)
  );

  const selectedCell = useSpreadsheetStore(state => state.selectedCell);
  const setSelectedCell = useSpreadsheetStore(state => state.setSelectedCell);
  const setSelectedRange = useSpreadsheetStore(state => state.setSelectedRange);
  const setEditingCell = useSpreadsheetStore(state => state.setEditingCell);
  const updateCellValue = useSpreadsheetStore(state => state.updateCellValue);

  // Click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey && selectedCell) {
      const [anchorRowId, anchorColKey] = selectedCell.split(':');
      const anchorRowIdx = rowIdToIndex.get(anchorRowId);
      const anchorColIdx = colKeyToIndex.get(anchorColKey);

      if (anchorRowIdx !== undefined && anchorColIdx !== undefined) {
        const rMin = Math.min(anchorRowIdx, rowIndex);
        const rMax = Math.max(anchorRowIdx, rowIndex);
        const cMin = Math.min(anchorColIdx, colIndex);
        const cMax = Math.max(anchorColIdx, colIndex);

        const newRange: CellKey[] = [];
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            newRange.push(`${sortedRows[r].id}:${visibleColumns[c].key}`);
          }
        }
        setSelectedRange(newRange);
      }
    } else {
      setSelectedCell(cellKey);
      setSelectedRange([]);
    }
    setEditingCell(null);
  }, [selectedCell, rowIndex, colIndex, cellKey, rowIdToIndex, colKeyToIndex, sortedRows, visibleColumns, setSelectedCell, setSelectedRange, setEditingCell]);

  const handleDoubleClick = useCallback(() => {
    if (col.type !== 'readonly') {
      setEditingCell(cellKey);
    }
  }, [col.type, cellKey, setEditingCell]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    handleCellContextMenu(e, rowIndex, rowId, colKey);
  }, [handleCellContextMenu, rowIndex, rowId, colKey]);

  let cellClass = `${
    isFrozen ? 'sticky left-[40px] z-21' : 'absolute'
  } border-r border-b border-[#dadce0] px-1.5 truncate flex items-center select-none font-sans text-[11px] text-[#202124] ${
    isSelected
      ? 'z-10'
      : inRange
      ? 'bg-[#e8f0fe]'
      : ''
  } ${isCutSource ? 'border-[1.5px] border-dashed border-[#1a73e8] text-[#1a73e8]' : ''}`;

  if (annotation?.type === 'comment') {
    cellClass += ' cell-comment-triangle';
  } else if (annotation?.type === 'note') {
    cellClass += ' cell-note-triangle';
  }

  const baseStyle: React.CSSProperties = {
    top: `${top}px`,
    left: `${isFrozen ? 40 : ROW_NUMBER_WIDTH + left}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: isDirty ? '#fff9c4' : (rowIndex % 2 === 0 ? '#fafafa' : '#ffffff'),
    boxShadow: isFrozen ? '2px 0 4px rgba(60,64,67,0.12)' : undefined,
  };

  return (
    <div
      ref={(el) => {
        if (el) cellRefMap.current.set(cellKey, el);
        else cellRefMap.current.delete(cellKey);
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => onMouseEnter(cellKey)}
      style={baseStyle}
      className={cellClass}
      title={annotation ? `${annotation.type.toUpperCase()}: ${annotation.text}` : undefined}
    >
      {isEditing ? (
        col.type === 'select' ? (
          <select
            ref={activeInputRef as any}
            value={cellVal ?? ''}
            onChange={(e) => updateCellValue(rowId, colKey, e.target.value, col.label, row[colKey])}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                updateCellValue(rowId, colKey, editingOriginalValue, col.label, row[colKey]);
                setEditingCell(null);
              }
            }}
            className="absolute inset-0 w-full h-full px-1 border-none focus:outline-none bg-white font-sans text-[11px]"
          >
            <option value="">(select)</option>
            {optionsList.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            ref={activeInputRef as any}
            type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
            value={cellVal ?? ''}
            onChange={(e) => updateCellValue(rowId, colKey, e.target.value, col.label, row[colKey])}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                updateCellValue(rowId, colKey, editingOriginalValue, col.label, row[colKey]);
                setEditingCell(null);
              }
            }}
            className="absolute inset-0 w-full h-full px-1.5 border-none focus:outline-none bg-white font-sans text-[11px]"
          />
        )
      ) : (
        <span className={`truncate ${cellVal === null || cellVal === undefined ? 'text-gray-200' : ''}`}>
          {cellVal ?? ''}
        </span>
      )}

      {/* Required Indicator */}
      {col.required && (cellVal === null || cellVal === undefined || cellVal === '') && (
        <div className="absolute right-1 top-1 w-1 h-1 bg-red-500 rounded-full" />
      )}
    </div>
  );
});

// ─── 5. HELPERS ───────────────────────────────────────────
function getAutoFilledValues(srcVals: any[], targetCount: number, fillType: 'copy' | 'series') {
  const result: any[] = [];
  if (srcVals.length === 0) return result;

  const allNumbers = srcVals.every(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)));
  const allDates = srcVals.every(v => {
    if (v === null || v === undefined || v === '') return false;
    const d = new Date(v);
    return !isNaN(d.getTime()) && String(v).includes('-');
  });

  if (fillType === 'series') {
    if (allNumbers) {
      const nums = srcVals.map(Number);
      if (nums.length === 1) {
        const base = nums[0];
        for (let i = 1; i <= targetCount; i++) {
          result.push(base + i);
        }
      } else {
        const step = nums[nums.length - 1] - nums[nums.length - 2];
        const base = nums[nums.length - 1];
        for (let i = 1; i <= targetCount; i++) {
          result.push(base + step * i);
        }
      }
      return result;
    } else if (allDates) {
      const dates = srcVals.map(v => new Date(v));
      if (dates.length === 1) {
        const base = dates[0];
        for (let i = 1; i <= targetCount; i++) {
          const next = new Date(base.getTime());
          next.setDate(base.getDate() + i);
          result.push(next.toISOString().split('T')[0]);
        }
      } else {
        const base = dates[dates.length - 1];
        const stepMs = base.getTime() - dates[dates.length - 2].getTime();
        for (let i = 1; i <= targetCount; i++) {
          const next = new Date(base.getTime() + stepMs * i);
          result.push(next.toISOString().split('T')[0]);
        }
      }
      return result;
    }
  }

  for (let i = 0; i < targetCount; i++) {
    result.push(srcVals[i % srcVals.length]);
  }
  return result;
}

// ─── 6. MAIN COMPONENT ────────────────────────────────────
export default function PatientLinelist({
  facilityName = '',
  screeningDate = '',
  screeningState = '',
  screeningDistrict = '',
  onClose,
  filters
}: PatientLinelistProps) {
  const queryClient = useQueryClient();

  // local auto-save & status states
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'sheets_failed'>('idle');
  const [isExporting, setIsExporting] = useState(false);

  // Zustand bindings
  const selectedCell = useSpreadsheetStore(state => state.selectedCell);
  const selectedRange = useSpreadsheetStore(state => state.selectedRange);
  const selectedRangeSet = useSpreadsheetStore(state => state.selectedRangeSet);
  const editingCell = useSpreadsheetStore(state => state.editingCell);
  const editingOriginalValue = useSpreadsheetStore(state => state.editingOriginalValue);
  const clipboardBuffer = useSpreadsheetStore(state => state.clipboardBuffer);
  const activeComment = useSpreadsheetStore(state => state.activeComment);
  const contextMenu = useSpreadsheetStore(state => state.contextMenu);
  const openFilterColumn = useSpreadsheetStore(state => state.openFilterColumn);
  const theme = useSpreadsheetStore(state => state.theme);
  const dynamicOptions = useSpreadsheetStore(state => state.dynamicOptions);
  const columnSearchFilters = useSpreadsheetStore(state => state.columnSearchFilters);
  const columnValueFilters = useSpreadsheetStore(state => state.columnValueFilters);
  const filterChips = useSpreadsheetStore(state => state.filterChips);
  const searchQuery = useSpreadsheetStore(state => state.searchQuery);
  const sortConfig = useSpreadsheetStore(state => state.sortConfig);
  const columnWidths = useSpreadsheetStore(state => state.columnWidths);
  const pendingChanges = useSpreadsheetStore(state => state.pendingChanges);
  const annotations = useSpreadsheetStore(state => state.annotations);
  const editHistory = useSpreadsheetStore(state => state.editHistory);
  const historyDrawerRowId = useSpreadsheetStore(state => state.historyDrawerRowId);
  const showDropdownEditor = useSpreadsheetStore(state => state.showDropdownEditor);
  const newDropdownOption = useSpreadsheetStore(state => state.newDropdownOption);
  const tbTypeOptions = useSpreadsheetStore(state => state.tbTypeOptions);
  const pasteState = useSpreadsheetStore(state => state.pasteState);

  const setSelectedCell = useSpreadsheetStore(state => state.setSelectedCell);
  const setSelectedRange = useSpreadsheetStore(state => state.setSelectedRange);
  const setEditingCell = useSpreadsheetStore(state => state.setEditingCell);
  const setEditingOriginalValue = useSpreadsheetStore(state => state.setEditingOriginalValue);
  const setClipboardBuffer = useSpreadsheetStore(state => state.setClipboardBuffer);
  const setActiveComment = useSpreadsheetStore(state => state.setActiveComment);
  const setContextMenu = useSpreadsheetStore(state => state.setContextMenu);
  const setOpenFilterColumn = useSpreadsheetStore(state => state.setOpenFilterColumn);
  const setTheme = useSpreadsheetStore(state => state.setTheme);
  const setDynamicOptions = useSpreadsheetStore(state => state.setDynamicOptions);
  const setColumnSearchFilters = useSpreadsheetStore(state => state.setColumnSearchFilters);
  const setColumnValueFilters = useSpreadsheetStore(state => state.setColumnValueFilters);
  const setFilterChips = useSpreadsheetStore(state => state.setFilterChips);
  const setSearchQuery = useSpreadsheetStore(state => state.setSearchQuery);
  const setSortConfig = useSpreadsheetStore(state => state.setSortConfig);
  const setColumnWidth = useSpreadsheetStore(state => state.setColumnWidth);
  const setPendingChanges = useSpreadsheetStore(state => state.setPendingChanges);
  const clearPendingChanges = useSpreadsheetStore(state => state.clearPendingChanges);
  const setAnnotations = useSpreadsheetStore(state => state.setAnnotations);
  const setEditHistory = useSpreadsheetStore(state => state.setEditHistory);
  const setHistoryDrawerRowId = useSpreadsheetStore(state => state.setHistoryDrawerRowId);
  const setShowDropdownEditor = useSpreadsheetStore(state => state.setShowDropdownEditor);
  const setNewDropdownOption = useSpreadsheetStore(state => state.setNewDropdownOption);
  const setTbTypeOptions = useSpreadsheetStore(state => state.setTbTypeOptions);
  const setPasteState = useSpreadsheetStore(state => state.setPasteState);
  const updateCellValue = useSpreadsheetStore(state => state.updateCellValue);
  const undoLastChange = useSpreadsheetStore(state => state.undoLastChange);

  // Auto-fill drag state
  const [isDraggingFill, setIsDraggingFill] = useState(false);
  const [dragEndCell, setDragEndCell] = useState<CellKey | null>(null);
  const [autoFillMenu, setAutoFillMenu] = useState<{
    x: number;
    y: number;
    targets: Array<{ rowId: string; colKey: string; colLabel: string; oldVal: any; srcVals: any[] }>;
  } | null>(null);

  // Refs
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const activeInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const scrollSentinelRef = useRef<HTMLDivElement>(null);
  const cellRefMap = useRef<Map<CellKey, HTMLElement>>(new Map());
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Columns definition list
  const visibleColumns = useMemo(() => {
    return COLUMN_DEFS.filter((c) => !c.hidden);
  }, []);

  const colKeyToIndex = useMemo(() => {
    const map = new Map<string, number>();
    visibleColumns.forEach((col, idx) => map.set(col.key, idx));
    return map;
  }, [visibleColumns]);

  const colKeyToDef = useMemo(() => {
    const map = new Map<string, ColDef>();
    visibleColumns.forEach((col) => map.set(col.key, col));
    return map;
  }, [visibleColumns]);

  const colLefts = useMemo(() => {
    let left = 0;
    const lefts: Record<string, number> = {};
    visibleColumns.forEach((col) => {
      lefts[col.key] = left;
      left += columnWidths[col.key] || col.width;
    });
    return { lefts, totalWidth: left };
  }, [visibleColumns, columnWidths]);

  // SWR-to-ReactQuery migration: load paginated rows via TanStack Query
  const {
    data: queryData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch
  } = useInfiniteQuery({
    queryKey: ['linelist', facilityName, screeningDate, screeningState, screeningDistrict, searchQuery, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const queryParams = new URLSearchParams({
        limit: '1000',
        facility_name: facilityName || filters?.facilityName || '',
        screening_date: screeningDate || '',
        state: screeningState || filters?.screeningState || '',
        district: screeningDistrict || filters?.screeningDistrict || '',
        search: searchQuery || filters?.searchQuery || '',
        date_from: filters?.dateFrom || '',
        date_to: filters?.dateTo || ''
      });
      if (typeof pageParam === 'string') {
        queryParams.append('cursor', pageParam);
      } else if (typeof pageParam === 'number' && pageParam > 0) {
        queryParams.append('offset', String(pageParam * 1000));
      }
      const res = await fetch(`/api/linelist?${queryParams.toString()}`);
      const result = await res.json();
      if (!result.success) throw new Error(result.error || 'Fetch failed');
      return result;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.nextCursor) return lastPage.nextCursor;
      if (lastPage.patients.length === lastPage.limit && lastPage.offset + lastPage.limit < lastPage.total) {
        return (lastPage.offset + lastPage.limit) / lastPage.limit;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Base patients data
  const baseRows = useMemo(() => {
    return queryData?.pages.flatMap((page) => page.patients) || [];
  }, [queryData]);

  const totalRows = useMemo(() => {
    return queryData?.pages[0]?.total || 0;
  }, [queryData]);

  // Fast lookup from base rows
  const getCellValueDirect = useCallback((row: PatientRow, colKey: string): any => {
    const changes = pendingChanges[row.id];
    if (changes && colKey in changes) {
      return (changes as any)[colKey];
    }
    const val = row[colKey];
    const colDef = colKeyToDef.get(colKey);
    if (colDef?.type === 'date' && val) {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString().split('T')[0];
        }
      } catch (_) {}
    }
    return val;
  }, [pendingChanges, colKeyToDef]);

  // Client side filters
  const filteredRows = useMemo(() => {
    return baseRows.filter((row) => {
      if (row._deleting) return false;

      // search
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSearch = visibleColumns.some(col => {
          const cellVal = getCellValueDirect(row, col.key);
          return String(cellVal ?? '').toLowerCase().includes(q);
        });
        if (!matchesSearch) return false;
      }

      // column search
      for (const [colKey, searchTerm] of Object.entries(columnSearchFilters)) {
        if (searchTerm && searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const cellVal = getCellValueDirect(row, colKey);
          if (!String(cellVal ?? '').toLowerCase().includes(q)) return false;
        }
      }

      // column checkboxes
      for (const [colKey, selectedValues] of Object.entries(columnValueFilters)) {
        if (selectedValues && selectedValues.size > 0) {
          const cellVal = getCellValueDirect(row, colKey);
          const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
          if (!selectedValues.has(strVal)) return false;
        }
      }

      // filter chips
      for (const chip of filterChips) {
        const cellVal = getCellValueDirect(row, chip.colKey);
        if (String(cellVal ?? '').toLowerCase() !== chip.value.toLowerCase()) return false;
      }

      return true;
    });
  }, [baseRows, searchQuery, columnSearchFilters, columnValueFilters, filterChips, visibleColumns, getCellValueDirect]);

  // Client side sorting
  const sortedRows = useMemo(() => {
    if (!sortConfig) return filteredRows;
    const { colKey, dir } = sortConfig;
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      const valA = getCellValueDirect(a, colKey);
      const valB = getCellValueDirect(b, colKey);
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRows, sortConfig, getCellValueDirect]);

  // Index maps for lookup
  const rowIdToIndex = useMemo(() => {
    const map = new Map<string, number>();
    sortedRows.forEach((row, idx) => map.set(row.id, idx));
    return map;
  }, [sortedRows]);

  const getCellValue = useCallback((rowId: string, colKey: string): any => {
    const changes = pendingChanges[rowId];
    if (changes && colKey in changes) {
      return changes[colKey];
    }
    const idx = rowIdToIndex.get(rowId);
    if (idx === undefined) return undefined;
    return getCellValueDirect(sortedRows[idx], colKey);
  }, [pendingChanges, rowIdToIndex, sortedRows, getCellValueDirect]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (!scrollSentinelRef.current || isLoading || isFetchingNextPage || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1, rootMargin: '3000px' }
    );

    observer.observe(scrollSentinelRef.current);
    return () => observer.disconnect();
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Dynamic Options Resolution (derived from rows)
  useEffect(() => {
    if (baseRows.length > 0) {
      const tbTypes = Array.from(new Set(baseRows.map((r) => r.tb_type).filter(Boolean))) as string[];
      if (tbTypes.length > 0) {
        setTbTypeOptions((prev) => Array.from(new Set([...prev, ...tbTypes])));
      }
    }
  }, [baseRows, setTbTypeOptions]);

  // Unique values for column filter checkboxes
  const uniqueValuesByColumn = useMemo(() => {
    const values: Record<string, Set<string>> = {};
    visibleColumns.forEach(col => { values[col.key] = new Set(); });

    baseRows.forEach(row => {
      visibleColumns.forEach(col => {
        const val = getCellValueDirect(row, col.key);
        const strVal = val !== null && val !== undefined ? String(val) : '';
        values[col.key].add(strVal);
      });
    });

    const result: Record<string, string[]> = {};
    Object.keys(values).forEach(key => {
      result[key] = Array.from(values[key]).sort();
    });
    return result;
  }, [baseRows, visibleColumns, getCellValueDirect]);

  // Virtualization Setup using TanStack Virtual
  const rowVirtualizer = useVirtualizer({
    count: sortedRows.length,
    getScrollElement: () => gridContainerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const colVirtualizer = useVirtualizer({
    horizontal: true,
    count: visibleColumns.length,
    getScrollElement: () => gridContainerRef.current,
    estimateSize: (index) => columnWidths[visibleColumns[index].key] || visibleColumns[index].width,
    overscan: 6,
  });

  // selection coordinates math
  const selectedRowId = selectedCell ? selectedCell.split(':')[0] : null;

  const selectionCoords = useMemo(() => {
    if (!selectedCell) return null;
    const keys = selectedRange.length > 0 ? selectedRange : [selectedCell];

    let minTop = Infinity, maxBottom = -Infinity, minLeft = Infinity, maxRight = -Infinity;

    keys.forEach((key) => {
      const [rId, cKey] = key.split(':');
      const rIdx = rowIdToIndex.get(rId);
      const cIdx = colKeyToIndex.get(cKey);

      if (rIdx !== undefined && cIdx !== undefined) {
        const top = HEADER_HEIGHT + rIdx * ROW_HEIGHT;
        const bottom = top + ROW_HEIGHT;
        const left = ROW_NUMBER_WIDTH + colLefts.lefts[cKey];
        const right = left + (columnWidths[cKey] || colKeyToDef.get(cKey)?.width || 80);

        if (top < minTop) minTop = top;
        if (bottom > maxBottom) maxBottom = bottom;
        if (left < minLeft) minLeft = left;
        if (right > maxRight) maxRight = right;
      }
    });

    if (minTop === Infinity) return null;

    return {
      top: minTop,
      left: minLeft,
      width: maxRight - minLeft,
      height: maxBottom - minTop,
      right: maxRight,
      bottom: maxBottom
    };
  }, [selectedCell, selectedRange, rowIdToIndex, colKeyToIndex, colLefts, columnWidths, colKeyToDef]);

  // Batch Save API
  const saveAllBatch = useCallback(async () => {
    const dirty = Object.entries(pendingChanges);
    if (dirty.length === 0) return;

    setSavingStatus('saving');

    // Split inserts and updates
    const inserts: any[] = [];
    const updates: any[] = [];

    dirty.forEach(([rowId, changes]) => {
      const isNew = rowId.startsWith('NEW_');
      const baseRow = baseRows.find(r => r.id === rowId) || {};
      
      const payload = {
        id: isNew ? undefined : rowId,
        updated_at: isNew ? undefined : baseRow.updated_at,
        ...changes
      };

      if (isNew) inserts.push(payload);
      else updates.push(payload);
    });

    try {
      // 1. Commit Updates Batch
      if (updates.length > 0) {
        const res = await fetch('/api/linelist/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', rows: updates })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Batch update failed');
      }

      // 2. Commit Inserts Batch
      if (inserts.length > 0) {
        const res = await fetch('/api/linelist/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'insert', rows: inserts })
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Batch insert failed');
      }

      // Clear local changes and invalidate cache to refresh
      clearPendingChanges();
      queryClient.invalidateQueries({ queryKey: ['linelist'] });
      setSavingStatus('saved');
      
      setTimeout(() => {
        setSavingStatus(curr => curr === 'saved' ? 'idle' : curr);
      }, 3000);

    } catch (err: any) {
      console.error('[Linelist Batch Save] Error:', err);
      setSavingStatus('sheets_failed');
    }
  }, [pendingChanges, baseRows, clearPendingChanges, queryClient]);

  // Auto-save flush logic (batch save)
  const triggerFlush = useCallback(() => {
    if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
    flushTimeoutRef.current = setTimeout(() => {
      saveAllBatch();
    }, 2000);
  }, [saveAllBatch]);

  // Fill preview coordinates math
  const fillPreviewCoords = useMemo(() => {
    if (!isDraggingFill || !selectedCell || !dragEndCell || !selectionCoords) return null;
    const [startRowId, startColKey] = selectedCell.split(':');
    const [endRowId, endColKey] = dragEndCell.split(':');

    const startRowIdx = rowIdToIndex.get(startRowId);
    const startColIdx = colKeyToIndex.get(startColKey);
    const endRowIdx = rowIdToIndex.get(endRowId);
    const endColIdx = colKeyToIndex.get(endColKey);

    if (startRowIdx === undefined || startColIdx === undefined || endRowIdx === undefined || endColIdx === undefined) return null;

    const keys = selectedRange.length > 0 ? selectedRange : [selectedCell];
    let rMin = Infinity, rMax = -Infinity, cMin = Infinity, cMax = -Infinity;
    keys.forEach(key => {
      const [rId, cKey] = key.split(':');
      const rIdx = rowIdToIndex.get(rId);
      const cIdx = colKeyToIndex.get(cKey);
      if (rIdx !== undefined && cIdx !== undefined) {
        rMin = Math.min(rMin, rIdx);
        rMax = Math.max(rMax, rIdx);
        cMin = Math.min(cMin, cIdx);
        cMax = Math.max(cMax, cIdx);
      }
    });

    const isVerticalDrag = Math.abs(endRowIdx - startRowIdx) >= Math.abs(endColIdx - startColIdx);

    let pRMin = rMin;
    let pRMax = rMax;
    let pCMin = cMin;
    let pCMax = cMax;

    if (isVerticalDrag) {
      if (endRowIdx > rMax) {
        pRMin = rMax + 1;
        pRMax = endRowIdx;
      } else if (endRowIdx < rMin) {
        pRMin = endRowIdx;
        pRMax = rMin - 1;
      } else {
        return null;
      }
    } else {
      if (endColIdx > cMax) {
        pCMin = cMax + 1;
        pCMax = endColIdx;
      } else if (endColIdx < cMin) {
        pCMin = endColIdx;
        pCMax = cMin - 1;
      } else {
        return null;
      }
    }

    let top = HEADER_HEIGHT + pRMin * ROW_HEIGHT;
    let height = (pRMax - pRMin + 1) * ROW_HEIGHT;
    let left = ROW_NUMBER_WIDTH + colLefts.lefts[visibleColumns[pCMin].key];
    let width = 0;
    for (let c = pCMin; c <= pCMax; c++) {
      const key = visibleColumns[c].key;
      width += columnWidths[key] || colKeyToDef.get(key)?.width || 80;
    }

    return { 
      top, 
      left, 
      width, 
      height, 
      pRMin, 
      pRMax, 
      pCMin, 
      pCMax, 
      isVerticalDrag, 
      rMin, 
      rMax, 
      cMin, 
      cMax 
    };
  }, [isDraggingFill, selectedCell, dragEndCell, selectionCoords, selectedRange, rowIdToIndex, colKeyToIndex, colLefts, columnWidths, colKeyToDef, visibleColumns]);

  // Global mouseup drag fill commit
  const handleGlobalMouseUp = useCallback(() => {
      if (isDraggingFill) {
        setIsDraggingFill(false);
        if (fillPreviewCoords) {
          const { pRMin, pRMax, pCMin, pCMax, isVerticalDrag, rMin, rMax, cMin, cMax } = fillPreviewCoords;
          const targetCount = isVerticalDrag ? (pRMax - pRMin + 1) : (pCMax - pCMin + 1);

          const newTargets: any[] = [];

          if (isVerticalDrag) {
            for (let c = pCMin; c <= pCMax; c++) {
              const colKey = visibleColumns[c].key;
              const colLabel = visibleColumns[c].label;
              const colDef = visibleColumns[c];
              if (colDef.type === 'readonly') continue;

              const srcVals: any[] = [];
              for (let r = rMin; r <= rMax; r++) {
                srcVals.push(getCellValue(sortedRows[r].id, colKey));
              }

              const filled = getAutoFilledValues(srcVals, targetCount, 'series');

              for (let r = pRMin; r <= pRMax; r++) {
                const targetRowId = sortedRows[r].id;
                const valIdx = r - pRMin;
                const oldVal = getCellValue(targetRowId, colKey);
                
                // Save to targets array for Auto-Fill choice swap
                newTargets.push({
                  rowId: targetRowId,
                  colKey,
                  colLabel,
                  oldVal,
                  srcVals,
                  index: valIdx
                });

                // Write initial series values
                updateCellValue(targetRowId, colKey, filled[valIdx], colLabel, oldVal);
              }
            }
          } else {
            for (let r = pRMin; r <= pRMax; r++) {
              const rowId = sortedRows[r].id;
              const srcVals: any[] = [];
              for (let c = cMin; c <= cMax; c++) {
                srcVals.push(getCellValue(rowId, visibleColumns[c].key));
              }

              const filled = getAutoFilledValues(srcVals, targetCount, 'series');

              for (let c = pCMin; c <= pCMax; c++) {
                const colKey = visibleColumns[c].key;
                const colLabel = visibleColumns[c].label;
                const colDef = visibleColumns[c];
                if (colDef.type === 'readonly') continue;

                const valIdx = c - pCMin;
                const oldVal = getCellValue(rowId, colKey);

                newTargets.push({
                  rowId,
                  colKey,
                  colLabel,
                  oldVal,
                  srcVals,
                  index: valIdx
                });

                updateCellValue(rowId, colKey, filled[valIdx], colLabel, oldVal);
              }
            }
          }

          setSavingStatus('saving');
          triggerFlush();

          // Display floating auto fill choice menu
          const containerRect = gridContainerRef.current?.getBoundingClientRect();
          if (containerRect) {
            setAutoFillMenu({
              x: containerRect.left + fillPreviewCoords.left + fillPreviewCoords.width - 24,
              y: containerRect.top + fillPreviewCoords.top + fillPreviewCoords.height + 6,
              targets: newTargets
            });
          }
        }
      }
  }, [isDraggingFill, fillPreviewCoords, sortedRows, visibleColumns, getCellValue, updateCellValue, setSavingStatus, triggerFlush, gridContainerRef, setAutoFillMenu]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // Handle cell mouse-enter (for drag selection and fill selection)
  const handleMouseEnterCell = useCallback((cellKey: CellKey) => {
    if (isDraggingFill) {
      setDragEndCell(cellKey);
    }
  }, [isDraggingFill]);

  // Scroll target cell into view
  const scrollCellIntoView = useCallback((cellKey: CellKey) => {
    const el = cellRefMap.current.get(cellKey);
    if (el && gridContainerRef.current) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, []);

  // Keyboard Navigation inside virtualized grid
  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!selectedCell) return;
    const [rowId, colKey] = selectedCell.split(':');
    const rowIndex = rowIdToIndex.get(rowId);
    const colIndex = colKeyToIndex.get(colKey);
    if (rowIndex === undefined || colIndex === undefined) return;

    const colDef = visibleColumns[colIndex];

    if (editingCell) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setEditingCell(null);
        triggerFlush();
        if (rowIndex < sortedRows.length - 1) {
          const next = `${sortedRows[rowIndex + 1].id}:${colKey}` as CellKey;
          setSelectedCell(next);
          setSelectedRange([]);
          setTimeout(() => scrollCellIntoView(next), 0);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        updateCellValue(rowId, colKey, editingOriginalValue, colDef.label, sortedRows[rowIndex][colKey]);
        setEditingCell(null);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setEditingCell(null);
        triggerFlush();
        if (e.shiftKey) {
          if (colIndex > 0) {
            const next = `${rowId}:${visibleColumns[colIndex - 1].key}` as CellKey;
            setSelectedCell(next);
            setSelectedRange([]);
            setTimeout(() => scrollCellIntoView(next), 0);
          }
        } else {
          if (colIndex < visibleColumns.length - 1) {
            const next = `${rowId}:${visibleColumns[colIndex + 1].key}` as CellKey;
            setSelectedCell(next);
            setSelectedRange([]);
            setTimeout(() => scrollCellIntoView(next), 0);
          }
        }
      }
      return;
    }

    // Navigation when NOT editing
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey || e.metaKey;

    let targetRowIndex = rowIndex;
    let targetColIndex = colIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      targetRowIndex = isCtrl ? sortedRows.length - 1 : Math.min(sortedRows.length - 1, rowIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRowIndex = isCtrl ? 0 : Math.max(0, rowIndex - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      targetColIndex = isCtrl ? visibleColumns.length - 1 : Math.min(visibleColumns.length - 1, colIndex + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      targetColIndex = isCtrl ? 0 : Math.max(0, colIndex - 1);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (isShift) {
        targetColIndex = Math.max(0, colIndex - 1);
      } else {
        targetColIndex = Math.min(visibleColumns.length - 1, colIndex + 1);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (colDef.type !== 'readonly') {
        setEditingCell(selectedCell);
      }
      return;
    }

    if (targetRowIndex !== rowIndex || targetColIndex !== colIndex) {
      const nextCellKey = `${sortedRows[targetRowIndex].id}:${visibleColumns[targetColIndex].key}` as CellKey;

      if (isShift) {
        const [anchorRowId, anchorColKey] = selectedCell.split(':');
        const anchorRowIdx = rowIdToIndex.get(anchorRowId)!;
        const anchorColIdx = colKeyToIndex.get(anchorColKey)!;

        const rMin = Math.min(anchorRowIdx, targetRowIndex);
        const rMax = Math.max(anchorRowIdx, targetRowIndex);
        const cMin = Math.min(anchorColIdx, targetColIndex);
        const cMax = Math.max(anchorColIdx, targetColIndex);

        const newRange: CellKey[] = [];
        for (let r = rMin; r <= rMax; r++) {
          for (let c = cMin; c <= cMax; c++) {
            newRange.push(`${sortedRows[r].id}:${visibleColumns[c].key}`);
          }
        }
        setSelectedRange(newRange);
      } else {
        setSelectedCell(nextCellKey);
        setSelectedRange([]);
      }
      scrollCellIntoView(nextCellKey);
    }
  }, [selectedCell, editingCell, sortedRows, visibleColumns, rowIdToIndex, colKeyToIndex, selectedRange, editingOriginalValue, scrollCellIntoView, setSelectedCell, setSelectedRange, setEditingCell, updateCellValue, triggerFlush]);

  // Global Typing triggers inline cell edit
  useEffect(() => {
    if (!editingCell && selectedCell) {
      const handleKeyDownForEdit = (e: KeyboardEvent) => {
        const isGridFocused = gridContainerRef.current?.contains(document.activeElement);
        if (!isGridFocused) return;

        if (
          (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) ||
          e.key === 'Enter' ||
          e.key === ' '
        ) {
          const [rowId, colKey] = selectedCell.split(':');
          const colDef = visibleColumns.find((c) => c.key === colKey);
          if (colDef && colDef.type !== 'readonly') {
            e.preventDefault();
            setEditingCell(selectedCell);
            if (e.key.length === 1 && e.key !== ' ') {
              const targetRow = baseRows.find(r => r.id === rowId);
              updateCellValue(rowId, colKey, e.key, colDef.label, targetRow ? targetRow[colKey] : null);
            }
          }
        }
      };
      window.addEventListener('keydown', handleKeyDownForEdit);
      return () => window.removeEventListener('keydown', handleKeyDownForEdit);
    }
  }, [editingCell, selectedCell, visibleColumns, baseRows, setEditingCell, updateCellValue]);

  // Keyboard Shortcuts (Ctrl+S, Copy, Cut, Paste, Undo)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isGridFocused = gridContainerRef.current?.contains(document.activeElement);
      if (!isGridFocused) return;

      // Ctrl + S (Save)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAllBatch();
      }

      // Ctrl + Z (Undo)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !editingCell) {
        e.preventDefault();
        undoLastChange();
      }

      // F2 (Edit)
      if (e.key === 'F2' && selectedCell && !editingCell) {
        e.preventDefault();
        const [rowId, colKey] = selectedCell.split(':');
        const colDef = visibleColumns.find((c) => c.key === colKey);
        if (colDef && colDef.type !== 'readonly') {
          setEditingCell(selectedCell);
        }
      }

      // Backspace/Delete (Clear)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCell && !editingCell) {
        e.preventDefault();
        const keys = selectedRange.length > 0 ? selectedRange : [selectedCell];
        keys.forEach(key => {
          const [rowId, colKey] = key.split(':');
          const colDef = colKeyToDef.get(colKey);
          if (colDef && colDef.type !== 'readonly') {
            const targetRow = baseRows.find(r => r.id === rowId);
            updateCellValue(rowId, colKey, null, colDef.label, targetRow ? targetRow[colKey] : null);
          }
        });
        setSavingStatus('saving');
        triggerFlush();
      }
    };

    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [selectedCell, editingCell, selectedRange, pendingChanges, baseRows, visibleColumns]);

  // Copy / Cut TSV helper
  const handleClipboardCopy = useCallback((mode: 'copy' | 'cut') => {
    if (!selectedCell) return;
    const keys = selectedRange.length > 0 ? selectedRange : [selectedCell];

    // Group selected values by row ID
    const rowGroups: Record<string, string[]> = {};
    keys.forEach((key) => {
      const [rId, cKey] = key.split(':');
      if (!rowGroups[rId]) rowGroups[rId] = [];
      rowGroups[rId].push(String(getCellValue(rId, cKey) ?? ''));
    });

    const parsedBufferData = Object.values(rowGroups);
    setClipboardBuffer({
      data: parsedBufferData,
      mode,
      sourceKeys: keys
    });

    const tsvText = parsedBufferData.map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvText).catch(() => {});
  }, [selectedCell, selectedRange, getCellValue, setClipboardBuffer]);

  // Paste TSV helper
  const handleClipboardPaste = useCallback((text: string) => {
    if (!selectedCell || !text) return;

    const parsed = text.split(/\r?\n/).map((row) => row.split('\t'));
    if (parsed.length === 0) return;

    const [anchorRowId, anchorColKey] = selectedCell.split(':');
    const anchorRowIdx = rowIdToIndex.get(anchorRowId);
    const anchorColIdx = visibleColumns.findIndex((c) => c.key === anchorColKey);

    if (anchorRowIdx === undefined || anchorColIdx === -1) return;

    let screeningDateVal = screeningDate || filters?.dateFrom || '';
    let stateVal = screeningState || filters?.screeningState || '';
    let districtVal = screeningDistrict || filters?.screeningDistrict || '';

    // Warn banner checking
    const hasContext = !!(screeningDateVal && stateVal && districtVal);
    const hasMultiRows = parsed.length >= 2;

    if (hasMultiRows && hasContext) {
      setPasteState({
        status: 'checking',
        parsedRows: parsed,
        anchorRowIndex: anchorRowIdx,
        anchorColIndex: anchorColIdx
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const url = `/api/linelist/count?screening_date=${screeningDateVal}&state=${encodeURIComponent(stateVal)}&district=${encodeURIComponent(districtVal)}`;

      fetch(url, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          clearTimeout(timeoutId);
          if (data.success) {
            setPasteState({
              status: 'warning',
              parsedRows: parsed,
              anchorRowIndex: anchorRowIdx,
              anchorColIndex: anchorColIdx,
              existingCount: data.existing_count,
              context: { screeningDate: screeningDateVal, state: stateVal, district: districtVal }
            });
          } else {
            applyPastedRows(parsed, anchorRowIdx, anchorColIdx, 'immediate');
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          console.warn('Count check timed out, pasting direct:', err);
          applyPastedRows(parsed, anchorRowIdx, anchorColIdx, 'immediate');
        });
    } else {
      applyPastedRows(parsed, anchorRowIdx, anchorColIdx, 'immediate');
    }
  }, [selectedCell, screeningDate, screeningState, screeningDistrict, filters, rowIdToIndex, visibleColumns, setPasteState]);

  const applyPastedRows = (
    parsedRows: string[][],
    startRowIdx: number,
    startColIdx: number,
    mode: 'immediate' | 'review'
  ) => {
    if (clipboardBuffer?.mode === 'cut') {
      clipboardBuffer.sourceKeys.forEach((key) => {
        const [rId, cKey] = key.split(':');
        const colDef = colKeyToDef.get(cKey);
        if (colDef && colDef.type !== 'readonly') {
          const targetRow = baseRows.find(r => r.id === rId);
          updateCellValue(rId, cKey, null, colDef.label, targetRow ? targetRow[cKey] : null);
        }
      });
      setClipboardBuffer(null);
    }

    parsedRows.forEach((rowVals, rOffset) => {
      let targetRowIdx = startRowIdx + rOffset;

      // Create new row if overflowing sheet length
      if (targetRowIdx >= sortedRows.length) {
        handleAddRow();
        targetRowIdx = sortedRows.length;
      }

      const targetRow = sortedRows[targetRowIdx];
      if (!targetRow) return;

      rowVals.forEach((val, cOffset) => {
        const targetColIdx = startColIdx + cOffset;
        if (targetColIdx >= visibleColumns.length) return;

        const colDef = visibleColumns[targetColIdx];
        if (colDef.type === 'readonly') return;

        let parsedVal: any = val.trim();
        if (colDef.type === 'number') {
          parsedVal = parsedVal === '' ? null : Number(parsedVal);
        } else if (parsedVal === '') {
          parsedVal = null;
        }

        updateCellValue(targetRow.id, colDef.key, parsedVal, colDef.label, targetRow[colDef.key]);
      });
    });

    setPasteState({ status: 'idle' });

    if (mode === 'immediate') {
      setSavingStatus('saving');
      triggerFlush();
    }
  };

  // Clipboard hook listener
  useEffect(() => {
    const handleGlobalClipboard = (e: KeyboardEvent) => {
      const isGridFocused = gridContainerRef.current?.contains(document.activeElement);
      if (!isGridFocused) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingCell) {
        e.preventDefault();
        handleClipboardCopy('copy');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !editingCell) {
        e.preventDefault();
        handleClipboardCopy('cut');
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !editingCell) {
        e.preventDefault();
        navigator.clipboard.readText().then((txt) => handleClipboardPaste(txt));
      }
    };
    window.addEventListener('keydown', handleGlobalClipboard);
    return () => window.removeEventListener('keydown', handleGlobalClipboard);
  }, [editingCell, handleClipboardCopy, handleClipboardPaste]);

  // Insert Row Handler
  const handleAddRow = () => {
    const tempId = `NEW_${Date.now()}`;
    const newPatient: PatientRow = {
      id: tempId,
      facility_name: facilityName || undefined,
      screening_date: screeningDate || new Date().toISOString().split('T')[0],
      screening_state: screeningState || 'All',
      screening_district: screeningDistrict || 'All',
      inmate_name: ''
    };

    // Insert to Zustand state pending changes locally, query cache can hold it
    // Or we can add it to local rows by prepending
    // Since rows comes from React Query, we can inject it locally in cache or manage a local prepended rows array.
    // Prepending is easiest by appending to pendingChanges and inserting into query cache!
    queryClient.setQueryData(
      ['linelist', facilityName, screeningDate, screeningState, screeningDistrict, searchQuery, filters],
      (oldData: any) => {
        if (!oldData) return oldData;
        const updatedPages = [...oldData.pages];
        updatedPages[0] = {
          ...updatedPages[0],
          patients: [newPatient, ...updatedPages[0].patients],
          total: updatedPages[0].total + 1
        };
        return { ...oldData, pages: updatedPages };
      }
    );

    setSelectedCell(`${tempId}:inmate_name`);
    setEditingCell(`${tempId}:inmate_name`);
  };

  // Right-Click Context Menu Trigger
  const handleCellContextMenu = useCallback((e: React.MouseEvent, rowIndex: number, rowId: string, colKey: string) => {
    e.preventDefault();
    setSelectedCell(`${rowId}:${colKey}`);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: { type: 'cell', rowId, colKey, rowIndex }
    });
  }, [setSelectedCell, setContextMenu]);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, rowIndex: number, rowId: string) => {
    e.preventDefault();
    const rowCellKeys = visibleColumns.map((col) => `${rowId}:${col.key}` as CellKey);
    setSelectedRange(rowCellKeys);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target: { type: 'row', rowId, rowIndex }
    });
  }, [visibleColumns, setSelectedRange, setContextMenu]);

  // Context Menu Actions dispatcher
  const handleMenuAction = (action: MenuAction) => {
    switch (action.type) {
      case 'cut':
        handleClipboardCopy('cut');
        break;
      case 'copy':
        handleClipboardCopy('copy');
        break;
      case 'paste':
        navigator.clipboard.readText().then((txt) => handleClipboardPaste(txt));
        break;
      case 'paste_values_only':
        navigator.clipboard.readText().then((txt) => {
          handleClipboardPaste(txt.replace(/^\s+|\s+$/g, ''));
        });
        break;
      case 'insert_row_above': {
        const rIdx = sortedRows.findIndex((r) => r.id === action.rowId);
        const tempId = `NEW_${Date.now()}`;
        const referenceRow = sortedRows[rIdx];
        const newRow: PatientRow = {
          id: tempId,
          facility_name: referenceRow?.facility_name,
          screening_date: referenceRow?.screening_date,
          screening_state: referenceRow?.screening_state,
          screening_district: referenceRow?.screening_district,
          inmate_name: ''
        };
        queryClient.setQueryData(
          ['linelist', facilityName, screeningDate, screeningState, screeningDistrict, searchQuery, filters],
          (oldData: any) => {
            if (!oldData) return oldData;
            const updatedPages = [...oldData.pages];
            // find which page has referenceRow and insert
            let inserted = false;
            for (let page of updatedPages) {
              const idx = page.patients.findIndex((p: any) => p.id === action.rowId);
              if (idx !== -1) {
                page.patients.splice(idx, 0, newRow);
                page.total += 1;
                inserted = true;
                break;
              }
            }
            if (!inserted) {
              updatedPages[0].patients.unshift(newRow);
              updatedPages[0].total += 1;
            }
            return { ...oldData, pages: updatedPages };
          }
        );
        setSelectedCell(`${tempId}:inmate_name`);
        setEditingCell(`${tempId}:inmate_name`);
        break;
      }
      case 'insert_row_below': {
        const rIdx = sortedRows.findIndex((r) => r.id === action.rowId);
        const tempId = `NEW_${Date.now()}`;
        const referenceRow = sortedRows[rIdx];
        const newRow: PatientRow = {
          id: tempId,
          facility_name: referenceRow?.facility_name,
          screening_date: referenceRow?.screening_date,
          screening_state: referenceRow?.screening_state,
          screening_district: referenceRow?.screening_district,
          inmate_name: ''
        };
        queryClient.setQueryData(
          ['linelist', facilityName, screeningDate, screeningState, screeningDistrict, searchQuery, filters],
          (oldData: any) => {
            if (!oldData) return oldData;
            const updatedPages = [...oldData.pages];
            let inserted = false;
            for (let page of updatedPages) {
              const idx = page.patients.findIndex((p: any) => p.id === action.rowId);
              if (idx !== -1) {
                page.patients.splice(idx + 1, 0, newRow);
                page.total += 1;
                inserted = true;
                break;
              }
            }
            if (!inserted) {
              updatedPages[0].patients.unshift(newRow);
              updatedPages[0].total += 1;
            }
            return { ...oldData, pages: updatedPages };
          }
        );
        setSelectedCell(`${tempId}:inmate_name`);
        setEditingCell(`${tempId}:inmate_name`);
        break;
      }
      case 'delete_row': {
        const name = sortedRows.find((r) => r.id === action.rowId)?.inmate_name || 'Unnamed';
        if (action.rowId.startsWith('NEW_')) {
          queryClient.setQueryData(
            ['linelist', facilityName, screeningDate, screeningState, screeningDistrict, searchQuery, filters],
            (oldData: any) => {
              if (!oldData) return oldData;
              const updatedPages = [...oldData.pages];
              for (let page of updatedPages) {
                const idx = page.patients.findIndex((p: any) => p.id === action.rowId);
                if (idx !== -1) {
                  page.patients.splice(idx, 1);
                  page.total -= 1;
                  break;
                }
              }
              return { ...oldData, pages: updatedPages };
            }
          );
        } else {
          if (confirm(`Delete patient row for ${name}?`)) {
            fetch('/api/linelist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete', row: { id: action.rowId } })
            })
              .then((res) => res.json())
              .then((data) => {
                if (data.success) {
                  queryClient.invalidateQueries({ queryKey: ['linelist'] });
                } else {
                  alert(data.error || 'Failed to delete row');
                }
              });
          }
        }
        break;
      }
      case 'filter_by_value': {
        if (!selectedCell) return;
        const [rId, cKey] = selectedCell.split(':');
        const cellValue = getCellValue(rId, cKey);
        const colDef = visibleColumns.find((c) => c.key === cKey);

        if (cellValue !== undefined && colDef) {
          const newFilterChip = { colKey: cKey, colLabel: colDef.label, value: String(cellValue) };
          setFilterChips([...filterChips, newFilterChip]);
        }
        break;
      }
      case 'show_history':
        setHistoryDrawerRowId(action.rowId);
        break;
      case 'comment':
      case 'note':
        setActiveComment(selectedCell);
        break;
      case 'dropdown':
        setShowDropdownEditor(action.colKey);
        break;
      case 'sync_db':
        saveAllBatch();
        break;
      case 'add_row':
        handleAddRow();
        break;
      case 'export_csv':
        handleExportCSV();
        break;
      case 'exit_spreadsheet':
        onClose();
        break;
      case 'toggle_theme':
        setTheme(theme === 'light' ? 'dark' : 'light');
        break;
    }
  };

  const removeFilterChip = (colKey: string) => {
    setFilterChips(filterChips.filter((chip) => chip.colKey !== colKey));
  };

  const handleSort = (colKey: string) => {
    setSortConfig((prev) => {
      if (prev?.colKey === colKey) {
        return { colKey, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { colKey, dir: 'asc' };
    });
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = visibleColumns.map((c) => c.label).join(',');
    const csvContent = sortedRows
      .map((row) =>
        visibleColumns.map((c) => `"${String(getCellValue(row.id, c.key) ?? '').replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([headers + '\n' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `patient_linelist_${facilityName || 'all'}_${screeningDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add Custom Dropdown option locally
  const handleAddSelectOption = (colKey: string) => {
    if (newDropdownOption.trim() === '') return;
    setDynamicOptions({
      ...dynamicOptions,
      [colKey]: [...(dynamicOptions[colKey] || []), newDropdownOption.trim()]
    });
    setNewDropdownOption('');
    setShowDropdownEditor(null);
  };

  // Focus input when editing cell
  useEffect(() => {
    if (editingCell) {
      const [rowId, colKey] = editingCell.split(':');
      setEditingOriginalValue(getCellValue(rowId, colKey));
      setTimeout(() => {
        if (activeInputRef.current) {
          activeInputRef.current.focus();
          if ('select' in activeInputRef.current) {
            (activeInputRef.current as any).select();
          }
        }
      }, 0);
    }
  }, [editingCell, getCellValue, setEditingOriginalValue]);

  return (
    <div className="w-full flex flex-col h-full bg-white border-none select-none text-[12px] font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
        .cell-comment-triangle::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 5px 5px 0;
          border-color: transparent #f59e0b transparent transparent;
          pointer-events: none;
        }
        .cell-note-triangle::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 0;
          height: 0;
          border-style: solid;
          border-width: 0 5px 5px 0;
          border-color: transparent #3c4043 transparent transparent;
          pointer-events: none;
        }
        .sheets-grid input, .sheets-grid select {
          font-family: inherit;
          font-size: inherit;
        }
        /* Native-looking scrollbar */
        .sheets-grid::-webkit-scrollbar {
          width: 12px;
          height: 12px;
        }
        .sheets-grid::-webkit-scrollbar-track {
          background: #f1f3f4;
        }
        .sheets-grid::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border: 2px solid #f1f3f4;
          border-radius: 6px;
        }
        .sheets-grid::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}} />

      {/* A. Dynamic warning banner container */}
      {pasteState.status === 'warning' && (
        <PasteWarningBanner
          pastedRowCount={pasteState.parsedRows.length}
          existingCount={pasteState.existingCount}
          screeningDate={pasteState.context.screeningDate}
          state={pasteState.context.state}
          district={pasteState.context.district}
          onConfirm={(mode) => applyPastedRows(pasteState.parsedRows, pasteState.anchorRowIndex, pasteState.anchorColIndex, mode)}
          onCancel={() => setPasteState({ status: 'idle' })}
        />
      )}

      {/* B. Sheets Indeterminate Progress Bar (checking state) */}
      {pasteState.status === 'checking' && (
        <div className="h-0.5 w-full bg-[#e8f0fe] overflow-hidden shrink-0">
          <div className="h-full bg-[#1a73e8] animate-[progress_1.5s_infinite_linear]" style={{ width: '50%' }} />
          <style dangerouslySetInnerHTML={{
            __html: `
            @keyframes progress {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `}} />
        </div>
      )}

      {/* C. Filter Chips Bar */}
      {filterChips.length > 0 && (
        <div className="px-3 py-1 bg-slate-50 border-b border-[#dadce0] flex flex-wrap gap-1.5 items-center shrink-0">
          <span className="text-[10px] uppercase font-bold text-gray-400">Filters:</span>
          {filterChips.map((chip) => (
            <div key={chip.colKey} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded flex items-center gap-1 text-[11px] font-medium">
              <span>{chip.colLabel}: <strong>{chip.value}</strong></span>
              <button onClick={() => removeFilterChip(chip.colKey)} className="hover:text-blue-900 font-bold">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* D. Grid Canvas */}
      <div
        ref={gridContainerRef}
        onKeyDown={handleGridKeyDown}
        className="flex-1 overflow-auto bg-[#fafafa] relative sheets-grid"
        tabIndex={0}
        style={{ outline: 'none' }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize() + HEADER_HEIGHT}px`,
            width: `${colVirtualizer.getTotalSize() + ROW_NUMBER_WIDTH}px`,
            position: 'relative'
          }}
        >
          {/* STICKY HEADER CONTAINER */}
          <div 
            className="sticky top-0 z-30 flex bg-[#f1f3f4] border-b border-[#dadce0]"
            style={{ 
              left: 0, 
              width: `${colVirtualizer.getTotalSize() + ROW_NUMBER_WIDTH}px`, 
              height: `${HEADER_HEIGHT}px` 
            }}
          >
            {/* Top-Left Intersection Cell */}
            <div 
              className="sticky left-0 z-40 bg-[#f1f3f4] border-r border-b border-[#dadce0] flex flex-col items-center justify-center font-semibold text-[10px]"
              style={{ width: `${ROW_NUMBER_WIDTH}px`, height: `${HEADER_HEIGHT}px` }}
            />

            {/* Virtualized Headers */}
            {colVirtualizer.getVirtualItems().map((virtualCol) => {
              const col = visibleColumns[virtualCol.index];
              const isFrozen = virtualCol.index === 0;
              const letter = String.fromCharCode(65 + (virtualCol.index % 26)) + (virtualCol.index >= 26 ? Math.floor(virtualCol.index / 26) : '');
              const isSelectedCol = selectedCell ? selectedCell.split(':')[1] : null;
              const isSelected = isSelectedCol === col.key;
              const isSorted = sortConfig?.colKey === col.key;
              const isFilterActive = columnSearchFilters[col.key]?.trim()?.length > 0;
              const isOpen = openFilterColumn === col.key;

              return (
                <div
                  key={col.key}
                  className={`absolute flex flex-col border-r border-[#dadce0] bg-[#f1f3f4] text-[11px] font-sans ${
                    isFrozen ? 'sticky left-[40px] z-38 bg-[#f1f3f4]' : ''
                  }`}
                  style={{
                    left: `${isFrozen ? 40 : ROW_NUMBER_WIDTH + virtualCol.start}px`,
                    width: `${virtualCol.size}px`,
                    height: `${HEADER_HEIGHT}px`,
                    boxShadow: isFrozen ? '2px 0 4px rgba(60,64,67,0.12)' : undefined
                  }}
                >
                  {/* Letter Line */}
                  <div 
                    onClick={() => {
                      const colCellKeys = sortedRows.map((row) => `${row.id}:${col.key}` as CellKey);
                      setSelectedRange(colCellKeys);
                      if (colCellKeys.length > 0) setSelectedCell(colCellKeys[0]);
                    }}
                    className={`h-5 border-b border-[#dadce0] flex items-center justify-center font-mono text-[9px] text-[#5f6368] cursor-pointer hover:bg-[#e8eaed] ${isSelected ? 'bg-[#d3e3fd]' : ''}`}
                  >
                    {letter}
                  </div>
                  {/* Label Line */}
                  <div 
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        target: { type: 'header', colKey: col.key }
                      });
                    }}
                    className={`h-5 px-1.5 flex items-center justify-between text-[#202124] select-none hover:bg-[#e8eaed] relative ${isSelected ? 'bg-[#d3e3fd]' : ''}`}
                  >
                    <button
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-0.5 hover:bg-[#e8e8e8] px-0.5 py-0.5 rounded flex-1 min-w-0 text-left font-bold"
                    >
                      <span className="truncate">{col.label}</span>
                      {isSorted && (
                        sortConfig.dir === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-gray-600 shrink-0" /> : <ArrowDown className="w-2.5 h-2.5 text-gray-600 shrink-0" />
                      )}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterColumn(isOpen ? null : col.key);
                      }}
                      className={`p-0.5 rounded hover:bg-[#e8e8e8] shrink-0 ${isFilterActive ? 'text-blue-600' : 'text-gray-500'}`}
                    >
                      <FilterIcon className="w-3 h-3" />
                    </button>

                    {/* Filter drop down menu */}
                    {isOpen && (
                      <div className="absolute top-full left-0 w-64 bg-white border border-gray-300 rounded shadow-lg z-50 p-3">
                        <div className="mb-2">
                          <input
                            type="text"
                            placeholder={`Search...`}
                            value={columnSearchFilters[col.key] || ''}
                            onChange={(e) => setColumnSearchFilters(prev => ({ ...prev, [col.key]: e.target.value }))}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto mb-2 border border-gray-200 rounded">
                          {(() => {
                            const term = (columnSearchFilters[col.key] || '').toLowerCase();
                            const valList = uniqueValuesByColumn[col.key]?.filter(v => v.toLowerCase().includes(term)) || [];
                            const currentSel = columnValueFilters[col.key] || new Set();
                            const allSel = valList.length > 0 && valList.every(v => currentSel.has(v));

                            return (
                              <>
                                <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm font-normal">
                                  <input
                                    type="checkbox"
                                    checked={allSel}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setColumnValueFilters(prev => ({ ...prev, [col.key]: new Set(valList) }));
                                      } else {
                                        setColumnValueFilters(prev => ({ ...prev, [col.key]: new Set() }));
                                      }
                                    }}
                                    className="w-3.5 h-3.5"
                                  />
                                  <span>Select All</span>
                                </label>
                                {valList.map(val => (
                                  <label key={val} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm font-normal">
                                    <input
                                      type="checkbox"
                                      checked={currentSel.has(val)}
                                      onChange={(e) => {
                                        setColumnValueFilters(prev => {
                                          const next = new Set(prev[col.key] || []);
                                          if (e.target.checked) next.add(val);
                                          else next.delete(val);
                                          return { ...prev, [col.key]: next };
                                        });
                                      }}
                                      className="w-3.5 h-3.5"
                                    />
                                    <span className="truncate">{val || '(blank)'}</span>
                                  </label>
                                ))}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setColumnSearchFilters(prev => ({ ...prev, [col.key]: '' }));
                              setColumnValueFilters(prev => ({ ...prev, [col.key]: new Set() }));
                              setOpenFilterColumn(null);
                            }}
                            className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 font-semibold text-gray-600 bg-white"
                          >
                            Clear
                          </button>
                          <button
                            onClick={() => setOpenFilterColumn(null)}
                            className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                          >
                            OK
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drag resize handle */}
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const startX = e.clientX;
                        const startW = columnWidths[col.key] || col.width;
                        const onMouseMove = (ev: MouseEvent) => {
                          const delta = ev.clientX - startX;
                          setColumnWidth(col.key, Math.max(startW + delta, 40));
                        };
                        const onMouseUp = () => {
                          document.removeEventListener('mousemove', onMouseMove);
                          document.removeEventListener('mouseup', onMouseUp);
                        };
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                      }}
                      className="absolute right-0 top-0 bottom-0 w-[4px] cursor-col-resize hover:bg-blue-600 active:bg-blue-700 z-10"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* VIRTUALIZED ROWS AND CELLS */}
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = sortedRows[virtualRow.index];
            const isSelectedRow = selectedRowId === row.id;

            return (
              <div
                key={row.id}
                className="absolute left-0 right-0 flex"
                style={{
                  top: `${HEADER_HEIGHT + virtualRow.start}px`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {/* Row Number Column Sticky Left */}
                <div
                  className={`bg-[#f1f3f4] border-r border-b border-[#dadce0] text-center text-[#5f6368] font-mono text-[10px] flex items-center justify-center cursor-pointer select-none hover:bg-[#e8eaed] sticky left-0 z-20 h-full ${
                    isSelectedRow ? 'bg-[#d3e3fd] text-[#1a73e8] font-bold' : ''
                  }`}
                  style={{
                    width: `${ROW_NUMBER_WIDTH}px`,
                  }}
                  onClick={() => {
                    const rowCellKeys = visibleColumns.map((col) => `${row.id}:${col.key}` as CellKey);
                    setSelectedRange(rowCellKeys);
                    setSelectedCell(rowCellKeys[0]);
                  }}
                  onContextMenu={(e) => handleRowContextMenu(e, virtualRow.index, row.id)}
                >
                  {virtualRow.index + 1}
                </div>

                {/* Patient Cells */}
                {colVirtualizer.getVirtualItems().map((virtualCol) => {
                  const col = visibleColumns[virtualCol.index];
                  const cellKey: CellKey = `${row.id}:${col.key}`;
                  const isFrozen = virtualCol.index === 0;

                  const optionsList = [
                    ...(col.options || []),
                    ...(dynamicOptions[col.key] || []),
                    ...(col.key === 'tb_type' ? tbTypeOptions : [])
                  ];

                  return (
                    <OptimizedCell
                      key={cellKey}
                      row={row}
                      col={col}
                      cellKey={cellKey}
                      rowIndex={virtualRow.index}
                      colIndex={virtualCol.index}
                      isFrozen={isFrozen}
                      top={0}
                      left={virtualCol.start}
                      width={virtualCol.size}
                      height={virtualRow.size}
                      optionsList={optionsList}
                      handleCellContextMenu={handleCellContextMenu}
                      cellRefMap={cellRefMap}
                      rowIdToIndex={rowIdToIndex}
                      colKeyToIndex={colKeyToIndex}
                      sortedRows={sortedRows}
                      visibleColumns={visibleColumns}
                      activeInputRef={activeInputRef}
                      onMouseEnter={handleMouseEnterCell}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* ACTIVE CELL BOUNDING OUTLINE */}
          {selectionCoords && (
            <div
              className="absolute border-2 border-[#1a73e8] pointer-events-none z-30"
              style={{
                top: `${selectionCoords.top}px`,
                left: `${selectionCoords.left}px`,
                width: `${selectionCoords.width}px`,
                height: `${selectionCoords.height}px`,
              }}
            >
              {/* Fill Handle Square */}
              {!editingCell && (
                <div
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDraggingFill(true);
                    setDragEndCell(selectedCell);
                  }}
                  className="absolute bottom-0 right-0 w-[6px] h-[6px] bg-[#1a73e8] border border-white cursor-crosshair pointer-events-auto translate-x-[3px] translate-y-[3px] z-32"
                />
              )}
            </div>
          )}

          {/* DRAG AUTO-FILL PREVIEW HIGHLIGHT */}
          {fillPreviewCoords && (
            <div
              className="absolute border-2 border-dashed border-[#1a73e8] pointer-events-none z-30 bg-[#1a73e8]/10"
              style={{
                top: `${fillPreviewCoords.top}px`,
                left: `${fillPreviewCoords.left}px`,
                width: `${fillPreviewCoords.width}px`,
                height: `${fillPreviewCoords.height}px`,
              }}
            />
          )}
        </div>

        {/* Scroll Sentinel for paging */}
        <div ref={scrollSentinelRef} className="h-10 w-full" />
      </div>

      {/* Floating Auto-Fill options menu */}
      {autoFillMenu && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-lg p-1.5 flex flex-col z-[9995] font-sans text-xs gap-1"
          style={{ left: autoFillMenu.x, top: autoFillMenu.y }}
        >
          <button
            onClick={() => {
              // Copy Cells chosen
              autoFillMenu.targets.forEach(t => {
                const filled = getAutoFilledValues(t.srcVals, 1, 'copy');
                updateCellValue(t.rowId, t.colKey, filled[0], t.colLabel, t.oldVal);
              });
              setSavingStatus('saving');
              triggerFlush();
              setAutoFillMenu(null);
            }}
            className="px-2.5 py-1 text-left hover:bg-gray-100 rounded flex items-center gap-1.5 text-gray-700 font-medium"
          >
            <span>📄</span> Copy Cells
          </button>
          <button
            onClick={() => {
              // Fill Series chosen (already filled, just close menu)
              setAutoFillMenu(null);
            }}
            className="px-2.5 py-1 text-left hover:bg-gray-100 rounded flex items-center gap-1.5 text-gray-700 font-medium"
          >
            <span>📈</span> Fill Series
          </button>
        </div>
      )}

      {/* Footer statistics */}
      <div className="h-[22px] bg-[#f1f3f4] border-t border-[#dadce0] px-3 flex items-center justify-between text-[#5f6368] text-[11px] shrink-0 font-normal">
        <div className="flex items-center gap-3">
          <span>{baseRows.length} of {totalRows} records loaded</span>
          {savingStatus === 'saving' && <span className="text-[#1a73e8] font-bold animate-pulse">Saving...</span>}
          {savingStatus === 'saved' && <span className="text-[#1a73e8] font-bold">✓ All changes saved</span>}
          {savingStatus === 'sheets_failed' && <span className="text-[#ea4335] font-bold">⚠️ DB save / sheets sync failed</span>}
        </div>
        <span>TB Surveillance Spreadsheet Ingestion OS v2.0 (Virtualized)</span>
      </div>

      {/* ── Portals and Overlay Drawers ────────────────────────── */}

      {/* 1. Context Menu Portal */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onAction={handleMenuAction}
          onClose={() => setContextMenu(null)}
          colDefs={visibleColumns}
        />
      )}

      {/* 2. Cell Annotation Popover */}
      {activeComment && (
        <CommentPopover
          anchorEl={cellRefMap.current.get(activeComment) || null}
          type={selectedCell ? 'comment' : 'note'}
          text={annotations[activeComment]?.text || ''}
          onSave={(txt) => {
            setAnnotations((prev) => ({
              ...prev,
              [activeComment]: {
                type: 'comment',
                text: txt,
                createdAt: new Date()
              }
            }));
            setActiveComment(null);
          }}
          onCancel={() => setActiveComment(null)}
        />
      )}

      {/* 3. Session History Drawer */}
      {historyDrawerRowId && (
        <EditHistoryDrawer
          rowId={historyDrawerRowId}
          inmateName={baseRows.find((r) => r.id === historyDrawerRowId)?.inmate_name || ''}
          history={editHistory[historyDrawerRowId] || []}
          onClose={() => setHistoryDrawerRowId(null)}
        />
      )}

      {/* 4. Dropdown custom config popup */}
      {showDropdownEditor && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-[9990] p-4">
          <div className="bg-white rounded shadow-xl max-w-sm w-full p-4 space-y-3 font-sans border border-gray-300">
            <div className="font-bold text-[13px] text-gray-700 border-b pb-1.5 flex justify-between items-center">
              <span>Edit Dropdown Options</span>
              <button onClick={() => setShowDropdownEditor(null)}>✕</button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {((visibleColumns.find((c) => c.key === showDropdownEditor)?.options || []).concat(dynamicOptions[showDropdownEditor] || [])).map((opt) => (
                <div key={opt} className="px-2 py-1 bg-slate-50 text-gray-700 rounded text-[11px] font-medium border border-gray-200">
                  {opt}
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-2">
              <input
                type="text"
                placeholder="New option..."
                value={newDropdownOption}
                onChange={(e) => setNewDropdownOption(e.target.value)}
                className="flex-1 px-2.5 py-1 border border-gray-300 rounded text-[12px] focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              <button
                onClick={() => handleAddSelectOption(showDropdownEditor)}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[12px]"
              >
                Add
              </button>
            </div>
            <p className="text-[10px] text-gray-400 italic">Custom options apply to this session only</p>
          </div>
        </div>
      )}
    </div>
  );
}
