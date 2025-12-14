/**
 * Report Feature
 * 
 * This feature handles all report-related functionality, including:
 * - Creating and fetching reports
 * - Report comments and reactions
 * - Evidence management (images/videos)
 * - Report filtering and categorization
 */

// API
export * from './api/report.api';

// Components
export { default as CurrentLocationMap } from './components/currentLocationMap';
export { default as EditLocation } from './components/editLocation';
export { default as ReportDetailModal } from './components/reportDetailModal';
export { default as ReportForm } from './components/reportForm';
export { default as ReportPickerModal } from './components/reportPickerModal';

// Contexts
export { ReportModalProvider, useReportModal } from './contexts';

// Hooks
export { useReportCategories } from './hooks/useReportCategories';

// Types
export type { ReportCategory } from './types';

// Lib utilities
export * from './lib/coordinatesUtils';
export * from './lib/googleGeocoding';
export * from './lib/mapStyles';


