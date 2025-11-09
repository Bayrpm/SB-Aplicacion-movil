declare module 'expo-video-thumbnails' {
  export function createThumbnailAsync(source: string, options?: { time?: number }): Promise<{ uri: string }>;
  const _default: { createThumbnailAsync: typeof createThumbnailAsync };
  export default _default;
}
