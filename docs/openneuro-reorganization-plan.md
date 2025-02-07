# OpenNeuro Dataset Page Reorganization Plan

## Overview
Reorganize the OpenNeuro dataset page to match the NWB page layout structure, providing a more consistent user experience and better maintainability.

## Current Structure
The current OpenNeuro dataset page:
- Single scrollable view containing all content
- Basic file listing
- Dataset information displayed inline
- SessionsBrowser component for file navigation

## Target Structure
New structure following NWB page layout:
- Split view with left panel and main workspace
- Left panel showing dataset overview
- Main workspace with tabbed interface
- Plugin system for file viewing

## Implementation Plan

### 1. Base Components

#### OpenNeuroDatasetOverview (Left Panel)
- Dataset metadata
  * Name, ID, Version
  * Authors
  * DOI
  * Description
  * Statistics (views, downloads)
  * Links
- Moved from current inline display

#### OpenNeuroMainTab
- Browseable list of subjects/sessions/files
- Enhanced version of current SessionsBrowser
- File browsing hierarchy
- Click-to-open functionality

#### OpenNeuroFileView
- Generic file viewer component
- Handles different file types
- Plugin-based rendering

### 2. Plugin System

#### Base Plugin Interface
```typescript
interface OpenNeuroPluginInterface {
  name: string;
  type: string[];
  component: React.ComponentType<OpenNeuroPluginProps>;
  priority?: number;
}
```

#### Plugin Registry
- Central registry for OpenNeuro plugins
- Plugin discovery and loading
- Plugin priority handling

#### Initial Plugins
1. NWB File Plugin
   - Reuse existing NWB viewer functionality
   - Handle .nwb files
2. Generic File Plugin
   - Basic file information
   - Download options
   - Preview when possible

### 3. Implementation Steps

1. Create New Components
   - Set up ResponsiveLayout structure
   - Implement OpenNeuroDatasetOverview
   - Create MainWorkspace with tabs
   - Develop OpenNeuroMainTab

2. Plugin System Setup
   - Define plugin interfaces
   - Create plugin registry
   - Implement basic plugins
   - Set up plugin loading

3. File Opening System
   - Implement file click handlers
   - Add tab management
   - Create file preview system

4. UI Integration
   - Add navigation between views
   - Implement responsive design
   - Add loading states
   - Error handling

### 4. Code Organization

```
src/pages/OpenNeuroDatasetPage/
├── components/
│   ├── OpenNeuroDatasetOverview.tsx
│   ├── OpenNeuroMainTab.tsx
│   └── OpenNeuroFileView.tsx
├── plugins/
│   ├── pluginInterface.ts
│   ├── registry.ts
│   ├── NwbFilePlugin/
│   └── GenericFilePlugin/
└── OpenNeuroDatasetPage.tsx
```

### 5. Shared Code Considerations

1. Tab Management
   - Reuse tab reducer and state management from NWB page
   - Share tab styling and components

2. Layout Components
   - Utilize existing ResponsiveLayout
   - Share common scroll and layout utilities

3. Plugin System
   - Share base plugin interface structure
   - Extend for OpenNeuro-specific needs

## Benefits

1. Consistency
   - Unified user experience across NWB and OpenNeuro pages
   - Consistent navigation patterns
   - Familiar layout for users

2. Maintainability
   - Shared code reduces duplication
   - Plugin system enables easy extensions
   - Organized component structure

3. Functionality
   - Enhanced file browsing
   - Better file preview capabilities
   - More flexible layout

## Next Steps

1. Review and refine this plan
2. Create initial component structure
3. Implement core functionality
4. Develop plugin system
5. Test and iterate