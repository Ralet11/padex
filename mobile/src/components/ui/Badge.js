import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

export const Badge = ({
    label,
    variant = 'primary', // primary, secondary, danger, success, outline
    size = 'md', // sm, md
    icon,
    style,
}) => {
    const { colors, spacing, radius } = useTheme();

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return { backgroundColor: colors.primary, borderColor: colors.primary };
            case 'secondary':
                return { backgroundColor: colors.surfaceHighlight, borderColor: colors.border };
            case 'danger':
                return { backgroundColor: colors.danger, borderColor: colors.danger };
            case 'success':
                return { backgroundColor: colors.success, borderColor: colors.success };
            case 'outline':
                return { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1 };
            default:
                return { backgroundColor: colors.primary, borderColor: colors.primary };
        }
    };

    const getTextColor = () => {
        if (variant === 'secondary' || variant === 'outline') return colors.text.primary;
        if (variant === 'primary' || variant === 'danger' || variant === 'success') return colors.text.inverse;
        return colors.text.primary;
    };

    return (
        <View
            style={[
                styles.container,
                {
                    borderRadius: radius.full,
                    paddingHorizontal: size === 'sm' ? spacing.xs : spacing.sm,
                    paddingVertical: size === 'sm' ? 2 : 4,
                    borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
                },
                getVariantStyles(),
                style,
            ]}
        >
            {icon && <View style={{ marginRight: 4 }}>{icon}</View>}
            <Typography
                variant={size === 'sm' ? 'captionMedium' : 'bodyMedium'}
                style={{ color: getTextColor(), fontSize: size === 'sm' ? 10 : 12 }}
            >
                {label}
            </Typography>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
    },
});
