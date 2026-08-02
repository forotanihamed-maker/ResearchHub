import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "transition-colors duration-150",
            error
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white hover:border-slate-400",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "transition-colors duration-150 resize-none",
            error
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-white hover:border-slate-400",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
