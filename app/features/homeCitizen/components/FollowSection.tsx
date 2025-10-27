import { useColorScheme } from '@/hooks/use-color-scheme';
import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import HomeCard from './HomeCard';

export default function FollowSection() {
  const scheme = useColorScheme() ?? 'light';

  const onPress = (which: string) => {
    // placeholder: abrir url con Linking.openURL(...) en un futuro
    console.log('follow', which);
  };

  return (
    <View style={styles.wrap}>
      <HomeCard title="Síguenos" description="Mantente informado y participa en nuestras redes" hideIcon hideAction titleAlign="center">
        <View style={styles.buttonsRow}>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#E4405F' }]} onPress={() => onPress('instagram')}>
            <FontAwesome name="instagram" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#1877F2' }]} onPress={() => onPress('facebook')}>
            <FontAwesome name="facebook" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#FF0000' }]} onPress={() => onPress('youtube')}>
            <FontAwesome name="youtube" size={20} color="#fff" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { backgroundColor: '#000' }]} onPress={() => onPress('x')}>
            <FontAwesome name="twitter" size={20} color="#fff" />
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
