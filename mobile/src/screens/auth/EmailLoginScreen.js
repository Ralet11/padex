import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthBrandHeader from '../../components/auth/AuthBrandHeader';

const DARK_INPUT = {
  containerStyle: {
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  inputStyle: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  labelStyle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    textTransform: 'none',
    marginLeft: 2,
    marginBottom: 8,
  },
  placeholderTextColor: 'rgba(255,255,255,0.32)',
  idleBorderColor: 'rgba(255,255,255,0.1)',
  iconColor: 'rgba(255,255,255,0.55)',
};

export default function EmailLoginScreen({ navigation }) {
  const { login } = useAuth();
  const { colors } = useTheme();

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
      await login(email.trim(), password);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={false} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.flex}>
              <AuthBrandHeader onBack={() => navigation.goBack()} size="sm" />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.intro}>
                  <Typography variant="h1" align="center" style={styles.title}>
                    Ingresar
                  </Typography>
                  <Typography variant="body" align="center" style={styles.subtitle}>
                    Tu cuenta para jugar, competir y subir en el ranking.
                  </Typography>
                </View>

                <View style={styles.form}>
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
                    returnKeyType="next"
                    focusedBorderColor={colors.accent}
                    {...DARK_INPUT}
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
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                    focusedBorderColor={colors.accent}
                    {...DARK_INPUT}
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleLogin}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: colors.accent,
                        opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#000000" size="small" />
                    ) : (
                      <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                        Entrar
                      </Typography>
                    )}
                  </Pressable>
                </View>
              </ScrollView>

              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.footer}
                activeOpacity={0.7}
              >
                <Typography variant="bodyMedium" align="center" style={styles.footerText}>
                  No tenes cuenta?{' '}
                  <Typography variant="bodyBold" style={{ color: colors.accent }}>
                    Crear perfil
                  </Typography>
                </Typography>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0D',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 28,
    paddingBottom: 24,
  },
  intro: {
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  form: {
    width: '100%',
    gap: 4,
  },
  primaryBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  footer: {
    marginTop: 8,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
});
