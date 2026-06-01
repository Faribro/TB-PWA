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
      <label className="block text-xs font-medium text-white/90 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-10 w-full rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 focus:bg-white/20 px-3 py-2 text-sm font-medium text-white outline-none focus:ring-4 focus:ring-white/10 focus:border-white/40 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] transition-all duration-300"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="text-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
