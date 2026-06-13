import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from '../ui/Typography';

WebBrowser.maybeCompleteAuthSession();

function GoogleGlyph() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        fill="#EA4335"
        d="M12.24 10.285v3.821h5.445c-.24 1.55-1.835 4.548-5.445 4.548-3.277 0-5.949-2.713-5.949-6.06s2.672-6.06 5.95-6.06c1.863 0 3.11.793 3.823 1.476l2.6-2.52C17.003 3.948 14.86 3 12.24 3 7.17 3 3.057 7.148 3.057 12.594c0 5.446 4.113 9.594 9.183 9.594 5.302 0 8.817-3.72 8.817-8.967 0-.603-.066-1.062-.146-1.52z"
      />
      <Path
        fill="#34A853"
        d="M3.057 12.594c0 5.446 4.113 9.594 9.183 9.594 5.302 0 8.817-3.72 8.817-8.967 0-.603-.066-1.062-.146-1.52h-8.671v3.821h5.445c-.24 1.55-1.835 4.548-5.445 4.548-3.277 0-5.949-2.713-5.949-6.06z"
        opacity={0.18}
      />
      <Path
        fill="#FBBC05"
        d="M5.172 7.68L8.31 9.98a5.971 5.971 0 0 1 3.93-1.447c1.863 0 3.11.793 3.823 1.476l2.6-2.52C17.003 3.948 14.86 3 12.24 3c-3.525 0-6.523 2.035-8.068 4.68z"
      />
      <Path
        fill="#4285F4"
        d="M3.057 12.594c0 1.756.493 3.396 1.345 4.793l3.33-2.57a6.09 6.09 0 0 1-.342-2.223c0-.773.12-1.514.342-2.223L4.402 7.8a9.766 9.766 0 0 0-1.345 4.794z"
      />
    </Svg>
  );
}

function formatAppleFullName(fullName) {
  if (!fullName) return null;

  return {
    givenName: fullName.givenName || null,
    middleName: fullName.middleName || null,
    familyName: fullName.familyName || null,
  };
}

