# Implementation Plan: Sistema de Broadcast para E-commerce

## Overview

This implementation plan breaks down the chat groups system into sequential, actionable tasks. The system enables administrators to send one-way broadcast messages to automatically segmented customer groups based on subscriptions, collections, orders, and launches.

**Key Architecture Decisions:**
- Single message storage (no per-member delivery rows)
- Realtime delivery via Supabase channels (one channel per group)
- Async email batch job for offline members
- Auto-sync job runs every 10-15 minutes
- Simple unread tracking via `last_viewed_at` timestamp
- Soft delete preserves historical data

**Implementation Strategy:**
1. Database foundation (migrations + RLS policies)
2. Core services (group, message, membership, metrics)
3. Background jobs (auto-sync, email batch)
4. Admin UI (create groups, send messages, view metrics)
5. Member UI (view groups, read messages)
6. Property-based testing (21 correctness properties)

**Estimated Complexity:** 3-4 days with existing infrastructure

## Tasks

### Phase 1: Database Foundation ✅ COMPLETED

- [x] 1. Create database schema and RLS policies ✅ APPLIED TO DATABASE
  - [x] 1.1 Create migration for chat_groups table
    - Create table with columns: id, name, type, membership_criteria (JSONB), created_by, created_at, updated_at, deleted_at, deleted_by
    - Add CHECK constraints for name length (3-100 chars) and type enum
    - Add unique constraint on name WHERE deleted_at IS NULL
    - Create indexes on type, deleted_at, created_by
    - _Requirements: 1.1, 1.2, 15.1, 15.2_
  
  - [x] 1.2 Create migration for chat_group_members table
    - Create table with columns: id, group_id, user_id, last_viewed_at, joined_at
    - Add foreign keys with CASCADE delete
    - Add unique constraint on (group_id, user_id)
    - Create indexes on group_id, user_id, and (group_id, last_viewed_at)
    - _Requirements: 2.1, 12.1_
  
  - [x] 1.3 Create migration for chat_group_messages table
    - Create table with columns: id, group_id, sender_id, message, created_at, updated_at
    - Add CHECK constraint for message length (1-5000 chars)
    - Add foreign keys with CASCADE delete
    - Create indexes on (group_id, created_at DESC) and sender_id
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 1.4 Create migration for chat_group_attachments table
    - Create table with columns: id, message_id, file_name, file_path, file_size, file_type, thumbnail_path, uploaded_by, created_at
    - Add foreign keys with CASCADE delete
    - Create indexes on message_id and uploaded_by
    - _Requirements: 9.1, 9.2_
  
  - [x] 1.5 Create RLS policies for chat_groups
    - Enable RLS on chat_groups table
    - Create policy: "Admins can view all groups" (SELECT for admins)
    - Create policy: "Members can view their groups" (SELECT for members, excluding deleted)
    - Create policy: "Admins can create groups" (INSERT for admins)
    - Create policy: "Admins can update groups" (UPDATE for admins)
    - Create policy: "Admins can delete groups" (DELETE for admins)
    - _Requirements: 18.1, 18.4_
  
  - [x] 1.6 Create RLS policies for chat_group_members
    - Enable RLS on chat_group_members table
    - Create policy: "Members can view their own membership" (SELECT where user_id = auth.uid())
    - Create policy: "Admins can view all memberships" (SELECT for admins)
    - Create policy: "Admins can manage memberships" (ALL for admins)
    - _Requirements: 18.1, 18.3, 18.4_
  
  - [x] 1.7 Create RLS policies for chat_group_messages
    - Enable RLS on chat_group_messages table
    - Create policy: "Members can read group messages" (SELECT for group members only)
    - Create policy: "Admins can send messages" (INSERT for admins)
    - Create policy: "Admins can update messages" (UPDATE for admins)
    - Create policy: "Admins can delete messages" (DELETE for admins)
    - _Requirements: 18.2, 18.3, 18.4_
  
  - [x] 1.8 Create RLS policies for chat_group_attachments
    - Enable RLS on chat_group_attachments table
    - Create policy: "Members can view group attachments" (SELECT for group members via message join)
    - Create policy: "Admins can insert attachments" (INSERT for admins)
    - Create policy: "Admins can delete attachments" (DELETE for admins)
    - _Requirements: 9.4, 18.4_

