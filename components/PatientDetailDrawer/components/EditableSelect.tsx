'use client';

interface EditableSelectProps {
  label: string;
  value: any;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}

export function EditableSelect({ label, value, onChange, options }: EditableSelectProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-white focus:bg-white px-3 py-2 text-sm font-medium ring-offset-white outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
