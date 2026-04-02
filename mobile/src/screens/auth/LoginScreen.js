import React, { useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthShell from '../../components/auth/AuthShell';

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
      title="Ingresar"
      subtitle="Entra a tu cuenta para ver partidos, mensajes y ranking."
      headerContent={
        <View style={styles.heroContent}>
          <View
            style={[
              styles.heroPill,
              {
                borderColor: `${colors.accent}36`,
                backgroundColor: `${colors.accent}18`,
              },
            ]}
          >
            <Typography variant="captionMedium" style={[styles.heroPillText, { color: colors.accent }]}>
              PADEX
            </Typography>
          </View>

          <View style={styles.heroLogoTile}>
            <Image
              source={require('../../../assets/ball-mark.png')}
              resizeMode="contain"
              style={styles.heroLogo}
            />
          </View>

          <Typography variant="caption" align="center" style={styles.heroCopy}>
            
          </Typography>
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
        style={[styles.submitBtn, { marginTop: spacing.md }]}
        textStyle={styles.submitText}
      />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    alignItems: 'center',
    paddingTop: 4,
  },
  heroPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroPillText: {
    fontSize: 11,
    letterSpacing: 1,
  },
  heroLogoTile: {
    width: 74,
    height: 74,
    borderRadius: 24,
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#050510',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroLogo: {
    width: 42,
    height: 42,
  },
  heroCopy: {
    maxWidth: 244,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 18,
  },
  fieldLabel: {
    marginLeft: 2,
    marginBottom: 8,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0,
    textTransform: 'none',
    color: '#3F4652',
  },
  fieldContainer: {
    height: 56,
    borderWidth: 1,
    borderColor: '#EEF0F4',
    borderRadius: 16,
    backgroundColor: '#FBFBFD',
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  fieldInput: {
    fontSize: 15,
    color: '#16181D',
  },
  submitBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111214',
  },
  submitText: {
    fontSize: 15,
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  registerBtn: {
    alignItems: 'center',
  },
});