- [ ] 2. Checkpoint - Verify database schema
  - Run migrations in development environment
  - Verify all tables created with correct columns and constraints
  - Verify all RLS policies active
  - Test basic INSERT/SELECT operations as admin and member
  - Ensure all tests pass, ask the user if questions arise.


### Phase 2: Core Services

- [ ] 3. Implement GroupService
  - [x] 3.1 Create GroupService with type definitions
    - Define TypeScript interfaces: Group, GroupDetails, CreateGroupInput, MembershipCriteria
    - Implement createGroup() method with validation
    - Implement deleteGroup() method (soft delete with deleted_at and deleted_by)
    - Implement getGroupDetails() method with member/message counts
    - Implement listGroups() method with includeDeleted parameter
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 15.1, 15.2, 15.3_
  
  - [ ]* 3.2 Write property test for GroupService
    - **Property 1: Group Creation Completeness**
    - **Validates: Requirements 1.1, 1.3, 4.1, 5.1, 6.1, 7.1**
  
  - [ ]* 3.3 Write property test for input validation
    - **Property 2: Input Validation Boundaries**
    - **Validates: Requirements 1.2, 1.4, 8.2**
  
  - [ ]* 3.4 Write property test for soft delete
    - **Property 10: Soft Delete Completeness**
    - **Validates: Requirements 15.1, 15.2, 15.3, 15.4**

- [ ] 4. Implement MembershipService
  - [x] 4.1 Create MembershipService with membership management
    - Implement addMember() method with duplicate prevention
    - Implement removeMember() method preserving message history
    - Implement listMembers() method with pagination
    - Implement getUsersMatchingCriteria() for automatic groups
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_
  
  - [ ]* 4.2 Write property test for membership idempotence
    - **Property 4: Membership Idempotence**
    - **Validates: Requirements 2.1, 2.3, 2.4**
  
  - [ ]* 4.3 Write property test for member removal
    - **Property 5: Member Removal Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  
  - [ ]* 4.4 Write property test for membership criteria consistency
    - **Property 3: Membership Criteria Consistency**
    - **Validates: Requirements 4.3, 5.3, 6.2, 6.3, 7.4**

- [ ] 5. Implement MessageService
  - [x] 5.1 Create MessageService with broadcast functionality
    - Implement sendBroadcastMessage() method with validation
    - Implement listMessages() method with pagination (50 per page)
    - Implement updateLastViewed() method
    - Implement getUnreadCount() method based on last_viewed_at
    - Integrate with existing fileUploadService for attachments
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 12.1, 12.2, 12.3, 14.4_
  
  - [ ]* 5.2 Write property test for message persistence
    - **Property 6: Message Persistence Singularity**
    - **Validates: Requirements 8.1, 8.3, 8.4**
  
  - [ ]* 5.3 Write property test for unread counter accuracy
    - **Property 8: View Tracking Accuracy**
    - **Validates: Requirements 12.1, 12.2, 12.3**
  
  - [ ]* 5.4 Write property test for message chronological ordering
    - **Property 9: Message Chronological Ordering**
    - **Validates: Requirements 14.1**
  
  - [ ]* 5.5 Write property test for attachment integration
    - **Property 7: Attachment Integration**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
  
  - [ ]* 5.6 Write property test for admin-only broadcast
    - **Property 13: Admin-Only Broadcast**
    - **Validates: Requirements 18.2**

- [ ] 6. Implement MetricsService
  - [x] 6.1 Create MetricsService with metrics calculations
    - Implement getTotalMembers() method
    - Implement getTotalMessages() method
    - Implement getEstimatedViewRate() method (% members with last_viewed_at > last_message.created_at)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ]* 6.2 Write property test for metrics accuracy
    - **Property 11: Metrics Accuracy**
    - **Validates: Requirements 16.1, 16.2, 16.3**

- [ ] 7. Implement Realtime integration
  - [x] 7.1 Create Realtime broadcast functionality
    - Implement broadcastGroupMessage() function to send to group channel
    - Create useGroupMessages() React hook for subscribing to group channels
    - Implement channel security validation (verify membership before subscription)
    - Add error handling for Realtime failures (graceful degradation)
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [ ]* 7.2 Write integration test for Realtime delivery
    - Test message broadcast to online members
    - Test channel security (unauthorized subscription blocked)
    - Test graceful degradation when Realtime fails
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 8. Checkpoint - Verify core services
  - Test all service methods with sample data
  - Verify RLS policies prevent unauthorized access
  - Test Realtime message delivery
  - Verify attachment integration works correctly
  - Ensure all tests pass, ask the user if questions arise.


