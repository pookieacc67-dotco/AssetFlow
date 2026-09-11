import * as React from "react";
import { motion } from "motion/react";

// ============================================================================
// 1. Card Component
// ============================================================================
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "panel" | "card" | "hover";
  className?: string;
  animate?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "card",
  className = "",
  animate = false,
  ...props
}) => {
  const baseClass = variant === "panel" 
    ? "glass-panel" 
    : variant === "hover" 
    ? "glass-card glass-card-hover" 
    : "glass-card";

  const resolvedClass = `${baseClass} rounded-[24px] p-6 ${className}`;

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className={resolvedClass}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={resolvedClass} {...props}>
      {children}
    </div>
  );
};

// ============================================================================
// 2. Input Component
// ============================================================================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  trailingIcon,
  className = "",
  containerClassName = "",
  ...props
}, ref) => {
  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <span className="text-[13px] font-bold text-[#15161A] select-none pl-1">
          {label}
        </span>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-4 text-neutral-400 flex items-center justify-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`glass-input w-full rounded-2xl py-3 text-sm text-[#15161A] placeholder-neutral-400 focus:outline-none transition-all ${
            icon ? "pl-11" : "pl-4"
          } ${
            trailingIcon ? "pr-11" : "pr-4"
          } ${
            error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""
          } ${className}`}
          {...props}
        />
        {trailingIcon && (
          <div className="absolute right-4 text-neutral-400 flex items-center justify-center">
            {trailingIcon}
          </div>
        )}
      </div>
      {error ? (
        <span className="text-[11px] text-red-500 font-semibold pl-1">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-[11px] text-neutral-500 pl-1">
          {helperText}
        </span>
      ) : null}
    </div>
  );
});

Input.displayName = "Input";

// ============================================================================
// 3. Button Component
// ============================================================================
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "glass" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  trailingIcon,
  fullWidth = false,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-bold tracking-wide transition-all select-none cursor-pointer border";
  
  const variantClasses = {
    primary: "bg-[#15161A] hover:bg-black text-white border-transparent shadow-xs",
    secondary: "bg-white hover:bg-neutral-50 text-[#15161A] border-neutral-200 shadow-xs",
    glass: "glass-panel hover:bg-white text-[#15161A] border-white/50",
    danger: "bg-red-500 hover:bg-red-600 text-white border-transparent shadow-xs"
  };

  const sizeClasses = {
    sm: "px-3.5 py-2 text-[11.5px] rounded-xl gap-1.5",
    md: "px-5 py-3 text-[12.5px] rounded-2xl gap-2",
    lg: "px-6 py-4 text-[13.5px] rounded-2xl gap-2.5"
  };

  const resolvedClass = `
    ${baseClasses} 
    ${variantClasses[variant]} 
    ${sizeClasses[size]} 
    ${fullWidth ? "w-full" : ""} 
    ${disabled || loading ? "opacity-50 cursor-not-allowed pointer-events-none" : ""} 
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <motion.button
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      whileHover={disabled || loading ? undefined : { scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      disabled={disabled || loading}
      className={resolvedClass}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
      {trailingIcon}
    </motion.button>
  );
};
