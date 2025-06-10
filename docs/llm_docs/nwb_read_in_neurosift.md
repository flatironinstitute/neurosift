# NWB Data Reading in Neurosift

This document explains how Neurosift reads and processes NWB (Neurodata Without Borders) files, including the architecture, optimizations, and technical details relevant for contributors.

## Overview

Neurosift uses a multi-layered approach to read NWB files efficiently in the browser. The system supports both traditional HDF5 files and optimized LINDI (Linked Data Interface) files, with intelligent format detection and performance optimizations.

## Architecture Components

### 1. Entry Point (`src/pages/NwbPage/NwbPage.tsx`)
- Handles URL processing and format detection
- Manages DANDI API integration for asset resolution
- Coordinates LINDI optimization attempts

### 2. HDF5 Interface Layer (`src/pages/NwbPage/hdf5Interface.ts`)
- Central abstraction for all file operations
- Implements caching and request deduplication
- Manages authentication and error handling
- Provides React hooks for component integration

### 3. Remote File Access (`src/remote-h5-file/`)
- Core file reading implementation
- Supports multiple file formats (HDF5, LINDI)
- Handles HTTP range requests and chunking
- Web Worker integration for non-blocking operations

## Data Flow

```
URL Input → Format Detection → LINDI Check → File Access → Caching → Visualization
     ↓              ↓              ↓              ↓         ↓            ↓
NwbPage.tsx → hdf5Interface → tryGetLindiUrl → RemoteH5File* → Cache → Plugins
```

### Step-by-Step Process

1. **URL Resolution**: Convert DANDI paths to direct download URLs
2. **LINDI Detection**: Check for optimized `.lindi.json` or `.lindi.tar` files
3. **File Access**: Use appropriate reader (HDF5 or LINDI)
4. **Data Loading**: Lazy load only required data with chunking
5. **Caching**: Store results to avoid redundant requests
6. **Visualization**: Pass data to type-specific plugins

## File Format Support

### Traditional HDF5 Files
- **Access Method**: HTTP range requests via Web Workers
- **Worker URL**: `https://tempory.net/js/RemoteH5Worker.js`
- **Chunk Size**: 100KB default (configurable)
- **Limitations**: Slower metadata access, requires full header parsing

### LINDI Files (Optimized)
- **Format**: JSON-based reference file system
- **Metadata**: Instant access to all HDF5 structure
- **Data Storage**: References to external URLs or embedded chunks
- **Location**: `https://lindi.neurosift.org/[dandi|dandi-staging]/dandisets/{id}/assets/{asset_id}/nwb.lindi.json`
- **Tar Support**: `.lindi.tar` files containing both metadata and data

## Performance Optimizations

### 1. LINDI Priority System
```typescript
if (isDandiAssetUrl(url) && currentDandisetId && tryUsingLindi) {
  const lindiUrl = await tryGetLindiUrl(url, currentDandisetId);
  if (lindiUrl) return { url: lindiUrl }; // 10-100x faster metadata access
}
```

### 2. Lazy Loading Strategy
- **Groups**: Load structure on-demand
- **Datasets**: Load metadata separately from data
- **Data**: Only load when visualization requires it

### 3. HTTP Range Requests
- Load only required byte ranges from large files
- Configurable chunk sizes for optimal network usage
- Automatic retry logic for failed requests

### 4. Multi-Level Caching
- **In-Memory**: Groups, datasets, and data results
- **Request Deduplication**: Prevent duplicate network calls
- **Status Tracking**: Monitor ongoing operations

### 5. Web Workers
- Non-blocking file operations
- Prevents UI freezing during large data loads
- Single worker by default (configurable)

## Technical Limits and Constraints

### Data Size Limits
```typescript
const maxNumElements = 1e7; // 10 million elements maximum
if (totalSize > maxNumElements) {
  throw new Error(`Dataset too large: ${formatSize(totalSize)} > ${formatSize(maxNumElements)}`);
}
```

