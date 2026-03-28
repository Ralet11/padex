import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Mail, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import { Card } from '../../components/ui/Card';
import { screenPadding } from '../../theme/layout';
import BrandLockup from '../../components/branding/BrandLockup';

const CATEGORIES = [
  { value: 'principiante', label: 'Principiante', emoji: '\u{1F331}', elo: '~800' },
  { value: 'intermedio', label: 'Intermedio', emoji: '\u{1F3AF}', elo: '~1000' },
  { value: 'avanzado', label: 'Avanzado', emoji: '\u{1F525}', elo: '~1200' },
  { value: 'profesional', label: 'Profesional', emoji: '\u{1F3C6}', elo: '~1500' },
];

const POSITIONS = [
  { value: 'drive', label: 'Drive', emoji: '\u{1F448}' },
  { value: 'reves', label: 'Reves', emoji: '\u{1F449}' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const [keyboardInset, setKeyboardInset] = useState(0);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    self_category: 'intermedio',
    position: 'drive',
    paddle_brand: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateStep1() {
    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = 'El nombre es requerido';
    if (!form.email.trim()) nextErrors.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Email invalido';
    if (!form.password) nextErrors.password = 'La contrasena es requerida';
    else if (form.password.length < 6) nextErrors.password = 'Minimo 6 caracteres';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirma la contrasena';
    else if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Las contrasenas no coinciden';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
  }

  async function handleRegister() {
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      Alert.alert('Error', err.message);
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset((event.endCoordinates?.height ?? 0) + spacing.lg);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [spacing.lg]);

  return (
    <LinearGradient
      colors={['#050510', colors.background, colors.background]}
      style={styles.gradient}
    >
      <StatusBar style="light" hidden={false} />
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
                paddingBottom: Math.max(spacing.xxl, keyboardInset),
                paddingHorizontal: screenPadding.horizontal,
              },
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="always"
          >
            <View style={styles.header}>
              <BrandLockup
                kicker={step === 1 ? 'CREA TU PERFIL' : 'AJUSTA TU NIVEL'}
                subtitle={
                  step === 1
                    ? 'Crea tu perfil, suma partidos y empeza a subir tu ranking.'
                    : 'Deja listo tu nivel y entra a jugar con mejores cruces.'
                }
              />
              <Typography
                variant="bodyMedium"
                align="center"
                style={[styles.headerCopy, { marginTop: spacing.md }]}
              >
                {step === 1 ? 'Crea tu cuenta para jugar' : 'Completa tu perfil de juego'}
              </Typography>
              <View style={styles.steps}>
                {[1, 2].map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.step,
                      {
                        backgroundColor: item <= step ? colors.primary : colors.border,
                        borderRadius: radius.full,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>

            <Card variant="glass" style={styles.card}>
              {step === 1 ? (
                <>
                  <Input
                    label="Nombre completo"
                    value={form.name}
                    onChangeText={(value) => update('name', value)}
                    placeholder="Juan Perez"
                    error={errors.name}
                    leftIcon={<User color={colors.text.secondary} size={20} />}
                    returnKeyType="next"
                  />
                  <Input
                    label="Email"
                    value={form.email}
                    onChangeText={(value) => update('email', value)}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    error={errors.email}
                    leftIcon={<Mail color={colors.text.secondary} size={20} />}
                    returnKeyType="next"
                  />
                  <Input
                    label="Contrasena"
                    value={form.password}
                    onChangeText={(value) => update('password', value)}
                    placeholder="Minimo 6 caracteres"
                    secureTextEntry
                    autoCorrect={false}
                    error={errors.password}
                    leftIcon={<Lock color={colors.text.secondary} size={20} />}
                    returnKeyType="next"
                  />
                  <Input
                    label="Confirmar contrasena"
                    value={form.confirmPassword}
                    onChangeText={(value) => update('confirmPassword', value)}
                    placeholder="Repite tu contrasena"
                    secureTextEntry
                    autoCorrect={false}
                    error={errors.confirmPassword}
                    leftIcon={<Lock color={colors.text.secondary} size={20} />}
                    returnKeyType="done"
                    onSubmitEditing={goNext}
                  />

                  <Button
                    title="Continuar"
                    onPress={goNext}
                    size="lg"
                    style={{ marginTop: spacing.md }}
                  />
                </>
              ) : (
                <>
                  <Typography variant="h2" color="text" align="center" style={{ marginBottom: spacing.md }}>
                    Tu perfil de juego
                  </Typography>
                  <Typography variant="label" color="secondary" style={{ marginBottom: spacing.xs }}>
                    Cual es tu nivel?
                  </Typography>
                  <Typography variant="caption" color="tertiary" style={{ marginBottom: spacing.md }}>
                    Esto define tu ELO inicial y luego se ajusta con tus partidos.
                  </Typography>

                  <View style={styles.grid}>
                    {CATEGORIES.map((category) => {
                      const isSelected = form.self_category === category.value;
                      return (
                        <TouchableOpacity
                          key={category.value}
                          activeOpacity={0.7}
                          style={[
                            styles.optionCard,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceHighlight,
                              borderRadius: radius.md,
                            },
                          ]}
                          onPress={() => update('self_category', category.value)}
                        >
                          <Typography style={{ fontSize: 24, marginBottom: 4 }}>{category.emoji}</Typography>
                          <Typography
                            variant="bodyBold"
                            color={isSelected ? 'primary' : 'secondary'}
                            style={{ fontSize: 13 }}
                          >
                            {category.label}
                          </Typography>
                          <Typography variant="caption" color="tertiary" style={{ marginTop: 2, fontSize: 11 }}>
                            {category.elo} ELO
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Typography
                    variant="label"
                    color="secondary"
                    style={{ marginTop: spacing.lg, marginBottom: spacing.md }}
                  >
                    Juegas de?
                  </Typography>

                  <View style={styles.row}>
                    {POSITIONS.map((position) => {
                      const isSelected = form.position === position.value;
                      return (
                        <TouchableOpacity
                          key={position.value}
                          activeOpacity={0.7}
                          style={[
                            styles.posCard,
                            {
                              borderColor: isSelected ? colors.primary : colors.border,
                              backgroundColor: isSelected ? colors.primaryMuted : colors.surfaceHighlight,
                              borderRadius: radius.md,
                            },
                          ]}
                          onPress={() => update('position', position.value)}
                        >
                          <Typography style={{ fontSize: 28, marginBottom: 6 }}>{position.emoji}</Typography>
                          <Typography variant="bodyBold" color={isSelected ? 'primary' : 'secondary'}>
                            {position.label}
                          </Typography>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Input
                    label="Paleta que usas (opcional)"
                    value={form.paddle_brand}
                    onChangeText={(value) => update('paddle_brand', value)}
                    placeholder="Ej: Head Alpha"
                    style={{ marginTop: spacing.lg }}
                  />

                  <View style={styles.btnRow}>
                    <Button
                      title="Atras"
                      onPress={() => setStep(1)}
                      variant="outline"
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Jugar"
                      onPress={handleRegister}
                      loading={loading}
                      style={{ flex: 2 }}
                    />
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.loginBtn}
                activeOpacity={0.7}
              >
                <Typography variant="bodyMedium" color="secondary" align="center">
                  Ya tenes cuenta?{' '}
                  <Typography variant="bodyBold" color="primary">
                    Inicia sesion
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
  header: { alignItems: 'center', marginBottom: 16, paddingTop: 12 },
  headerCopy: { color: 'rgba(255, 255, 255, 0.76)' },
  card: { marginTop: 16 },
  steps: { flexDirection: 'row', gap: 8, marginTop: 16 },
  step: { width: 32, height: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionCard: {
    width: '48%',
    padding: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', gap: 8 },
  posCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  loginBtn: { alignItems: 'center', marginTop: 24 },
});
