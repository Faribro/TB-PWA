'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'institutional' | 'blob' | 'glass';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    leftIcon,
    rightIcon,
    className, 
    disabled,
    ...props 
  }, ref) => {
    
    const baseStyles = "relative inline-flex items-center justify-center font-bold transition-all duration-300 outline-none select-none overflow-hidden";
    
    const sizeStyles = {
      sm: "text-sm px-4 py-2 rounded-md",
      md: "text-base px-6 py-3 rounded-lg",
      lg: "text-lg px-8 py-4 rounded-xl",
      xl: "text-xl px-10 py-5 rounded-2xl"
    };

    const variantStyles = {
      // Emerald institutional (SAMADHAAN primary)
      primary: cn(
        "text-white font-bold tracking-wide",
        "bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-700",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_0_#047857,0_16px_32px_rgba(16,185,129,0.6),0_0_50px_rgba(16,185,129,0.3)]",
        "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.2),0_14px_0_#047857,0_20px_40px_rgba(16,185,129,0.7),0_0_70px_rgba(16,185,129,0.4)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_0_#047857]",
        "active:translate-y-3 active:scale-[0.98]",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-t before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        "after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-gradient-to-br after:from-emerald-900 after:to-black after:blur-2xl after:opacity-60"
      ),
      
      // Cyan secondary
      secondary: cn(
        "text-white font-bold tracking-wide",
        "bg-gradient-to-br from-cyan-400 via-cyan-500 to-cyan-700",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_0_#0e7490,0_16px_32px_rgba(6,182,212,0.6),0_0_50px_rgba(6,182,212,0.3)]",
        "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.2),0_14px_0_#0e7490,0_20px_40px_rgba(6,182,212,0.7),0_0_70px_rgba(6,182,212,0.4)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_0_#0e7490]",
        "active:translate-y-3 active:scale-[0.98]"
      ),
      
      // Green success
      success: cn(
        "text-white font-bold tracking-wide",
        "bg-gradient-to-br from-green-400 via-green-500 to-green-700",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_0_#15803d,0_16px_32px_rgba(34,197,94,0.6),0_0_50px_rgba(34,197,94,0.3)]",
        "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.2),0_14px_0_#15803d,0_20px_40px_rgba(34,197,94,0.7),0_0_70px_rgba(34,197,94,0.4)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_0_#15803d]",
        "active:translate-y-3 active:scale-[0.98]"
      ),
      
      // Rose danger
      danger: cn(
        "text-white font-bold tracking-wide",
        "bg-gradient-to-br from-rose-400 via-rose-500 to-rose-700",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_0_#be123c,0_16px_32px_rgba(244,63,94,0.6),0_0_50px_rgba(244,63,94,0.3)]",
        "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.2),0_14px_0_#be123c,0_20px_40px_rgba(244,63,94,0.7),0_0_70px_rgba(244,63,94,0.4)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_0_#be123c]",
        "active:translate-y-3 active:scale-[0.98]"
      ),
      
      // Amber warning
      warning: cn(
        "text-white font-bold tracking-wide",
        "bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.2),0_12px_0_#b45309,0_16px_32px_rgba(245,158,11,0.6),0_0_50px_rgba(245,158,11,0.3)]",
        "hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.2),0_14px_0_#b45309,0_20px_40px_rgba(245,158,11,0.7),0_0_70px_rgba(245,158,11,0.4)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4),inset_0_-2px_0_#b45309]",
        "active:translate-y-3 active:scale-[0.98]"
      ),
      
      // Institutional gold (premium)
      institutional: cn(
        "text-white font-extrabold tracking-wider",
        "bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-700",
        "shadow-[inset_0_3px_0_rgba(255,240,200,0.9),inset_0_-1px_0_rgba(0,0,0,0.3),0_14px_0_#915100,0_20px_40px_rgba(255,161,43,0.6),0_0_60px_rgba(255,161,43,0.4)]",
        "hover:shadow-[inset_0_3px_0_rgba(255,240,200,1),inset_0_-1px_0_rgba(0,0,0,0.3),0_16px_0_#915100,0_24px_48px_rgba(255,161,43,0.8),0_0_80px_rgba(255,161,43,0.5)]",
        "hover:brightness-110 hover:scale-[1.02]",
        "active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.5),inset_0_-3px_0_#915100]",
        "active:translate-y-[14px] active:scale-[0.98]",
        "before:absolute before:inset-0 before:rounded-[inherit] before:bg-gradient-to-t before:from-white/20 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        "after:absolute after:inset-0 after:-z-10 after:rounded-[inherit] after:bg-[#2B1800] after:translate-y-[18px] after:scale-[1.02] after:blur-sm"
      ),
      
      // Blob button (animated goo effect)
      blob: cn(
        "text-emerald-600 font-bold tracking-wider uppercase",
        "bg-transparent border-2 border-emerald-600 rounded-full",
        "hover:text-white transition-colors duration-500",
        "before:absolute before:inset-0 before:rounded-full before:border-2 before:border-emerald-600 before:z-[1]",
        "after:absolute after:left-[3px] after:top-[3px] after:w-full after:h-full after:transition-all after:duration-300 after:delay-200 after:rounded-full",
        "hover:after:left-0 hover:after:top-0 hover:after:delay-0"
      ),
      
      // Glass morphism
      glass: cn(
        "text-white font-bold tracking-wide",
        "bg-white/10 backdrop-blur-xl border border-white/30",
        "shadow-[inset_0_2px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1),0_10px_0_rgba(255,255,255,0.15),0_14px_28px_rgba(0,0,0,0.3),0_0_40px_rgba(255,255,255,0.1)]",
        "hover:bg-white/20 hover:border-white/40 hover:shadow-[inset_0_2px_0_rgba(255,255,255,0.5),inset_0_-1px_0_rgba(0,0,0,0.1),0_12px_0_rgba(255,255,255,0.2),0_18px_36px_rgba(0,0,0,0.4),0_0_60px_rgba(255,255,255,0.15)]",
        "hover:scale-[1.02]",
        "active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.3),inset_0_-2px_0_rgba(255,255,255,0.1)]",
        "active:translate-y-2.5 active:scale-[0.98]"
      )
    };

    const disabledStyles = "opacity-50 cursor-not-allowed pointer-events-none";

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles[size],
          variantStyles[variant],
          (disabled || isLoading) && disabledStyles,
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {variant === 'blob' && (
          <>
            <span className="absolute inset-0 -z-[1] overflow-hidden rounded-full bg-white">
              <span className="blob-container absolute inset-0 block h-full">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="blob absolute top-0 h-full w-1/4 rounded-full bg-emerald-600 transition-transform duration-[450ms] scale-y-[1.7] translate-y-[150%]"
                    style={{
                      left: `${i * 30}%`,
                      transitionDelay: `${i * 80}ms`
                    }}
                  />
                ))}
              </span>
            </span>
            <style jsx>{`
              button:hover .blob {
                transform: translateY(0) scale(1.7);
              }
            `}</style>
          </>
        )}
        
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        <span className="relative z-10">{children}</span>
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

PremiumButton.displayName = 'PremiumButton';

export default PremiumButton;
