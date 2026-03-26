import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

export const Avatar = ({
    src,
    name,
    size = 40,
    fallbackColor = 'primaryMuted',
    style,
}) => {
    const { colors } = useTheme();

    // Get initials if no image is provided
    const getInitials = () => {
        if (!name) return '?';
        const parts = name.split(' ');
        if (parts.length > 1) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const containerStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors[fallbackColor] || colors.primaryMuted,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    };

    return (
        <View style={[containerStyle, style]}>
            {src ? (
                <Image source={{ uri: src }} style={{ width: '100%', height: '100%' }} />
            ) : (
                <Typography
                    variant="bodyBold"
                    style={{
                        fontSize: size * 0.4,
                        color: colors.primary,
                    }}
                >
                    {getInitials()}
                </Typography>
            )}
        </View>
    );
};
