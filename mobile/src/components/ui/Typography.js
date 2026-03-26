import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export const Typography = ({
    variant = 'body',
    color = 'primary', // primary, secondary, tertiary, inverse, danger, success, string
    align = 'left',
    weight, // regular, medium, semiBold, bold (overrides variant if provided)
    style,
    children,
    ...props
}) => {
    const { colors, typography } = useTheme();

    const variantStyle = typography[variant] || typography.body;

    // Resolve color string or map to theme colors
    let textColor = colors.text.primary;
    if (color === 'secondary') textColor = colors.text.secondary;
    else if (color === 'tertiary') textColor = colors.text.tertiary;
    else if (color === 'inverse') textColor = colors.text.inverse;
    else if (color === 'danger') textColor = colors.danger;
    else if (color === 'success') textColor = colors.success;
    else if (color === 'brand') textColor = colors.primary;
    else if (color.startsWith('#') || color.startsWith('rgb')) textColor = color;

    // Resolve specific font family weight override
    let fontFamilyOverride = null;
    if (weight) {
        const familyKey = variant.startsWith('h') || variant === 'subtitle' ? 'h' : 'b';
        fontFamilyOverride = { fontFamily: typography.families[familyKey][weight] };
    }

    return (
        <Text
            style={[
                variantStyle,
                { color: textColor, textAlign: align },
                fontFamilyOverride,
                style,
            ]}
            {...props}
        >
            {children}
        </Text>
    );
};
