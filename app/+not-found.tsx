//+not-found.tsx
import { Stack } from 'expo-router';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Link } from 'expo-router';

export default function NotFoundScreen() {
  const colorScheme = useColorScheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles(colorScheme).container}>
        <Text style={styles(colorScheme).title}>This screen does not exist.</Text>
        <Link href="/" asChild>
          <Pressable style={styles(colorScheme).link}>
            <Text style={styles(colorScheme).linkText}>Go to home screen!</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = (colorScheme: 'light' | 'dark') => StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#FFFFFF', },
  title: { fontSize: 20, fontWeight: 'bold', color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', },
  link: { marginTop: 15, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#E0E7FF', borderRadius: 30, borderWidth: 2, borderColor: colorScheme === 'dark' ? '#666666' : '#2F4F68', },
  linkText: { color: colorScheme === 'dark' ? '#FFFFFF' : '#0A2940', fontSize: 16, fontWeight: '600', },
});