### Phase 3: Background Jobs

- [ ] 9. Implement auto-sync job
  - [x] 9.1 Create auto-sync Edge Function
    - Create Supabase Edge Function: auto-sync-groups
    - Implement syncGroupMembership() for each automatic group
    - Implement evaluateMembershipCriteria() for each group type (assinantes, coleção, lançamentos, pedidos)
    - Add new members matching criteria
    - Remove members no longer matching criteria (they lose ALL access including history)
    - Add error handling and logging
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [~] 9.2 Configure pg_cron for auto-sync
    - Create cron job to run every 15 minutes
    - Configure service role key for authentication
    - Test cron execution in development
    - _Requirements: 17.1_
  
  - [ ]* 9.3 Write property test for auto-sync idempotence
    - **Property 12: Auto-Sync Idempotence**
    - **Validates: Requirements 17.2, 17.3, 17.4**
  
  - [ ]* 9.4 Write unit tests for membership criteria evaluation
    - Test assinantes criteria (active subscriptions, optional collection/plan filters)
    - Test coleção criteria (specific collection subscriptions)
    - Test lançamentos criteria (all users vs previous buyers)
    - Test pedidos criteria (status and date filters)
    - _Requirements: 4.1, 4.2, 5.1, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 7.4_

- [ ] 10. Implement email batch job
  - [x] 10.1 Create email batch Edge Function
    - Create Supabase Edge Function: send-group-emails-batch
    - Implement logic to send emails to all members (respecting notification preferences)
    - Reuse existing send-email Edge Function
    - Include group name, sender name, message preview, and link to view full message
    - Add retry logic (up to 3 attempts with exponential backoff)
    - Add error handling and logging
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 10.2 Configure pg_cron for email batch
    - Create cron job to run every 2 minutes
    - Configure service role key for authentication
    - Test cron execution in development
    - _Requirements: 11.1_
  
  - [ ]* 10.3 Write integration test for email notifications
    - Test email sent to members with notifications enabled
    - Test email NOT sent to members with notifications disabled
    - Test email content includes all required fields
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [ ]* 10.4 Write property test for notification preferences
    - **Property 16: Email Notification Preferences**
    - **Validates: Requirements 11.4**
  
  - [ ]* 10.5 Write property test for notification payload completeness
    - **Property 15: Notification Payload Completeness**
    - **Validates: Requirements 10.2, 10.3, 10.4, 11.2, 11.3**

- [x] 11. Checkpoint - Verify background jobs
  - Test auto-sync job manually
  - Verify members added/removed correctly based on criteria
  - Test email batch job manually
  - Verify emails sent with correct content
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Admin UI ✅ COMPLETED

- [x] 12. Create group management UI
  - [x] 12.1 Create GroupList component ✅
  - [x] 12.2 Create CreateGroupModal component ✅
  
- [x] 13. Create member management UI
  - [x] 13.1 Create GroupMembersList component ✅
  - [x] 13.2 Create AddMemberModal component ✅

- [x] 14. Create message broadcast UI
  - [x] 14.1 Create GroupMessageList component ✅
  - [x] 14.2 Create SendMessageForm component ✅

- [x] 15. Create metrics dashboard UI
  - [x] 15.1 Create GroupMetrics component ✅

- [x] 16. Create admin pages
  - [x] 16.1 Create AdminGroupsPage ✅
  - [x] 16.2 Create AdminGroupDetailsPage ✅
    - Integrate GroupList component
    - Integrate CreateGroupModal
    - Add navigation to group details page
    - _Requirements: 1.1, 15.1_
  
  - [~] 16.2 Create AdminGroupDetailsPage
    - Display group information and metrics
    - Integrate GroupMembersList component
    - Integrate GroupMessageList component
    - Integrate SendMessageForm component
    - Add breadcrumb navigation
    - _Requirements: 2.1, 8.1, 14.1, 16.1_

- [ ] 17. Checkpoint - Verify admin UI
  - Test creating all group types
  - Test adding/removing members from manual groups
  - Test sending messages with attachments
  - Test viewing metrics
  - Test soft delete functionality
  - Ensure all tests pass, ask the user if questions arise.


