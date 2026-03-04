# CharacterChoiceCard Component

## Overview

The `CharacterChoiceCard` component displays character choice status and actions for customers viewing their order progress. It provides a clear interface for customers to understand their character selection status, see deadlines, and take appropriate actions based on the current state.

## Requirements

- **Requirement 2.2.2**: Customer Choice Submission
- **Requirement 2.4.3**: Character Selection Interface
- **Task 5.1.4**: Create CharacterChoiceCard component

## Features

### Core Functionality

1. **Status Display**: Shows current choice status with color-coded badges
2. **Deadline Countdown**: Displays time remaining with urgency indicators
3. **Character Display**: Shows chosen character with image
4. **Action Buttons**: Provides context-appropriate actions (choose, change, etc.)
5. **Change Tracking**: Shows remaining changes allowed (max 3)

### Status States

The component handles five distinct choice statuses:

#### 1. Pending
- Shows "Choose Character" button
- Displays deadline countdown with color coding
- Shows alert prompting user to make a choice
- Disables button if deadline has passed

#### 2. Submitted
- Shows "Awaiting Approval" badge
- Displays chosen character with image
- Shows waiting message
- Displays deadline countdown

#### 3. Approved
- Shows "Approved" badge with green styling
- Displays approved character with image
- Shows success message
- Provides "Change Choice" button if allowed
- Shows remaining changes counter

#### 4. Rejected
- Shows "Rejected" badge with red styling
- Displays rejected character (grayed out)
- Shows error message
- Provides "Choose Another Character" button
- Disables button if deadline has passed

#### 5. Locked
- Shows "Locked" badge
- Displays locked character
- Shows info message that production has started
- No action buttons available

## Props

```typescript
interface CharacterChoiceCardProps {
  orderId: string;                    // Order ID
  orderType: "subscription_delivery" | "standalone_purchase";
  choiceStatus: ChoiceStatus;         // Current choice status
  choiceDeadline: string | null;      // ISO date string
  characterName: string | null;       // Name of chosen character
  characterImageUrl: string | null;   // URL to character image
  changesCount?: number;              // Number of changes made (default: 0)
  className?: string;                 // Additional CSS classes
}

type ChoiceStatus = "pending" | "submitted" | "approved" | "rejected" | "locked";
```

## Usage

### Basic Usage

```tsx
import { CharacterChoiceCard } from "@/components/customer/CharacterChoiceCard";

function OrderProgressPage() {
  return (
    <CharacterChoiceCard
      orderId="order-123"
      orderType="subscription_delivery"
      choiceStatus="pending"
      choiceDeadline="2024-12-31T23:59:59Z"
      characterName={null}
      characterImageUrl={null}
    />
  );
}
```

### With Approved Character

```tsx
<CharacterChoiceCard
  orderId="order-123"
  orderType="subscription_delivery"
  choiceStatus="approved"
  choiceDeadline="2024-12-31T23:59:59Z"
  characterName="Naruto Uzumaki"
  characterImageUrl="https://example.com/naruto.jpg"
  changesCount={1}
/>
```

### With Custom Styling

```tsx
<CharacterChoiceCard
  orderId="order-123"
  orderType="subscription_delivery"
  choiceStatus="submitted"
  choiceDeadline="2024-12-31T23:59:59Z"
  characterName="Sasuke Uchiha"
  characterImageUrl="https://example.com/sasuke.jpg"
  className="shadow-lg"
/>
```

## Deadline Urgency Levels

The component uses color-coded urgency indicators based on time remaining:

| Time Remaining | Color | Background | Icon |
|---------------|-------|------------|------|
| > 3 days | Green | `bg-green-50` | Clock |
| 1-3 days | Yellow | `bg-yellow-50` | Clock |
| < 24 hours | Red | `bg-red-50` | AlertCircle |

## Change Limits

Customers can change their approved choice up to 3 times:

- **0 changes**: "3 alterações restantes"
- **1 change**: "2 alterações restantes"
- **2 changes**: "1 alteração restante"
- **3 changes**: "Você atingiu o limite de 3 alterações"

After 3 changes, the "Change Choice" button is hidden.

## Status Labels (Portuguese)

| Status | Label |
|--------|-------|
| pending | Aguardando Escolha |
| submitted | Aguardando Aprovação |
| approved | Aprovado |
| rejected | Rejeitado |
| locked | Bloqueado |

## Accessibility

The component follows accessibility best practices:

- **Semantic HTML**: Uses proper heading hierarchy
- **Alt Text**: All images have descriptive alt text
- **Button Labels**: Clear, descriptive button labels
- **Color Contrast**: Meets WCAG AA standards
- **Keyboard Navigation**: All interactive elements are keyboard accessible

## Responsive Design

The component is fully responsive and works on:

- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (< 768px)

Uses Tailwind CSS utility classes for responsive behavior.

## Dependencies

- **React**: ^18.0.0
- **date-fns**: For date formatting and calculations
- **lucide-react**: For icons
- **@/components/ui**: shadcn/ui components (Card, Button, Badge, Alert)
- **@/lib/utils**: Utility functions (cn for className merging)

## Testing

The component includes comprehensive tests covering:

- All five status states
- Deadline urgency levels
- Change limit scenarios
- Expired deadline handling
- Accessibility features
- Edge cases (missing data, null values)

Run tests with:

```bash
npm test CharacterChoiceCard.test.tsx
```

## Future Enhancements

The component currently has placeholder comments for modal integration:

1. **CharacterSelectionModal**: For choosing a character
2. **ChoiceChangeModal**: For changing an approved choice

These modals will be implemented in future tasks (3.2.1 and 3.2.3).

## Related Components

- **CharacterChoiceStatus**: Alternative component with different props structure
- **ProgressTimeline**: Shows production stage progress
- **EstimatedDatesCard**: Shows estimated dates
- **CustomerOrderProgressPage**: Parent page component

## Notes

- The component is designed to work with data already fetched by the parent page
- It does not fetch data itself, making it lightweight and reusable
- All text is in Portuguese (pt-BR) as per project requirements
- Uses ISO 8601 date strings for deadline prop
