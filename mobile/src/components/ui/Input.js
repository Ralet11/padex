import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';
import { Eye, EyeOff } from 'lucide-react-native';

export const Input = ({
    label,
    error,
    leftIcon,
    rightIcon,
    secureTextEntry,
    style,
    containerStyle,
    inputStyle,
    labelStyle,
    errorStyle,
    onFocus,
    onBlur,
    ...props
}) => {
    const { colors, spacing, radius } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleFocus = (e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
    };

    const handleBlur = (e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
    };

    const getBorderColor = () => {
        if (error) return colors.danger;
        if (isFocused) return colors.primary;
        return colors.border;
    };

    return (
        <View style={[styles.container, style]}>
            {label && (
                <Typography variant="captionMedium" color="primary" style={[styles.label, labelStyle]}>
                    {label}
                </Typography>
            )}
            <View
                style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.surfaceHighlight,
                        borderRadius: radius.md,
                        paddingHorizontal: spacing.md,
                    },
                    containerStyle,
                    { borderColor: getBorderColor() },
                ]}
            >
                {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.text.primary },
                        inputStyle,
                    ]}
                    placeholderTextColor={colors.text.tertiary}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    secureTextEntry={secureTextEntry && !isPasswordVisible}
                    {...props}
                />
                {secureTextEntry ? (
                    <TouchableOpacity
                        accessibilityLabel={isPasswordVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                        accessibilityRole="button"
                        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                        onPress={() => setIsPasswordVisible((prev) => !prev)}
                        style={styles.rightIcon}
                    >
                        {isPasswordVisible ? (
                            <EyeOff color={colors.text.secondary} size={20} />
                        ) : (
                            <Eye color={colors.text.secondary} size={20} />
                        )}
                    </TouchableOpacity>
                ) : rightIcon ? (
                    <View style={styles.rightIcon}>{rightIcon}</View>
                ) : null}
            </View>
            {error && (
                <Typography variant="caption" color="danger" style={[styles.error, errorStyle]}>
                    {error}
                </Typography>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        marginBottom: 8,
        marginLeft: 4,
        fontSize: 11,
        lineHeight: 14,
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        height: 52, // Fixed height to prevent layout jumps on Android when typing
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        paddingVertical: 0, // Reset default padding
    },
    leftIcon: {
        marginRight: 8,
    },
    rightIcon: {
        marginLeft: 8,
    },
    error: {
        marginTop: 6,
        marginLeft: 4,
    },
});
