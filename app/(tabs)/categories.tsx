import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Share,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { useFinance } from '../../src/context/FinanceContext';
import { Category } from '../../src/types/finance';
import { GENERAL_ICONS, SmartIcon } from '../../src/components/BrandIcon';
import {
  scheduleDailyExpenseReminder,
  cancelDailyExpenseReminder,
} from '../../src/services/notificationService';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { OnboardingView } from '../../src/components/OnboardingView';
import { POPULAR_CURRENCIES, CurrencyOption } from '../../src/constants/currencies';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';

const COLOR_PALETTE = [
  '#E50914',
  '#38BDF8',
  '#1DB954',
  '#FF9900',
  '#9146FF',
  '#5865F2',
  '#F59E0B',
  '#10B981',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F43F5E',
];

const RECOMMENDED_REMINDER_HOURS = [
  { label: '🌅 09:00 AM (Mañana)', hour: 9, minute: 0, text: '09:00' },
  { label: '☕ 02:00 PM (Almuerzo)', hour: 14, minute: 0, text: '14:00' },
  { label: '🌙 08:00 PM (Recomendada)', hour: 20, minute: 0, text: '20:00' },
  { label: '🛏️ 10:00 PM (Noche)', hour: 22, minute: 0, text: '22:00' },
];

