/**
 * Profile Citizen Feature
 * 
 * This feature handles citizen profile management, including:
 * - Profile data retrieval and updates
 * - Avatar upload and deletion
 * - Citizen reports list
 * 
 * Note: Comments and reactions functionalities are in @/app/features/report/api/report.api.ts
 */

// API
export * from './api/profile.api';

// Components
export { default as EditProfileModal } from './components/editProfileModal';
export { default as ProfileHeader } from './components/profileHeader';
export { default as ReportDetailModal } from './components/reportDetailModal';
export { default as ReportsList } from './components/reportsList';
export { default as ProfileSettingsModal, default as SettingsModal } from './components/settingsModal';

// Types (if any)
export * from './api/profile.api';

