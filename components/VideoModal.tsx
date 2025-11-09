import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VideoModalProps {
  visible: boolean;
  videoUrl: string | null;
  onClose: () => void;
  videoModule: any;
  videoImportError?: string | null;
  accentColor?: string;
  textColor?: string;
  mutedColor?: string;
}

export default function VideoModal({ visible, videoUrl, onClose, videoModule, videoImportError, accentColor = '#0A4A90', textColor = '#fff', mutedColor = '#9CA3AF' }: VideoModalProps) {
  const [videoLoading, setVideoLoading] = useState<boolean>(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);

  if (!visible || !videoUrl) return null;

  // minimal source object helper (avoid passing contentType which can break native casting)
  const isMp4 = typeof videoUrl === 'string' && /\.mp4(\?|$)/i.test(videoUrl);
  const sourceObj: any = isMp4 ? { uri: videoUrl, overrideFileExtensionAndroid: 'mp4', useCaching: true } : { uri: videoUrl };

  const renderPlayer = () => {
    try {
      // prefer hook + VideoView (expo-video)
      if (videoModule?.useVideoPlayer && videoModule?.VideoView) {
        try {
          const player = videoModule.useVideoPlayer ? videoModule.useVideoPlayer(sourceObj) : null;
          // @ts-ignore dynamic component
          return (
            // @ts-ignore
            <videoModule.VideoView
              player={player}
              video={player}
              style={styles.videoPlayer}
              useNativeControls={true}
              onError={(e: any) => { setVideoLoading(false); setVideoPlaybackError(e?.message ?? String(e)); }}
              onFirstFrameRender={() => setVideoLoading(false)}
              onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
            />
          );
        } catch (e) {
          // fallthrough
        }
      }

      // expo-av style Video export
      if (videoModule?.Video) {
        try {
          // @ts-ignore
          return (
            // @ts-ignore
            <videoModule.Video
              source={sourceObj}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode={videoModule?.ResizeMode?.CONTAIN}
              shouldPlay={true}
              onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
              onLoad={() => setVideoLoading(false)}
              onReadyForDisplay={() => setVideoLoading(false)}
              onError={(e: any) => { setVideoLoading(false); setVideoPlaybackError(e?.message ?? String(e)); }}
            />
          );
        } catch (e) {
          // fallthrough
        }
      }

      // VideoView without hook
      if (videoModule?.VideoView) {
        try {
          // @ts-ignore
          return (
            // @ts-ignore
            <videoModule.VideoView
              source={sourceObj}
              style={styles.videoPlayer}
              useNativeControls={true}
              onError={(e: any) => { setVideoLoading(false); setVideoPlaybackError(e?.message ?? String(e)); }}
              onFirstFrameRender={() => setVideoLoading(false)}
              onLoadStart={() => { setVideoLoading(true); setVideoPlaybackError(null); }}
            />
          );
        } catch (e) {
          // fallthrough
        }
      }

      // createVideoPlayer factory
      if (videoModule?.createVideoPlayer) {
        try {
          const Player = videoModule.createVideoPlayer({ source: sourceObj, style: styles.videoPlayer });
          return <Player />;
        } catch (e) {
          // fallthrough
        }
      }

      return null;
    } catch (e) {
      return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.galleryClose} onPress={onClose}>
          <IconSymbol name="close" size={32} color={textColor} />
        </TouchableOpacity>

        {renderPlayer() ? (
          <>
            {renderPlayer()}
            {videoLoading ? (
              <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={accentColor} /></View>
            ) : null}
            {videoPlaybackError ? (
              <View style={styles.errorBox}><Text style={{ color: '#FFBABA' }}>{videoPlaybackError}</Text></View>
            ) : null}
          </>
        ) : (
          <View style={styles.fallbackBox}>
            <Text style={{ color: textColor, marginBottom: 12 }}>El reproductor nativo no está disponible en esta build.</Text>
            <Text style={{ color: mutedColor, marginBottom: 8, textAlign: 'center' }}>Para reproducir videos dentro de la app necesitas una build que incluya el módulo nativo (Dev Client o EAS build).</Text>
            {videoImportError ? <Text style={{ color: '#FFBABA', backgroundColor: '#3B0A0A', padding: 8, borderRadius: 8, marginTop: 8 }}>{videoImportError}</Text> : null}
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity onPress={async () => {
                try {
                  if (!videoUrl) return;
                  // try open externally
                  const can = await (await import('react-native')).Linking.canOpenURL(videoUrl);
                  if (can) await (await import('react-native')).Linking.openURL(videoUrl);
                } catch (e) {
                  try { await (await import('react-native')).Share.share({ url: videoUrl || '', message: videoUrl || '' }); } catch {}
                }
              }} style={[styles.openButton, { backgroundColor: accentColor }]}>
                <Text style={{ color: '#fff' }}>Abrir en reproductor</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose} style={[styles.openButton, { backgroundColor: '#333' }]}>
                <Text style={{ color: '#fff' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  videoPlayer: {
    width: '100%',
    height: '60%',
    backgroundColor: '#000',
    borderRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center'
  },
  errorBox: { padding: 12, alignItems: 'center' },
  fallbackBox: { padding: 20, alignItems: 'center' },
  openButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
});
