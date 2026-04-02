import React, { useRef, useEffect } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Pulse-animated placeholder for loading states.
 * Uses RN built-in Animated — no Reanimated dependency.
 *
 * @param {Object}  props
 * @param {number}  [props.width='100%']   — skeleton width
 * @param {number}  [props.height=16]       — skeleton height
 * @param {number}  [props.radius]          — border radius (defaults to radius.sm)
 * @param {Object}  [props.style]           — extra styles
 */
export const Skeleton = ({
    width = '100%',
    height = 16,
    radius,
    style,
}) => {
    const { colors, radius: themeRadius } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.base,
                {
                    width,
                    height,
                    borderRadius: radius ?? themeRadius.sm,
                    backgroundColor: colors.surfaceHighlight,
                    opacity,
                },
                style,
            ]}
        />
    );
};

/**
 * Convenience: a row of skeleton pills (e.g. list item loading).
 */
export const SkeletonRow = ({
    count = 3,
    itemHeight = 16,
    gap = 8,
    style,
}) => (
    <Animated.View style={[styles.row, { gap }, style]}>
        {Array.from({ length: count }).map((_, i) => (
            <Skeleton
                key={i}
                height={itemHeight}
                width={`${100 / count - 2}%`}
            />
        ))}
    </Animated.View>
);

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
