'use client';

interface ReadOnlyFieldProps {
  label: string;
  value: any;
}

export function ReadOnlyField({ label, value }: ReadOnlyFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <div className="font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 min-h-[38px] flex items-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
        {value || (
          <span className="text-slate-400 text-sm italic">N/A</span>
        )}
      </div>
    </div>
  );
}
