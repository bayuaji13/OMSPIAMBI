import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { setBoolean, getBoolean, KEYS } from '@/lib/storage';
import { Link, useRouter } from 'expo-router';
import { SafeArea } from '@/components/safe-area';

export default function Onboarding() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const seen = await getBoolean(KEYS.hasOnboarded, false);
      if (seen) router.replace('/(tabs)');
      else setReady(true);
    })();
  }, []);

  if (!ready) return null;

  const finish = async () => {
    await setBoolean(KEYS.hasOnboarded, true);
    router.replace('/(tabs)');
  };

  return (
    <SafeArea>
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome to OMSPIAMBI</ThemedText>
      <ThemedText>Quick MVP to jot ideas and mark them.</ThemedText>
      <ThemedText type="link" onPress={finish}>Continue</ThemedText>
      <Link href="/auth/register"><ThemedText type="link">Create account</ThemedText></Link>
      <Link href="/auth/login"><ThemedText type="link">I have an account</ThemedText></Link>
    </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, flex: 1, justifyContent: 'center' },
});
