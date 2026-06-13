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
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthBrandHeader from '../../components/auth/AuthBrandHeader';

const CATEGORIES = [
  { value: 'principiante', label: 'Principiante', icon: 'compass', elo: '~800', hint: 'Primeros partidos' },
  { value: 'intermedio', label: 'Intermedio', icon: 'target', elo: '~1000', hint: 'Buen ritmo y control' },
  { value: 'avanzado', label: 'Avanzado', icon: 'zap', elo: '~1200', hint: 'Mas velocidad y lectura' },
  { value: 'profesional', label: 'Profesional', icon: 'award', elo: '~1500', hint: 'Nivel competitivo' },
];

const POSITIONS = [
  { value: 'drive', label: 'Drive', icon: 'arrow-right-circle', hint: 'Juego mas directo' },
  { value: 'reves', label: 'Reves', icon: 'arrow-left-circle', hint: 'Mas control y armado' },
];

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

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { colors } = useTheme();

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
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep2() {
    const nextErrors = {};
    if (!form.password) nextErrors.password = 'La contraseña es requerida';
    else if (form.password.length < 6) nextErrors.password = 'Mínimo 6 caracteres';
    if (!form.confirmPassword) nextErrors.confirmPassword = 'Confirma la contraseña';
    else if (form.password !== form.confirmPassword)
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  }

  function handleBack() {
    if (step === 1) navigation.goBack();
    else setStep((current) => current - 1);
  }

  async function handleRegister() {
    setLoading(true);
    try {
      await register(form);
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
              <AuthBrandHeader onBack={handleBack} size="sm" />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepRow}>
                  {[1, 2, 3].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.stepBar,
                        {
                          backgroundColor:
                            item <= step ? colors.accent : 'rgba(255,255,255,0.12)',
                        },
                      ]}
                    />
                  ))}
                </View>

                <View style={styles.intro}>
                  <View
                    style={[
                      styles.stepChip,
                      {
                        borderColor: `${colors.accent}45`,
                        backgroundColor: `${colors.accent}1A`,
                      },
                    ]}
                  >
                    <Typography variant="captionMedium" style={{ color: colors.accent, fontSize: 11, letterSpacing: 0.4 }}>
                      PASO {step} DE 3
                    </Typography>
                  </View>

                  <Typography variant="h1" align="center" style={styles.title}>
                    {step === 1
                      ? 'Crea tu cuenta'
                      : step === 2
                        ? 'Protege tu acceso'
                        : 'Configura tu juego'}
                  </Typography>
                  <Typography variant="body" align="center" style={styles.subtitle}>
                    {step === 1
                      ? 'Sumamos tu nombre y email para empezar.'
                      : step === 2
                        ? 'Ahora crea y confirma tu contraseña.'
                        : 'Elegí tu nivel y preferencias para arrancar bien.'}
                  </Typography>
                </View>

                {step === 1 ? (
                  <View style={styles.form}>
                    <Input
                      label="Nombre completo"
                      value={form.name}
                      onChangeText={(value) => update('name', value)}
                      placeholder="Juan Perez"
                      error={errors.name}
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      focusedBorderColor={colors.accent}
                      {...DARK_INPUT}
                    />
                    <Input
                      label="Email"
                      value={form.email}
                      onChangeText={(value) => update('email', value)}
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

                    <Pressable
                      accessibilityRole="button"
                      onPress={goNext}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                        Continuar
                      </Typography>
                    </Pressable>
                  </View>
                ) : step === 2 ? (
                  <View style={styles.form}>
                    <Input
                      label="Contraseña"
                      value={form.password}
                      onChangeText={(value) => update('password', value)}
                      placeholder="Mínimo 6 caracteres"
                      secureTextEntry
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="newPassword"
                      error={errors.password}
                      returnKeyType="next"
                      focusedBorderColor={colors.accent}
                      {...DARK_INPUT}
                    />
                    <Input
                      label="Confirmar contraseña"
                      value={form.confirmPassword}
                      onChangeText={(value) => update('confirmPassword', value)}
                      placeholder="Repite tu contraseña"
                      secureTextEntry
                      autoCorrect={false}
                      autoComplete="new-password"
                      textContentType="password"
                      error={errors.confirmPassword}
                      returnKeyType="done"
                      onSubmitEditing={goNext}
                      focusedBorderColor={colors.accent}
                      {...DARK_INPUT}
                    />

                    <Pressable
                      accessibilityRole="button"
                      onPress={goNext}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
                      ]}
                    >
                      <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                        OK
                      </Typography>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.panel}>
                      <Typography variant="captionMedium" style={styles.sectionEyebrow}>
                        NIVEL INICIAL
                      </Typography>
                      <Typography variant="captionMedium" style={styles.sectionLabel}>
                        Elegí tu nivel
                      </Typography>
                      <Typography variant="caption" style={styles.sectionCopy}>
                        Define tu punto de partida y se ajusta con tus partidos.
                      </Typography>

                      <View style={styles.grid}>
                        {CATEGORIES.map((category) => {
                          const isSelected = form.self_category === category.value;
                          return (
                            <TouchableOpacity
                              key={category.value}
                              activeOpacity={0.82}
                              style={[
                                styles.optionCard,
                                isSelected ? styles.optionCardSelected : null,
                                {
                                  borderColor: isSelected
                                    ? colors.accent
                                    : 'rgba(255,255,255,0.1)',
                                  backgroundColor: isSelected
                                    ? 'rgba(216, 255, 64, 0.08)'
                                    : 'rgba(255,255,255,0.04)',
                                },
                              ]}
                              onPress={() => update('self_category', category.value)}
                            >
                              <View
                                style={[
                                  styles.optionIconBadge,
                                  {
                                    backgroundColor: isSelected
                                      ? `${colors.accent}22`
                                      : 'rgba(255,255,255,0.06)',
                                  },
                                ]}
                              >
                                <Feather
                                  name={category.icon}
                                  size={18}
                                  color={isSelected ? colors.accent : 'rgba(255,255,255,0.72)'}
                                />
                              </View>
                              <Typography variant="bodyBold" style={styles.optionTitle}>
                                {category.label}
                              </Typography>
                              <Typography variant="caption" style={styles.optionHint}>
                                {category.hint}
                              </Typography>
                              <View
                                style={[
                                  styles.eloPill,
                                  {
                                    backgroundColor: isSelected
                                      ? `${colors.accent}26`
                                      : 'rgba(255,255,255,0.06)',
                                  },
                                ]}
                              >
                                <Typography
                                  variant="caption"
                                  style={[
                                    styles.eloText,
                                    { color: isSelected ? colors.accent : 'rgba(255,255,255,0.6)' },
                                  ]}
                                >
                                  {category.elo} ELO
                                </Typography>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.panel}>
                      <Typography variant="captionMedium" style={styles.sectionEyebrow}>
                        PREFERENCIAS
                      </Typography>
                      <Typography variant="captionMedium" style={styles.sectionLabel}>
                        Tu lado favorito
                      </Typography>

                      <View style={styles.row}>
                        {POSITIONS.map((position) => {
                          const isSelected = form.position === position.value;
                          return (
                            <TouchableOpacity
                              key={position.value}
                              activeOpacity={0.82}
                              style={[
                                styles.posCard,
                                isSelected ? styles.optionCardSelected : null,
                                {
                                  borderColor: isSelected
                                    ? colors.accent
                                    : 'rgba(255,255,255,0.1)',
                                  backgroundColor: isSelected
                                    ? 'rgba(216, 255, 64, 0.08)'
                                    : 'rgba(255,255,255,0.04)',
                                },
                              ]}
                              onPress={() => update('position', position.value)}
                            >
                              <View
                                style={[
                                  styles.optionIconBadge,
                                  styles.positionIconBadge,
                                  {
                                    backgroundColor: isSelected
                                      ? `${colors.accent}22`
                                      : 'rgba(255,255,255,0.06)',
                                  },
                                ]}
                              >
                                <Feather
                                  name={position.icon}
                                  size={18}
                                  color={isSelected ? colors.accent : 'rgba(255,255,255,0.72)'}
                                />
                              </View>
                              <Typography variant="bodyBold" style={styles.optionTitle}>
                                {position.label}
                              </Typography>
                              <Typography variant="caption" style={styles.optionHint}>
                                {position.hint}
                              </Typography>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={{ marginTop: 22 }}>
                      <Input
                        label="Paleta que usas (opcional)"
                        value={form.paddle_brand}
                        onChangeText={(value) => update('paddle_brand', value)}
                        placeholder="Ej: Head Alpha"
                        focusedBorderColor={colors.accent}
                        {...DARK_INPUT}
                      />
                    </View>

                    <View style={styles.btnRow}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setStep(2)}
                        style={({ pressed }) => [
                          styles.secondaryBtn,
                          { opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <Typography variant="bodyBold" align="center" style={styles.secondaryBtnText}>
                          Atras
                        </Typography>
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        onPress={handleRegister}
                        disabled={loading}
                        style={({ pressed }) => [
                          styles.primaryWideBtn,
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
                            Crear cuenta
                          </Typography>
                        )}
                      </Pressable>
                    </View>
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={styles.footer}
                activeOpacity={0.7}
              >
                <Typography variant="bodyMedium" align="center" style={styles.footerText}>
                  Ya tenes cuenta?{' '}
                  <Typography variant="bodyBold" style={{ color: colors.accent }}>
                    Iniciar sesión
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
    paddingTop: 20,
    paddingBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 22,
  },
  stepBar: {
    width: 36,
    height: 4,
    borderRadius: 999,
  },
  intro: {
    marginBottom: 24,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  stepChip: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  form: {
    width: '100%',
    gap: 4,
  },
  panel: {
    marginTop: 18,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  sectionEyebrow: {
    marginBottom: 8,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  sectionLabel: {
    marginBottom: 4,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  sectionCopy: {
    marginBottom: 14,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionCard: {
    width: '48%',
    minHeight: 146,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  optionCardSelected: {
    borderWidth: 1.5,
  },
  optionIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  positionIconBadge: {
    marginBottom: 14,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  optionHint: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    lineHeight: 15,
  },
  eloPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  eloText: {
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  posCard: {
    flex: 1,
    minHeight: 126,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
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
  primaryWideBtn: {
    flex: 2,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
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
