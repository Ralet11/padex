import React from 'react';
import { View, Pressable, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { shadows, spacing } from '../../theme/spacing';

const TabIcon = ({ name, iconName, isFocused, onPress }) => {
    const { colors, isDark } = useTheme();
    const scaleValue = React.useRef(new Animated.Value(1)).current;

    const animatePress = (inPress) => {
        Animated.spring(scaleValue, {
            toValue: inPress ? 0.8 : 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 12
        }).start();
    };

    const isCenter = name === 'Crear';

    return (
        <Pressable
            onPress={onPress}
            onPressIn={() => animatePress(true)}
            onPressOut={() => animatePress(false)}
            style={styles.tabButton}
        >
            <Animated.View style={[
                styles.iconContainer,
                isCenter && [
                    styles.centerButton,
                    { backgroundColor: colors.text.primary, shadowColor: isDark ? '#000' : colors.text.primary }
                ],
                { transform: [{ scale: scaleValue }] }
            ]}>
                <Feather
                    name={isCenter ? 'plus' : iconName}
                    size={isCenter ? 26 : 24}
                    color={isCenter ? colors.accent : (isFocused ? colors.text.primary : colors.text.tertiary)}
                />
            </Animated.View>
        </Pressable>
    );
};

export const FloatingTabBar = ({ state, descriptors, navigation }) => {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const bottomOffset = Math.max(insets.bottom, spacing.sm);
    const solidBackground = isDark ? 'rgba(8,8,8,0.96)' : 'rgba(255,255,255,0.985)';
    const insetMask = isDark ? '#000000' : colors.background;
    const fadeColors = isDark
        ? ['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.52)', 'rgba(0,0,0,0.86)', 'rgba(0,0,0,1)']
        : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.58)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,1)'];

    return (
        <View pointerEvents="box-none" style={styles.portal}>
            {insets.bottom > 0 ? (
                <View
                    pointerEvents="none"
                    style={[styles.bottomInsetMask, { height: insets.bottom, backgroundColor: insetMask }]}
                />
            ) : null}
            <View pointerEvents="box-none" style={[styles.wrapper, { bottom: bottomOffset }]}>
            <LinearGradient
                pointerEvents="none"
                colors={fadeColors}
                locations={[0, 0.18, 0.42, 0.72, 1]}
                style={[styles.bottomFade, { top: 30, height: 36 + bottomOffset + 36 }]}
            />
            <View style={[
                styles.container,
                { backgroundColor: solidBackground },
                { borderColor: isDark ? '#232326' : '#E4E4E7', ...shadows.md }
            ]}>
                <BlurView
                    intensity={24}
                    tint={isDark ? "dark" : "light"}
                    style={styles.blurView}
                >
                    <View style={styles.content}>
                        {state.routes.map((route, index) => {
                            const isFocused = state.index === index;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name);
                                }
                            };

                            let iconName = 'circle';
                            if (route.name === 'Inicio') iconName = 'home';
                            if (route.name === 'Social') iconName = 'users';

                            if (route.name === 'Mensajes') iconName = 'message-square';
                            if (route.name === 'Perfil') iconName = 'user';

                            return (
                                <TabIcon
                                    key={route.key}
                                    name={route.name}
                                    iconName={iconName}
                                    isFocused={isFocused}
                                    onPress={onPress}
                                />
                            );
                        })}
                    </View>
                </BlurView>
            </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    portal: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-end',
        zIndex: 20,
        elevation: 20,
    },
    bottomInsetMask: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    wrapper: {
        position: 'absolute',
        left: spacing.xl,
        right: spacing.xl,
        bottom: 0,
    },
    bottomFade: {
        position: 'absolute',
        left: -spacing.xl,
        right: -spacing.xl,
        bottom: undefined,
        zIndex: 2,
    },
    container: {
        height: 60,
        borderRadius: 30,
        borderWidth: 1,
        overflow: 'hidden',
        zIndex: 3,
    },
    blurView: {
        flex: 1,
    },
    content: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: spacing.sm,
    },
    tabButton: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 22,
    },
    centerButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        elevation: 6,
    }
});
