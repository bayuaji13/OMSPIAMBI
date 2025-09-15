/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';

// Single palette: ignore light/dark props and return from Colors
export function useThemeColor(
  _props: { light?: string; dark?: string },
  colorName: keyof typeof Colors
) {
  return Colors[colorName];
}
