//userprofile\_layout.tsx
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import LoadingPuck from "@/components/loadingPuck";
import { StyleSheet, View } from 'react-native';

export default function UserprofileLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: '',
        loading: () => (
          <View style={styles.loadingContainer(colorScheme)}>
            <LoadingPuck size={240} />
          </View>
        ),
      }}
    />
  );
}

const styles = {
  loadingContainer: (colorScheme: string) => ({ flex: 1, backgroundColor: colorScheme === 'dark' ? '#0D2C42' : '#FFFFFF', justifyContent: 'center', alignItems: 'center', }),
};