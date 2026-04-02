import React, { useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthShell from '../../components/auth/AuthShell';

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

  return (
    <AuthShell
      headerTitle="Crear cuenta"
      onBackPress={() => (step === 1 ? navigation.goBack() : setStep(1))}
      title={step === 1 ? 'Tus datos' : 'Perfil de juego'}
      subtitle={
        step === 1
          ? 'Arma tu acceso y despues terminamos de ajustar tu nivel.'
          : 'Elegi tu nivel y posicion para entrar con mejores cruces.'
      }
      headerContent={
        <View style={styles.heroContent}>
          <View
            style={[
              styles.stepChip,
              {
                borderColor: `${colors.accent}34`,
                backgroundColor: `${colors.accent}16`,
              },
            ]}
          >
            <Typography variant="captionMedium" style={{ color: colors.accent }}>
              PASO {step} DE 2
            </Typography>
          </View>
          <Typography variant="body" align="center" style={styles.heroCopy}>
            Misma familia visual que el login, con alta simple y foco en claridad.
          </Typography>
        </View>
      }
      footer={
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.loginBtn}
          activeOpacity={0.75}
        >
          <Typography variant="bodyMedium" align="center" style={{ color: colors.text.secondary }}>
            Ya tenes cuenta?{' '}
            <Typography variant="bodyBold" style={{ color: colors.accent }}>
              Iniciar sesion
            </Typography>
          </Typography>
        </TouchableOpacity>
      }
      scrollContentStyle={step === 2 ? { paddingTop: spacing.md, paddingBottom: spacing.xl } : null}
    >
      <View style={[styles.steps, { marginBottom: spacing.lg }]}>
        {[1, 2].map((item) => (
          <View
            key={item}
            style={[
              styles.step,
              {
                backgroundColor: item <= step ? '#111214' : '#E5E7EC',
                borderRadius: radius.full,
              },
            ]}
          />
        ))}
      </View>

      {step === 1 ? (
        <>
          <Input
            label="Nombre completo"
            value={form.name}
            onChangeText={(value) => update('name', value)}
            placeholder="Juan Perez"
            error={errors.name}
            autoComplete="name"
            textContentType="name"
            labelStyle={styles.fieldLabel}
            containerStyle={styles.fieldContainer}
            inputStyle={styles.fieldInput}
            placeholderTextColor="#B8BEC8"
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
            value={form.password}
            onChangeText={(value) => update('password', value)}
            placeholder="Minimo 6 caracteres"
            secureTextEntry
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="newPassword"
            error={errors.password}
            labelStyle={styles.fieldLabel}
            containerStyle={styles.fieldContainer}
            inputStyle={styles.fieldInput}
            placeholderTextColor="#B8BEC8"
            returnKeyType="next"
          />
          <Input
            label="Confirmar contrasena"
            value={form.confirmPassword}
            onChangeText={(value) => update('confirmPassword', value)}
            placeholder="Repite tu contrasena"
            secureTextEntry
            autoCorrect={false}
            autoComplete="new-password"
            textContentType="password"
            error={errors.confirmPassword}
            labelStyle={styles.fieldLabel}
            containerStyle={styles.fieldContainer}
            inputStyle={styles.fieldInput}
            placeholderTextColor="#B8BEC8"
            returnKeyType="done"
            onSubmitEditing={goNext}
          />

          <Button
            title="Continuar"
            onPress={goNext}
            size="lg"
            textColor="#FFFFFF"
            style={[styles.primaryBtn, { marginTop: spacing.md }]}
            textStyle={styles.primaryBtnText}
          />
        </>
      ) : (
        <>
          <Typography variant="label" style={styles.sectionLabel}>
            Elegi tu nivel
          </Typography>
          <Typography variant="caption" style={styles.sectionCopy}>
            Esto define tu punto de partida y luego se ajusta con tus partidos.
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
                    {
                      borderColor: isSelected ? '#111214' : '#ECEEF3',
                      backgroundColor: isSelected ? '#111214' : '#FBFBFD',
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={() => update('self_category', category.value)}
                >
                  <Typography style={styles.optionEmoji}>{category.emoji}</Typography>
                  <Typography
                    variant="bodyBold"
                    style={{ color: isSelected ? '#FFFFFF' : '#17181B', fontSize: 13 }}
                  >
                    {category.label}
                  </Typography>
                  <View
                    style={[
                      styles.eloPill,
                      {
                        backgroundColor: isSelected ? `${colors.accent}26` : '#F1F3F7',
                      },
                    ]}
                  >
                    <Typography
                      variant="caption"
                      style={{ color: isSelected ? colors.accent : '#6A7280' }}
                    >
                      {category.elo} ELO
                    </Typography>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Typography variant="label" style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
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
                    {
                      borderColor: isSelected ? '#111214' : '#ECEEF3',
                      backgroundColor: isSelected ? '#111214' : '#FBFBFD',
                      borderRadius: radius.lg,
                    },
                  ]}
                  onPress={() => update('position', position.value)}
                >
                  <Typography style={styles.optionEmoji}>{position.emoji}</Typography>
                  <Typography variant="bodyBold" style={{ color: isSelected ? '#FFFFFF' : '#17181B' }}>
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
            labelStyle={styles.fieldLabel}
            containerStyle={[styles.fieldContainer, { marginTop: spacing.lg }]}
            inputStyle={styles.fieldInput}
            placeholderTextColor="#B8BEC8"
          />

          <View style={styles.btnRow}>
            <Button
              title="Atras"
              onPress={() => setStep(1)}
              variant="outline"
              style={styles.secondaryBtn}
              textStyle={styles.secondaryBtnText}
            />
            <Button
              title="Crear cuenta"
              onPress={handleRegister}
              loading={loading}
              textColor="#FFFFFF"
              loadingColor="#FFFFFF"
              style={styles.primaryWideBtn}
              textStyle={styles.primaryBtnText}
            />
          </View>
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  heroContent: {
    alignItems: 'center',
    paddingTop: 4,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroCopy: {
    maxWidth: 250,
    marginTop: 14,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 18,
  },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  step: {
    width: 38,
    height: 5,
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
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111214',
  },
  primaryWideBtn: {
    flex: 2,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#111214',
  },
  primaryBtnText: {
    fontSize: 15,
    letterSpacing: 0.1,
    color: '#FFFFFF',
  },
  secondaryBtn: {
    flex: 1,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D9DEE7',
  },
  secondaryBtnText: {
    color: '#17181B',
    fontSize: 14,
  },
  sectionLabel: {
    marginBottom: 6,
    color: '#3F4652',
    letterSpacing: 0.3,
  },
  sectionCopy: {
    marginBottom: 14,
    color: '#7D8696',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 2,
  },
  optionCard: {
    width: '48%',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#111827',
    shadowOpacity: 0.03,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  optionEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  eloPill: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  posCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.03,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  loginBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
});
