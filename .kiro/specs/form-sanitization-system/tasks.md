# Implementation Plan: Form Sanitization System

## Overview

This implementation plan systematically applies the existing sanitization infrastructure (input-sanitizer.ts, useSanitizedInput hook) to all forms throughout the application. The approach focuses on retrofitting existing forms with sanitization, implementing validation feedback, and ensuring comprehensive XSS protection across admin, public, and chat interfaces.

## Tasks

- [ ] 1. Enhance core sanitization infrastructure
  - [x] 1.1 Extend input-sanitizer.ts with missing sanitization functions
    - Add sanitizePath() for path traversal prevention
    - Add sanitizeFilename() for safe file storage
    - Add sanitizeSearchQuery() with SQL injection pattern detection
    - Ensure all functions are idempotent
    - _Requirements: 1.7, 5.1, 7.1, 7.2_
  
  - [ ]* 1.2 Write property tests for sanitization idempotence
    - **Property: Idempotence - sanitize(sanitize(x)) = sanitize(x)**
    - **Validates: Requirements 1.7**
    - Test for all sanitization types: text, html, email, phone, url, search
  
  - [ ]* 1.3 Write unit tests for XSS attack vectors
    - Test script tags, event handlers, javascript: URLs
    - Test SQL injection patterns in search queries
    - Test edge cases: empty strings, long inputs, unicode, special characters
    - _Requirements: 6.1, 6.3, 6.4, 6.7_

- [ ] 2. Create useSanitizedForm hook for form-level sanitization
  - [x] 2.1 Implement useSanitizedForm hook in src/hooks/useSanitizedInput.ts
    - Accept initialData and sanitizationMap parameters
    - Manage form state with raw and sanitized values
    - Provide setValue(), getSanitizedValue(), getSanitizedData(), reset() methods
    - Integrate with react-hook-form patterns
    - _Requirements: 5.2, 5.3_
  
  - [ ]* 2.2 Write unit tests for useSanitizedForm hook
    - Test form state management
    - Test sanitization map application
    - Test getSanitizedData() output
    - _Requirements: 5.2_

- [ ] 3. Create ValidationFeedback component
  - [x] 3.1 Implement ValidationFeedback component in src/components/ui/validation-feedback.tsx
    - Accept error, warning, info props
    - Display inline feedback with appropriate styling
    - Support className for custom positioning
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_
  
  - [x] 3.2 Enhance sanitization functions to return SanitizationResult
    - Return { value, wasModified, modifications, errors }
    - Track what was removed or changed during sanitization
    - _Requirements: 4.1, 4.2_

- [ ] 4. Implement centralized sanitization configuration
  - [x] 4.1 Create sanitization config in src/lib/security/sanitization-config.ts
    - Define SANITIZATION_CONFIG with field-level settings
    - Define FORM_RATE_LIMITS for different form types
    - Define allowed HTML tags and file types
    - Export configuration constants
    - _Requirements: 5.1, 5.3, 5.4, 9.2_
  
  - [x] 4.2 Add sanitization event logging
    - Log sanitization events with field name, type, and modifications
    - Integrate with existing error-tracking.ts
    - _Requirements: 5.6_

- [x] 5. Checkpoint - Verify infrastructure is ready
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Apply sanitization to admin forms
  - [x] 6.1 Retrofit User Management form (/admin/users)
    - Apply useSanitizedForm with sanitization map
    - Add ValidationFeedback for each field
    - Integrate rate limiting check before submission
    - Sanitize: name (text), email (email), phone (phone), notes (html)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 9.1, 9.2_
  
  - [x] 6.2 Retrofit Product Management form (/admin/products)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: name (text), description (html), category (text)
    - Add validation feedback
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [x] 6.3 Retrofit Order Management form (/admin/orders)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: notes (html), customer_notes (html)
    - Add validation feedback
    - _Requirements: 1.1, 1.5_
  
  - [x] 6.4 Retrofit Payment Keys form (/admin/payment-keys)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: pix_key (text), api_keys (text)
    - Add validation feedback
    - _Requirements: 1.1, 1.2_
  
  - [x] 6.5 Retrofit Bonus Pieces form (/admin/bonus-pieces)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: name (text), description (html)
    - Add validation feedback
    - _Requirements: 1.1, 1.2, 1.5_