export default function SocialAuthSection({ caption = 'o continua con', density = 'default' }) {
  const { loginWithProvider } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const handledGoogleResponseRef = useRef(null);
  const isCompact = density === 'compact';

  const isExpoGo = Constants.executionEnvironment === 'storeClient';
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  const googleAndroidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || googleClientId;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || googleClientId;
  const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || googleClientId;

  const googleConfigured = Boolean(
    googleClientId || googleAndroidClientId || googleIosClientId || googleWebClientId
  );

  const googleRequestConfig = useMemo(
    () => ({
      clientId: googleClientId || googleWebClientId || 'missing-google-client-id',
      androidClientId: isExpoGo ? undefined : googleAndroidClientId,
      iosClientId: isExpoGo ? undefined : googleIosClientId,
      webClientId: googleWebClientId || googleClientId || 'missing-google-client-id',
      selectAccount: true,
    }),
    [
      googleAndroidClientId,
      googleClientId,
      googleIosClientId,
      googleWebClientId,
      isExpoGo,
    ]
  );

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest(googleRequestConfig, {
    path: 'oauthredirect',
  });

  useEffect(() => {
    let mounted = true;

    if (Platform.OS !== 'ios') {
      return undefined;
    }

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) {
          setAppleAvailable(available);
        }
      })
      .catch(() => {
        if (mounted) {
          setAppleAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadingProvider !== 'google' || !googleResponse) {
      return;
    }

    if (handledGoogleResponseRef.current === googleResponse) {
      return;
    }

    handledGoogleResponseRef.current = googleResponse;

    if (googleResponse.type !== 'success') {
      setLoadingProvider(null);
      return;
    }

    const idToken = googleResponse.params?.id_token || googleResponse.authentication?.idToken;

    if (!idToken) {
      Alert.alert('No pudimos continuar con Google', 'Google no devolvio un token de identidad valido');
      setLoadingProvider(null);
      return;
    }

    let cancelled = false;

    async function completeGoogleSignIn() {
      try {
        await loginWithProvider('google', { idToken });
      } catch (error) {
        if (!cancelled) {
          Alert.alert('No pudimos continuar con Google', error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingProvider(null);
        }
      }
    }

    completeGoogleSignIn();

    return () => {
      cancelled = true;
    };
  }, [googleResponse, loadingProvider, loginWithProvider]);

  async function handleGooglePress() {
    if (!googleConfigured) {
      Alert.alert(
        'Google no configurado',
        'Agrega tu client ID de Google en mobile/.env para habilitar este acceso.'
      );
      return;
    }

    if (!googleRequest) {
      Alert.alert('Google no está listo', 'Espera un segundo y vuelve a intentarlo.');
      return;
    }

    setLoadingProvider('google');

    try {
      const result = await promptGoogleAsync();
      if (result.type !== 'success') {
        setLoadingProvider(null);
      }
    } catch (error) {
      setLoadingProvider(null);
      Alert.alert('No pudimos continuar con Google', error.message);
    }
  }

  async function handleApplePress() {
    setLoadingProvider('apple');

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple no devolvio un token de identidad valido');
      }

      await loginWithProvider('apple', {
        identityToken: credential.identityToken,
        email: credential.email,
        fullName: formatAppleFullName(credential.fullName),
      });
    } catch (error) {
      if (error?.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      Alert.alert('No pudimos continuar con Apple', error.message);
    } finally {
      setLoadingProvider(null);
    }
  }

  const socialBusy = loadingProvider !== null;

  return (
    <View style={[styles.section, { marginTop: isCompact ? spacing.md : spacing.lg }]}>
      <View style={[styles.dividerRow, { gap: isCompact ? 8 : 12 }]}>
        <View style={styles.dividerLine} />
        <Typography variant="caption" align="center" style={styles.dividerText}>
          {caption}
        </Typography>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={handleGooglePress}
        disabled={socialBusy}
        style={({ pressed }) => [
          styles.socialButton,
          {
            borderColor: '#E7EAF0',
            borderRadius: radius.lg,
            backgroundColor: '#FFFFFF',
            opacity: socialBusy ? 0.7 : pressed ? 0.94 : 1,
            marginTop: isCompact ? spacing.sm : spacing.md,
            minHeight: isCompact ? 48 : 54,
            paddingHorizontal: isCompact ? 14 : 16,
          },
        ]}
      >
        <View style={styles.socialIconSlot}>
          {loadingProvider === 'google' ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <GoogleGlyph />
          )}
        </View>

        <Typography variant="bodyBold" align="center" style={styles.socialButtonText}>
          Continuar con Google
        </Typography>

        <View style={styles.socialIconSlot} />
      </Pressable>

      {Platform.OS === 'ios' && appleAvailable ? (
        loadingProvider === 'apple' ? (
          <View
            style={[
              styles.appleLoadingState,
              {
                borderRadius: radius.lg,
                marginTop: isCompact ? 8 : spacing.sm,
                height: isCompact ? 48 : 54,
              },
            ]}
          >
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Typography variant="bodyBold" color="inverse" style={styles.appleLoadingText}>
              Conectando con Apple...
            </Typography>
          </View>
        ) : (
          <View pointerEvents={socialBusy ? 'none' : 'auto'} style={{ opacity: socialBusy ? 0.7 : 1 }}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.lg}
              onPress={handleApplePress}
              style={[
                styles.appleButton,
                { marginTop: isCompact ? 8 : spacing.sm, height: isCompact ? 48 : 54 },
              ]}
            />
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EBF1',
  },
  dividerText: {
    color: '#8D94A0',
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  socialButton: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  socialIconSlot: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialButtonText: {
    flex: 1,
    color: '#17181B',
    fontSize: 14,
  },
  appleButton: {
    width: '100%',
  },
  appleLoadingState: {
    backgroundColor: '#111214',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  appleLoadingText: {
    fontSize: 15,
  },
});
