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

const CATEGORIES = [
  { value: 'principiante', label: 'Principiante', emoji: '🌱', elo: '~800', desc: 'Estoy aprendiendo' },
  { value: 'intermedio', label: 'Intermedio', emoji: '🎯', elo: '~1000', desc: 'Juego regularmente' },
  { value: 'avanzado', label: 'Avanzado', emoji: '🔥', elo: '~1200', desc: 'Juego competitivo' },
  { value: 'profesional', label: 'Profesional', emoji: '🏆', elo: '~1500', desc: 'Nivel profesional' },
];

const POSITIONS = [
  { value: 'drive', label: 'Drive', emoji: '👈' },
  { value: 'reves', label: 'Revés', emoji: '👉' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    self_category: 'intermedio',
    position: 'drive',
    paddle_brand: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validateStep1() {
    const e = {};
    if (!form.name.trim()) e.name = 'El nombre es requerido';
    if (!form.email.trim()) e.email = 'El email es requerido';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email inválido';
    if (!form.password) e.password = 'La contraseña es requerida';
    else if (form.password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
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
    <LinearGradient colors={[colors.bg, '#0D1E35']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>🎾</Text>
            <Text style={styles.title}>{step === 1 ? 'Crear cuenta' : 'Tu perfil de juego'}</Text>
            <View style={styles.steps}>
              {[1, 2].map((s) => (
                <View key={s} style={[styles.step, s <= step && styles.stepActive]} />
              ))}
            </View>
          </View>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <Input label="Nombre completo" value={form.name} onChangeText={(v) => update('name', v)} placeholder="Juan Pérez" error={errors.name} icon={<Text>👤</Text>} />
                <Input label="Email" value={form.email} onChangeText={(v) => update('email', v)} placeholder="tu@email.com" keyboardType="email-address" autoCapitalize="none" error={errors.email} icon={<Text>📧</Text>} />
                <Input label="Contraseña" value={form.password} onChangeText={(v) => update('password', v)} placeholder="Mínimo 6 caracteres" secureTextEntry error={errors.password} icon={<Text>🔒</Text>} />
                <Button title="Continuar →" onPress={goNext} size="lg" style={{ marginTop: 8 }} />
              </>
            ) : (
              <>
                {/* Categoría */}
                <Text style={styles.sectionLabel}>¿Cuál es tu nivel?</Text>
                <Text style={styles.sectionHint}>Esto determina tu ELO inicial. Se ajustará con el tiempo.</Text>
                <View style={styles.grid}>
                  {CATEGORIES.map((c) => (
                    <TouchableOpacity
                      key={c.value}
                      style={[styles.optionCard, form.self_category === c.value && styles.optionSelected]}
                      onPress={() => update('self_category', c.value)}
                    >
                      <Text style={styles.optionEmoji}>{c.emoji}</Text>
                      <Text style={[styles.optionLabel, form.self_category === c.value && styles.optionLabelActive]}>{c.label}</Text>
                      <Text style={styles.optionElo}>{c.elo} ELO</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Posición */}
                <Text style={[styles.sectionLabel, { marginTop: 16 }]}>¿Jugás de?</Text>
                <View style={styles.row}>
                  {POSITIONS.map((p) => (
                    <TouchableOpacity
                      key={p.value}
                      style={[styles.posCard, form.position === p.value && styles.posCardActive, { flex: 1, marginHorizontal: 4 }]}
                      onPress={() => update('position', p.value)}
                    >
                      <Text style={styles.posEmoji}>{p.emoji}</Text>
                      <Text style={[styles.posLabel, form.position === p.value && styles.posLabelActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Paleta */}
                <Input
                  label="Paleta que usás (opcional)"
                  value={form.paddle_brand}
                  onChangeText={(v) => update('paddle_brand', v)}
                  placeholder="Ej: Head Alpha"
                  icon={<Text>🏓</Text>}
                  style={{ marginTop: 16 }}
                />

                <View style={styles.btnRow}>
                  <Button title="← Atrás" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
                  <Button title="¡Jugar!" onPress={handleRegister} loading={loading} style={{ flex: 2 }} />
                </View>
              </>
            )}

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginBtn}>
              <Text style={styles.loginText}>
                ¿Ya tenés cuenta? <Text style={styles.loginLink}>Iniciá sesión</Text>
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
  header: { alignItems: 'center', paddingTop: 50, paddingBottom: 30 },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text },
  steps: { flexDirection: 'row', gap: 8, marginTop: 16 },
  step: { width: 32, height: 4, borderRadius: 2, backgroundColor: colors.border },
  stepActive: { backgroundColor: colors.primary },
  form: { backgroundColor: colors.surface, borderRadius: radius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sectionHint: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionCard: {
    width: '47%',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  optionEmoji: { fontSize: 24, marginBottom: 4 },
  optionLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  optionLabelActive: { color: colors.primary },
  optionElo: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', marginHorizontal: -4 },
  posCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  posCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  posEmoji: { fontSize: 28, marginBottom: 6 },
  posLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  posLabelActive: { color: colors.primary },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  loginBtn: { alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: colors.textSecondary },
  loginLink: { color: colors.primary, fontWeight: '700' },
});
