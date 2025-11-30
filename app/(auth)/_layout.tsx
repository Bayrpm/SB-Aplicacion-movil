import { useAppColorScheme } from '@/hooks/useAppColorScheme';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  const [appScheme] = useAppColorScheme();
  const scheme = appScheme ?? 'light';
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        contentStyle: { backgroundColor: scheme === 'dark' ? '#000' : '#fff' },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          // Use slide animation to keep transitions consistent and avoid a
          // brief fade that can show an undesired white background.
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />
      <Stack.Screen 
        name="signIn" 
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />
      <Stack.Screen 
        name="signUp" 
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />
    </Stack>
  );
}
