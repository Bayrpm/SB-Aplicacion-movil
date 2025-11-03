// app.config.js
import fs from 'fs';

export default ({ config }) => {
  // --- TU CONFIG EXISTENTE (Google Maps) ---
  const androidConfig = {
    ...(config.android?.config ?? {}),
    googleMaps: {
      apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
    },
  };

  const iosConfig = {
    ...(config.ios?.config ?? {}),
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  };

  // --- FCM: google-services.json ---
  // Opción A: archivo commiteado en la raíz del proyecto
  if (fs.existsSync('./google-services.json')) {
    config.android = { ...(config.android ?? {}), googleServicesFile: './google-services.json' };
  }



  return {
    ...config,
    android: {
      ...(config.android ?? {}),
      config: androidConfig, // <- mantiene tu Google Maps
      // ojo: aquí también viven package, permissions, etc.
    },
    ios: {
      ...(config.ios ?? {}),
      config: iosConfig, // <- mantiene tu Google Maps iOS
    },
  };
};
