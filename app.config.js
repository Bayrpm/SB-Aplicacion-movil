// app.config.js

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
