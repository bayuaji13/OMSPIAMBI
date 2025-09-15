import { useRef, useState } from 'react';
import { StyleSheet, ScrollView, TextInput, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { exec } from '@/lib/turso';
import { scrypt } from 'scrypt-js';

export default function AuthDebug() {
  const [log, setLog] = useState<string>('');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const passRef = useRef<TextInput>(null);

  const run = async () => {
    try {
      setLog('Running SELECT 1 ...');
      const res: any = await exec('SELECT 1 as ok', []);
      setLog('OK\n' + JSON.stringify(res, null, 2));
    } catch (e: any) {
      setLog('ERR\n' + (e?.message || String(e)));
    }
  };

  const verify = async () => {
    try {
      setLog('Checking user...');
      const rows: any = await exec('SELECT id, password_salt, password_hash FROM users WHERE username = ?;', [u.trim().toLowerCase()]);
      const row = rows?.rows?.[0];
      if (!row) return setLog('No user');
      const enc = new TextEncoder();
      const fromHex = (hex: string) => Uint8Array.from(hex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
      const toHex = (bytes: Uint8Array) => Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
      const salt = fromHex(String(row.password_salt).trim());
      const out = await scrypt(enc.encode(p), salt, 16384, 8, 1, 32);
      const hex = toHex(new Uint8Array(out));
      const stored = String(row.password_hash).trim().toLowerCase();
      const ok = hex.toLowerCase() === stored;
      setLog('OK user fetched. Match=' + ok + '\n' + JSON.stringify({ hex: hex.slice(0,8), stored: stored.slice(0,8), saltLen: String(row.password_salt).length }, null, 2));
    } catch (e: any) {
      setLog('ERR verify\n' + (e?.message || String(e)));
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Auth Debug</ThemedText>
      <ThemedText>URL: {process.env.EXPO_PUBLIC_TURSO_URL}</ThemedText>
      <ThemedText>Token present: {process.env.EXPO_PUBLIC_TURSO_TOKEN ? 'yes' : 'no'}</ThemedText>
      <ThemedText type="link" onPress={run}>Run SELECT 1</ThemedText>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TextInput style={styles.input} placeholder="username" autoCapitalize="none" value={u} onChangeText={setU} returnKeyType="next" onSubmitEditing={() => passRef.current?.focus()} />
        <TextInput ref={passRef} style={styles.input} placeholder="password" secureTextEntry value={p} onChangeText={setP} returnKeyType="go" onSubmitEditing={verify} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        <ThemedText type="link" onPress={verify}>Verify credentials locally</ThemedText>
      </View>
      <ScrollView style={{ marginTop: 12 }}>
        <ThemedText style={{ fontFamily: 'monospace' }}>{log}</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 8, flex: 1 },
});