- [ ]* 6.6 Write integration tests for admin forms
  - Test end-to-end sanitization for each admin form
  - Verify malicious input is neutralized
  - Verify legitimate input is preserved
  - _Requirements: 6.5, 6.6_

- [ ] 7. Apply sanitization to public forms
  - [x] 7.1 Retrofit Contact form (/contact)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: name (text), email (email), message (html)
    - Add validation feedback
    - Integrate rate limiting (5 requests/hour)
    - _Requirements: 2.1, 2.6, 9.1, 9.2, 9.3_
  
  - [x] 7.2 Retrofit Registration form (/register)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: name (text), email (email), phone (phone)
    - Password field uses type 'none' (no sanitization)
    - Add validation feedback
    - _Requirements: 2.2, 2.6_
  
  - [x] 7.3 Retrofit Login form (/login)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: email (email)
    - Password field uses type 'none'
    - Add validation feedback
    - _Requirements: 2.2_
  
  - [x] 7.4 Retrofit Search forms (multiple pages)
    - Apply useSanitizedInput to all search input fields
    - Use sanitization type 'search'
    - Limit query length to 200 characters
    - Add validation feedback for malicious patterns
    - Integrate rate limiting (30 requests/minute)
    - _Requirements: 2.3, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 9.2_
  
  - [x] 7.5 Retrofit Payment forms (/purchase, /pay-balance)
    - Apply useSanitizedForm with sanitization map
    - Sanitize: name (text), email (email), notes (html)
    - Add validation feedback
    - _Requirements: 2.1, 2.2_
  
  - [x] 7.6 Add file upload validation to forms with file inputs
    - Use validateFileUpload() from input-sanitizer.ts
    - Validate file type against allowlist
    - Validate file size limits (10MB images, 20MB documents)
    - Sanitize filenames with sanitizeFilename()
    - Verify MIME type matches extension
    - Display clear error messages for rejected files
    - _Requirements: 2.5, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ]* 7.7 Write integration tests for public forms
  - Test end-to-end sanitization for each public form
  - Test file upload validation
  - Test rate limiting behavior
  - _Requirements: 6.5, 6.6_

- [x] 8. Checkpoint - Verify admin and public forms are complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Apply sanitization to chat and messaging forms
  - [x] 9.1 Retrofit Customer Chat form (/customer/chat)
    - Apply useSanitizedInput to message field (type: text)
    - Add URL sanitization for links in messages
    - Preserve line breaks and basic formatting
    - Add validation feedback
    - Integrate rate limiting (60 messages/minute)
    - _Requirements: 3.1, 3.4, 3.5, 9.2_
  
  - [x] 9.2 Retrofit Admin Chat form (/admin/chat)
    - Apply useSanitizedInput to message field (type: text)
    - Sanitize quick reply templates before saving
    - Add validation feedback
    - _Requirements: 3.2, 3.6_
  
  - [x] 9.3 Retrofit Group Messages form (/groups/:id)
    - Apply useSanitizedInput to message field (type: text)
    - Sanitize message metadata
    - Add validation feedback
    - _Requirements: 3.3, 3.4_

- [ ]* 9.4 Write integration tests for chat forms
  - Test message sanitization end-to-end
  - Test URL sanitization in messages
  - Test rate limiting for chat messages
  - _Requirements: 6.5, 6.6_

- [ ] 10. Implement rate limiting integration
  - [x] 10.1 Add rate limit checks to all form submission handlers
    - Use checkRateLimit() from rate-limiter.ts
    - Display retry time when limit exceeded
    - Track per-user for authenticated forms
    - Track per-IP for unauthenticated forms
    - Log rate limit events
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 11. Create documentation and examples
  - [x] 11.1 Create sanitization documentation in docs/security/sanitization-guide.md
    - Document each sanitization type with examples
    - Include decision tree for choosing sanitization types
    - Provide code examples for useSanitizedInput and useSanitizedForm
    - Explain sanitization vs validation
    - List common security pitfalls and prevention
    - Include migration guide for existing forms
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 12. Final checkpoint - Verify complete system
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all forms have sanitization applied
  - Verify validation feedback is consistent
  - Verify rate limiting is working

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end sanitization flows
- All forms use consistent patterns from the design document
- Rate limiting is integrated at submission time to prevent abuse
