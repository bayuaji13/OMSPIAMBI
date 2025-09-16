import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { Link } from 'expo-router';

import { SafeArea } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Radius } from '@/constants/theme';
import { useItems } from '@/hooks/useItems';
import { MarkType, Post } from '@/constants/schema';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = Math.min(SCREEN_HEIGHT * 0.6, 520);
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

type MarkChoice = Exclude<MarkType, 'ignored'>;
const MARK_CHOICES: Array<{ type: MarkChoice; label: string }> = [
  { type: 'shitpost', label: 'shitpost' },
  { type: 'spark', label: 'spark' },
  { type: 'gonna_implement', label: 'gonna implement' },
];

type Counts = Record<MarkType, number>;
type CardActionHandler = (action: MarkType, id: string) => void;

function SwipeableCard({ item, counts, onAction }: { item: Post; counts: Counts; onAction: CardActionHandler }) {
  const [dismissing, setDismissing] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    translateX.value = 0;
    translateY.value = 0;
    opacity.value = 1;
    scale.value = 1;
    setDismissing(false);
  }, [item.id, opacity, translateX, translateY, scale]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!dismissing)
      .onUpdate((event) => {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
        const squeeze = Math.min(Math.abs(event.translationX) / (CARD_WIDTH * 4), 0.06);
        scale.value = 1 - squeeze;
      })
      .onEnd((event) => {
        if (dismissing) return;
        const projectedX = event.translationX + event.velocityX * 0.2;
        if (Math.abs(projectedX) > SWIPE_THRESHOLD) {
          runOnJS(setDismissing)(true);
          const direction = projectedX > 0 ? 1 : -1;
          translateX.value = withTiming(direction * SCREEN_WIDTH, { duration: 220 });
          translateY.value = withTiming(event.translationY, { duration: 220 });
          scale.value = withTiming(0.92, { duration: 220 });
          opacity.value = withTiming(0, { duration: 220 }, (finished) => {
            if (finished) {
              runOnJS(onAction)('ignored', item.id);
            }
          });
        } else {
          translateX.value = withSpring(0, { damping: 18 });
          translateY.value = withSpring(0, { damping: 18 });
          scale.value = withSpring(1, { damping: 16 });
        }
      });
  }, [dismissing, item.id, onAction, translateX, translateY, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = `${translateX.value / 18}deg`;
    return {
      opacity: opacity.value,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate },
        { scale: scale.value },
      ],
    };
  });

  const triggerMark = useCallback(
    (type: MarkChoice) => {
      if (dismissing) return;
      setDismissing(true);
      translateX.value = withTiming(0, { duration: 140, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(-SCREEN_HEIGHT, { duration: 260, easing: Easing.out(Easing.quad) });
      scale.value = withTiming(0.88, { duration: 220, easing: Easing.out(Easing.quad) });
      opacity.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          runOnJS(onAction)(type, item.id);
        }
      });
    },
    [dismissing, item.id, onAction, opacity, translateX, translateY, scale]
  );

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View>
          <ThemedText type="subtitle">{item.content}</ThemedText>
          {item.author ? <ThemedText style={styles.meta}>by {item.author}</ThemedText> : null}
        </View>
        <View>
          <View style={styles.divider} />
          <View style={styles.counterRow}>
            {MARK_CHOICES.map((choice) => (
              <ThemedView key={choice.type} style={styles.counterChip}>
                <ThemedText>
                  {choice.label} {counts[choice.type] ?? 0}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
          <View style={styles.actionsRow}>
            {MARK_CHOICES.map((choice) => (
              <Pressable
                key={choice.type}
                style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
                onPress={() => triggerMark(choice.type)}
              >
                <ThemedText style={styles.actionLabel}>{choice.label.toUpperCase()}</ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function HomeScreen() {
  const { items, counts, repo, ready, loading, reload } = useItems();
  const [deck, setDeck] = useState<Post[]>([]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  useEffect(() => {
    setDeck(items);
  }, [items]);

  const handleAction = useCallback<CardActionHandler>(
    (action, id) => {
      setDeck((prev) => prev.filter((post) => post.id !== id));
      repo.toggleMark(id, action).catch((err) => {
        if (__DEV__) console.error('[feed] toggleMark failed', err);
      });
    },
    [repo]
  );

  if (!ready) {
    return (
      <ThemedView style={{ padding: 16 }}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const topCard = deck[0];
  const previews = deck.slice(1, 3);

  return (
    <SafeArea>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title">Feed</ThemedText>
          <Link href="/(tabs)/compose">
            <ThemedText type="link">Compose</ThemedText>
          </Link>
        </View>
        <View style={styles.deckArea}>
          {previews
            .map((item, index) => (
              <ThemedView
                key={item.id}
                style={[
                  styles.previewCard,
                  {
                    top: 12 + index * 10,
                    transform: [{ scale: 1 - (index + 1) * 0.05 }],
                    opacity: 0.4 + index * 0.2,
                  },
                ]}
              >
                <ThemedText numberOfLines={3}>{item.content}</ThemedText>
              </ThemedView>
            ))
            .reverse()}
          {topCard ? (
            <SwipeableCard
              key={topCard.id}
              item={topCard}
              counts={counts[topCard.id] ?? { shitpost: 0, spark: 0, gonna_implement: 0, ignored: 0 }}
              onAction={handleAction}
            />
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText type="subtitle">You reached the end!</ThemedText>
              <ThemedText>{loading ? 'Refreshing feed...' : 'Pull down to refresh or Compose something new.'}</ThemedText>
            </ThemedView>
          )}
        </View>
      </ThemedView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  deckArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    borderRadius: Radius.lg,
    padding: 20,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    justifyContent: 'space-between',
    position: 'absolute',
  },
  previewCard: {
    position: 'absolute',
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  emptyState: {
    width: CARD_WIDTH,
    padding: 24,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    gap: 8,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16, opacity: 0.6 },
  counterRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  counterChip: { borderWidth: 1, borderRadius: Radius.pill, borderColor: Colors.border, paddingVertical: 6, paddingHorizontal: 12 },
  actionsRow: { flexDirection: 'column', gap: 12, marginTop: 16 },
  actionButton: { borderRadius: Radius.md, backgroundColor: Colors.accent, paddingVertical: 12, alignItems: 'center' },
  actionButtonPressed: { opacity: 0.85 },
  actionLabel: { color: Colors.surfaceContrast, fontWeight: '600' },
  meta: { color: Colors.icon, marginTop: 4 },
});
