# Confirmation Modal - Usage Guide

## Overview
A reusable, beautiful confirmation modal component for confirming destructive or important actions throughout the application.

## Component Location
- **Component**: `src/components/ConfirmationModal.tsx`

## Features
- ✅ Clean, modern design with gradient header
- ✅ Three variants: danger (red), warning (orange), info (blue)
- ✅ Lucide React icon (AlertTriangle)
- ✅ Smooth scale-in animation
- ✅ Customizable text for title, message, and buttons
- ✅ Modal overlay prevents clicking outside
- ✅ Fully typed with TypeScript

## Usage

### 1. Import the component
```typescript
import ConfirmationModal from './ConfirmationModal';
```

### 2. Add state management
```typescript
const [confirmDialog, setConfirmDialog] = useState({
  isOpen: false,
  // Add any other data you need
});
```

### 3. Create handler functions
```typescript
const handleOpenDialog = () => {
  setConfirmDialog({ isOpen: true });
};

const handleConfirm = async () => {
  // Perform the action
  await deleteItem();
  setConfirmDialog({ isOpen: false });
};

const handleCancel = () => {
  setConfirmDialog({ isOpen: false });
};
```

### 4. Render the modal
```typescript
<ConfirmationModal
  isOpen={confirmDialog.isOpen}
  title="Delete Item"
  message="Are you sure you want to delete this item? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  variant="danger"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | boolean | Yes | - | Controls visibility of the modal |
| `title` | string | Yes | - | Modal title text |
| `message` | string | Yes | - | Main message/question to display |
| `confirmText` | string | No | "Confirm" | Text for confirm button |
| `cancelText` | string | No | "Cancel" | Text for cancel button |
| `onConfirm` | function | Yes | - | Callback when confirm is clicked |
| `onCancel` | function | Yes | - | Callback when cancel is clicked |
| `variant` | 'danger' \| 'warning' \| 'info' | No | 'danger' | Color scheme variant |

## Variants

### Danger (Red) - Default
Use for destructive actions like delete, remove, etc.
```typescript
variant="danger"
```

### Warning (Orange)
Use for actions that need caution but aren't destructive
```typescript
variant="warning"
```

### Info (Blue)
Use for important confirmations that aren't dangerous
```typescript
variant="info"
```

## Complete Example

```typescript
import React, { useState } from 'react';
import ConfirmationModal from './ConfirmationModal';
import axios from 'axios';

const MyComponent: React.FC = () => {
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    itemId: null as number | null,
    itemName: '',
  });

  const handleDelete = (id: number, name: string) => {
    setDeleteDialog({
      isOpen: true,
      itemId: id,
      itemName: name,
    });
  };

  const confirmDelete = async () => {
    if (!deleteDialog.itemId) return;
    
    try {
      await axios.delete(`/api/items/${deleteDialog.itemId}`);
      // Show success message
    } catch (error) {
      // Handle error
    } finally {
      setDeleteDialog({ isOpen: false, itemId: null, itemName: '' });
    }
  };

  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, itemId: null, itemName: '' });
  };

  return (
    <div>
      <button onClick={() => handleDelete(1, 'Test Item')}>
        Delete Item
      </button>

      <ConfirmationModal
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.itemName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        variant="danger"
      />
    </div>
  );
};
```

## Best Practices

1. **Use descriptive messages**: Include the item name or specific details in the message
2. **Choose appropriate variant**: Use `danger` for destructive actions
3. **Clear button text**: Use action-specific text (e.g., "Delete" instead of "OK")
4. **Reset state**: Always reset dialog state after confirm/cancel
5. **Error handling**: Handle errors in the confirm callback
6. **Loading state**: Consider adding loading state during async operations

## Integration Examples

### Users Component ✅
Already integrated for delete confirmation:
```typescript
<ConfirmationModal
  isOpen={deleteConfirmation.isOpen}
  title="Delete User"
  message={`Are you sure you want to delete "${deleteConfirmation.username}"? This action cannot be undone and will remove all associated data.`}
  confirmText="Delete"
  cancelText="Cancel"
  onConfirm={confirmDelete}
  onCancel={cancelDelete}
  variant="danger"
/>
```

### Ready to Use In:
- Projects (delete project)
- Tasks (delete task)
- Teams (remove team member)
- Any component requiring confirmation

## Styling
The modal uses inline styles for maximum portability and doesn't require external CSS. It includes:
- Gradient header matching the variant
- Smooth hover effects on buttons
- Scale-in animation on mount
- High z-index (10000) to appear above other elements
- Modal overlay prevents interaction with background

## Accessibility
- Modal appears on top of overlay
- Clear visual hierarchy
- Readable color contrast
- Distinct buttons (outline vs solid)
- Icon provides visual context

---

Created: October 29, 2025
Component Version: 1.0.0

