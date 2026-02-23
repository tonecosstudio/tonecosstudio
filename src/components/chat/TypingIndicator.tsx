/**
 * TypingIndicator Component
 * 
 * Displays animated typing indicator with user names
 * 
 * Features:
 * - Animated bouncing dots
 * - Single user: "João está digitando..."
 * - Multiple users: "João e Maria estão digitando..."
 * - Smooth fade-in/fade-out transitions
 * 
 * Requirements: 3.2, 3.7
 */

interface TypingIndicatorProps {
  typingText: string;
}

export function TypingIndicator({ typingText }: TypingIndicatorProps) {
  if (!typingText) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground animate-in fade-in duration-200">
      <div className="flex gap-1">
        <span 
          className="w-2 h-2 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '0ms' }} 
        />
        <span 
          className="w-2 h-2 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '150ms' }} 
        />
        <span 
          className="w-2 h-2 bg-current rounded-full animate-bounce" 
          style={{ animationDelay: '300ms' }} 
        />
      </div>
      <span>{typingText}</span>
    </div>
  );
}