### Slicing Constraints
- Maximum 3 dimensions can be sliced simultaneously
- Slice parameters must be valid integers
- Format: `[[start, end], [start, end], ...]`

### Authentication Requirements
- DANDI API key required for embargoed datasets
- Automatic detection of authentication errors
- User notification system for access issues

## Key Implementation Details

### Core Functions

#### `getHdf5Group(url, path)`
- Returns HDF5 group structure with subgroups and datasets
- Implements caching to avoid redundant requests
- Used for building file hierarchy views

#### `getHdf5Dataset(url, path)`
- Returns dataset metadata (shape, dtype, attributes)
- Does not load actual data
- Essential for understanding data structure before loading

#### `getHdf5DatasetData(url, path, options)`
- Loads actual array data with optional slicing
- Supports cancellation via `Canceler` objects
- Handles BigInt conversion for compatibility

### React Integration
```typescript
// Hook-based API for components
const group = useHdf5Group(url, "/acquisition");
const dataset = useHdf5Dataset(url, "/data/timeseries");
const { data, errorMessage } = useHdf5DatasetData(url, "/data/values");
```

### Error Handling
- Network timeout handling (3-minute default)
- Authentication error detection and user notification
- Graceful fallbacks for failed LINDI attempts
- CORS issue mitigation strategies

## DANDI Integration

### Asset URL Resolution
```typescript
// Convert DANDI paths to download URLs
const response = await fetch(
  `https://api.dandiarchive.org/api/dandisets/${dandisetId}/versions/${version}/assets/?glob=${path}`
);
const assetId = data.results[0].asset_id;
const downloadUrl = `https://api.dandiarchive.org/api/assets/${assetId}/download/`;
```

### LINDI URL Construction
```typescript
const aa = staging ? "dandi-staging" : "dandi";
const lindiUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dandisetId}/assets/${assetId}/nwb.lindi.json`;
```

## Contributing Guidelines

### Adding New File Formats
1. Implement `RemoteH5FileX` interface in `src/remote-h5-file/lib/`
2. Add format detection logic in `hdf5Interface.ts`
3. Update `getMergedRemoteH5File` for multi-file support

### Performance Considerations
- Always prefer LINDI files when available
- Implement proper caching for new data types
- Use Web Workers for CPU-intensive operations
- Consider memory usage for large datasets

### Testing Large Files
- Test with files >1GB to verify chunking works
- Verify LINDI fallback mechanisms
- Test authentication flows with embargoed data
- Check error handling for network failures

### Plugin Development
- Use provided hooks (`useHdf5Group`, `useHdf5Dataset`, etc.)
- Implement proper loading states and error handling
- Consider data slicing for large arrays
- Follow lazy loading patterns

## Debugging and Monitoring

### Status Bar Integration
The system provides real-time statistics in the status bar:
- `numGroups / numDatasets / numDatasetDatas`: Operation counters
- Loading indicators for active operations
- Error notifications for failed requests

### Console Logging
- LINDI detection attempts and results
- Authentication error details
- Performance metrics and timing
- Cache hit/miss information

### Common Issues
1. **CORS Errors**: Usually resolved by LINDI files or proper headers
2. **Authentication Failures**: Check DANDI API key configuration
3. **Large Dataset Errors**: Implement proper slicing
4. **Worker Loading Failures**: Verify CDN accessibility

## Future Improvements

### Potential Optimizations
- Implement progressive loading for very large datasets
- Add compression support for data transfers
- Enhance caching with persistence across sessions
- Improve error recovery mechanisms

### Format Extensions
- Support for additional HDF5-compatible formats
- Enhanced LINDI features (compression, encryption)
- Integration with cloud storage providers
- Real-time streaming capabilities

This architecture enables Neurosift to efficiently handle NWB files ranging from megabytes to gigabytes while providing responsive user interactions and comprehensive error handling.
