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
  { value: 'principiante', label: 'Principiante', icon: 'compass', hint: 'Primeros partidos' },
  { value: 'intermedio', label: 'Intermedio', icon: 'target', hint: 'Buen ritmo y control' },
  { value: 'avanzado', label: 'Avanzado', icon: 'zap', hint: 'Mas velocidad y lectura' },
  { value: 'profesional', label: 'Profesional', icon: 'award', hint: 'Nivel competitivo' },
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

export default function PhoneProfileCompletionScreen() {
  const { colors } = useTheme();
  const { user, completePhoneProfile, logout } = useAuth();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    self_category: user?.self_category || 'intermedio',
    position: user?.position || 'drive',
    paddle_brand: user?.paddle_brand || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'El nombre es requerido';
    }

    if (form.email.trim() && !/\S+@\S+\.\S+/.test(form.email.trim())) {
      nextErrors.email = 'Ingresa un email valido';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setLoading(true);
    try {
      await completePhoneProfile(form);
    } catch (error) {
      Alert.alert('No pudimos completar tu perfil', error.message);
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
              <AuthBrandHeader size="sm" />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
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
                      PERFIL INICIAL
                    </Typography>
                  </View>

                  <Typography variant="h1" align="center" style={styles.title}>
                    Termina de armar tu perfil
                  </Typography>
                  <Typography variant="body" align="center" style={styles.subtitle}>
                    Ya verificamos tu telefono. Ahora sumamos tus datos para que puedas empezar a jugar.
                  </Typography>
                  <Typography variant="caption" align="center" style={styles.phoneBadge}>
                    Telefono verificado: {user?.phone || 'Listo'}
                  </Typography>
                </View>

                <View style={styles.form}>
                  <Input
                    label="Nombre completo"
                    value={form.name}
                    onChangeText={(value) => update('name', value)}
                    placeholder="Juan Perez"
                    error={errors.name}
                    autoComplete="name"
                    textContentType="name"
                    focusedBorderColor={colors.accent}
                    {...DARK_INPUT}
                  />

                  <Input
                    label="Email (opcional)"
                    value={form.email}
                    onChangeText={(value) => update('email', value)}
                    placeholder="tu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    error={errors.email}
                    focusedBorderColor={colors.accent}
                    {...DARK_INPUT}
                  />

                  <View style={styles.sectionBlock}>
                    <Typography variant="bodyBold" style={styles.sectionTitle}>
                      Tu nivel
                    </Typography>
                    <View style={styles.cardsGrid}>
                      {CATEGORIES.map((category) => {
                        const isSelected = form.self_category === category.value;
                        return (
                          <Pressable
                            key={category.value}
                            accessibilityRole="button"
                            onPress={() => update('self_category', category.value)}
                            style={({ pressed }) => [
                              styles.optionCard,
                              {
                                borderColor: isSelected ? colors.accent : 'rgba(255,255,255,0.08)',
                                backgroundColor: isSelected ? 'rgba(167,206,41,0.12)' : 'rgba(255,255,255,0.03)',
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.optionIconBadge,
                                { backgroundColor: isSelected ? colors.accent : 'rgba(255,255,255,0.08)' },
                              ]}
                            >
                              <Feather
                                name={category.icon}
                                size={16}
                                color={isSelected ? '#0B0B0D' : 'rgba(255,255,255,0.7)'}
                              />
                            </View>
                            <Typography variant="bodyBold" style={styles.optionTitle}>
                              {category.label}
                            </Typography>
                            <Typography variant="caption" style={styles.optionHint}>
                              {category.hint}
                            </Typography>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.sectionBlock}>
                    <Typography variant="bodyBold" style={styles.sectionTitle}>
                      Tu posicion
                    </Typography>
                    <View style={styles.cardsGrid}>
                      {POSITIONS.map((position) => {
                        const isSelected = form.position === position.value;
                        return (
                          <Pressable
                            key={position.value}
                            accessibilityRole="button"
                            onPress={() => update('position', position.value)}
                            style={({ pressed }) => [
                              styles.optionCard,
                              {
                                borderColor: isSelected ? colors.accent : 'rgba(255,255,255,0.08)',
                                backgroundColor: isSelected ? 'rgba(167,206,41,0.12)' : 'rgba(255,255,255,0.03)',
                                opacity: pressed ? 0.9 : 1,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.optionIconBadge,
                                { backgroundColor: isSelected ? colors.accent : 'rgba(255,255,255,0.08)' },
                              ]}
                            >
                              <Feather
                                name={position.icon}
                                size={16}
                                color={isSelected ? '#0B0B0D' : 'rgba(255,255,255,0.7)'}
                              />
                            </View>
                            <Typography variant="bodyBold" style={styles.optionTitle}>
                              {position.label}
                            </Typography>
                            <Typography variant="caption" style={styles.optionHint}>
                              {position.hint}
                            </Typography>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <Input
                    label="Paleta favorita (opcional)"
                    value={form.paddle_brand}
                    onChangeText={(value) => update('paddle_brand', value)}
                    placeholder="Bullpadel, Nox, Adidas..."
                    focusedBorderColor={colors.accent}
                    {...DARK_INPUT}
                  />

                  <Pressable
                    accessibilityRole="button"
                    onPress={handleSubmit}
                    disabled={loading}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        backgroundColor: colors.accent,
                        opacity: loading ? 0.8 : pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#0B0B0D" size="small" />
                    ) : (
                      <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                        Entrar a Padex
                      </Typography>
                    )}
                  </Pressable>

                  <TouchableOpacity
                    onPress={logout}
                    activeOpacity={0.7}
                    style={styles.secondaryLink}
                  >
                    <Typography variant="bodyMedium" align="center" style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Salir y volver despues
                    </Typography>
                  </TouchableOpacity>
                </View>
              </ScrollView>
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
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
  },
  intro: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 320,
  },
  phoneBadge: {
    color: 'rgba(255,255,255,0.62)',
  },
  form: {
    width: '100%',
  },
  sectionBlock: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardsGrid: {
    gap: 12,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  optionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    color: '#FFFFFF',
    marginBottom: 4,
  },
  optionHint: {
    color: 'rgba(255,255,255,0.68)',
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#0B0B0D',
  },
  secondaryLink: {
    marginTop: 18,
    alignSelf: 'center',
  },
});
