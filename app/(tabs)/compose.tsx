import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useItems } from '@/hooks/useItems';
import { Post } from '@/constants/schema';
import { Link, useRouter } from 'expo-router';
import { SafeArea } from '@/components/safe-area';

function uid() {
  // Simple uid for local use (timestamp-rand)
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ComposeScreen() {
  const { repo } = useItems();
  const [value, setValue] = useState('');
  const router = useRouter();

  const onSubmit = async () => {
    const content = value.trim();
    if (!content) return;
    const p: Post = { id: uid(), content, createdAt: Date.now() };
    await repo.upsertPost(p);
    setValue('');
    Alert.alert('Posted', 'Your idea was added.');
    router.push('/(tabs)');
  };

  return (
    <SafeArea>
      <ThemedView style={styles.container}>
      <ThemedText type="title">New Idea</ThemedText>
      <TextInput
        style={styles.input}
        placeholder="Share your idea (max 280 chars)"
        value={value}
        onChangeText={(t) => t.slice(0, 280) && setValue(t.slice(0, 280))}
        multiline
      />
      <View style={styles.row}>
        <Link href="/(tabs)">
          <ThemedText type="link">Cancel</ThemedText>
        </Link>
        <ThemedText type="link" onPress={onSubmit}>
          Post
        </ThemedText>
      </View>
      </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#999',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
});
