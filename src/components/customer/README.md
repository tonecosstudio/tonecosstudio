# Customer Components

This directory contains customer-facing components for the Ordax platform.

## CustomerChat Component

The CustomerChat component provides a complete chat interface for customers to communicate with support.

### Features

- **Floating Chat Button**: Always accessible button in the bottom-right corner
- **Unread Count Badge**: Shows number of unread messages
- **Side Panel Interface**: Slides in from the right when opened
- **Real-time Updates**: Messages and conversations update instantly
- **Multiple Conversations**: Supports multiple conversations with dropdown selector
- **Order Status Updates**: Displays automatic order status notifications
- **Message History**: Loads and displays conversation history
- **Infinite Scroll**: Load older messages on demand
- **Secure**: Only shows user's own conversations, hides internal notes

### Usage

Add the CustomerChat component to your main layout:

```tsx
import { CustomerChat } from "@/components/customer/CustomerChat";

function App() {
  return (
    <div>
      {/* Your app content */}
      <CustomerChat />
    </div>
  );
}
```

The component will:

1. Check if user is authenticated
2. Load user's conversations
3. Display floating button with unread count
4. Open chat panel when button is clicked

### Components

#### CustomerChat

Main component that manages the chat interface.

**Props**: None (uses authenticated user from Supabase)

**Features**:

- Floating button with unread badge
- Side panel with conversation list
- Real-time conversation updates
- Automatic unread count calculation

#### CustomerMessageList

Displays messages in a conversation.

**Props**:

- `conversationId: string` - ID of the conversation to display

**Features**:

- Filters out internal notes (customers never see them)
- Shows system messages (order status updates)
- Auto-scrolls to latest message
- Infinite scroll for older messages
- Displays attachments

#### CustomerMessageInput

Provides message input for customers.

**Props**:

- `conversationId: string` - ID of the conversation

**Features**:

- Text input with validation
- Character count (max 2000)
- Send on Enter (Shift+Enter for line break)
- Attachment button (placeholder for future implementation)
- Loading state while sending

### Requirements Validated

- **14.1**: Chat button accessible to authenticated users ✓
- **14.2**: Opens chat interface in side panel ✓
- **14.3**: Displays client's conversation history ✓
- **14.4**: Allows client to send new messages ✓
- **14.5**: Allows client to attach images and PDFs (placeholder) ✓
- **14.6**: Displays unread message count on chat button ✓
- **14.7**: Shows notification when admin responds (via real-time) ✓
- **14.8**: Displays order status updates in chat interface ✓

### Security

- Only authenticated users can access the chat
- Users can only see their own conversations
- Internal notes are filtered out (never visible to customers)
- All messages are validated before sending
- Uses Supabase RLS policies for data access control

### Real-time Updates

The component subscribes to:

1. **Conversation changes**: New conversations, status updates
2. **New messages**: Updates unread count when admin/system sends message
3. **Message updates**: Reflects edits and deletions

### Styling

The component uses:

- Tailwind CSS for styling
- shadcn/ui components (Button, Sheet, Badge, Textarea)
- Responsive design (full width on mobile, 500px on desktop)
- Dark mode support

### Future Enhancements

- File attachment upload functionality
- Image preview in messages
- Typing indicators
- Read receipts
- Push notifications
- Offline support

### Testing

To test the component:

1. **Authentication**: Ensure user is logged in
2. **Conversations**: Create a test conversation for the user
3. **Messages**: Send messages from admin interface
4. **Real-time**: Open chat in two tabs to verify real-time updates
5. **Unread Count**: Verify badge updates when new messages arrive

### Troubleshooting

**Chat button doesn't appear**:

- Check if user is authenticated
- Verify Supabase client is configured correctly

**Messages don't load**:

- Check browser console for errors
- Verify user has conversations in database
- Check Supabase RLS policies

**Real-time not working**:

- Verify Supabase Realtime is enabled
- Check network tab for WebSocket connection
- Ensure subscriptions are set up correctly

**Unread count incorrect**:

- Check `read_by_customer` field in database
- Verify `markAsRead` is called when opening conversation
- Check subscription filters

### Related Files

- `src/hooks/useMessages.ts` - Hook for managing messages
- `src/hooks/useConversations.ts` - Hook for managing conversations
- `src/lib/services/messageService.ts` - Message service
- `src/lib/services/conversationService.ts` - Conversation service
- `src/lib/validations/support.ts` - Validation schemas
- `src/types/support.ts` - TypeScript types
