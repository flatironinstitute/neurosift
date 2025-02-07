# Tabs System Reorganization

## Overview
Currently, the tabs system is implemented separately in NwbPage and OpenNeuroDatasetWorkspace with significant code duplication. This document outlines a plan to create a shared, generalized tabs system that can be used across the application.

## Current Implementation

### NwbPage Tabs
- Located in `src/pages/NwbPage/tabsReducer.ts`
- Supports multiple tab types (main, single, multi)
- Handles NWB-specific data and plugins
- More sophisticated implementation

### OpenNeuro Tabs
- Located in `src/pages/OpenNeuroDatasetPage/components/OpenNeuroDatasetWorkspace.tsx`
- Simpler implementation focused on file viewing
- Basic tab operations (open, close, switch)

## Proposed Solution

### 1. Create Shared Base Types
Create a new shared tabs reducer with base types that both implementations can extend:

```typescript
// src/components/tabs/tabsReducer.ts

export type BaseTab = {
    id: string;
    label: string;
    type: string;
};

export type BaseTabsState = {
    tabs: BaseTab[];
    activeTabId: string;
};

export type BaseTabAction =
    | { type: 'CLOSE_TAB'; id: string }
    | { type: 'SWITCH_TO_TAB'; id: string };
```

### 2. Extend Base Types for Specific Use Cases

NWB Extension:
```typescript
type NwbTab = BaseTab & {
    type: 'main' | 'single' | 'multi';
    path?: string;
    objectType?: 'group' | 'dataset';
    plugin?: NwbObjectViewPlugin;
    secondaryPaths?: string[];
    paths?: string[];
    objectTypes?: ('group' | 'dataset')[];
};
```

OpenNeuro Extension:
```typescript
type OpenNeuroTab = BaseTab & {
    type: 'main' | 'file';
    file?: OpenNeuroFile;
};
```

### 3. Create Generic Tab Components
Create reusable UI components for tab rendering and management:

- TabBar component
- TabPanel component
- TabContent component

### 4. Implementation Steps

1. Create shared base types and reducer in `src/components/tabs/`
2. Create reusable UI components
3. Migrate NwbPage to use new system
4. Migrate OpenNeuroDatasetWorkspace to use new system
5. Write tests for shared functionality

### 5. Benefits

- Reduced code duplication
- Consistent tab behavior across the application
- Easier maintenance
- Type safety through TypeScript
- Reusable components for future tab implementations

## Migration Plan

1. Create new files:
   - `src/components/tabs/tabsReducer.ts`
   - `src/components/tabs/TabBar.tsx`
   - `src/components/tabs/TabPanel.tsx`
   - `src/components/tabs/TabContent.tsx`

2. Implement shared functionality

3. Update existing implementations:
   - Modify NwbPage to use new system
   - Modify OpenNeuroDatasetWorkspace to use new system

4. Test thoroughly to ensure no regressions

## Next Steps

1. Switch to Code mode to implement the shared tab system
2. Create the base components and types
3. Migrate existing implementations one at a time
4. Add tests for the new shared system