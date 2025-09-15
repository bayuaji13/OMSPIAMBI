import AsyncStorage from '@react-native-async-storage/async-storage';

const NAMESPACE = 'omspiambi';

function key(name: string) {
  return `${NAMESPACE}:${name}`;
}

export async function getJSON<T>(name: string, fallback: T): Promise<T> {
  try {
    const v = await AsyncStorage.getItem(key(name));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function setJSON<T>(name: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key(name), JSON.stringify(value));
}

export async function remove(name: string): Promise<void> {
  await AsyncStorage.removeItem(key(name));
}

export async function getBoolean(name: string, fallback = false): Promise<boolean> {
  const v = await AsyncStorage.getItem(key(name));
  if (v === null) return fallback;
  return v === '1';
}

export async function setBoolean(name: string, value: boolean): Promise<void> {
  await AsyncStorage.setItem(key(name), value ? '1' : '0');
}

export const KEYS = {
  items: 'items',
  marks: 'marks',
  hasOnboarded: 'hasOnboarded',
  sessionToken: 'sessionToken',
  sessionUser: 'sessionUser',
} as const;
