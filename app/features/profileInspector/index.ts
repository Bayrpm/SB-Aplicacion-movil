/**
 * Profile Inspector Feature
 * 
 * This feature handles inspector profile management, including:
 * - Inspector profile data and shifts
 * - Mobile unit management
 */

// API
export * from './api/dataMovil.api';
export * from './api/inspectorProfile.api';
export * from './api/turnInspector.api';

// Components (export components as needed)

// Contexts
export { useMovil } from './context/movilContext';

// Types
export type { InspectorPersonInfo, InspectorProfile, InspectorTurnType } from './api/inspectorProfile.api';


