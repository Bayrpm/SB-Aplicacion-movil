declare module 'react-native-view-shot' {
  export function captureRef(ref: any, options?: { format?: 'png'|'jpg'|'webm', quality?: number, result?: 'data-uri'|'base64'|'tmpfile' }): Promise<string>;
}
