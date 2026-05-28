/**
 * ValidationFeedback Component
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 * Task: 3.1 Implement ValidationFeedback component
 * 
 * Provides inline feedback for form inputs when sanitization occurs or validation fails.
 * Displays error, warning, and info messages with appropriate styling.
 */

import { AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationFeedbackProps {
  /** Error message - displayed in red with error icon */
  error?: string;
  /** Warning message - displayed in amber with warning icon */
  warning?: string;
  /** Info message - displayed in blue with info icon */
  info?: string;
  /** Additional CSS classes for custom positioning */
  className?: string;
}

/**
 * ValidationFeedback displays inline validation messages for form inputs.
 * 
 * @example
 * // Display error message
 * <ValidationFeedback error="Invalid email format" />
 * 
 * @example
 * // Display warning about sanitization
 * <ValidationFeedback warning="Special characters were removed" />
 * 
 * @example
 * // Display info message
 * <ValidationFeedback info="Maximum 200 characters" />
 */
export function ValidationFeedback({
  error,
  warning,
  info,
  className,
}: ValidationFeedbackProps) {
  // Don't render if no messages
  if (!error && !warning && !info) return null;

  return (
    <div className={cn("text-sm mt-1 space-y-1", className)}>
      {error && (
        <div className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="leading-tight">{error}</p>
        </div>
      )}
      {warning && (
        <div className="flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="leading-tight">{warning}</p>
        </div>
      )}
      {info && (
        <div className="flex items-start gap-1.5 text-blue-600 dark:text-blue-400">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p className="leading-tight">{info}</p>
        </div>
      )}
    </div>
  );
}
