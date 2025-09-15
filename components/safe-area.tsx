import { PropsWithChildren } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
}>;

export function SafeArea({ children, style, edges = ['top', 'left', 'right'] }: Props) {
  return (
    <SafeAreaView style={[{ backgroundColor: Colors.background, flex: 1 }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

