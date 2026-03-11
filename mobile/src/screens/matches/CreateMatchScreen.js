import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { courtsAPI, matchesAPI } from '../../services/api';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { colors, spacing, radius } from '../../theme';

export default function CreateMatchScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: court, 2: slot, 3: details
  const [courts, setCourts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedCourt, setSelectedCourt] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [form, setForm] = useState({ title: '', description: '', min_players: '3', max_players: '4' });
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Generar próximos 7 días
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      value: d.toISOString().split('T')[0],
      label: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: i === 0,
    };
  });

  useEffect(() => {
    courtsAPI.list().then((r) => setCourts(r.data.courts)).catch(console.error);
    setSelectedDate(dates[0].value);
  }, []);

  useEffect(() => {
    if (selectedCourt && selectedDate) {
      fetchSlots();
    }
  }, [selectedCourt, selectedDate]);

  async function fetchSlots() {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await courtsAPI.slots(selectedCourt.id, selectedDate);
      setSlots(res.data.slots.filter((s) => s.is_available));
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function handleCreate() {
    if (!selectedSlot) return Alert.alert('Error', 'Seleccioná un turno');
    const minP = parseInt(form.min_players);
    const maxP = parseInt(form.max_players);
    if (minP < 2 || maxP > 4 || minP > maxP) {
      return Alert.alert('Error', 'Jugadores: mínimo 2, máximo 4');
    }

    setLoading(true);
    try {
      const res = await matchesAPI.create({
        slot_id: selectedSlot.id,
        title: form.title || undefined,
        description: form.description || undefined,
        min_players: minP,
        max_players: maxP,
      });
      Alert.alert('🎾 ¡Partido creado!', 'Tu partido ya está visible en el buscador', [
        { text: 'Ver partido', onPress: () => navigation.navigate('Home', { screen: 'MatchDetail', params: { matchId: res.data.match.id } }) },
        { text: 'Ok', style: 'cancel' },
      ]);
      navigation.navigate('Inicio');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['Cancha', 'Turno', 'Detalles'].map((label, i) => (
        <View key={i} style={styles.stepItem}>
          <View style={[styles.stepCircle, step > i + 1 && styles.stepDone, step === i + 1 && styles.stepCurrent]}>
            <Text style={[styles.stepNum, (step >= i + 1) && styles.stepNumActive]}>
              {step > i + 1 ? '✓' : i + 1}
            </Text>
          </View>
          <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{label}</Text>
          {i < 2 && <View style={[styles.stepLine, step > i + 1 && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}

        {/* STEP 1: Seleccionar cancha */}
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>¿En qué cancha jugás?</Text>
            {courts.map((court) => (
              <TouchableOpacity
                key={court.id}
                style={[styles.courtCard, selectedCourt?.id === court.id && styles.courtSelected]}
                onPress={() => setSelectedCourt(court)}
              >
                <Text style={styles.courtEmoji}>🏟️</Text>
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  <Text style={styles.courtAddress} numberOfLines={1}>{court.address}</Text>
                </View>
                {selectedCourt?.id === court.id && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            ))}
            <Button
              title="Siguiente →"
              onPress={() => { if (!selectedCourt) return Alert.alert('Error', 'Seleccioná una cancha'); setStep(2); }}
              style={{ marginTop: 16 }}
              size="lg"
            />
          </View>
        )}

        {/* STEP 2: Seleccionar turno */}
        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>¿Qué día y hora?</Text>

            {/* Selector de fecha */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dates.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, selectedDate === d.value && styles.dateChipActive]}
                  onPress={() => setSelectedDate(d.value)}
                >
                  <Text style={[styles.dateText, selectedDate === d.value && styles.dateTextActive]}>
                    {d.isToday ? 'Hoy' : d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loadingSlots ? (
              <Text style={styles.loadingText}>Cargando turnos...</Text>
            ) : slots.length === 0 ? (
              <Text style={styles.emptyText}>No hay turnos disponibles para este día</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => (
                  <TouchableOpacity
                    key={slot.id}
                    style={[styles.slotCard, selectedSlot?.id === slot.id && styles.slotSelected]}
                    onPress={() => setSelectedSlot(slot)}
                  >
                    <Text style={[styles.slotTime, selectedSlot?.id === slot.id && styles.slotTimeActive]}>
                      {slot.time}
                    </Text>
                    <Text style={styles.slotPrice}>${slot.price?.toLocaleString('es-AR')}</Text>
                    {slot.has_match > 0 && <Text style={styles.slotPartidos}>+{slot.has_match} partido(s)</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.btnRow}>
              <Button title="← Atrás" onPress={() => setStep(1)} variant="secondary" style={{ flex: 1 }} />
              <Button
                title="Siguiente →"
                onPress={() => { if (!selectedSlot) return Alert.alert('Error', 'Seleccioná un turno'); setStep(3); }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        )}

        {/* STEP 3: Detalles */}
        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Detalles del partido</Text>

            {/* Resumen */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>📍 {selectedCourt?.name}</Text>
              <Text style={styles.summaryLabel}>📅 {selectedDate} · ⏰ {selectedSlot?.time}</Text>
              <Text style={styles.summaryLabel}>💰 ${selectedSlot?.price?.toLocaleString('es-AR')} / persona</Text>
            </View>

            <Input
              label="Título (opcional)"
              value={form.title}
              onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
              placeholder="Ej: Partido amistoso tarde"
            />
            <Input
              label="Descripción (opcional)"
              value={form.description}
              onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
              placeholder="Nivel requerido, observaciones..."
              multiline
              numberOfLines={3}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Mínimo jugadores"
                  value={form.min_players}
                  onChangeText={(v) => setForm((p) => ({ ...p, min_players: v }))}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Input
                  label="Máximo jugadores"
                  value={form.max_players}
                  onChangeText={(v) => setForm((p) => ({ ...p, max_players: v }))}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.btnRow}>
              <Button title="← Atrás" onPress={() => setStep(2)} variant="secondary" style={{ flex: 1 }} />
              <Button title="Crear partido 🎾" onPress={handleCreate} loading={loading} style={{ flex: 2 }} />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 24, position: 'relative' },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card,
    borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  stepCurrent: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  stepDone: { borderColor: colors.primary, backgroundColor: colors.primary },
  stepNum: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  stepNumActive: { color: colors.text },
  stepLabel: { fontSize: 11, color: colors.textMuted, marginLeft: 6, marginRight: 6 },
  stepLabelActive: { color: colors.primary },
  stepLine: { width: 20, height: 2, backgroundColor: colors.border },
  stepLineDone: { backgroundColor: colors.primary },
  stepTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16 },
  courtCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: radius.md, padding: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: colors.border,
  },
  courtSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  courtEmoji: { fontSize: 28, marginRight: 12 },
  courtInfo: { flex: 1 },
  courtName: { fontSize: 15, fontWeight: '700', color: colors.text },
  courtAddress: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  checkmark: { fontSize: 18, color: colors.primary, fontWeight: '700' },
  dateScroll: { marginBottom: 16 },
  dateChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginRight: 8,
  },
  dateChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dateText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  dateTextActive: { color: colors.white },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  slotCard: {
    width: '30%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 10, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  slotSelected: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  slotTime: { fontSize: 15, fontWeight: '700', color: colors.text },
  slotTimeActive: { color: colors.primary },
  slotPrice: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  slotPartidos: { fontSize: 10, color: colors.accent, marginTop: 2 },
  summaryCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    borderWidth: 1, borderColor: colors.cardBorder, marginBottom: 16, gap: 6,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  row: { flexDirection: 'row' },
  loadingText: { textAlign: 'center', color: colors.textMuted, marginVertical: 20 },
  emptyText: { textAlign: 'center', color: colors.textMuted, marginVertical: 20 },
});
