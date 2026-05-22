import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getLocationAddress, getLocationName, getVenueMapPreviewSources } from '../utils/maps';

function getTitle(location) {
  return getLocationName(location) || 'Ubicacion';
}

function getAddress(location) {
  return getLocationAddress(location) || 'Direccion no disponible';
}

export default function VenueMapPreview({
  location,
  onPress,
  style,
  eyebrow = 'UBICACION',
}) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(Boolean(location));
  const [hasError, setHasError] = useState(false);
  const [sourceIndex, setSourceIndex] = useState(0);

  const previewSources = useMemo(() => getVenueMapPreviewSources(location), [location]);
  const mapUrl = previewSources[sourceIndex] || null;
  const title = getTitle(location);
  const address = getAddress(location);

  useEffect(() => {
    setSourceIndex(0);
    setIsLoading(previewSources.length > 0);
    setHasError(false);
  }, [previewSources]);

  if (!getLocationAddress(location)) return null;

  return (
    <View style={style}>
      <Text style={[typography.captionMedium, styles.eyebrow, { color: colors.text.tertiary }]}>
        {eyebrow}
      </Text>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={onPress ? `Abrir mapa de ${title}` : undefined}
        style={[
          styles.card,
          {
            backgroundColor: colors.surfaceHighlight,
            borderColor: colors.borderLight,
          },
        ]}
      >
        <View style={[styles.mapFrame, { backgroundColor: colors.background }]}>
          {mapUrl && !hasError ? (
            <>
              <Image
                source={{ uri: mapUrl }}
                key={mapUrl}
                style={styles.mapImage}
                resizeMode="cover"
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => setIsLoading(false)}
                onError={() => {
                  const nextIndex = sourceIndex + 1;
                  if (nextIndex < previewSources.length) {
                    setSourceIndex(nextIndex);
                    setIsLoading(true);
                    return;
                  }

                  setHasError(true);
                  setIsLoading(false);
                }}
              />
              {isLoading ? (
                <View style={[styles.loadingOverlay, { backgroundColor: colors.glassMask }]}>
                  <ActivityIndicator color={colors.text.primary} />
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.fallbackMap}>
              <View style={[styles.fallbackPin, { backgroundColor: colors.surface }]}>
                <Feather name="map-pin" size={18} color={colors.text.secondary} />
              </View>
              <Text style={[typography.captionMedium, { color: colors.text.secondary, marginTop: spacing.sm }]}>
                Vista previa no disponible
              </Text>
            </View>
          )}

          <View style={[styles.mapBadge, { backgroundColor: colors.surface }]}>
            <Feather name="map-pin" size={12} color={colors.text.secondary} />
            <Text style={[typography.captionMedium, { color: colors.text.primary }]}>Ver zona</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={[styles.infoIcon, { backgroundColor: colors.background }]}>
            <Feather name="navigation" size={14} color={colors.text.secondary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]} numberOfLines={2}>
              {address}
            </Text>
          </View>
          {onPress ? <Feather name="external-link" size={14} color={colors.text.tertiary} /> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    letterSpacing: 0.9,
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapFrame: {
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fallbackPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBadge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCopy: {
    flex: 1,
  },
});
