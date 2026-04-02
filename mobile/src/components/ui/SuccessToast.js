import React, { useEffect, useRef, useCallback } from 'react';
import { Animated, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from './Typography';

const SCREEN_WIDTH = Dimensions.get('window').width;

/**
 * Lightweight success toast with auto-dismiss.
 * Replaces Alert.alert('✅', ...) pattern.
 *
 * Usage — manage visibility with a parent state:
 *
 *   const [visible, setVisible] = useState(false);
 *   <SuccessToast visible={visible} message="Partido creado" onDismiss={() => setVisible(false)} />
 *
 * @param {Object}  props
 * @param {boolean} props.visible          — controlled visibility
 * @param {string}  props.message          — toast text
 * @param {number}  [props.duration=2500]  — auto-dismiss ms (0 to disable)
 * @param {Function} [props.onDismiss]     — called after exit animation
 * @param {string}  [props.icon]           — custom icon / emoji (default ✓)
 * @param {Object}  [props.style]          — extra toast styles
 */
export const SuccessToast = ({
    visible,
    message,
    duration = 2500,
    onDismiss,
    icon = '✓',
    style,
}) => {
    const { colors, spacing, radius } = useTheme();
    const translateY = useRef(new Animated.Value(-80)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const dismissTimer = useRef(null);

    const animateIn = useCallback(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                friction: 7,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    }, [translateY, opacity]);

    const animateOut = useCallback(
        (cb) => {
            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -80,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => cb?.());
        },
        [translateY, opacity],
    );

    useEffect(() => {
        if (visible) {
            animateIn();
            if (duration > 0) {
                dismissTimer.current = setTimeout(() => {
                    animateOut(onDismiss);
                }, duration);
            }
        } else {
            // If visibility is externally set to false, animate out
            animateOut();
        }

        return () => {
            if (dismissTimer.current) clearTimeout(dismissTimer.current);
        };
    }, [visible, duration, animateIn, animateOut, onDismiss]);

    const handlePress = () => {
        if (dismissTimer.current) clearTimeout(dismissTimer.current);
        animateOut(onDismiss);
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: colors.success,
                    borderRadius: radius.md,
                    paddingVertical: spacing.sm + 2,
                    paddingHorizontal: spacing.md,
                    transform: [{ translateY }],
                    opacity,
                },
                style,
            ]}
        >
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.85}
                style={styles.touchable}
            >
                <Typography
                    variant="bodyBold"
                    style={[styles.icon, { color: colors.text.inverse }]}
                >
                    {icon}
                </Typography>
                <Typography
                    variant="bodyMedium"
                    style={[styles.message, { color: colors.text.inverse }]}
                    numberOfLines={2}
                >
                    {message}
                </Typography>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    toast: {
        position: 'absolute',
        top: 60,
        alignSelf: 'center',
        width: SCREEN_WIDTH - 40,
        zIndex: 9999,
        elevation: 10,
    },
    touchable: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        fontSize: 18,
        marginRight: 10,
    },
    message: {
        flex: 1,
    },
});
