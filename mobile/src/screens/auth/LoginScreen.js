import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Circle, Path } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from '../../components/ui/Typography';
import AuthBrandHeader from '../../components/auth/AuthBrandHeader';

WebBrowser.maybeCompleteAuthSession();

const HERO_SLIDES = [
  require('../../../assets/padel1.jpg'),
  require('../../../assets/padel2.jpg'),
  require('../../../assets/padel3.jpg'),
];

function BallGlyph({ size = 18, color = '#A7CE29', stroke = '#0B0B0D' }) {
  const cx = 12;
  const cy = 12;
  const r = 9;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={cx} cy={cy} r={r} fill={color} />
      <Path
        d="M5.2 8.4c2.6 1 4.6 3.2 5.4 6 .3 1 .4 2 .3 3"
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
      <Path
        d="M18.8 15.6c-2.6-1-4.6-3.2-5.4-6-.3-1-.4-2-.3-3"
        stroke={stroke}
        strokeWidth={1.3}
        strokeLinecap="round"
        fill="none"
        opacity={0.85}
      />
    </Svg>
  );
}

function HeroImage({ accent }) {
  const slide = useMemo(
    () => HERO_SLIDES[Math.floor(Math.random() * HERO_SLIDES.length)],
    []
  );

  return (
    <View style={[styles.heroCard, { shadowColor: accent }]}>
      <Image source={slide} style={styles.heroSlide} resizeMode="cover" />
      <View pointerEvents="none" style={styles.heroVignette} />
      <View pointerEvents="none" style={styles.heroHighlight} />
    </View>
  );
}

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

export default function LoginScreen({ navigation }) {
  const { loginWithProvider } = useAuth();
  const { colors } = useTheme();

  const [loadingProvider, setLoadingProvider] = useState(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const handledGoogleResponseRef = useRef(null);

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
    [googleAndroidClientId, googleClientId, googleIosClientId, googleWebClientId, isExpoGo]
  );

  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useAuthRequest(
    googleRequestConfig,
    { path: 'oauthredirect' }
  );

  useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'ios') return undefined;

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setAppleAvailable(available);
      })
      .catch(() => {
        if (mounted) setAppleAvailable(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (loadingProvider !== 'google' || !googleResponse) return;
    if (handledGoogleResponseRef.current === googleResponse) return;
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
    (async () => {
      try {
        await loginWithProvider('google', { idToken });
      } catch (error) {
        if (!cancelled) Alert.alert('No pudimos continuar con Google', error.message);
      } finally {
        if (!cancelled) setLoadingProvider(null);
      }
    })();

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
      if (result.type !== 'success') setLoadingProvider(null);
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
      if (error?.code === 'ERR_REQUEST_CANCELED') return;
      Alert.alert('No pudimos continuar con Apple', error.message);
    } finally {
      setLoadingProvider(null);
    }
  }

  const socialBusy = loadingProvider !== null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={false} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <AuthBrandHeader />

        <View style={styles.hero}>
          <HeroImage accent={colors.accent} />
        </View>

        <View style={styles.copyBlock}>
          <Typography variant="h1" align="center" style={styles.title}>
            Tu cancha, tu comunidad.
          </Typography>
          <Typography variant="body" align="center" style={styles.subtitle}>
            Reserva partidos, sigue la liga y subi en el ranking junto a tus amigos.
          </Typography>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('PhoneAuth')}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.accent, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={styles.primaryIcon}>
              <BallGlyph size={18} color="#FFFFFF" stroke="#0B0B0D" />
            </View>
            <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
              Continuar con telefono
            </Typography>
            <View style={styles.primaryIcon} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('EmailLogin')}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <View style={styles.secondaryIcon}>
              <BallGlyph size={18} color="#FFFFFF" stroke="#0B0B0D" />
            </View>
            <Typography variant="bodyBold" align="center" style={styles.secondaryBtnText}>
              Entrar con email y contrasena
            </Typography>
            <View style={styles.secondaryIcon} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={handleGooglePress}
            disabled={socialBusy}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: socialBusy ? 0.7 : pressed ? 0.9 : 1 },
            ]}
          >
            <View style={styles.secondaryIcon}>
              {loadingProvider === 'google' ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <GoogleGlyph />
              )}
            </View>
            <Typography variant="bodyBold" align="center" style={styles.secondaryBtnText}>
              Continuar con Google
            </Typography>
            <View style={styles.secondaryIcon} />
          </Pressable>

          {Platform.OS === 'ios' && appleAvailable ? (
            loadingProvider === 'apple' ? (
              <View style={styles.appleLoading}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Typography variant="bodyBold" style={styles.appleLoadingText}>
                  Conectando con Apple...
                </Typography>
              </View>
            ) : (
              <View
                pointerEvents={socialBusy ? 'none' : 'auto'}
                style={{ opacity: socialBusy ? 0.7 : 1 }}
              >
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE}
                  cornerRadius={14}
                  onPress={handleApplePress}
                  style={styles.appleButton}
                />
              </View>
            )
          ) : null}
        </View>

        <View style={styles.footer}>
          <Typography variant="caption" align="center" style={styles.footerText}>
            Al unirte a Padex, aceptas nuestros{' '}
            <Typography variant="captionMedium" style={styles.footerLink}>
              Terminos de uso
            </Typography>{' '}
            y{' '}
            <Typography variant="captionMedium" style={styles.footerLink}>
              Politica de privacidad
            </Typography>
            .
          </Typography>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
            style={styles.registerLink}
          >
            <Typography variant="bodyMedium" align="center" style={styles.registerText}>
              No tenes cuenta?{' '}
              <Typography variant="bodyBold" style={{ color: colors.accent }}>
                Crear perfil
              </Typography>
            </Typography>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B0B0D',
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  heroCard: {
    width: '100%',
    aspectRatio: 16 / 10,
    maxHeight: 260,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#111214',
    borderWidth: 1,
    borderColor: 'rgba(167,206,41,0.18)',
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 14,
  },
  heroHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(167,206,41,0.45)',
  },
  heroSlide: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  copyBlock: {
    paddingHorizontal: 8,
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  primaryIcon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    flex: 1,
    color: '#000000',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  secondaryIcon: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 0.1,
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  appleLoading: {
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleLoadingText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  footer: {
    marginTop: 22,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  footerText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    lineHeight: 16,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  registerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
});
