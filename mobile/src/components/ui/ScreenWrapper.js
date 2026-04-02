import React from 'react';
import { View, ScrollView, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { screenPadding } from '../../theme/layout';

/**
 * Themed layout wrapper for every screen.
 *
 * @param {Object}  props
 * @param {boolean} [props.scrollable=true]  — ScrollView vs plain View
 * @param {boolean} [props.refreshing=false] — pull-to-refresh state
 * @param {Function} [props.onRefresh]       — pull-to-refresh callback
 * @param {string[]} [props.edges=['top']]   — safe-area edges
 * @param {boolean} [props.disablePadding]   — remove horizontal padding
 * @param {React.ReactNode} props.children
 * @param {Object} [props.style]             — extra container styles
 * @param {Object} [props.contentStyle]      — extra content styles
 * @param {Object} [props.scrollViewProps]   — forwarded ScrollView props
 */
export const ScreenWrapper = ({
    children,
    scrollable = true,
    refreshing = false,
    onRefresh,
    edges = ['top'],
    disablePadding = false,
    style,
    contentStyle,
    scrollViewProps,
}) => {
    const { colors } = useTheme();

    const containerStyle = [
        styles.container,
        { backgroundColor: colors.background },
        style,
    ];

    const paddedContent = (
        <View style={[
            !disablePadding && styles.content,
            contentStyle,
        ]}>
            {children}
        </View>
    );

    const inner = scrollable ? (
        <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.text.secondary}
                        colors={[colors.accent]}
                    />
                ) : undefined
            }
            {...scrollViewProps}
        >
            {paddedContent}
        </ScrollView>
    ) : paddedContent;

    return (
        <SafeAreaView style={containerStyle} edges={edges}>
            {inner}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: screenPadding.horizontal,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
});
