import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { socialAPI } from '../../services/api';
import { getSocket } from '../../services/socket';
import { colors, spacing, radius } from '../../theme';

export default function MessagesScreen({ navigation }) {
  const [connections, setConnections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchConnections() {
    try {
      const res = await socialAPI.connections();
      setConnections(res.data.connections);
    } catch (err) {
      console.error(err);
    } finally {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.header}>Mensajes</Text>
      <FlatList
        data={connections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate('Chat', { connectionId: item.id, partnerName: item.partner_name })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.partner_name?.[0] || '?'}</Text>
              <View style={[styles.onlineDot, { backgroundColor: colors.primary }]} />
            </View>
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={styles.name}>{item.partner_name}</Text>
                <Text style={styles.time}>{timeAgo(item.last_message_at)}</Text>
              </View>
              <View style={styles.bottomRow}>
                <Text style={[styles.lastMsg, item.unread_count > 0 && styles.unread]} numberOfLines={1}>
                  {item.last_message || 'Sin mensajes aún'}
                </Text>
                {item.unread_count > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Sin conversaciones</Text>
            <Text style={styles.emptyText}>Conectate con jugadores para poder chatear</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { fontSize: 26, fontWeight: '800', color: colors.text, padding: spacing.md, paddingBottom: 8 },
  list: { paddingBottom: 80 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 14 },
  avatar: { position: 'relative' },
  avatarInner: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    width: 52, height: 52, lineHeight: 52, textAlign: 'center',
    color: '#fff', fontSize: 20, fontWeight: '700',
    backgroundColor: colors.primary, borderRadius: 26, overflow: 'hidden',
  },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.bg,
  },
  content: { flex: 1, marginLeft: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  time: { fontSize: 12, color: colors.textMuted },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMsg: { fontSize: 13, color: colors.textMuted, flex: 1 },
  unread: { color: colors.text, fontWeight: '600' },
  badge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: colors.divider, marginLeft: 76 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
