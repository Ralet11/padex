import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { socialAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PlayerCard from '../../components/PlayerCard';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

const TABS = ['Buscar', 'Compañeros', 'Solicitudes'];

export default function SocialScreen({ navigation }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('Buscar');
  const [search, setSearch] = useState('');
  const [players, setPlayers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'Buscar') {
        const res = await socialAPI.players({ q: search || undefined });
        setPlayers(res.data.players);
      } else if (tab === 'Compañeros') {
        const res = await socialAPI.connections();
        setConnections(res.data.connections);
      } else {
        const res = await socialAPI.pending();
        setPending(res.data.pending);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, search]);

  useEffect(() => {
    const timer = setTimeout(fetchData, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  async function sendRequest(userId) {
    try {
      await socialAPI.connect(userId);
      Alert.alert('✅', 'Solicitud de conexión enviada');
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  async function respondRequest(id, action) {
    try {
      await socialAPI.respond(id, action);
      fetchData();
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  function getConnectionButton(player) {
    if (!player.connection_id) {
      return (
        <Button title="+ Conectar" onPress={() => sendRequest(player.id)} size="sm" />
      );
    }
    if (player.connection_status === 'pending') {
      const isMine = player.requester_id === user.id;
      return (
        <View style={styles.pendingChip}>
          <Text style={styles.pendingText}>{isMine ? '⏳ Enviada' : '⏳ Recibida'}</Text>
        </View>
      );
    }
    if (player.connection_status === 'accepted') {
      return (
        <View style={styles.connectedChip}>
          <Text style={styles.connectedText}>✓ Compañero</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
            {t === 'Solicitudes' && pending.length > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{pending.length}</Text></View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Search (solo en Buscar) */}
      {tab === 'Buscar' && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar jugadores..."
            placeholderTextColor={colors.textMuted}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* Content */}
      {tab === 'Buscar' && (
        <FlatList
          data={players}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PlayerCard
              player={item}
              onPress={() => navigation.navigate('PlayerProfile', { userId: item.id })}
              actionButton={getConnectionButton(item)}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🎾</Text>
              <Text style={styles.emptyText}>No se encontraron jugadores</Text>
            </View>
          ) : null}
        />
      )}

      {tab === 'Compañeros' && (
        <FlatList
          data={connections}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.connCard}
              onPress={() => navigation.navigate('Chat', { connectionId: item.id, partnerName: item.partner_name })}
            >
              <View style={styles.connLeft}>
                <View style={styles.connAvatar}>
                  <Text style={styles.connAvatarText}>{item.partner_name?.[0] || '?'}</Text>
                </View>
                <View>
                  <Text style={styles.connName}>{item.partner_name}</Text>
                  <Text style={styles.connMeta}>{item.partner_category} · {item.partner_elo} ELO</Text>
                  {item.last_message && <Text style={styles.lastMsg} numberOfLines={1}>{item.last_message}</Text>}
                </View>
              </View>
              <View style={styles.connRight}>
                {item.unread_count > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread_count}</Text>
                  </View>
                )}
                <Text style={styles.msgArrow}>💬</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🤝</Text>
              <Text style={styles.emptyText}>Aún no tenés compañeros{'\n'}Buscá jugadores y conectate</Text>
            </View>
          ) : null}
        />
      )}

      {tab === 'Solicitudes' && (
        <FlatList
          data={pending}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.requestCard}>
              <View style={styles.reqLeft}>
                <View style={styles.connAvatar}>
                  <Text style={styles.connAvatarText}>{item.name?.[0] || '?'}</Text>
                </View>
                <View>
                  <Text style={styles.connName}>{item.name}</Text>
                  <Text style={styles.connMeta}>{item.category} · {item.elo} ELO</Text>
                </View>
              </View>
              <View style={styles.reqBtns}>
                <Button title="✓" onPress={() => respondRequest(item.id, 'accept')} size="sm" style={styles.acceptBtn} />
                <Button title="✕" onPress={() => respondRequest(item.id, 'reject')} size="sm" variant="danger" style={styles.rejectBtn} />
              </View>
            </View>
          )}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={!loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📬</Text>
              <Text style={styles.emptyText}>Sin solicitudes pendientes</Text>
            </View>
          ) : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.primary },
  badge: { backgroundColor: colors.error, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    margin: spacing.md, borderRadius: radius.md, paddingHorizontal: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
  clearBtn: { color: colors.textMuted, fontSize: 16, padding: 4 },
  list: { padding: spacing.md, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
  pendingChip: { backgroundColor: colors.accentBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  pendingText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  connectedChip: { backgroundColor: colors.primaryBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  connectedText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  connCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder,
  },
  connLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  connAvatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  connAvatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  connName: { fontSize: 15, fontWeight: '700', color: colors.text },
  connMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  lastMsg: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  connRight: { alignItems: 'center', gap: 4 },
  unreadBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  msgArrow: { fontSize: 20 },
  requestCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder,
  },
  reqLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqBtns: { flexDirection: 'row', gap: 8 },
  acceptBtn: { width: 40, paddingHorizontal: 0 },
  rejectBtn: { width: 40, paddingHorizontal: 0 },
});
