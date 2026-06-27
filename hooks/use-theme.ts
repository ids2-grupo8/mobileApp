import { useColorScheme } from 'react-native';
import { dark, light, type ThemeColors } from '@/constants/colors';
import { useThemeStore } from '@/store/theme';

export function useTheme(): ThemeColors {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();

  if (mode === 'dark') return dark;
  if (mode === 'light') return light;
  return system === 'light' ? light : dark;
}

export function useIsLightTheme(): boolean {
  const mode = useThemeStore((s) => s.mode);
  const system = useColorScheme();
  if (mode === 'light') return true;
  if (mode === 'dark') return false;
  return system === 'light';
}
