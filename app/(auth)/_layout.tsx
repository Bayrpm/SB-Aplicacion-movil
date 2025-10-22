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
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{
          animation: 'fade',
          animationDuration: 200,
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
