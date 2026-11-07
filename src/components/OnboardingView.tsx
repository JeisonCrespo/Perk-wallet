import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  Easing,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';

const { width } = Dimensions.get('window');

interface OnboardingViewProps {
  visible: boolean;
  onFinish: () => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ visible, onFinish }) => {
  const { isDark } = useTheme();
  const { userProfile, updateUserProfile, setHasCompletedOnboarding, loginUser } = useFinance();

  const [step, setStep] = useState<'welcome' | 'setup'>('welcome');
  const [inputName, setInputName] = useState(userProfile.name || '');
  const [inputEmail, setInputEmail] = useState(userProfile.email || '');

  // Animaciones iniciales
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeContent = useRef(new Animated.Value(0)).current;
  const slideContent = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (visible) {
      // Animación de flotación infinita para la tarjeta ilustrada
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: -12,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Animación de pulso para la moneda y el badge
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Entrada suave de contenido
      Animated.parallel([
        Animated.timing(fadeContent, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(slideContent, {
          toValue: 0,
          duration: 700,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleStart = () => {
    setStep('setup');
  };

  const handleCompleteSetup = async () => {
    const finalName = inputName.trim() || 'Jeison';
    const finalEmail = inputEmail.trim() || 'jeison@ejemplo.com';
    await loginUser(finalName, finalEmail);
    await setHasCompletedOnboarding(true);
    onFinish();
  };

  const handleSkipOrGuest = async () => {
    await setHasCompletedOnboarding(true);
    onFinish();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={[styles.container, { backgroundColor: isDark ? '#041B15' : '#083E31' }]}>
        {/* Cabecera / Logo */}
        <View style={styles.headerRow}>
          <View style={styles.logoPill}>
            <Ionicons name="wallet" size={18} color="#34D399" />
            <Text style={styles.logoText}>Finanzas USA</Text>
          </View>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkipOrGuest}>
            <Text style={styles.skipBtnText}>Saltar</Text>
          </TouchableOpacity>
        </View>

        {/* Zona Ilustrada con Animación Inicial */}
        <View style={styles.illustrationArea}>
          {/* Círculo de luz ambiental detrás */}
          <View style={styles.glowCircle} />

          {/* Tarjeta flotante animada inspirada en la imagen */}
          <Animated.View
            style={[
              styles.cardIllustration,
              {
                transform: [{ translateY: floatAnim }],
              },
            ]}
          >
            {/* Chip de la tarjeta */}
            <View style={styles.cardChip} />
            <View style={styles.cardLines}>
              <View style={styles.cardLineLong} />
              <View style={styles.cardLineShort} />
            </View>

            {/* Píldora de status */}
            <View style={styles.cardBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#34D399" />
            </View>
          </Animated.View>

          {/* Moneda dorada animada flotando en la esquina */}
          <Animated.View
            style={[
              styles.coinIllustration,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={styles.coinInner}>
              <Ionicons name="logo-usd" size={20} color="#92400E" />
            </View>
          </Animated.View>
        </View>

        {/* Contenido inferior */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? '#062B20' : '#FFFFFF',
              opacity: fadeContent,
              transform: [{ translateY: slideContent }],
            },
          ]}
        >
          {step === 'welcome' ? (
            <>
              <Text style={[styles.title, { color: isDark ? '#F0FDF4' : '#062B20' }]}>
                Toma el control{'\n'}de tu dinero
              </Text>

              <Text style={[styles.subtitle, { color: isDark ? '#A7F3D0' : '#64748B' }]}>
                Monitorea tus gastos diarios, ahorra de forma inteligente y gestiona todas tus
                cuentas en un solo lugar seguro.
              </Text>

              {/* Indicadores de carrusel (dots) */}
              <View style={styles.dotsRow}>
                <View style={[styles.dot, styles.dotActive]} />
                <View style={[styles.dot, { backgroundColor: isDark ? '#144637' : '#E2E8F0' }]} />
              </View>

              {/* Botón Principal "Get started" */}
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleStart}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Comenzar (Get started)</Text>
              </TouchableOpacity>

              {/* Enlace secundario "Ya tengo una cuenta" */}
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSkipOrGuest}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: isDark ? '#A7F3D0' : '#059669' }]}>
                  Ya tengo una cuenta / Entrar como invitado
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: isDark ? '#F0FDF4' : '#062B20', fontSize: 24 }]}>
                Personaliza tu Perfil
              </Text>

              <Text style={[styles.subtitle, { color: isDark ? '#A7F3D0' : '#64748B', marginBottom: 16 }]}>
                Tus datos se guardan de forma privada y local en tu dispositivo con SQLite.
              </Text>

              <Text style={[styles.inputLabel, { color: isDark ? '#A7F3D0' : '#475569' }]}>
                ¿Cuál es tu nombre?
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#041B15' : '#F8FAFC',
                    color: isDark ? '#F0FDF4' : '#0F172A',
                    borderColor: isDark ? '#144637' : '#E2E8F0',
                  },
                ]}
                placeholder="Ej. Jeison"
                placeholderTextColor="#64748B"
                value={inputName}
                onChangeText={setInputName}
              />

              <Text style={[styles.inputLabel, { color: isDark ? '#A7F3D0' : '#475569', marginTop: 12 }]}>
                Correo electrónico
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#041B15' : '#F8FAFC',
                    color: isDark ? '#F0FDF4' : '#0F172A',
                    borderColor: isDark ? '#144637' : '#E2E8F0',
                  },
                ]}
                placeholder="Ej. jeison@ejemplo.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={inputEmail}
                onChangeText={setInputEmail}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 24 }]}
                onPress={handleCompleteSetup}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Guardar y Entrar</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 24,
  },
  logoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#062B20',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#144637',
  },
  logoText: {
    color: '#F0FDF4',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skipBtnText: {
    color: '#A7F3D0',
    fontSize: 14,
    fontWeight: '700',
  },
  illustrationArea: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 240,
  },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#10B98122',
  },
  cardIllustration: {
    width: width * 0.72,
    height: 140,
    backgroundColor: '#34D399',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  cardChip: {
    width: 36,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FDE047',
    borderWidth: 1,
    borderColor: '#CA8A04',
  },
  cardLines: {
    gap: 6,
  },
  cardLineLong: {
    width: '60%',
    height: 6,
    borderRadius: 4,
    backgroundColor: '#064E3B44',
  },
  cardLineShort: {
    width: '35%',
    height: 6,
    borderRadius: 4,
    backgroundColor: '#064E3B33',
  },
  cardBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinIllustration: {
    position: 'absolute',
    right: width * 0.16,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F59E0B',
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 6,
  },
  coinInner: {
    flex: 1,
    borderRadius: 24,
    backgroundColor: '#FCD34D',
    borderWidth: 2,
    borderColor: '#D97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 26,
    paddingTop: 32,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#10B981',
  },
  primaryBtn: {
    backgroundColor: '#A7F3D0',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#064E3B',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 6,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
});

