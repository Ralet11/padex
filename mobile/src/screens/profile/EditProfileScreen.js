import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Avatar from '../../components/Avatar';
import { colors, spacing, radius } from '../../theme';

const POSITIONS = [
  { value: 'drive', label: 'Drive', emoji: '👈' },
  { value: 'reves', label: 'Revés', emoji: '👉' },
];

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    position: user?.position || 'drive',
    paddle_brand: user?.paddle_brand || '',
    preferred_partner: user?.preferred_partner || '',
    bio: user?.bio || '',
  });
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  function update(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return Alert.alert('Error', 'El nombre es requerido');
    setLoading(true);
    try {
      const res = await profileAPI.update(form);
      updateUser(res.data.user);
      Alert.alert('✅', 'Perfil actualizado', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarLoading(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('avatar', {
          uri: asset.uri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        const res = await profileAPI.uploadAvatar(formData);
        updateUser({ avatar: res.data.avatar });
        Alert.alert('✅', 'Foto de perfil actualizada');
      } catch (err) {
        Alert.alert('Error', err.message);
      } finally {
        setAvatarLoading(false);
      }
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar name={user?.name} uri={user?.avatar} size={90} category={user?.category} />
          <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickAvatar} disabled={avatarLoading}>
            <Text style={styles.changePhotoText}>{avatarLoading ? 'Subiendo...' : '📷 Cambiar foto'}</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <Input label="Nombre completo" value={form.name} onChangeText={(v) => update('name', v)} placeholder="Tu nombre" icon={<Text>👤</Text>} />

        <Text style={styles.sectionLabel}>Posición de juego</Text>
        <View style={styles.posRow}>
          {POSITIONS.map((p) => (
            <TouchableOpacity
              key={p.value}
              style={[styles.posCard, form.position === p.value && styles.posCardActive]}
              onPress={() => update('position', p.value)}
            >
              <Text style={styles.posEmoji}>{p.emoji}</Text>
              <Text style={[styles.posLabel, form.position === p.value && styles.posLabelActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Paleta que usás" value={form.paddle_brand} onChangeText={(v) => update('paddle_brand', v)} placeholder="Ej: Head Alpha, Bullpadel..." icon={<Text>🏓</Text>} />
        <Input label="Compañero preferido" value={form.preferred_partner} onChangeText={(v) => update('preferred_partner', v)} placeholder="Nombre de tu compañero habitual" icon={<Text>🤝</Text>} />
        <Input
          label="Sobre mí"
          value={form.bio}
          onChangeText={(v) => update('bio', v)}
          placeholder="Contá algo sobre vos..."
          multiline
          numberOfLines={4}
          icon={<Text>📝</Text>}
        />

        {/* ELO info */}
        <View style={styles.eloInfo}>
          <Text style={styles.eloInfoTitle}>⭐ ELO: {user?.elo} — {user?.category}</Text>
          <Text style={styles.eloInfoText}>
            Tu ELO se ajusta automáticamente según las calificaciones que recibís de otros jugadores.
            No podés modificarlo manualmente.
          </Text>
        </View>

        <Button title="Guardar cambios" onPress={handleSave} loading={loading} size="lg" style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 20 },
  changePhotoBtn: {
    marginTop: 12, backgroundColor: colors.card, borderRadius: radius.full,
    paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: colors.border,
  },
  changePhotoText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: colors.textSecondary,
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  posRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  posCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  posCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  posEmoji: { fontSize: 28, marginBottom: 6 },
  posLabel: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  posLabelActive: { color: colors.primary },
  eloInfo: {
    backgroundColor: colors.primaryBg, borderRadius: radius.md,
    padding: 14, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.primary + '44',
  },
  eloInfoTitle: { fontSize: 15, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  eloInfoText: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
});
