import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthShell from '../../components/auth/AuthShell';
import SocialAuthSection from '../../components/auth/SocialAuthSection';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors, spacing } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  function validate() {
    const nextErrors = {};
    if (!email.trim()) nextErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = 'Email invalido';
    if (!password) nextErrors.password = 'La contrasena es requerida';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
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
    <AuthShell
      density="compact"
      title="Ingresar"
      subtitle="Tu cuenta para jugar, competir y subir en el ranking."
      headerContent={
        <View style={styles.heroContent}>
          <View style={[styles.heroAccent, { backgroundColor: colors.accent }]} />

          <Typography variant="h1" style={styles.heroTitle}>
            Padex
          </Typography>

          <Typography variant="body" style={styles.heroSubtitle}>
            Entra a tus partidos, segui la liga y movete en el ranking.
          </Typography>

          <View style={styles.heroFeatureRow}>
            {['Partidos', 'Ranking', 'Mensajes'].map((label) => (
              <View key={label} style={styles.heroFeatureChip}>
                <Typography variant="captionMedium" style={styles.heroFeatureText}>
                  {label}
                </Typography>
              </View>
            ))}
          </View>
        </View>
      }
      footer={
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerBtn}
          activeOpacity={0.75}
        >
          <Typography variant="bodyMedium" align="center" style={{ color: colors.text.secondary }}>
            No tenes cuenta?{' '}
            <Typography variant="bodyBold" style={{ color: colors.accent }}>
              Crear perfil
            </Typography>
          </Typography>
        </TouchableOpacity>
      }
    >
      <Input
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.fieldWrap}
        placeholder="tu@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
        labelStyle={styles.fieldLabel}
        containerStyle={styles.fieldContainer}
        inputStyle={styles.fieldInput}
        placeholderTextColor="#B8BEC8"
        returnKeyType="next"
      />

      <Input
        label="Contrasena"
        value={password}
        onChangeText={setPassword}
        style={styles.fieldWrap}
        placeholder="********"
        secureTextEntry
        autoCorrect={false}
        autoComplete="password"
        textContentType="password"
        error={errors.password}
        labelStyle={styles.fieldLabel}
        containerStyle={styles.fieldContainer}
        inputStyle={styles.fieldInput}
        placeholderTextColor="#B8BEC8"
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <Button
        title="Entrar"
        onPress={handleLogin}
        loading={loading}
        size="lg"
        textColor="#FFFFFF"
        loadingColor="#FFFFFF"
        style={[styles.submitBtn, { marginTop: spacing.sm }]}
        textStyle={styles.submitText}
      />

      <SocialAuthSection density="compact" />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    width: '100%',
    paddingTop: 10,
    paddingHorizontal: 2,
    alignItems: 'flex-start',
  },
  heroAccent: {
    width: 38,
    height: 4,
    borderRadius: 999,
  },
  heroTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    letterSpacing: -1.2,
  },
  heroSubtitle: {
    marginTop: 8,
    maxWidth: 250,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 19,
  },
  heroFeatureRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroFeatureChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  heroFeatureText: {
    color: 'rgba(255,255,255,0.84)',
  },
  fieldLabel: {
    marginLeft: 2,
    marginBottom: 6,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0,
    textTransform: 'none',
    color: '#3F4652',
  },
  fieldWrap: {
    marginBottom: 10,
  },
  fieldContainer: {
    height: 50,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    borderRadius: 14,
    backgroundColor: '#FBFBFD',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  fieldInput: {
    fontSize: 14,
    color: '#16181D',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: '#111214',
  },
  submitText: {
    fontSize: 14,
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  registerBtn: {
    alignItems: 'center',
  },
});