### Phase 5: Member UI ✅ COMPLETED

- [x] 18. Create member group list UI
  - [x] 18.1 Create MemberGroupList component ✅
  
- [x] 19. Create member message view UI
  - [x] 19.1 Create MemberGroupMessagesPage ✅
  - [x] 19.2 Create MemberGroupsPage ✅
  - [x] 19.3 Create MemberGroupDetailsPage ✅

- [ ] 20. Create member navigation
  - [~] 20.1 Add "Grupos" link to member navigation menu
    - Add navigation item in customer menu
    - Show unread count badge (total across all groups)
    - Link to MemberGroupList page
    - _Requirements: 13.1_
  
  - [~] 20.2 Create MemberGroupsPage
    - Integrate MemberGroupList component
    - Add empty state when user has no groups
    - Add navigation to group messages page
    - _Requirements: 13.1_

- [ ] 21. Implement Realtime updates for members
  - [~] 21.1 Add Realtime subscription to MemberGroupList
    - Subscribe to user's group channels on mount
    - Update unread counts when new messages arrive
    - Update last message preview
    - Show toast notification for new messages
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [~] 21.2 Add Realtime subscription to MemberGroupMessagesPage
    - Subscribe to group channel on mount
    - Append new messages to list in real-time
    - Auto-scroll to new messages
    - Update last_viewed_at when new message arrives
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 22. Checkpoint - Verify member UI
  - Test viewing group list as member
  - Test unread counter updates
  - Test viewing message history
  - Test Realtime message delivery
  - Test last_viewed_at updates correctly
  - Ensure all tests pass, ask the user if questions arise.


### Phase 6: Access Control & Security ✅ COMPLETED

- [x] 23. Implement access control enforcement
  - [x] 23.1 Create permission validation utilities ✅
  - [x] 23.2 Create permission tests ✅
  
- [x] 24. Implement validation utilities
  - [x] 24.1 Create validation functions ✅
  - [x] 24.2 Create validation tests ✅

### Phase 7: Integration & Testing

- [ ] 26. Integration testing
  - [ ]* 26.1 Write end-to-end test for complete broadcast flow
    - Admin creates group
    - Admin adds members
    - Admin sends message with attachment
    - Members receive via Realtime
    - Offline members receive email
    - Members view message and unread count updates
    - _Requirements: 1.1, 2.1, 8.1, 9.1, 10.1, 11.1, 12.3, 14.1_
  
  - [ ]* 26.2 Write end-to-end test for auto-sync flow
    - Create automatic group (assinantes)
    - User subscribes to collection
    - Auto-sync job runs
    - User added to group automatically
    - User cancels subscription
    - Auto-sync job runs
    - User removed from group (loses access to history)
    - _Requirements: 4.1, 4.3, 17.1, 17.2, 17.3, 17.4_
  
  - [ ]* 26.3 Write end-to-end test for soft delete flow
    - Admin creates group with members and messages
    - Admin soft deletes group
    - Verify group invisible to members
    - Verify group invisible to admin in default list
    - Verify data preserved in database
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [ ]* 26.4 Write integration test for attachment system
    - Upload attachment via fileUploadService
    - Link attachment to group message
    - Verify attachment accessible to all group members
    - Verify attachment URLs generated correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ]* 26.5 Write integration test for notification system
    - Send message to group
    - Verify Realtime broadcast to online members
    - Verify email queued for offline members
    - Verify email content correct
    - Verify notification preferences respected
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4_

- [ ] 27. Performance testing
  - [ ]* 27.1 Test message broadcast with 1000+ members
    - Create group with 1000+ members
    - Send message
    - Verify single message row created
    - Verify Realtime broadcast completes in <2 seconds
    - Verify email batch job processes all members
    - _Requirements: 8.4_
  
  - [ ]* 27.2 Test auto-sync with 100+ groups
    - Create 100+ automatic groups
    - Run auto-sync job
    - Verify job completes in <5 minutes
    - Verify all groups synced correctly
    - _Requirements: 17.1_
  
  - [ ]* 27.3 Test pagination with 10,000+ messages
    - Create group with 10,000+ messages
    - Request paginated message list
    - Verify query performance <500ms per page
    - Verify correct ordering maintained
    - _Requirements: 14.4_

