import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Avatar from '../../components/Avatar';
import { screenPadding } from '../../theme/layout';

const POSITIONS = [
  { value: 'drive', label: 'Drive', icon: 'corner-down-left' },
  { value: 'reves', label: 'Revés', icon: 'corner-down-right' },
];

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { colors, isDark } = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar name={user?.name} uri={user?.avatar} size={100} category={user?.category} />
          <TouchableOpacity
            style={[styles.changePhotoBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}
            onPress={handlePickAvatar}
            disabled={avatarLoading}
          >
            <Feather name="camera" size={14} color={colors.text.primary} />
            <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 6 }]}>
              {avatarLoading ? 'Subiendo...' : 'Cambiar foto'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <Input
          label="Nombre completo"
          value={form.name}
          onChangeText={(v) => update('name', v)}
          placeholder="Tu nombre"
          icon={<Feather name="user" size={18} color={colors.text.tertiary} />}
        />

        <Text style={[typography.label, { color: colors.text.secondary, marginBottom: spacing.xs, marginTop: spacing.sm }]}>Posición de juego</Text>
        <View style={styles.posRow}>
          {POSITIONS.map((p) => {
            const isActive = form.position === p.value;
            return (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.posCard,
                  {
                    backgroundColor: isActive ? colors.text.primary : colors.surface,
                    borderColor: isActive ? colors.text.primary : colors.borderLight
                  },
                  isActive && shadows.sm
                ]}
                onPress={() => update('position', p.value)}
              >
                <Feather name={p.icon} size={20} color={isActive ? colors.background : colors.text.tertiary} style={{ marginBottom: 6 }} />
                <Text style={[typography.bodyBold, { color: isActive ? colors.background : colors.text.secondary }]}>{p.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <Input
          label="Paleta"
          value={form.paddle_brand}
          onChangeText={(v) => update('paddle_brand', v)}
          placeholder="Ej: Head Alpha, Bullpadel..."
          icon={<Feather name="shield" size={18} color={colors.text.tertiary} />}
          style={{ marginTop: spacing.md }}
        />

        <Input
          label="Compañero preferido"
          value={form.preferred_partner}
          onChangeText={(v) => update('preferred_partner', v)}
          placeholder="Nombre de tu compañero habitual"
          icon={<Feather name="users" size={18} color={colors.text.tertiary} />}
        />

        <Input
          label="Biografía"
          value={form.bio}
          onChangeText={(v) => update('bio', v)}
          placeholder="Contá algo sobre vos..."
          multiline
          numberOfLines={4}
          icon={<Feather name="align-left" size={18} color={colors.text.tertiary} />}
        />

        {/* ELO info */}
        <View style={[styles.eloInfo, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
          <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: 4 }]}>
            <Feather name="star" size={14} color={colors.text.primary} /> ELO: {user?.elo} — {user?.category}
          </Text>
          <Text style={[typography.caption, { color: colors.text.tertiary, lineHeight: 18 }]}>
            Tu ELO se ajusta automáticamente según las calificaciones obtenidas y el resultado de tus partidos.
          </Text>
        </View>

        <Button title="Guardar cambios" onPress={handleSave} loading={loading} size="lg" style={{ marginTop: spacing.md }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingVertical: spacing.md, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  posRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  posCard: {
    flex: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  eloInfo: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
  },
});
