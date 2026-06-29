import { Stack } from 'expo-router';

export default function PagodaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="pagoda" />
      <Stack.Screen name="pagoda-detail" />
    </Stack>
  );
}