export default function SettingsAndCategoriesScreen() {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToZero,
    exportBackupJson,
    importBackupJson,
    lastDriveBackupAt,
    recordDriveBackupTimestamp,
    isDriveConnected,
    driveEmail,
    connectGoogleDrive,
    disconnectGoogleDrive,
    autoDriveBackupEnabled,
    toggleAutoDriveBackup,
    setHasCompletedOnboarding,
    userProfile,
    updateUserProfile,
    securitySettings,
    updateSecuritySettings,
    logoutUser,
    loginUser,
  } = useFinance();

  const { isDark, toggleTheme, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  const scrollRef = useRef<any>(null);

  // Al cambiar y volver a esta pestaña, siempre volver al inicio (arriba del todo)
  useFocusEffect(
    useCallback(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Modales directos en Ajustes
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showDailyReminderModal, setShowDailyReminderModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreJsonModal, setShowRestoreJsonModal] = useState(false);
  const [showDriveEmailModal, setShowDriveEmailModal] = useState(false);
  const [driveEmailInput, setDriveEmailInput] = useState('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Estados de Edición de Perfil
  const [nameInput, setNameInput] = useState(userProfile.name);
  const [emailInput, setEmailInput] = useState(userProfile.email);
  const [phoneInput, setPhoneInput] = useState(userProfile.phone || '');

  // Estados de Moneda
  const [currencySearch, setCurrencySearch] = useState('');

  // Estados de Seguridad (PIN)
  const [pinInput, setPinInput] = useState(securitySettings.pinCode || '');
  const [pinEnabled, setPinEnabled] = useState(securitySettings.pinEnabled);
  const [requirePinOnOpen, setRequirePinOnOpen] = useState(securitySettings.requirePinOnOpen);

  // Estados de Categorías
  const [tabType, setTabType] = useState<'expense' | 'income'>('expense');
  const [showCatEditModal, setShowCatEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState(GENERAL_ICONS[0].icon);
  const [iconSearch, setIconSearch] = useState('');

  // Estados de Copia de Seguridad
  const [backupJsonInput, setBackupJsonInput] = useState('');

  // Estados de Recordatorio Diario
  const [reminderEnabled, setReminderEnabled] = useState(
    userProfile.dailyReminderEnabled ?? false
  );
  const [reminderTime, setReminderTime] = useState(
    userProfile.dailyReminderTime || '20:00'
  );
  const [customHourInput, setCustomHourInput] = useState(
    userProfile.dailyReminderTime ? userProfile.dailyReminderTime.split(':')[0] : '20'
  );
  const [customMinuteInput, setCustomMinuteInput] = useState(
    userProfile.dailyReminderTime ? userProfile.dailyReminderTime.split(':')[1] : '00'
  );

  // Estados de Login
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginEmailInput, setLoginEmailInput] = useState('');

  const filteredCategories = categories.filter((c) => c.type === tabType);

  const filteredIcons = GENERAL_ICONS.filter(
    (item) =>
      !iconSearch.trim() ||
      item.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
      item.group.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const filteredCurrencies = POPULAR_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  // Seleccionar Foto de Perfil desde Galería
  const handlePickAvatar = async () => {
    Alert.alert(
      'Foto de Perfil',
      'Elige una opción para tu avatar:',
      [
        {
          text: 'Elegir de Galería',
          onPress: async () => {
            try {
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!res.canceled && res.assets && res.assets.length > 0) {
                const pickedUri = res.assets[0].uri;
                await updateUserProfile({ avatarUri: pickedUri });
              }
            } catch {
              Alert.alert('Error', 'No se pudo acceder a las fotos.');
            }
          },
        },
        ...(userProfile.avatarUri
          ? [
              {
                text: 'Quitar Foto',
                style: 'destructive' as const,
                onPress: async () => {
                  await updateUserProfile({ avatarUri: '' });
                },
              },
            ]
          : []),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleOpenEditProfile = () => {
    setNameInput(userProfile.name);
    setEmailInput(userProfile.email);
    setPhoneInput(userProfile.phone || '');
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!nameInput.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }
    await updateUserProfile({
      name: nameInput.trim(),
      email: emailInput.trim(),
      phone: phoneInput.trim(),
    });
    setShowEditProfileModal(false);
  };

  const handleOpenSecurity = () => {
    setPinInput(securitySettings.pinCode || '');
    setPinEnabled(securitySettings.pinEnabled);
    setRequirePinOnOpen(securitySettings.requirePinOnOpen);
    setShowSecurityModal(true);
  };

  const handleSaveSecurity = async () => {
    if (pinEnabled && pinInput.length < 4) {
      Alert.alert('PIN inválido', 'El PIN de seguridad debe tener al menos 4 dígitos.');
      return;
    }
    await updateSecuritySettings({
      pinEnabled,
      pinCode: pinEnabled ? pinInput : '',
      requirePinOnOpen: pinEnabled ? requirePinOnOpen : false,
    });
    setShowSecurityModal(false);
    Alert.alert('Seguridad actualizada', 'Tus preferencias de PIN han sido guardadas.');
  };

  const handleOpenCatCreate = () => {
    setEditingCategory(null);
    setCatName('');
    setSelectedColor(COLOR_PALETTE[0]);
    setSelectedIcon(GENERAL_ICONS[0].icon);
    setIconSearch('');
    setShowCatEditModal(true);
  };

  const handleOpenCatEdit = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setSelectedColor(cat.color);
    setSelectedIcon(cat.icon);
    setIconSearch('');
    setShowCatEditModal(true);
  };

  const handleSaveCategory = async () => {
    if (!catName.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: catName.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      setEditingCategory(null);
    } else {
      await addCategory({
        name: catName.trim(),
        type: tabType,
        color: selectedColor,
        icon: selectedIcon,
      });
    }
    setCatName('');
    setIconSearch('');
    setShowCatEditModal(false);
  };

  const handleBackupToGoogleDrive = async () => {
    try {
      const json = exportBackupJson();
      const today = new Date().toISOString().split('T')[0];
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

      if (baseDir) {
        const fileUri = `${baseDir}finanzas-usa-backup-${today}.json`;
        await FileSystem.writeAsStringAsync(fileUri, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await recordDriveBackupTimestamp();
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Guardar Respaldo en Google Drive',
            UTI: 'public.json',
          });
          return;
        }
      }

      await recordDriveBackupTimestamp();
      await Share.share({
        title: `finanzas-usa-backup-${today}.json`,
        message: json,
      });
    } catch {
      Alert.alert(
        'Error al crear archivo',
        'No se pudo preparar el archivo de respaldo para Google Drive.'
      );
    }
  };

  const handleRestoreBackup = async () => {
    try {
      await importBackupJson(backupJsonInput);
      setBackupJsonInput('');
      setShowRestoreJsonModal(false);
      setShowBackupModal(false);
      Alert.alert(
        'Respaldo Restaurado',
        'Tus cuentas, movimientos, préstamos, metas y categorías fueron restaurados con éxito.'
      );
    } catch {
      Alert.alert('Error', 'El texto JSON pegado no tiene un formato de respaldo válido.');
    }
  };

  const handleToggleDailyReminder = async (enabled: boolean) => {
    setReminderEnabled(enabled);
    if (!enabled) {
      await cancelDailyExpenseReminder();
      await updateUserProfile({ dailyReminderEnabled: false });
      Alert.alert('Recordatorio desactivado', 'Ya no recibirás alertas automáticas para registrar gastos.');
    } else {
      const parts = reminderTime.split(':').map(Number);
      const h = parts[0] ?? 20;
      const m = parts[1] ?? 0;
      await scheduleDailyExpenseReminder(h, m);
      await updateUserProfile({ dailyReminderEnabled: true, dailyReminderTime: reminderTime });
      Alert.alert(
        'Recordatorio activado',
        `Te recordaremos registrar tus gastos todos los días a las ${reminderTime}.`
      );
    }
  };

  const handleSaveReminderTime = async (h: number, m: number, timeStr: string) => {
    setReminderTime(timeStr);
    setReminderEnabled(true);
    await scheduleDailyExpenseReminder(h, m);
    await updateUserProfile({ dailyReminderEnabled: true, dailyReminderTime: timeStr });
    setShowDailyReminderModal(false);
    Alert.alert(
      'Hora Guardada',
      `Tu recordatorio diario quedó programado a las ${timeStr}.`
    );
  };

  const handleSaveCustomReminder = async () => {
    const h = parseInt(customHourInput, 10);
    const m = parseInt(customMinuteInput, 10);
    if (isNaN(h) || h < 0 || h > 23 || isNaN(m) || m < 0 || m > 59) {
      Alert.alert('Hora inválida', 'Ingresa una hora entre 00 y 23 y minutos entre 00 y 59.');
      return;
    }
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    await handleSaveReminderTime(h, m, formatted);
  };

  const handleOpenDriveConnect = () => {
    setDriveEmailInput(
      driveEmail ||
      (userProfile.email && !userProfile.email.includes('ejemplo.com') ? userProfile.email : '')
    );
    setShowDriveEmailModal(true);
  };

  const handleSaveDriveEmail = async () => {
    const clean = driveEmailInput.trim();
    if (!clean) {
      Alert.alert('Correo Requerido', 'Por favor ingresa tu cuenta de Google (Gmail).');
      return;
    }
    await connectGoogleDrive(clean);
    setShowDriveEmailModal(false);
    Alert.alert(
      'Google Drive Conectado',
      `Tu cuenta ${clean} ha sido vinculada para tus respaldos.`
    );
  };

  const handleDisconnectDrive = () => {
    Alert.alert(
      'Cerrar sesión de Google Drive',
      '¿Deseas desvincular Google Drive? La copia de seguridad automática quedará pausada hasta que vuelvas a conectar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await disconnectGoogleDrive();
          },
        },
      ]
    );
  };

  const handleResetZero = () => {
    Alert.alert(
      'Restablecer y Empezar de Cero ($0.00)',
      '¿Seguro que deseas borrar todas las cuentas, préstamos, metas y movimientos de prueba? La app volverá a $0.00 y te mostrará la pantalla de bienvenida para comenzar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Empezar de Cero',
          style: 'destructive',
          onPress: async () => {
            await resetToZero();
            await setHasCompletedOnboarding(false);
            setShowOnboardingModal(true);
          },
        },
      ]
    );
  };

  const handleToggleLogout = () => {
    if (userProfile.isLogged) {
      Alert.alert(
        'Cerrar sesión',
        '¿Deseas cerrar sesión? Todos tus datos bancarios y registros se mantendrán guardados en este dispositivo.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Cerrar sesión',
            style: 'destructive',
            onPress: async () => {
              await logoutUser();
            },
          },
        ]
      );
    } else {
      setLoginNameInput('');
      setLoginEmailInput('');
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = async () => {
    if (!loginNameInput.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }
    await loginUser(loginNameInput, loginEmailInput);
    setShowLoginModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Tarjeta Principal de Perfil (Con Foto e Iniciales) */}
        <View style={styles.profileCard}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
            {userProfile.avatarUri ? (
              <Image source={{ uri: userProfile.avatarUri }} style={styles.profileAvatarImg} />
            ) : (
              <View style={styles.profileAvatarBox}>
                <Text style={styles.profileAvatarText}>
                  {(userProfile.name || 'J').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={{ flex: 1 }} onPress={handleOpenEditProfile} activeOpacity={0.7}>
            <Text style={styles.profileName}>{userProfile.name || 'Tu Nombre'}</Text>
            <Text style={styles.profileEmail}>{userProfile.email || 'tu.correo@ejemplo.com'}</Text>
            <Text style={styles.profileHint}>Toca para editar nombre y correo ✎</Text>
          </TouchableOpacity>
        </View>

        {/* Grupo 1: Moneda y Seguridad */}
        <Text style={styles.sectionHeaderTitle}>CUENTA Y SEGURIDAD</Text>
        <View style={styles.menuBox}>
          {/* Moneda Principal */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowCurrencyModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="cash-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Moneda Principal</Text>
              <Text style={styles.menuRowSub}>
                {userProfile.currency || 'USD'} • Elige entre 25 monedas
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Seguridad y Bloqueo PIN */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={handleOpenSecurity}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Seguridad y Bloqueo PIN</Text>
              <Text style={styles.menuRowSub}>
                {securitySettings.pinEnabled ? 'PIN activado' : 'PIN desactivado'} • Cifrado SQLite local
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Grupo 2: Preferencias de la App */}
        <Text style={styles.sectionHeaderTitle}>PREFERENCIAS</Text>
        <View style={styles.menuBox}>
          {/* Modo Oscuro */}
          <View style={styles.menuRow}>
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Modo Oscuro</Text>
              <Text style={styles.menuRowSub}>
                {isDark ? 'Tema oscuro activo' : 'Tema claro activo'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: '#34D399' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuDivider} />

          {/* Recordatorio Diario de Gastos */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowDailyReminderModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="alarm-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Recordatorio Diario de Gastos</Text>
              <Text style={styles.menuRowSub}>
                {reminderEnabled
                  ? `Activo a las ${reminderTime} todos los días`
                  : 'Desactivado • Toca para programar la hora'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Grupo 3: Datos, Categorías y Respaldos */}
        <Text style={styles.sectionHeaderTitle}>GESTIÓN DE DATOS Y RESPALDOS</Text>
        <View style={styles.menuBox}>
          {/* Categorías */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowCategoriesModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="pricetags-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Categorías de Gastos e Ingresos</Text>
              <Text style={styles.menuRowSub}>
                {categories.length} categorías configuradas • Iconos y colores
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Copia de Seguridad y Google Drive */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowBackupModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="cloud-upload-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Copia de Seguridad y Google Drive</Text>
              <Text style={styles.menuRowSub}>
                {isDriveConnected
                  ? `Google Drive activo (${driveEmail || userProfile.email || 'Conectado'})`
                  : 'Desconectado • Toca para gestionar'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Restablecer y Empezar de Cero */}
          <TouchableOpacity style={styles.menuRow} onPress={handleResetZero} activeOpacity={0.7}>
            <View style={[styles.iconPill, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-bin-outline" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuRowTitle, { color: '#DC2626' }]}>
                Restablecer y Empezar de Cero ($0.00)
              </Text>
              <Text style={styles.menuRowSub}>
                Borra datos de prueba y abre la pantalla de bienvenida inicial
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Grupo 4: Sesión e Info */}
        <Text style={styles.sectionHeaderTitle}>SESIÓN E INFORMACIÓN</Text>
        <View style={styles.menuBox}>
          {/* Cerrar / Iniciar Sesión */}
          <TouchableOpacity style={styles.menuRow} onPress={handleToggleLogout} activeOpacity={0.7}>
            <View
              style={[
                styles.iconPill,
                { backgroundColor: userProfile.isLogged ? '#FEE2E2' : '#DCFCE7' },
              ]}
            >
              <Ionicons
                name={userProfile.isLogged ? 'log-out-outline' : 'log-in-outline'}
                size={18}
                color={userProfile.isLogged ? '#EF4444' : '#059669'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.menuRowTitle,
                  { color: userProfile.isLogged ? '#EF4444' : '#059669' },
                ]}
              >
                {userProfile.isLogged ? 'Cerrar Sesión' : 'Iniciar Sesión'}
              </Text>
              <Text style={styles.menuRowSub}>
                {userProfile.isLogged ? 'Tus datos bancarios se mantienen guardados' : 'Ingresa tu nombre y correo'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Acerca de */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowAboutModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: '#10B981' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#064E3B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Finanzas USA • v1.0.4</Text>
              <Text style={styles.menuRowSub}>Base de datos SQLite local 100% privada</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* --- MODAL: EDITAR PERFIL (NOMBRE, CORREO, TELÉFONO) --- */}
      <Modal
        visible={showEditProfileModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowEditProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Editar Perfil</Text>

            <Text style={styles.inputLabelText}>Nombre Completo</Text>
            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Tu nombre"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.inputLabelText, { marginTop: 12 }]}>Correo Electrónico</Text>
            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[styles.inputLabelText, { marginTop: 12 }]}>Teléfono (Opcional)</Text>
            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="+1 (555) 000-0000"
              placeholderTextColor="#64748B"
              keyboardType="phone-pad"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={styles.cancelBtnHalf}
                onPress={() => setShowEditProfileModal(false)}
              >
                <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleSaveProfile}>
                <Text style={styles.primaryBtnHalfText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: CURRENCY SELECTOR (25 MONEDAS POPULARES CON BUSCADOR) --- */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, maxHeight: '82%' }]}>
            <Text style={styles.modalHeading}>Elegir Moneda Principal</Text>
            <Text style={[styles.menuRowSub, { marginBottom: 12 }]}>
              Selecciona la divisa para tus balances y cálculos:
            </Text>

            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text, marginBottom: 12 }]}
              placeholder="Buscar país o divisa (USD, EUR, Peso...)"
              placeholderTextColor="#64748B"
              value={currencySearch}
              onChangeText={setCurrencySearch}
            />

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {filteredCurrencies.map((item: CurrencyOption) => {
                const isSelected = (userProfile.currency || 'USD') === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.currencyRow,
                      isSelected && {
                        backgroundColor: isDark ? '#064E3B' : '#ECFDF5',
                        borderColor: '#34D399',
                        borderWidth: 1,
                      },
                    ]}
                    onPress={async () => {
                      await updateUserProfile({ currency: item.code });
                      setShowCurrencyModal(false);
                      Alert.alert('Moneda Actualizada', `Tu moneda principal ahora es ${item.code} (${item.symbol}).`);
                    }}
                  >
                    <Text style={{ fontSize: 24, marginRight: 10 }}>{item.flag}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.currencyRowCode, { color: colors.text }]}>
                        {item.code} ({item.symbol})
                      </Text>
                      <Text style={[styles.currencyRowName, { color: colors.textMuted }]}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[styles.cancelBtnFull, { marginTop: 14 }]}
              onPress={() => setShowCurrencyModal(false)}
            >
              <Text style={styles.cancelBtnFullText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: SEGURIDAD Y BLOQUEO PIN --- */}
      <Modal
        visible={showSecurityModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSecurityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Seguridad y Bloqueo</Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.menuRowTitle}>Activar PIN de 4 dígitos</Text>
                <Text style={styles.menuRowSub}>Protege el acceso a tus finanzas</Text>
              </View>
              <Switch
                value={pinEnabled}
                onValueChange={setPinEnabled}
                trackColor={{ false: '#334155', true: '#34D399' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {pinEnabled && (
              <>
                <Text style={[styles.inputLabelText, { marginTop: 12 }]}>
                  Código PIN (4 o 6 dígitos numéricos)
                </Text>
                <TextInput
                  style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
                  value={pinInput}
                  onChangeText={setPinInput}
                  placeholder="****"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  maxLength={6}
                  secureTextEntry
                />

                <View style={[styles.switchRow, { marginTop: 12 }]}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.menuRowTitle}>Requerir al abrir la app</Text>
                    <Text style={styles.menuRowSub}>Pedir el PIN cada vez que inicies la app</Text>
                  </View>
                  <Switch
                    value={requirePinOnOpen}
                    onValueChange={setRequirePinOnOpen}
                    trackColor={{ false: '#334155', true: '#34D399' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={styles.cancelBtnHalf}
                onPress={() => setShowSecurityModal(false)}
              >
                <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleSaveSecurity}>
                <Text style={styles.primaryBtnHalfText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: RECORDATORIO DIARIO DE GASTOS --- */}
      <Modal
        visible={showDailyReminderModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDailyReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Recordatorio Diario de Gastos</Text>
            <Text style={[styles.menuRowSub, { marginBottom: 14 }]}>
              La app te enviará una notificación diaria para que no olvides apuntar tus consumos.
            </Text>

            <View style={styles.switchRow}>
              <Text style={styles.menuRowTitle}>Activar Recordatorio Diario</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleDailyReminder}
                trackColor={{ false: '#334155', true: '#34D399' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <Text style={[styles.inputLabelText, { marginTop: 14, marginBottom: 8 }]}>
              Horas Recomendadas
            </Text>
            <View style={{ gap: 8 }}>
              {RECOMMENDED_REMINDER_HOURS.map((rec) => {
                const isSelected = reminderTime === rec.text;
                return (
                  <TouchableOpacity
                    key={rec.text}
                    style={[
                      styles.reminderChip,
                      isSelected && { backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#34D399' },
                    ]}
                    onPress={() => handleSaveReminderTime(rec.hour, rec.minute, rec.text)}
                  >
                    <Text style={[styles.menuRowTitle, isSelected && { color: isDark ? '#A7F3D0' : '#064E3B' }]}>
                      {rec.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabelText, { marginTop: 14, marginBottom: 6 }]}>
              O elige una hora personalizada (Formato 24h)
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={customHourInput}
                onChangeText={setCustomHourInput}
                placeholder="20"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={{ fontSize: 20, fontWeight: '800', color: colors.text }}>:</Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={customMinuteInput}
                onChangeText={setCustomMinuteInput}
                placeholder="00"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                maxLength={2}
              />
              <TouchableOpacity style={styles.applyTimeBtn} onPress={handleSaveCustomReminder}>
                <Text style={styles.applyTimeBtnText}>Fijar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cancelBtnFull, { marginTop: 16 }]}
              onPress={() => setShowDailyReminderModal(false)}
            >
              <Text style={styles.cancelBtnFullText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: OPCIONES DE COPIA DE SEGURIDAD Y GOOGLE DRIVE --- */}
      <Modal
        visible={showBackupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Google Drive y Copia de Seguridad</Text>
            <Text style={[styles.menuRowSub, { marginBottom: 14 }]}>
              Conecta tu cuenta para respaldar tus cuentas, movimientos y préstamos automáticamente.
            </Text>

            {/* Tarjeta de Estado de Conexión de Google Drive */}
            <View
              style={[
                styles.driveCard,
                !isDriveConnected && styles.driveDisconnectedCard,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons
                  name={isDriveConnected ? 'cloud-done' : 'cloud-offline-outline'}
                  size={26}
                  color={isDriveConnected ? (isDark ? '#34D399' : '#059669') : '#94A3B8'}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '800',
                      color: isDriveConnected
                        ? (isDark ? '#A7F3D0' : '#065F46')
                        : colors.text,
                    }}
                  >
                    {isDriveConnected ? 'Google Drive Conectado' : 'Google Drive Desconectado'}
                  </Text>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDriveConnected
                        ? (isDark ? '#6EE7B7' : '#047857')
                        : colors.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {isDriveConnected
                      ? `Cuenta: ${driveEmail || 'Tu cuenta de Google'}`
                      : 'Vincula tu cuenta real de Google para respaldar'}
                  </Text>
                </View>
              </View>

              {isDriveConnected ? (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    style={styles.driveConnectBtn}
                    onPress={handleOpenDriveConnect}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.driveConnectBtnText}>Cambiar cuenta</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.driveDisconnectBtn}
                    onPress={handleDisconnectDrive}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.driveDisconnectBtnText}>Cerrar sesión</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.driveConnectBtn}
                  onPress={handleOpenDriveConnect}
                  activeOpacity={0.8}
                >
                  <Text style={styles.driveConnectBtnText}>Conectar cuenta de Google</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Banner explicativo sobre el guardado oficial en Google Drive */}
            <View style={styles.driveInfoBanner}>
              <Ionicons name="information-circle-outline" size={18} color={isDark ? '#34D399' : '#059669'} />
              <Text style={styles.driveInfoBannerText}>
                Al tocar 'Hacer Copia de Seguridad ahora', Android abre automáticamente Google Drive de tu teléfono para guardar el archivo en tu cuenta real y carpeta elegida sin permisos complejos.
              </Text>
            </View>

            {/* Opción: Copia de Seguridad Automática al Iniciar y Salir */}
            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.menuRowTitle}>Copia de seguridad automática</Text>
                <Text style={styles.menuRowSub}>
                  Respaldar al iniciar y al salir de la aplicación
                </Text>
              </View>
              <Switch
                value={autoDriveBackupEnabled}
                onValueChange={toggleAutoDriveBackup}
                trackColor={{ false: '#334155', true: '#34D399' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {lastDriveBackupAt && (
              <View style={[styles.lastBackupBox, { marginTop: 10 }]}>
                <Text style={styles.lastBackupPill}>
                  ✓ Último respaldo guardado: {lastDriveBackupAt}
                </Text>
              </View>
            )}

            <View style={{ marginTop: 12, gap: 10 }}>
              {/* Botón 1: Hacer Copia de Seguridad ahora */}
              <TouchableOpacity
                style={styles.fullWidthPrimaryBtn}
                onPress={handleBackupToGoogleDrive}
              >
                <Ionicons name="cloud-upload" size={18} color="#064E3B" />
                <Text style={styles.fullWidthPrimaryBtnText}>
                  {isDriveConnected ? 'Hacer Copia de Seguridad ahora' : 'Exportar Copia (.json)'}
                </Text>
              </TouchableOpacity>

              {/* Botón 2: Restaurar Respaldo desde JSON */}
              <TouchableOpacity
                style={styles.fullWidthSecondaryBtn}
                onPress={() => {
                  setShowBackupModal(false);
                  setShowRestoreJsonModal(true);
                }}
              >
                <Ionicons name="cloud-download-outline" size={18} color={colors.text} />
                <Text style={[styles.fullWidthSecondaryBtnText, { color: colors.text }]}>
                  Restaurar Respaldo (.json)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.cancelBtnFull, { marginTop: 14 }]}
              onPress={() => setShowBackupModal(false)}
            >
              <Text style={styles.cancelBtnFullText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: VINCULAR CUENTA REAL DE GOOGLE DRIVE --- */}
      <KeyboardSafeModal
        visible={showDriveEmailModal}
        animationType="slide"
        onClose={() => setShowDriveEmailModal(false)}
      >
        <Text style={styles.modalHeading}>Vincular Cuenta de Google</Text>
        <Text style={[styles.menuRowSub, { marginBottom: 12 }]}>
          Escribe tu correo real de Google (Gmail) para asociarlo a tus respaldos automáticos y en la nube:
        </Text>

        <Text style={styles.inputLabelText}>Correo de Google (Gmail)</Text>
        <TextInput
          style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
          value={driveEmailInput}
          onChangeText={setDriveEmailInput}
          placeholder="ejemplo@gmail.com"
          placeholderTextColor="#64748B"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtnHalf}
            onPress={() => setShowDriveEmailModal(false)}
          >
            <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryBtnHalf}
            onPress={handleSaveDriveEmail}
          >
            <Text style={styles.primaryBtnHalfText}>Vincular Cuenta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* --- MODAL: PEGAR JSON PARA RESTAURAR --- */}
      <KeyboardSafeModal
        visible={showRestoreJsonModal}
        animationType="slide"
        onClose={() => setShowRestoreJsonModal(false)}
      >
        <Text style={styles.modalHeading}>Restaurar Copia desde JSON</Text>
        <Text style={[styles.menuRowSub, { marginBottom: 10 }]}>
          Pega el texto del archivo .json de tu respaldo para restaurar tus movimientos:
        </Text>
        <TextInput
          style={[styles.jsonInput, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder='Pega aquí el contenido JSON {"version": 1, ...}'
          placeholderTextColor="#64748B"
          multiline
          numberOfLines={8}
          value={backupJsonInput}
          onChangeText={setBackupJsonInput}
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <TouchableOpacity
            style={styles.cancelBtnHalf}
            onPress={() => setShowRestoreJsonModal(false)}
          >
            <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleRestoreBackup}>
            <Text style={styles.primaryBtnHalfText}>Restaurar Ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* --- MODAL: GESTOR DE CATEGORÍAS (ABIERTO POR CLICK) --- */}
      <Modal
        visible={showCategoriesModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCategoriesModal(false)}
      >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeaderBar, { backgroundColor: isDark ? '#062B20' : '#083E31' }]}>
            <TouchableOpacity onPress={() => setShowCategoriesModal(false)}>
              <Ionicons name="chevron-down" size={26} color="#F0FDF4" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderBarTitle}>Categorías</Text>
            <TouchableOpacity style={styles.addCatPill} onPress={handleOpenCatCreate}>
              <Ionicons name="add" size={16} color="#064E3B" />
              <Text style={styles.addCatPillText}>Nueva</Text>
            </TouchableOpacity>
          </View>

          {/* Segment Selector: Gastos vs Ingresos */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentTab, tabType === 'expense' && styles.segmentTabActive]}
              onPress={() => setTabType('expense')}
            >
              <Text style={[styles.segmentTabText, tabType === 'expense' && styles.segmentTabTextActive]}>
                Gastos ({categories.filter((c) => c.type === 'expense').length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentTab, tabType === 'income' && styles.segmentTabActive]}
              onPress={() => setTabType('income')}
            >
              <Text style={[styles.segmentTabText, tabType === 'income' && styles.segmentTabTextActive]}>
                Ingresos ({categories.filter((c) => c.type === 'income').length})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
            {filteredCategories.map((cat) => (
              <View key={cat.id} style={styles.catCard}>
                <View style={styles.catTopRow}>
                  <SmartIcon iconName={cat.icon} color={cat.color} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catSub}>{cat.isCustom ? 'Personalizada' : 'Predeterminada'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <TouchableOpacity onPress={() => handleOpenCatEdit(cat)}>
                      <Ionicons name="create-outline" size={18} color={isDark ? '#34D399' : '#059669'} />
                    </TouchableOpacity>
                    {cat.isCustom && (
                      <TouchableOpacity onPress={() => deleteCategory(cat.id)}>
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* --- MODAL: EDITAR / CREAR CATEGORÍA --- */}
      <KeyboardSafeModal
        visible={showCatEditModal}
        animationType="slide"
        onClose={() => setShowCatEditModal(false)}
      >
        <Text style={styles.modalHeading}>
          {editingCategory ? 'Modificar Categoría' : 'Nueva Categoría'}
        </Text>

        <Text style={styles.inputLabelText}>Nombre de la Categoría</Text>
        <TextInput
          style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
          placeholder="Ej. Cine, Ropa, Gym..."
          placeholderTextColor="#64748B"
          value={catName}
          onChangeText={setCatName}
        />

        <Text style={[styles.inputLabelText, { marginTop: 12 }]}>Color</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
          {COLOR_PALETTE.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                selectedColor === c && styles.colorDotSelected,
              ]}
              onPress={() => setSelectedColor(c)}
            />
          ))}
        </ScrollView>

        <Text style={[styles.inputLabelText, { marginTop: 8 }]}>Buscar Icono</Text>
        <TextInput
          style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text, marginBottom: 8 }]}
          placeholder="Buscar icono (ej. auto, comida, gym...)"
          placeholderTextColor="#64748B"
          value={iconSearch}
          onChangeText={setIconSearch}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 60 }}>
          {filteredIcons.slice(0, 30).map((item) => (
            <TouchableOpacity
              key={item.icon}
              style={[
                styles.iconChip,
                selectedIcon === item.icon && { borderColor: '#34D399', backgroundColor: '#10B98122' },
              ]}
              onPress={() => setSelectedIcon(item.icon)}
            >
              <SmartIcon iconName={item.icon} color={selectedColor} size={20} />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtnHalf}
            onPress={() => setShowCatEditModal(false)}
          >
            <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleSaveCategory}>
            <Text style={styles.primaryBtnHalfText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* --- MODAL: INICIAR SESIÓN --- */}
      <Modal
        visible={showLoginModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Iniciar Sesión</Text>
            <Text style={[styles.menuRowSub, { marginBottom: 14 }]}>
              Ingresa tus datos para identificarte en tu app:
            </Text>

            <Text style={styles.inputLabelText}>Nombre</Text>
            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={loginNameInput}
              onChangeText={setLoginNameInput}
              placeholder="Ej. Jeison"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.inputLabelText, { marginTop: 12 }]}>Correo</Text>
            <TextInput
              style={[styles.textInputFull, { backgroundColor: colors.inputBg, color: colors.text }]}
              value={loginEmailInput}
              onChangeText={setLoginEmailInput}
              placeholder="Ej. jeison@ejemplo.com"
              placeholderTextColor="#64748B"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity
                style={styles.cancelBtnHalf}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.cancelBtnHalfText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtnHalf} onPress={handleLoginSubmit}>
                <Text style={styles.primaryBtnHalfText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL: ACERCA DE LA APP --- */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Finanzas USA • v1.0.4</Text>
            <Text style={[styles.menuRowSub, { lineHeight: 20, marginVertical: 10 }]}>
              Aplicación de finanzas personales, presupuestos y control de deudas con almacenamiento SQLite local 100% privado en tu dispositivo.
            </Text>
            <Text style={[styles.menuRowSub, { lineHeight: 18, marginBottom: 14 }]}>
              • Modo offline garantizado{'\n'}
              • Copias de seguridad en Google Drive (.json){'\n'}
              • Recordatorios locales en Android{'\n'}
              • Manejo inteligente de ahorros propios y dinero ajeno
            </Text>
            <TouchableOpacity
              style={styles.fullWidthPrimaryBtn}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.fullWidthPrimaryBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Onboarding View (Replay de bienvenida) */}
      <OnboardingView
        visible={showOnboardingModal}
        onFinish={() => setShowOnboardingModal(false)}
      />
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40 },
    profileCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
      gap: 12,
    },
    profileAvatarImg: {
      width: 50,
      height: 50,
      borderRadius: 25,
      borderWidth: 2,
      borderColor: '#34D399',
    },
    profileAvatarBox: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#A7F3D0',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#34D399',
    },
    profileAvatarText: {
      color: '#064E3B',
      fontSize: 22,
      fontWeight: '800',
    },
    cameraBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
    },
    profileName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    profileBadge: {
      backgroundColor: '#10B98122',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    profileBadgeText: {
      color: '#10B981',
      fontSize: 11,
      fontWeight: '700',
    },
    profileEmail: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    profileHint: {
      color: isDark ? '#34D399' : '#059669',
      fontSize: 11,
      fontWeight: '700',
      marginTop: 6,
    },
    sectionHeaderTitle: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginLeft: 4,
    },
    menuBox: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
      overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    menuRowTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    menuRowSub: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    menuDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 16,
    },
    iconPill: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    currencyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 4,
    },
    currencyRowCode: {
      fontSize: 14,
      fontWeight: '800',
    },
    currencyRowName: {
      fontSize: 12,
      marginTop: 1,
    },
    modalHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 50,
      paddingHorizontal: 16,
      paddingBottom: 14,
    },
    modalHeaderBarTitle: {
      color: '#F0FDF4',
      fontSize: 18,
      fontWeight: '800',
    },
    addCatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#A7F3D0',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      gap: 4,
    },
    addCatPillText: {
      color: '#064E3B',
      fontWeight: '800',
      fontSize: 12,
    },
    segmentContainer: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    segmentTab: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    segmentTabActive: {
      backgroundColor: '#A7F3D0',
      borderColor: '#34D399',
    },
    segmentTabText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 13,
    },
    segmentTabTextActive: {
      color: '#064E3B',
      fontWeight: '800',
    },
    catCard: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    catTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    catSub: {
      color: colors.textMuted,
      fontSize: 12,
      marginTop: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: '#00000088',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalBox: {
      width: '100%',
      borderRadius: 20,
      padding: 20,
    },
    modalHeading: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      marginBottom: 6,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    inputLabelText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    reminderChip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
    timeInput: {
      width: 60,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      textAlign: 'center',
      fontSize: 18,
      fontWeight: '800',
    },
    applyTimeBtn: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      backgroundColor: '#A7F3D0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    applyTimeBtnText: {
      color: '#064E3B',
      fontWeight: '800',
      fontSize: 14,
    },
    lastBackupBox: {
      marginBottom: 14,
    },
    lastBackupPill: {
      color: '#10B981',
      fontSize: 12,
      fontWeight: '700',
    },
    driveCard: {
      backgroundColor: isDark ? '#062B20' : '#ECFDF5',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#0C4E3D' : '#A7F3D0',
      marginBottom: 12,
    },
    driveDisconnectedCard: {
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    driveDisconnectBtn: {
      marginTop: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? '#3B1212' : '#FEE2E2',
      alignSelf: 'flex-start',
    },
    driveDisconnectBtnText: {
      color: '#DC2626',
      fontSize: 12,
      fontWeight: '700',
    },
    driveConnectBtn: {
      marginTop: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: '#10B981',
      alignSelf: 'flex-start',
    },
    driveConnectBtnText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
    driveInfoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: isDark ? '#062B20' : '#ECFDF5',
      borderRadius: 10,
      padding: 10,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? '#0C4E3D' : '#A7F3D0',
    },
    driveInfoBannerText: {
      flex: 1,
      fontSize: 11,
      color: isDark ? '#A7F3D0' : '#065F46',
      lineHeight: 16,
      fontWeight: '600',
    },
    fullWidthPrimaryBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#A7F3D0',
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 10,
    },
    fullWidthPrimaryBtnText: {
      color: '#064E3B',
      fontWeight: '800',
      fontSize: 14,
    },
    fullWidthSecondaryBtn: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 6,
    },
    fullWidthSecondaryBtnText: {
      fontWeight: '700',
      fontSize: 14,
    },
    cancelBtnFull: {
      width: '100%',
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    cancelBtnFullText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 14,
    },
    cancelBtnHalf: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    cancelBtnHalfText: {
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: 14,
    },
    primaryBtnHalf: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: '#A7F3D0',
      alignItems: 'center',
    },
    primaryBtnHalfText: {
      color: '#064E3B',
      fontWeight: '800',
      fontSize: 14,
    },
    jsonInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 12,
      fontSize: 13,
      textAlignVertical: 'top',
    },
    textInputFull: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      marginTop: 6,
    },
    colorDot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      marginRight: 8,
    },
    colorDotSelected: {
      borderWidth: 3,
      borderColor: '#FFFFFF',
    },
    iconChip: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
  });