- [ ] 28. Manual testing checklist
  - [ ]* 28.1 Test all group types creation
    - Create manual group and add members manually
    - Create assinantes group with optional filters
    - Create coleção group with specific collection
    - Create lançamentos group with all users criteria
    - Create lançamentos group with previous buyers criteria
    - Create pedidos group with status filters
    - Create pedidos group with date range filters
    - _Requirements: 1.1, 4.1, 5.1, 6.1, 7.1_
  
  - [ ]* 28.2 Test message sending with attachments
    - Send message without attachments
    - Send message with single image attachment
    - Send message with multiple attachments
    - Send message with PDF attachment
    - Verify attachment previews display correctly
    - _Requirements: 8.1, 9.1_
  
  - [ ]* 28.3 Test Realtime delivery
    - Open group as member in two browser windows
    - Send message as admin
    - Verify both windows receive message instantly
    - Verify unread counter updates correctly
    - _Requirements: 10.1, 10.2, 12.3_
  
  - [ ]* 28.4 Test email notifications
    - Send message to group
    - Check email inbox for notification
    - Verify email contains group name, sender, preview, link
    - Click link and verify redirects to correct group
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [ ]* 28.5 Test auto-sync behavior
    - Create assinantes group
    - Subscribe user to collection
    - Wait 15 minutes
    - Verify user added to group
    - Cancel subscription
    - Wait 15 minutes
    - Verify user removed from group and loses access
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  
  - [ ]* 28.6 Test metrics accuracy
    - Create group with 10 members
    - Send message
    - Have 6 members view the group
    - Verify estimated view rate shows 60%
    - Send another message
    - Verify view rate resets (only 0% viewed new message)
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  
  - [ ]* 28.7 Test soft delete behavior
    - Create group with members and messages
    - Soft delete group
    - Verify group not visible in member's group list
    - Verify group not visible in admin's default list
    - Verify admin can view deleted groups with includeDeleted=true
    - Verify data preserved in database
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [ ]* 28.8 Test permission enforcement
    - Attempt to create group as non-admin (should fail)
    - Attempt to send message as non-admin (should fail)
    - Attempt to view messages as non-member (should fail)
    - Attempt to delete group as non-admin (should fail)
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [ ] 29. Final checkpoint - Complete system verification
  - All property-based tests passing (21 properties)
  - All unit tests passing
  - All integration tests passing
  - Manual testing checklist complete
  - Performance benchmarks met
  - Security audit complete
  - Documentation updated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

### Property-Based Testing Requirements

All property tests MUST:
- Use `fast-check` library for TypeScript
- Run minimum 100 iterations per test
- Include comment referencing design document property
- Format: `// Feature: chat-groups-system, Property N: [Property Title]`

### Testing Strategy

- **Property tests**: Verify universal correctness properties (21 total)
- **Unit tests**: Verify specific examples and error conditions
- **Integration tests**: Verify system integration points
- **Manual tests**: Verify end-to-end user flows

### Reuse Existing Systems

- **Attachment system**: `fileUploadService` already exists
- **Notification system**: `notificationService` already exists
- **Email function**: `supabase/functions/send-email` already exists
- **Admin authentication**: `admin_users` table already exists
- **Chat UI components**: Reuse from existing chat system

### Critical Security Notes

- RLS policies MUST be enabled on all tables
- Realtime channel subscriptions MUST validate membership
- Only admins can create groups and send messages
- Only members can view group messages
- Soft delete preserves data but hides from all users

### Scalability Considerations

- Messages stored ONCE (not per-member)
- Realtime delivery via group channels (not per-member)
- Email sent in async batches (not synchronous)
- Auto-sync runs every 10-15 minutes (not real-time)
- Simple unread tracking via `last_viewed_at` (not per-message receipts)

### Implementation Estimates

- Phase 1 (Database): 4-6 hours
- Phase 2 (Core Services): 8-12 hours
- Phase 3 (Background Jobs): 6-8 hours
- Phase 4 (Admin UI): 8-12 hours
- Phase 5 (Member UI): 6-8 hours
- Phase 6 (Security): 4-6 hours
- Phase 7 (Testing): 8-12 hours

**Total: 44-64 hours (3-4 days with existing infrastructure)**
