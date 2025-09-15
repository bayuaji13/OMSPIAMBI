import { useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, View, Switch, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeArea } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import { login } from '@/lib/auth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const router = useRouter();
  const passRef = useRef<TextInput>(null);

  const onLogin = async () => {
    try {
      setLoading(true);
      await login(username, password, remember);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Login failed', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeArea>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
          <ThemedText type="title">Login</ThemedText>
          <TextInput
            placeholder="Username"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            textContentType="username"
            value={username}
            onChangeText={setUsername}
            returnKeyType="next"
            onSubmitEditing={() => passRef.current?.focus()}
            style={styles.input}
          />
          <TextInput
            ref={passRef}
            placeholder="Password"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            returnKeyType="go"
            onSubmitEditing={onLogin}
            style={styles.input}
          />
          <View style={styles.row}>
        <ThemedText type="link" onPress={onLogin}>{loading ? '...' : 'Login'}</ThemedText>
        <Link href="/auth/register"><ThemedText type="link">Register</ThemedText></Link>
          </View>
      {__DEV__ && (
        <Link href="/auth/debug"><ThemedText type="link">Auth Debug</ThemedText></Link>
      )}
          <View style={styles.rowL2}>
        <ThemedText>Remember me</ThemedText>
        <Switch value={remember} onValueChange={setRemember} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, flexGrow: 1, justifyContent: 'center' },
  input: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#999', borderRadius: 8, padding: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
});
