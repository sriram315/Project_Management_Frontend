# Global Toast System Usage Guide

## Overview
A reusable toast notification system for displaying success, error, warning, and info messages across the application.

## Components
- `Toast.tsx` - The toast component that displays notifications
- `useToast.ts` - Custom React hook for managing toast state

## Installation
Toast components are already set up in the project. Simply import and use them in any component.

## Usage

### 1. Import the hook
```typescript
import Toast from './Toast';
import { useToast } from '../hooks/useToast';
```

### 2. Initialize the hook in your component
```typescript
const YourComponent: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  
  // Your component logic...
};
```

### 3. Show toast messages
```typescript
// Success message
showToast('User created successfully!', 'success');

// Error message
showToast('Failed to delete user', 'error');

// Warning message
showToast('Please save your changes', 'warning');

// Info message
showToast('Loading data...', 'info');
```

### 4. Render the Toast component
Add this at the end of your component's JSX, before the closing tag:

```typescript
return (
  <div>
    {/* Your component content */}
    
    {toast.isVisible && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />
    )}
  </div>
);
```

## Complete Example

```typescript
import React, { useState } from 'react';
import axios from 'axios';
import Toast from './Toast';
import { useToast } from '../hooks/useToast';

const MyComponent: React.FC = () => {
  const { toast, showToast, hideToast } = useToast();
  const [data, setData] = useState([]);

  const handleSave = async () => {
    try {
      await axios.post('/api/data', { /* data */ });
      showToast('Data saved successfully!', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save data';
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div>
      <button onClick={handleSave}>Save</button>
      
      {/* Toast component */}
      {toast.isVisible && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};
```

## Toast Types
- `success` - Green toast with checkmark icon
- `error` - Red toast with X icon  
- `warning` - Orange/amber toast with alert icon
- `info` - Blue toast with info icon

## Customization
You can customize the toast duration by passing a `duration` prop (in milliseconds):

```typescript
<Toast
  message={toast.message}
  type={toast.type}
  onClose={hideToast}
  duration={5000}  // 5 seconds instead of default 3 seconds
/>
```

## Features
- ✅ Auto-dismiss after 3 seconds (configurable)
- ✅ Manual dismiss with close button
- ✅ Smooth slide-in animation
- ✅ Icons for each toast type
- ✅ Fixed position in top-right corner
- ✅ Fully typed with TypeScript
- ✅ Responsive design

## Implementation Status
Currently implemented in:
- ✅ Users.tsx (Add, Edit, Delete operations)

To be added in future:
- Projects.tsx
- Tasks.tsx  
- TeamManagement.tsx
- Other components as needed

