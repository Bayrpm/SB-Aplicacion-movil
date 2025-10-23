import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 250,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
  // Make the stack content background transparent so each screen's own
  // background paints without a white flash during transitions.
  contentStyle: { backgroundColor: 'transparent' },
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
