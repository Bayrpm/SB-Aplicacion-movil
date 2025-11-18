// Context & Auth
// Default export to satisfy expo-router scanning (this is a barrel, not a page)
import React from 'react';

export { AuthProvider, useAuth } from './context';

// Screens
export { default as SignInScreen } from './screens/signInScreen';
export { default as SignUpScreen } from './screens/signUpScreen';
export { default as SplashScreen } from './screens/splashScreen';
export { default as WelcomeScreen } from './screens/welcomeScreen';

// Components
export { ProgressIndicator } from './components/progressIndicator';
export { RegistrationStep1 } from './components/registrationStep1';
export { RegistrationStep2 } from './components/registrationStep2';
export { RegistrationStep3 } from './components/registrationStep3';

// Hooks
export { useRegistration } from './hooks/useRegistration';

// API
export * from './api/auth.api';

// Types
export * from './types';

// Schemas
export * from './schemas/registration.schema';
const _AuthBarrelPlaceholder: React.FC = () => null;
export default _AuthBarrelPlaceholder;
