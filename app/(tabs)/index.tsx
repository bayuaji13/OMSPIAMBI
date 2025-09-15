import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useItems } from '@/hooks/useItems';
import { Link } from 'expo-router';
import { Colors, Radius } from '@/constants/theme';
import { SafeArea } from '@/components/safe-area';

export default function HomeScreen() {
  const { items, counts, repo, ready, marks } = useItems();

  if (!ready) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading…</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeArea>
      <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title">Feed</ThemedText>
        <Link href="/(tabs)/compose">
          <ThemedText type="link">Compose</ThemedText>
        </Link>
      </View>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderItem={({ item }) => {
          const c = counts[item.id] || { shitpost: 0, spark: 0, gonna_implement: 0 };
          const isMarked = (type: 'shitpost'|'spark'|'gonna_implement') =>
            marks.some((m) => m.postId === item.id && m.type === type);
          const Chip = ({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) => (
            <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
              <ThemedText style={[active && { color: Colors.surfaceContrast }]}>{label}</ThemedText>
            </Pressable>
          );
          return (
            <ThemedView style={styles.card}>
              <Link href={{ pathname: '/item/[id]', params: { id: item.id } }}>
                <ThemedText type="subtitle">{item.content}</ThemedText>
              </Link>
              <View style={styles.row}>
                <Chip label={`shitpost ${c.shitpost}`} onPress={() => repo.toggleMark(item.id, 'shitpost')} active={isMarked('shitpost')} />
                <Chip label={`spark ${c.spark}`} onPress={() => repo.toggleMark(item.id, 'spark')} active={isMarked('spark')} />
                <Chip label={`gonna_implement ${c.gonna_implement}`} onPress={() => repo.toggleMark(item.id, 'gonna_implement')} active={isMarked('gonna_implement')} />
              </View>
            </ThemedView>
          );
        }}
        ListEmptyComponent={<ThemedText>No posts yet. Tap Compose to add one.</ThemedText>}
        contentContainerStyle={{ paddingVertical: 12 }}
      />
      </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 8, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 10 },
  chipActive: { backgroundColor: Colors.accent },
});
