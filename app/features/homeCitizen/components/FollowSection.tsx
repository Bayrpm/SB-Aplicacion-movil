import { Alert as AppAlert } from '@/components/ui/AlertBox';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import HomeCard from './HomeCard';

export default function FollowSection() {
  const scheme = useColorScheme() ?? 'light';

  const onPress = (which: string) => {
    // abrir url correspondiente
    try {
      let url = '';
      switch (which) {
        case 'instagram':
          url = 'https://www.instagram.com/sanbernardocl/';
          break;
        case 'facebook':
          url = 'https://www.facebook.com/sanbernardocl/?_rdc=1&_rdr#';
          break;
        case 'youtube':
          url = 'https://www.youtube.com/@sanbernardo.onlinetv';
          break;
        case 'x':
          url = 'https://x.com/SanBernardocl';
          break;
        default:
          url = '';
      }
      if (url) {
        Linking.openURL(url).catch(() => {
          AppAlert.alert('Error', 'No se pudo abrir el enlace');
        });
      }
    } catch (e) {
      console.warn('follow error', e);
    }
  };

  return (
    <View style={styles.wrap}>
      <HomeCard title="Síguenos" description="Mantente informado y participa en nuestras redes" hideIcon hideAction titleAlign="center">
        <View style={styles.buttonsRow}>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#E4405F' }]} onPress={() => onPress('instagram')}>
            <IconSymbol name="instagram" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#1877F2' }]} onPress={() => onPress('facebook')}>
            <IconSymbol name="facebook" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#FF0000' }]} onPress={() => onPress('youtube')}>
            <IconSymbol name="youtube" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#000' }]} onPress={() => onPress('x')}>
            {/* X (antes Twitter) */}
            <IconSymbol name="x-twitter" size={20} color="#fff" />
          </Pressable>
        </View>
      </HomeCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', marginTop: 18 },
  buttonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 12 },
  iconBtn: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
});
