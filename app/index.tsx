import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { currentSession } from '@/lib/auth';

export default function EntryGate() {
  const router = useRouter();
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await currentSession();
      router.replace(session ? '/(tabs)' : '/auth/login');
      setDone(true);
    })();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
