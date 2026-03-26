import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const Card = ({
    children,
    style,
    onPress,
    variant = 'elevated', // elevated, flat, outline, glass
}) => {
    const { colors, radius, shadows, spacing } = useTheme();

    const getVariantStyles = () => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.surface,
                    ...shadows.md,
                };
            case 'flat':
                return {
                    backgroundColor: colors.surfaceHighlight,
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: colors.border,
                };
            case 'glass':
                return {
                    backgroundColor: colors.glassMask,
                    borderWidth: 1,
                    borderColor: colors.borderLight,
                };
            default:
                return { backgroundColor: colors.surface };
        }
    };

    const Component = onPress ? Pressable : View;

    return (
        <Component
            onPress={onPress}
            style={({ pressed }) => [
                styles.card,
                {
                    borderRadius: radius.lg,
                    padding: spacing.md,
                },
                getVariantStyles(),
                onPress && pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                style,
            ]}
        >
            {children}
        </Component>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '100%',
        overflow: 'hidden',
    },
});
