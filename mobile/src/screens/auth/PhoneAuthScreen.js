import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Input } from '../../components/ui/Input';
import { Typography } from '../../components/ui/Typography';
import AuthBrandHeader from '../../components/auth/AuthBrandHeader';

const DARK_INPUT = {
  containerStyle: {
    height: 54,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
  },
  inputStyle: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  labelStyle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    textTransform: 'none',
    marginLeft: 2,
    marginBottom: 8,
  },
  placeholderTextColor: 'rgba(255,255,255,0.32)',
  idleBorderColor: 'rgba(255,255,255,0.1)',
  iconColor: 'rgba(255,255,255,0.55)',
};

export default function PhoneAuthScreen({ navigation }) {
  const { colors } = useTheme();
  const { sendPhoneCode, verifyPhoneCode } = useAuth();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('+54 9 ');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [sentPhone, setSentPhone] = useState('');
  const [debugCode, setDebugCode] = useState('');

  const title = useMemo(
    () => (step === 'phone' ? 'Entrar con telefono' : 'Confirma tu codigo'),
    [step]
  );

  const subtitle = useMemo(
    () =>
      step === 'phone'
        ? 'Te enviamos un codigo por SMS para entrar o crear tu cuenta.'
        : `Ingresa el codigo que mandamos a ${sentPhone || 'tu telefono'}.`,
    [sentPhone, step]
  );

  function resetErrors(field) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validatePhone() {
    if (!phone.trim()) {
      setErrors({ phone: 'Ingresa tu telefono' });
      return false;
    }

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setErrors({ phone: 'Ingresa un telefono valido con codigo de pais' });
      return false;
    }

    setErrors({});
    return true;
  }

  function validateCode() {
    if (!code.trim()) {
      setErrors({ code: 'Ingresa el codigo' });
      return false;
    }

    if (code.replace(/\D/g, '').length < 4) {
      setErrors({ code: 'El codigo es demasiado corto' });
      return false;
    }

    setErrors({});
    return true;
  }

  async function handleSendCode() {
    if (!validatePhone()) return;

    setLoading(true);
    try {
      const response = await sendPhoneCode(phone);
      setSentPhone(response.phone || phone);
      setDebugCode(response.debug_code || '');
      setStep('code');
    } catch (error) {
      Alert.alert('No pudimos enviar el codigo', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (!validateCode()) return;

    setLoading(true);
    try {
      await verifyPhoneCode(phone, code);
    } catch (error) {
      Alert.alert('No pudimos verificar el codigo', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setLoading(true);
    try {
      const response = await sendPhoneCode(phone);
      setSentPhone(response.phone || phone);
      setDebugCode(response.debug_code || '');
      Alert.alert('Codigo reenviado', 'Te mandamos un nuevo codigo por SMS.');
    } catch (error) {
      Alert.alert('No pudimos reenviar el codigo', error.message);
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    if (step === 'code') {
      setStep('phone');
      setCode('');
      setErrors({});
      return;
    }

    navigation.goBack();
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={false} />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.flex}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.flex}>
              <AuthBrandHeader onBack={handleBack} size="sm" />

              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.intro}>
                  <View
                    style={[
                      styles.stepChip,
                      {
                        borderColor: `${colors.accent}45`,
                        backgroundColor: `${colors.accent}1A`,
                      },
                    ]}
                  >
                    <Typography variant="captionMedium" style={{ color: colors.accent, fontSize: 11, letterSpacing: 0.4 }}>
                      {step === 'phone' ? 'PASO 1 DE 2' : 'PASO 2 DE 2'}
                    </Typography>
                  </View>

                  <Typography variant="h1" align="center" style={styles.title}>
                    {title}
                  </Typography>
                  <Typography variant="body" align="center" style={styles.subtitle}>
                    {subtitle}
                  </Typography>
                </View>

                {step === 'phone' ? (
                  <View style={styles.form}>
                    <Input
                      label="Telefono"
                      value={phone}
                      onChangeText={(value) => {
                        setPhone(value);
                        resetErrors('phone');
                      }}
                      placeholder="+54 9 11 5555 5555"
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      autoComplete="tel"
                      error={errors.phone}
                      focusedBorderColor={colors.accent}
                      {...DARK_INPUT}
                    />

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleSendCode}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                          backgroundColor: colors.accent,
                          opacity: loading ? 0.8 : pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0B0B0D" size="small" />
                      ) : (
                        <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                          Enviar codigo
                        </Typography>
                      )}
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <Input
                      label="Codigo"
                      value={code}
                      onChangeText={(value) => {
                        setCode(value.replace(/\D/g, '').slice(0, 8));
                        resetErrors('code');
                      }}
                      placeholder="123456"
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      error={errors.code}
                      focusedBorderColor={colors.accent}
                      {...DARK_INPUT}
                    />

                    {debugCode ? (
                      <Typography variant="caption" align="center" style={styles.debugText}>
                        Codigo de prueba: {debugCode}
                      </Typography>
                    ) : null}

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleVerifyCode}
                      disabled={loading}
                      style={({ pressed }) => [
                        styles.primaryBtn,
                        {
                          backgroundColor: colors.accent,
                          opacity: loading ? 0.8 : pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0B0B0D" size="small" />
                      ) : (
                        <Typography variant="bodyBold" align="center" style={styles.primaryBtnText}>
                          Verificar y continuar
                        </Typography>
                      )}
                    </Pressable>

                    <TouchableOpacity
                      disabled={loading}
                      onPress={handleResendCode}
                      activeOpacity={0.7}
                      style={styles.secondaryLink}
                    >
                      <Typography variant="bodyMedium" align="center" style={{ color: colors.accent }}>
                        Reenviar codigo
                      </Typography>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 28,
    justifyContent: 'center',
  },
  intro: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 28,
  },
  stepChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 38,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    maxWidth: 320,
  },
  form: {
    width: '100%',
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: '#0B0B0D',
  },
  secondaryLink: {
    marginTop: 18,
    alignSelf: 'center',
  },
  debugText: {
    color: 'rgba(255,255,255,0.56)',
    marginTop: -6,
    marginBottom: 10,
  },
});
