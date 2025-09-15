import { useRef, useState } from 'react';
import { Alert, StyleSheet, TextInput, View, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { SafeArea } from '@/components/safe-area';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import { register as reg, login } from '@/lib/auth';
import { migrate } from '@/lib/turso';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const passRef = useRef<TextInput>(null);

  const onRegister = async () => {
    try {
      setLoading(true);
      await migrate(); // ensure tables exist
      await reg(username, password);
      await login(username, password);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeArea>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
          <ThemedText type="title">Create Account</ThemedText>
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
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
            returnKeyType="go"
            onSubmitEditing={onRegister}
            style={styles.input}
          />
          <View style={styles.row}>
            <ThemedText type="link" onPress={onRegister}>{loading ? '...' : 'Register'}</ThemedText>
            <Link href="/auth/login"><ThemedText type="link">Login</ThemedText></Link>
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
