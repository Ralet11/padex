import React, { useRef } from 'react';
import { Pressable, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = ({
    title,
    onPress,
    variant = 'solid', // solid | outline | ghost | danger
    size = 'md', // sm | md | lg
    disabled = false,
    loading = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
    textColor,
    loadingColor,
}) => {
    const { colors, spacing, radius } = useTheme();

    // Built-in Animated values for micro-interactions (bypassing Reanimated native crashes)
    const scale = useRef(new Animated.Value(1)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        if (!disabled && !loading) {
            Animated.spring(scale, {
                toValue: 0.96,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }).start();

            if (variant === 'ghost') {
                Animated.spring(opacity, {
                    toValue: 0.5,
                    useNativeDriver: true,
                }).start();
            }
        }
    };

    const handlePressOut = () => {
        if (!disabled && !loading) {
            Animated.spring(scale, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
            }).start();

            if (variant === 'ghost') {
                Animated.spring(opacity, {
                    toValue: 1,
                    useNativeDriver: true,
                }).start();
            }
        }
    };

    // Dynamic Styles based on variant
    const getVariantStyles = () => {
        switch (variant) {
            case 'solid':
                return {
                    backgroundColor: colors.primary,
                    borderWidth: 0,
                };
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: colors.primary,
                };
            case 'ghost':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                };
            case 'danger':
                return {
                    backgroundColor: colors.danger,
                    borderWidth: 0,
                };
            default:
                return { backgroundColor: colors.primary };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return { minHeight: 40, paddingHorizontal: spacing.md, paddingVertical: 0 };
            case 'lg':
                return { minHeight: 54, paddingHorizontal: spacing.xxl, paddingVertical: 0 };
            case 'md':
            default:
                return { minHeight: 48, paddingHorizontal: spacing.xl, paddingVertical: 0 };
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.text.tertiary;
        if (textColor) return textColor;
        switch (variant) {
            case 'solid':
            case 'danger':
                return colors.text.inverse; // Black text on green/red
            case 'outline':
            case 'ghost':
                return colors.primary;
            default:
                return colors.text.inverse;
        }
    };

    return (
        <AnimatedPressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[
                styles.base,
                { borderRadius: radius.lg },
                getVariantStyles(),
                getSizeStyles(),
                {
                    transform: [{ scale }],
                    opacity: disabled ? 0.6 : opacity,
                },
                style,
            ]}
        >
            {loading ? (
                <ActivityIndicator color={loadingColor || getTextColor()} size="small" />
            ) : (
                <>
                    {leftIcon}
                    <Typography
                        variant="bodyBold"
                        align="center"
                        style={[{ color: getTextColor() }, textStyle]}
                    >
                        {title}
                    </Typography>
                    {rightIcon}
                </>
            )}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
});
