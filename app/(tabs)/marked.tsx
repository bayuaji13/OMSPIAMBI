import { useCallback, useEffect, useState } from 'react';
import { SectionList, StyleSheet, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { SafeArea } from '@/components/safe-area';
import { Colors, Radius } from '@/constants/theme';
import { exec } from '@/lib/turso';
import { getCurrentUserId } from '@/lib/auth';
import { useFocusEffect } from '@react-navigation/native';
import { useItems } from '@/hooks/useItems';

type Row = { id: string; content: string; author: string; created_at: string; mark_type: 'shitpost'|'spark'|'gonna_implement'|'ignored' };

const GROUPS: Array<{ key: Row['mark_type']; title: string }> = [
  { key: 'shitpost', title: 'Shitposts' },
  { key: 'spark', title: 'Sparks' },
  { key: 'gonna_implement', title: 'Gonna Implement' },
];

export default function MarkedScreen() {
  const [sections, setSections] = useState<Array<{ title: string; data: Row[] }>>([]);
  const [loading, setLoading] = useState(false);
  const { repo } = useItems();

  const load = useCallback(async () => {
    setLoading(true);
    const uid = await getCurrentUserId();
    if (!uid) {
      setSections([]);
      setLoading(false);
      return;
    }
    const res: any = await exec(
      `SELECT p.id, p.content, u.username AS author, p.created_at, pm.mark_type
       FROM post_marks pm
       JOIN posts p ON p.id = pm.post_id
       JOIN users u ON u.id = p.author_id
       WHERE pm.user_id = ?
       ORDER BY pm.created_at DESC
       LIMIT 200;`,
      [uid]
    );
    const rows: Row[] = (res?.rows ?? []).map((r: any) => ({ id: r.id, content: r.content, author: r.author, created_at: r.created_at, mark_type: r.mark_type }));
    const grouped = GROUPS.map((g) => ({ title: g.title, data: rows.filter((r) => r.mark_type === g.key) }));
    setSections(grouped);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeArea>
      <ThemedView style={styles.container}>
        <ThemedText type="title">Marked by Me</ThemedText>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          refreshing={loading}
          onRefresh={load}
          renderSectionHeader={({ section }) => (
            section.data.length ? (
              <ThemedText style={{ marginTop: 16, marginBottom: 8 }} type="subtitle">{section.title}</ThemedText>
            ) : null
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <ThemedView style={styles.card}>
              <ThemedText type="subtitle">{item.content}</ThemedText>
              <ThemedText>by {item.author}</ThemedText>
              <View style={styles.row}>
                <ThemedText style={styles.pill}>{item.mark_type}</ThemedText>
              </View>
            </ThemedView>
          )}
          ListEmptyComponent={<ThemedText>No marked posts yet.</ThemedText>}
          contentContainerStyle={{ paddingVertical: 12 }}
        />
      </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, gap: 8, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', gap: 8 },
  pill: { borderWidth: 1, borderColor: Colors.accent, borderRadius: Radius.pill, paddingVertical: 4, paddingHorizontal: 10 },
});



