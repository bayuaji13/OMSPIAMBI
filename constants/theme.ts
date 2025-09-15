import { Platform } from 'react-native';

// Single design palette (no light/dark modes), derived from docs/project_breakdown_with_epics.md
// Peach (Accent): #F8BFA0 | Black: #1C1C1C | White: #FFFFFF | Greys: #7A7A7A (text-secondary), #E5E5E5 (dividers)

export const Colors = {
  text: '#1C1C1C',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceContrast: '#1C1C1C',
  accent: '#F8BFA0',
  icon: '#7A7A7A',
  border: '#E5E5E5',
  tabIconDefault: '#7A7A7A',
  tabIconSelected: '#F8BFA0',
  tint: '#F8BFA0',
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
