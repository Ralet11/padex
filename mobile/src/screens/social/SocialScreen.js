import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { socialAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius, shadows } from '../../theme/spacing';
import PlayerCard from '../../components/PlayerCard';
import Button from '../../components/Button';
import { getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';

const TABS = ['Buscar', 'Compañeros', 'Solicitudes'];

export default function SocialScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

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

  useFocusEffect(
    useCallback(() => {
      if (tab === 'CompaÃ±eros') {
        fetchData();
      }
    }, [fetchData, tab])
  );

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  async function sendRequest(userId) {
    try {
      await socialAPI.connect(userId);
      Alert.alert('✅', 'Solicitud enviada');
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

  function getConnectionButton(player) {
    if (!player.connection_id) {
      return (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.text.primary }]}
          onPress={() => sendRequest(player.id)}
        >
          <Text style={[typography.captionMedium, { color: colors.accent }]}>Conectar</Text>
        </TouchableOpacity>
      );
    }
    if (player.connection_status === 'pending') {
      const isMine = player.requester_id === user.id;
      return (
        <View style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>{isMine ? 'Enviada' : 'Pendiente'}</Text>
        </View>
      );
    }
    if (player.connection_status === 'accepted') {
      return (
        <View style={[styles.chip, { backgroundColor: colors.surfaceHighlight }]}>
          <Text style={[typography.captionMedium, { color: colors.accent }]}>✓ Compañero</Text>
        </View>
      );
    }
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      {/* Modern Header */}
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text.primary }]}>Social</Text>
        <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>Conecta con otros jugadores.</Text>
      </View>

      {/* Segmented iOS-style Tabs */}
      <View style={{ paddingHorizontal: screenPadding.horizontal, marginBottom: spacing.md }}>
        <View style={[styles.segmentedControl, { backgroundColor: colors.surfaceHighlight }]}>
          {TABS.map((t) => {
            const isActive = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, isActive && { backgroundColor: colors.text.primary, ...shadows.sm }]}
                onPress={() => setTab(t)}
              >
                <Text style={[
                  typography.label,
                  { color: isActive ? colors.accent : colors.text.secondary },
                  isActive && { fontWeight: '700' }
                ]}>
                  {t}
                </Text>
                {t === 'Solicitudes' && pending.length > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{pending.length}</Text></View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Search Input */}
      {tab === 'Buscar' && (
        <View style={{ paddingHorizontal: screenPadding.horizontal, marginBottom: spacing.md }}>
          <View style={[styles.searchBar, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
            <Feather name="search" size={18} color={colors.text.tertiary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text.primary }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por nombre..."
              placeholderTextColor={colors.text.tertiary}
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}>
                <Feather name="x-circle" size={18} color={colors.text.tertiary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1 }}>
        {tab === 'Buscar' && (
          <FlatList
            data={players}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.itemWrap}>
                <PlayerCard
                  player={item}
                  onPress={() => navigation.navigate('PlayerProfile', { userId: item.id })}
                  actionButton={getConnectionButton(item)}
                />
              </View>
            )}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.primary} />}
            ListEmptyComponent={!loading ? (
              <View style={styles.empty}>
                <Feather name="search" size={32} color={colors.text.tertiary} style={{ marginBottom: spacing.sm }} />
                <Text style={[typography.body, { color: colors.text.secondary }]}>No se encontraron jugadores</Text>
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
                style={[styles.connCard, { borderBottomColor: colors.borderLight }]}
                onPress={() => openChat(item)}
              >
                <View style={styles.connLeft}>
                  <View style={[styles.connAvatar, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[typography.h3, { color: colors.text.primary }]}>{item.partner_name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View>
                    <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{item.partner_name}</Text>
                    <Text style={[typography.caption, { color: colors.text.secondary, textTransform: 'capitalize' }]}>
                      {getRankByTier(item.partner_category_tier).name} · {item.partner_stars} Estrellas
                    </Text>
                    {item.last_message && <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 4 }]} numberOfLines={1}>{item.last_message}</Text>}
                  </View>
                </View>
                <View style={styles.connRight}>
                  {item.unread_count > 0 && (
                    <View style={[styles.unreadBadge, { backgroundColor: colors.text.primary }]}>
                      <Text style={[styles.unreadText, { color: colors.accent }]}>{item.unread_count}</Text>
                    </View>
                  )}
                  <Feather name="chevron-right" size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.primary} />}
            ListEmptyComponent={!loading ? (
              <View style={styles.empty}>
                <Feather name="users" size={32} color={colors.text.tertiary} style={{ marginBottom: spacing.sm }} />
                <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>Aún no tenés compañeros{'\n'}Buscá jugadores y conectate</Text>
              </View>
            ) : null}
          />
        )}

        {tab === 'Solicitudes' && (
          <FlatList
            data={pending}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={[styles.requestCard, { borderBottomColor: colors.borderLight }]}>
                <View style={styles.reqLeft}>
                  <View style={[styles.connAvatar, { backgroundColor: colors.surfaceHighlight }]}>
                    <Text style={[typography.h3, { color: colors.text.primary }]}>{item.name?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View>
                    <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{item.name}</Text>
                    <Text style={[typography.caption, { color: colors.text.secondary }]}>
                      {getRankByTier(item.category_tier).name} · {item.stars} Estrellas
                    </Text>
                  </View>
                </View>
                <View style={styles.reqBtns}>
                  <TouchableOpacity onPress={() => respondRequest(item.id, 'reject')} style={[styles.iconBtn, { backgroundColor: colors.surfaceHighlight }]}>
                    <Feather name="x" size={18} color={colors.text.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => respondRequest(item.id, 'accept')} style={[styles.iconBtn, { backgroundColor: colors.text.primary }]}>
                    <Feather name="check" size={18} color={colors.accent} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.primary} />}
            ListEmptyComponent={!loading ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={32} color={colors.text.tertiary} style={{ marginBottom: spacing.sm }} />
                <Text style={[typography.body, { color: colors.text.secondary }]}>Sin solicitudes pendientes</Text>
              </View>
            ) : null}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 12 },
  list: { paddingBottom: 120 }, // Leaves room for FloatingTabBar
  itemWrap: { paddingHorizontal: screenPadding.horizontal },
  empty: { alignItems: 'center', paddingVertical: 60 },
  actionButton: {
    borderRadius: radius.full,
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 6
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: 6
  },
  connCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: screenPadding.horizontal,
    borderBottomWidth: 1,
  },
  connLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  connAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  connRight: { alignItems: 'center', gap: 8, flexDirection: 'row' },
  unreadBadge: {
    borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  requestCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, paddingHorizontal: screenPadding.horizontal, borderBottomWidth: 1,
  },
  reqLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqBtns: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
