import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-white bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_12px_24px_rgba(16,185,129,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#047857,0_16px_32px_rgba(16,185,129,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#047857] active:translate-y-2 before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-t before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
        success: "text-white bg-gradient-to-br from-green-500 via-green-600 to-green-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#15803d,0_12px_24px_rgba(34,197,94,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#15803d,0_16px_32px_rgba(34,197,94,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#15803d] active:translate-y-2",
        destructive: "text-white bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#be123c,0_12px_24px_rgba(244,63,94,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#be123c,0_16px_32px_rgba(244,63,94,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#be123c] active:translate-y-2",
        warning: "text-white bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#b45309,0_12px_24px_rgba(245,158,11,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_0_#b45309,0_16px_32px_rgba(245,158,11,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-3px_0_#b45309] active:translate-y-2",
        outline: "border-2 border-emerald-600 bg-white hover:bg-emerald-50 text-emerald-700 shadow-md hover:shadow-lg active:scale-95",
        ghost: "hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 active:scale-95",
        neutral: "text-white bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_0_#1e293b,0_12px_24px_rgba(15,23,42,0.4)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_0_#1e293b,0_16px_32px_rgba(15,23,42,0.6)] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-3px_0_#1e293b] active:translate-y-2",
        glass: "text-white bg-white/10 backdrop-blur-xl border border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.2)] hover:bg-white/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_12px_48px_rgba(0,0,0,0.3)] active:scale-95",
      },
      size: {
        default: "h-11 px-6 py-3 rounded-lg",
        sm: "h-9 px-4 py-2 text-xs rounded-md",
        lg: "h-14 px-8 py-4 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
