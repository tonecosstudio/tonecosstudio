/**
 * ValidationFeedback Component Tests
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 * Task: 3.1 Implement ValidationFeedback component
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ValidationFeedback } from "./validation-feedback";

describe("ValidationFeedback", () => {
  it("renders nothing when no messages are provided", () => {
    const { container } = render(<ValidationFeedback />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error message with error icon", () => {
    render(<ValidationFeedback error="Invalid email format" />);
    expect(screen.getByText("Invalid email format")).toBeInTheDocument();
    // Check for error styling
    const errorDiv = screen.getByText("Invalid email format").closest("div");
    expect(errorDiv).toHaveClass("text-red-600");
  });

  it("renders warning message with warning icon", () => {
    render(<ValidationFeedback warning="Special characters removed" />);
    expect(screen.getByText("Special characters removed")).toBeInTheDocument();
    // Check for warning styling
    const warningDiv = screen.getByText("Special characters removed").closest("div");
    expect(warningDiv).toHaveClass("text-amber-600");
  });

  it("renders info message with info icon", () => {
    render(<ValidationFeedback info="Maximum 200 characters" />);
    expect(screen.getByText("Maximum 200 characters")).toBeInTheDocument();
    // Check for info styling
    const infoDiv = screen.getByText("Maximum 200 characters").closest("div");
    expect(infoDiv).toHaveClass("text-blue-600");
  });

  it("renders multiple messages simultaneously", () => {
    render(
      <ValidationFeedback
        error="Field is required"
        warning="Input was sanitized"
        info="Use alphanumeric characters only"
      />
    );
    
    expect(screen.getByText("Field is required")).toBeInTheDocument();
    expect(screen.getByText("Input was sanitized")).toBeInTheDocument();
    expect(screen.getByText("Use alphanumeric characters only")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <ValidationFeedback error="Error" className="custom-class" />
    );
    
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-class");
    expect(wrapper).toHaveClass("text-sm");
    expect(wrapper).toHaveClass("mt-1");
  });

  it("renders error message with correct structure", () => {
    render(<ValidationFeedback error="Test error" />);
    
    const errorDiv = screen.getByText("Test error").closest("div");
    expect(errorDiv).toHaveClass("flex", "items-start", "gap-1.5");
  });

  it("handles long error messages", () => {
    const longMessage = "This is a very long error message that should wrap properly and maintain good readability even when it spans multiple lines in the UI";
    render(<ValidationFeedback error={longMessage} />);
    
    expect(screen.getByText(longMessage)).toBeInTheDocument();
  });

  it("prioritizes error over warning and info when all are present", () => {
    const { container } = render(
      <ValidationFeedback
        error="Critical error"
        warning="Warning message"
        info="Info message"
      />
    );
    
    // All messages should be present
    expect(screen.getByText("Critical error")).toBeInTheDocument();
    expect(screen.getByText("Warning message")).toBeInTheDocument();
    expect(screen.getByText("Info message")).toBeInTheDocument();
    
    // Error should appear first in DOM
    const messages = container.querySelectorAll(".flex.items-start");
    expect(messages[0]).toHaveClass("text-red-600");
  });

  it("renders with dark mode classes", () => {
    render(<ValidationFeedback error="Error" />);
    
    const errorDiv = screen.getByText("Error").closest("div");
    expect(errorDiv?.className).toContain("dark:text-red-400");
  });
});
