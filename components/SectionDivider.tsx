"use client";

interface SectionDividerProps {
  variant?: "top" | "bottom";
}

export default function SectionDivider({ variant = "top" }: SectionDividerProps) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 flex items-center gap-4 my-1 md:my-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-70" />
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 opacity-60" />
        <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 opacity-70" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-300 opacity-60" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-200 to-transparent opacity-70" />
    </div>
  );
}
