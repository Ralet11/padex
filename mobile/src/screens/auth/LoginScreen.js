import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, radius } from '../../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email inválido';
    if (!password) e.password = 'La contraseña es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.bg, '#0D1E35']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.logo}>🎾</Text>
            <Text style={styles.title}>Bienvenido</Text>
            <Text style={styles.subtitle}>Iniciá sesión para jugar</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
              icon={<Text>📧</Text>}
            />
            <Input
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              error={errors.password}
              icon={<Text>🔒</Text>}
            />

            <Button
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              style={styles.loginBtn}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>o</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerBtn}>
              <Text style={styles.registerText}>
                ¿No tenés cuenta? <Text style={styles.registerLink}>Registrate</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  header: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginTop: 6 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loginBtn: { marginTop: spacing.sm },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, marginHorizontal: spacing.md, fontSize: 13 },
  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: 14, color: colors.textSecondary },
  registerLink: { color: colors.primary, fontWeight: '700' },
});
