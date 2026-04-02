import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

/**
 * Themed inline error with optional retry button.
 * Replaces silent console.error failures with visible feedback.
 *
 * @param {Object}  props
 * @param {string}  props.message         — error text to display
 * @param {string}  [props.title]         — optional title above the message
 * @param {Function} [props.onRetry]      — retry callback; renders a button when present
 * @param {string}  [props.retryLabel='Reintentar'] — retry button label
 * @param {Object}  [props.style]         — extra container styles
 */
export const InlineError = ({
    message,
    title,
    onRetry,
    retryLabel = 'Reintentar',
    style,
}) => {
    const { colors, spacing, radius } = useTheme();

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: `${colors.danger}10`,
                    borderColor: `${colors.danger}30`,
                    borderRadius: radius.md,
                    padding: spacing.md,
                },
                style,
            ]}
        >
            <Typography
                variant="caption"
                style={[styles.icon, { color: colors.danger }]}
            >
                ⚠
            </Typography>

            <View style={styles.textContainer}>
                {title && (
                    <Typography
                        variant="bodyBold"
                        style={[styles.title, { color: colors.danger }]}
                    >
                        {title}
                    </Typography>
                )}
                <Typography
                    variant="body"
                    style={[styles.message, { color: colors.danger }]}
                >
                    {message}
                </Typography>
            </View>

            {onRetry && (
                <TouchableOpacity
                    onPress={onRetry}
                    activeOpacity={0.7}
                    style={[
                        styles.retryBtn,
                        {
                            borderColor: colors.danger,
                            borderRadius: radius.sm,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: spacing.xs,
                        },
                    ]}
                >
                    <Typography
                        variant="captionMedium"
                        style={{ color: colors.danger }}
                    >
                        {retryLabel}
                    </Typography>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    icon: {
        fontSize: 16,
        marginRight: 8,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        marginBottom: 2,
    },
    message: {
        opacity: 0.85,
    },
    retryBtn: {
        borderWidth: 1,
        marginLeft: 8,
    },
});
