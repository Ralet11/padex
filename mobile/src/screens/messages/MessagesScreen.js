import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { socialAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { screenPadding } from '../../theme/layout';
import { InlineError, Skeleton } from '../../components/ui';

export default function MessagesScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  async function fetchConnections() {
    setError(null);
    try {
      const res = await socialAPI.connections();
      setConnections(res.data.connections);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchConnections();

    const socket = getSocket();
    if (socket) {
      socket.on('message_notification', fetchConnections);
      return () => socket.off('message_notification', fetchConnections);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchConnections();
    }, [])
  );

  function openChat(connection) {
    setConnections((prev) =>
      prev.map((item) =>
        item.id === connection.id ? { ...item, unread_count: 0 } : item
      )
    );

    navigation.navigate('Chat', {
      connectionId: connection.id,
      partnerName: connection.partner_name,
    });
  }

  const onRefresh = () => { setRefreshing(true); fetchConnections(); };

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[typography.h1, { color: colors.text.primary }]}>Mensajes</Text>
      <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
        Tus chats de Padel.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {error && !loading && (
        <InlineError message={error} onRetry={fetchConnections} style={{ marginHorizontal: screenPadding.horizontal, marginBottom: spacing.sm }} />
      )}
      {loading ? (
        <View style={{ paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.lg }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={64} radius={radius.lg} style={{ marginBottom: spacing.sm }} />
          ))}
        </View>
      ) : (
        <FlatList
        data={connections}
        ListHeaderComponent={renderHeader}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.item, { borderBottomColor: colors.borderLight }]}
            onPress={() => openChat(item)}
            activeOpacity={0.7}
            accessibilityLabel={`Abrir chat con ${item.partner_name}`}
            accessibilityRole="button"
          >
            <View style={styles.avatar}>
              <View style={[styles.avatarInner, { backgroundColor: colors.text.primary }]}>
                <Text style={[typography.h3, { color: colors.background }]}>{item.partner_name?.[0]?.toUpperCase() || '?'}</Text>
              </View>
              {/* Online Dot */}
              <View style={[styles.onlineDot, { backgroundColor: colors.accent, borderColor: colors.background }]} />
            </View>
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{item.partner_name}</Text>
                <Text style={[typography.caption, { color: item.unread_count > 0 ? colors.text.primary : colors.text.tertiary, fontWeight: item.unread_count > 0 ? '700' : '400' }]}>
                  {timeAgo(item.last_message_at)}
                </Text>
              </View>
              <View style={styles.bottomRow}>
                <Text
                  style={[typography.body, { flex: 1, color: item.unread_count > 0 ? colors.text.primary : colors.text.secondary, fontWeight: item.unread_count > 0 ? '600' : '400' }]}
                  numberOfLines={1}
                >
                  {item.last_message || 'Sin mensajes aún'}
                </Text>
                {item.unread_count > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.text.primary }]}>
                    <Text style={[styles.badgeText, { color: colors.accent }]}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="message-circle" size={48} color={colors.text.tertiary} style={{ marginBottom: spacing.md }} />
            <Text style={[typography.h3, { color: colors.text.primary, marginBottom: 4 }]}>Sin conversaciones</Text>
            <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>Conectate con jugadores en Social para empezar a chatear.</Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  list: { paddingBottom: 110 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  avatar: { position: 'relative' },
  avatarInner: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7, borderWidth: 2,
  },
  content: { flex: 1, marginLeft: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: {
    borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: spacing.xl },
});
