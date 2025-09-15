import { useLocalSearchParams, Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useState } from 'react';
import { useItems } from '@/hooks/useItems';
import { SafeArea } from '@/components/safe-area';

export default function ItemDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repo, counts, marks } = useItems();
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    (async () => {
      if (!id) return;
      const p = await repo.getPost(id);
      setContent(p?.content ?? 'Not found');
    })();
  }, [id]);

  const c = id ? counts[id] : undefined;

  return (
    <SafeArea>
      <ThemedView style={styles.container}>
      <ThemedText type="title">Details</ThemedText>
      <ThemedText>{content}</ThemedText>
      <View style={{ height: 12 }} />
      <ThemedText>
        shitpost: {c?.shitpost ?? 0} • spark: {c?.spark ?? 0} • gonna_implement: {c?.gonna_implement ?? 0}
      </ThemedText>
      <View style={{ height: 16 }} />
      <Link href="/(tabs)">
        <ThemedText type="link">Back</ThemedText>
      </Link>
      </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8 },
});
