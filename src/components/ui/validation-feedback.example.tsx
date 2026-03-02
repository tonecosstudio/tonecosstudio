/**
 * ValidationFeedback Usage Examples
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6
 * 
 * This file demonstrates how to use the ValidationFeedback component
 * in various form scenarios.
 */

import React, { useState } from "react";
import { ValidationFeedback } from "./validation-feedback";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

/**
 * Example 1: Email validation with error feedback
 */
export function EmailValidationExample() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();

  const validateEmail = (value: string) => {
    if (!value) {
      setError("Email is required");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Invalid email format");
    } else {
      setError(undefined);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          validateEmail(e.target.value);
        }}
        className={error ? "border-red-500" : ""}
      />
      <ValidationFeedback error={error} />
    </div>
  );
}

/**
 * Example 2: Text input with sanitization warning
 */
export function SanitizedTextExample() {
  const [text, setText] = useState("");
  const [warning, setWarning] = useState<string>();

  const sanitizeText = (value: string) => {
    const hasSpecialChars = /[<>'"&]/.test(value);
    if (hasSpecialChars) {
      setWarning("Special characters (<, >, ', \", &) were removed for security");
    } else {
      setWarning(undefined);
    }
    return value.replace(/[<>'"&]/g, "");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input
        id="name"
        value={text}
        onChange={(e) => {
          const sanitized = sanitizeText(e.target.value);
          setText(sanitized);
        }}
      />
      <ValidationFeedback warning={warning} />
    </div>
  );
}

/**
 * Example 3: Textarea with character limit info
 */
export function TextareaWithLimitExample() {
  const [message, setMessage] = useState("");
  const maxLength = 200;
  const remaining = maxLength - message.length;

  return (
    <div className="space-y-2">
      <Label htmlFor="message">Message</Label>
      <Textarea
        id="message"
        value={message}
        onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
        className={remaining < 20 ? "border-amber-500" : ""}
      />
      <ValidationFeedback
        info={`${remaining} characters remaining`}
        warning={remaining < 20 ? "Approaching character limit" : undefined}
      />
    </div>
  );
}

/**
 * Example 4: Multiple validation states
 */
export function MultipleValidationExample() {
  const [password, setPassword] = useState("");
  
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*]/.test(password);
  
  const isValid = hasMinLength && hasNumber && hasSpecialChar;
  
  let error: string | undefined;
  let warning: string | undefined;
  let info: string | undefined;

  if (password && !hasMinLength) {
    error = "Password must be at least 8 characters";
  } else if (password && !hasNumber) {
    warning = "Password should contain at least one number";
  } else if (password && !hasSpecialChar) {
    warning = "Password should contain at least one special character";
  } else if (isValid) {
    info = "Strong password ✓";
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={error ? "border-red-500" : isValid ? "border-green-500" : ""}
      />
      <ValidationFeedback error={error} warning={warning} info={info} />
    </div>
  );
}

/**
 * Example 5: Custom positioned feedback
 */
export function CustomPositionedExample() {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  return (
    <div className="relative">
      <Label htmlFor="custom">Custom Field</Label>
      <Input
        id="custom"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          if (e.target.value.length > 50) {
            setError("Maximum 50 characters allowed");
          } else {
            setError(undefined);
          }
        }}
      />
      {/* Custom positioning with className */}
      <ValidationFeedback 
        error={error} 
        className="absolute right-0 top-0 mt-1"
      />
    </div>
  );
}

/**
 * Example 6: Using SanitizationResult for detailed feedback
 * Demonstrates the new *WithResult functions that track modifications
 */
export function SanitizationResultExample() {
  const [text, setText] = useState("");
  const [modifications, setModifications] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (value: string) => {
    // Import the function at the top of the file:
    // import { sanitizeTextWithResult } from "@/lib/security/input-sanitizer";
    
    // Use the *WithResult function to get detailed information
    // const result = sanitizeTextWithResult(value);
    
    // For this example, we'll simulate the result
    const hasHtml = /<[^>]+>/.test(value);
    const hasSpecialChars = /[&<>"']/.test(value.replace(/<[^>]+>/g, ''));
    
    const mods: string[] = [];
    if (hasHtml) mods.push("Removed HTML tag(s)");
    if (hasSpecialChars) mods.push("Encoded special characters");
    
    setModifications(mods);
    setErrors([]);
    
    // Set the sanitized value
    const sanitized = value.replace(/<[^>]+>/g, '').replace(/[&<>"']/g, '');
    setText(sanitized);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="sanitized">Text with Sanitization Tracking</Label>
      <Input
        id="sanitized"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
      />
      <ValidationFeedback
        warning={modifications.length > 0 ? modifications.join(", ") : undefined}
        error={errors.length > 0 ? errors.join(", ") : undefined}
      />
    </div>
  );
}

/**
 * Example 7: Email with SanitizationResult
 */
export function EmailSanitizationResultExample() {
  const [email, setEmail] = useState("");
  const [modifications, setModifications] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (value: string) => {
    // Import at the top: import { sanitizeEmailWithResult } from "@/lib/security/input-sanitizer";
    // const result = sanitizeEmailWithResult(value);
    
    // Simulate the result
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();
    
    const mods: string[] = [];
    if (value !== trimmed) mods.push("Removed whitespace");
    if (trimmed !== lower) mods.push("Converted to lowercase");
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errs: string[] = [];
    if (lower && !emailRegex.test(lower)) {
      errs.push("Invalid email format");
    }
    
    setModifications(mods);
    setErrors(errs);
    setEmail(lower);
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email-sanitized">Email with Modification Tracking</Label>
      <Input
        id="email-sanitized"
        type="email"
        value={email}
        onChange={(e) => handleChange(e.target.value)}
        className={errors.length > 0 ? "border-red-500" : ""}
      />
      <ValidationFeedback
        warning={modifications.length > 0 ? modifications.join(", ") : undefined}
        error={errors.length > 0 ? errors[0] : undefined}
        info={!errors.length && email ? "Email looks good" : undefined}
      />
    </div>
  );
}
