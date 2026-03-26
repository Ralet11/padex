import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Alert, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import { Card } from '../../components/ui/Card';
import { Mail, Lock } from 'lucide-react-native';
import { screenPadding } from '../../theme/layout';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const e = {};
    if (!email.trim()) e.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Email invalido';
    if (!password) e.password = 'La contrasena es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    try {
      console.log('[login-screen] submit', { email: email.trim().toLowerCase() });
      await login(email.trim(), password);
    } catch (err) {
      console.warn('[login-screen] submit failed', { message: err.message });
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient
      colors={['#050510', colors.background, colors.background]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: spacing.lg,
                paddingBottom: spacing.xxl,
                paddingHorizontal: screenPadding.horizontal,
              }
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="always"
          >
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: colors.surfaceHighlight, borderColor: colors.primary }]}>
                <Image
                  source={require('../../../assets/padexicon.jpeg')}
                  style={{ width: 92, height: 92, borderRadius: 28 }}
                  resizeMode="cover"
                />
              </View>
              <Typography
                variant="bodyMedium"
                color="primary"
                align="center"
                style={{ marginTop: spacing.sm, opacity: 0.72 }}
              >
                Inicia sesion para jugar
              </Typography>
            </View>

            <Card variant="glass" style={styles.card}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
                leftIcon={<Mail color={colors.text.secondary} size={20} />}
              />

              <Input
                label="Contrasena"
                value={password}
                onChangeText={setPassword}
                placeholder="********"
                secureTextEntry
                autoCorrect={false}
                error={errors.password}
                leftIcon={<Lock color={colors.text.secondary} size={20} />}
              />

              <Button
                title="Iniciar sesion"
                onPress={handleLogin}
                loading={loading}
                size="lg"
                style={{ marginTop: spacing.md }}
              />

              <View style={[styles.divider, { marginVertical: spacing.lg }]}>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
                <Typography variant="caption" color="tertiary" style={{ marginHorizontal: spacing.md }}>
                  o
                </Typography>
                <View style={[styles.line, { backgroundColor: colors.border }]} />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.registerBtn}
                activeOpacity={0.7}
              >
                <Typography variant="bodyMedium" color="secondary" align="center">
                  No tenes cuenta?{' '}
                  <Typography variant="bodyBold" color="primary">
                    Registrate
                  </Typography>
                </Typography>
              </TouchableOpacity>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { alignItems: 'center', marginBottom: 20, paddingTop: 8 },
  card: { marginTop: 32 },
  logoContainer: {
    padding: 5,
    borderWidth: 2,
    borderRadius: 32,
    shadowColor: '#bdf101',
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  divider: { flexDirection: 'row', alignItems: 'center' },
  line: { flex: 1, height: 1 },
  registerBtn: { alignItems: 'center' },
});
