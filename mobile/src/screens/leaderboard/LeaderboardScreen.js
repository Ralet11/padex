import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, shadows, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import api from '../../services/api';
import { RANK_ARRAY, getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';



export default function LeaderboardScreen({ navigation }) {
    const { colors, isDark } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState(7);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [selectedCategory]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/leaderboard/${selectedCategory}`);
            setLeaderboard(response.data.leaderboard);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.topRow}>
                <TouchableOpacity 
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { backgroundColor: colors.surfaceHighlight }]}
                >
                    <Feather name="chevron-left" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.seasonBadge}>
                    <Text style={[typography.label, { color: colors.accent }]}>TEMPORADA 1</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.titleContainer}>
                <Text style={[typography.h1, { color: colors.text.primary }]}>Rankings</Text>
                <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
                    Los mejores jugadores de la comunidad.
                </Text>
            </View>
            
            <View style={styles.categoryTabs}>
                <FlatList
                    data={RANK_ARRAY}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            onPress={() => setSelectedCategory(item.id)}
                            style={[
                                styles.tab,
                                selectedCategory === item.id && { backgroundColor: colors.text.primary }
                            ]}
                        >
                            <Text
                                style={[
                                    typography.label,
                                    styles.tabText,
                                    selectedCategory === item.id ? { color: colors.accent } : { color: colors.text.secondary }
                                ]}
                            >
                                {item.name.split(' ')[0]}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </View>
    );

    const renderItem = ({ item, index }) => {
        const rank = getRankByTier(selectedCategory);
        const isTop3 = index < 3;
        
        return (
            <TouchableOpacity 
                style={styles.playerCard}
                onPress={() => navigation.navigate('PlayerProfile', { userId: item.id })}
            >
                <View style={styles.rankContainer}>
                    <Text 
                        style={[
                            typography.h3,
                            styles.rank, 
                            isTop3 && { color: colors.accent }
                        ]}
                    >
                        {index + 1}
                    </Text>
                </View>

                <View style={styles.avatarContainer}>
                    {item.avatar ? (
                        <Image source={{ uri: item.avatar }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surface }]}>
                            <Feather name="user" size={20} color={colors.text.tertiary} />
                        </View>
                    )}
                    {isTop3 && (
                        <View style={styles.crown}>
                            <Feather name="award" size={12} color={colors.accent} />
                        </View>
                    )}
                </View>

                <View style={styles.playerInfo}>
                    <Text style={[typography.bodyBold, { color: colors.text.primary }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[typography.caption, { color: colors.text.tertiary }]}>
                        {item.wins}V - {item.losses}D • {item.position}
                    </Text>
                </View>

                <View style={styles.pointsContainer}>
                    <Feather name="star" size={14} color={rank.starColor} style={{ marginRight: 4 }} />
                    <Text style={[typography.h3, { color: colors.text.primary, fontWeight: '700' }]}>{item.stars}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            {renderHeader()}
            
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent} size="large" />
                </View>
            ) : (
                <FlatList
                    data={leaderboard}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="info" size={40} color={colors.text.tertiary} />
                            <Text style={[typography.body, styles.emptyText, { color: colors.text.secondary }]}>
                                No hay jugadores en esta categoría todavía.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingBottom: spacing.md,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: screenPadding.horizontal,
        paddingVertical: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        paddingHorizontal: screenPadding.horizontal,
        paddingTop: spacing.md,
        paddingBottom: spacing.lg,
    },
    title: {
        fontWeight: '900',
    },
    seasonBadge: {
        backgroundColor: '#000',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: 'rgba(167, 206, 41, 0.3)',
    },
    categoryTabs: {
        paddingLeft: screenPadding.horizontal,
    },
    tab: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: radius.full,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    tabText: {
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: screenPadding.horizontal,
        paddingBottom: 100,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    rankContainer: {
        width: 40,
        alignItems: 'center',
    },
    rank: {
        fontWeight: '900',
        fontSize: 20,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: spacing.md,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    crown: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#000',
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#A7CE29',
    },
    playerInfo: {
        flex: 1,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: radius.md,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 100,
        opacity: 0.5,
    },
    emptyText: {
        marginTop: spacing.md,
        textAlign: 'center',
    }
});
