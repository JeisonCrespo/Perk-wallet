import React, { useState, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFinance } from '../../src/context/FinanceContext';
import { Category } from '../../src/types/finance';
import { GENERAL_ICONS, SmartIcon } from '../../src/components/BrandIcon';
import {
  sendTestNotificationNow,
  scheduleDailyExpenseReminder,
  cancelDailyExpenseReminder,
} from '../../src/services/notificationService';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { ProfileModal } from '../../src/components/ProfileModal';
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
    userProfile,
    updateUserProfile,
  } = useFinance();

  const { isDark, toggleTheme, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);

  // Submodales para navegación limpia por click
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showBackupOptionsModal, setShowBackupOptionsModal] = useState(false);
  const [showDailyReminderModal, setShowDailyReminderModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  // Estados de Categorías
  const [tabType, setTabType] = useState<'expense' | 'income'>('expense');
  const [showCatEditModal, setShowCatEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState(GENERAL_ICONS[0].icon);
  const [iconSearch, setIconSearch] = useState('');

  // Estados de Copia de Seguridad
  const [showRestoreJsonModal, setShowRestoreJsonModal] = useState(false);
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

  const filteredCategories = categories.filter((c) => c.type === tabType);

  const filteredIcons = GENERAL_ICONS.filter(
    (item) =>
      !iconSearch.trim() ||
      item.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
      item.group.toLowerCase().includes(iconSearch.toLowerCase())
  );

  const handleOpenCatCreate = () => {
    setEditingCategory(null);
    setName('');
    setSelectedColor(COLOR_PALETTE[0]);
    setSelectedIcon(GENERAL_ICONS[0].icon);
    setIconSearch('');
    setShowCatEditModal(true);
  };

  const handleOpenCatEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSelectedColor(cat.color);
    setSelectedIcon(cat.icon);
    setIconSearch('');
    setShowCatEditModal(true);
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) return;
    if (editingCategory) {
      await updateCategory(editingCategory.id, {
        name: name.trim(),
        color: selectedColor,
        icon: selectedIcon,
      });
      setEditingCategory(null);
    } else {
      await addCategory({
        name: name.trim(),
        type: tabType,
        color: selectedColor,
        icon: selectedIcon,
      });
    }
    setName('');
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
      setShowBackupOptionsModal(false);
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

  const handleResetZero = () => {
    Alert.alert(
      'Empezar desde Cero ($0.00)',
      '¿Seguro que deseas borrar todas las cuentas, préstamos, metas y movimientos de prueba para iniciar la app desde cero?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Empezar desde 0',
          style: 'destructive',
          onPress: async () => {
            await resetToZero();
            Alert.alert('Listo', 'La app quedó en $0.00 lista para tus cuentas reales.');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Tarjeta Principal de Perfil (Acceso con Click) */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => setShowProfileModal(true)}
          activeOpacity={0.8}
        >
          {userProfile.avatarUri ? (
            <Image source={{ uri: userProfile.avatarUri }} style={styles.profileAvatarImg} />
          ) : (
            <View style={styles.profileAvatarBox}>
              <Text style={styles.profileAvatarText}>
                {(userProfile.name || 'J').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.profileName}>{userProfile.name || 'Your Name'}</Text>
              <View style={styles.profileBadge}>
                <Text style={styles.profileBadgeText}>
                  {userProfile.accountType || 'Personal'} • {userProfile.currency || 'USD'}
                </Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>{userProfile.email || 'your.email@example.com'}</Text>
            <Text style={styles.profileHint}>
              Foto, moneda, información personal y seguridad PIN ➔
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Grupo 1: Preferencias y Notificaciones */}
        <Text style={styles.sectionHeaderTitle}>PREFERENCIAS Y NOTIFICACIONES</Text>
        <View style={styles.menuBox}>
          {/* Alternar Tema Directo (Sin duplicados) */}
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

          <View style={styles.menuDivider} />

          {/* Probar Notificación Local en Android */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={async () => {
              const ok = await sendTestNotificationNow();
              if (ok) {
                Alert.alert(
                  'Notificación Enviada',
                  'En 2 segundos verás la alerta en la barra superior de tu teléfono.'
                );
              } else {
                Alert.alert(
                  'Permiso Denegado',
                  'Habilita los permisos de notificación de la app en Ajustes de Android.'
                );
              }
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="notifications-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Probar Alerta en Android</Text>
              <Text style={styles.menuRowSub}>Enviar notificación de prueba en 2 segundos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Grupo 2: Gestión de Finanzas y Copias */}
        <Text style={styles.sectionHeaderTitle}>GESTIÓN Y COPIAS DE SEGURIDAD</Text>
        <View style={styles.menuBox}>
          {/* Categorías (Ahora en submodal limpio por click) */}
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

          {/* Copia de Seguridad Google Drive / JSON */}
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => setShowBackupOptionsModal(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
              <Ionicons name="cloud-upload-outline" size={18} color={isDark ? '#34D399' : '#064E3B'} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuRowTitle}>Copia de Seguridad y Google Drive</Text>
              <Text style={styles.menuRowSub}>
                {lastDriveBackupAt
                  ? `Último respaldo: ${lastDriveBackupAt}`
                  : 'Exportar o importar archivo .json'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Empezar desde Cero */}
          <TouchableOpacity style={styles.menuRow} onPress={handleResetZero} activeOpacity={0.7}>
            <View style={[styles.iconPill, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-bin-outline" size={18} color="#DC2626" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuRowTitle, { color: '#DC2626' }]}>Empezar desde Cero ($0.00)</Text>
              <Text style={styles.menuRowSub}>Borrar cuentas de prueba para ingresar tus datos reales</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Grupo 3: Información */}
        <Text style={styles.sectionHeaderTitle}>ACERCA DE LA APLICACIÓN</Text>
        <View style={styles.menuBox}>
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

      {/* --- MODAL: OPCIONES DE COPIA DE SEGURIDAD (GOOGLE DRIVE & JSON) --- */}
      <Modal
        visible={showBackupOptionsModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBackupOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={styles.modalHeading}>Copia de Seguridad y Respaldo</Text>
            <Text style={[styles.menuRowSub, { marginBottom: 14 }]}>
              Genera un archivo seguro .json con todas tus cuentas, movimientos, préstamos y metas.
            </Text>

            {lastDriveBackupAt && (
              <Text style={styles.lastBackupPill}>
                ✓ Último respaldo guardado: {lastDriveBackupAt}
              </Text>
            )}

            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={handleBackupToGoogleDrive}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#064E3B" />
              <Text style={styles.actionBtnPrimaryText}>Guardar en Google Drive</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtnSecondary, { marginTop: 10 }]}
              onPress={() => setShowRestoreJsonModal(true)}
            >
              <Ionicons name="cloud-download-outline" size={18} color={colors.text} />
              <Text style={[styles.actionBtnSecondaryText, { color: colors.text }]}>
                Restaurar Respaldo (.json)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtnFull, { marginTop: 14 }]}
              onPress={() => setShowBackupOptionsModal(false)}
            >
              <Text style={styles.cancelBtnFullText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            style={styles.cancelBtnFull}
            onPress={() => setShowRestoreJsonModal(false)}
          >
            <Text style={styles.cancelBtnFullText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleRestoreBackup}>
            <Text style={styles.actionBtnPrimaryText}>Restaurar Ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

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
          value={name}
          onChangeText={setName}
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
            style={styles.cancelBtnFull}
            onPress={() => setShowCatEditModal(false)}
          >
            <Text style={styles.cancelBtnFullText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleSaveCategory}>
            <Text style={styles.actionBtnPrimaryText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

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
              style={styles.actionBtnPrimary}
              onPress={() => setShowAboutModal(false)}
            >
              <Text style={styles.actionBtnPrimaryText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Perfil Completo */}
      <ProfileModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
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
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: '#34D399',
    },
    profileAvatarBox: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#A7F3D0',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#34D399',
    },
    profileAvatarText: {
      color: '#064E3B',
      fontSize: 20,
      fontWeight: '800',
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
    lastBackupPill: {
      color: '#10B981',
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 14,
    },
    actionBtnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#A7F3D0',
      paddingVertical: 12,
      borderRadius: 12,
      flex: 1,
    },
    actionBtnPrimaryText: {
      color: '#064E3B',
      fontWeight: '800',
      fontSize: 14,
    },
    actionBtnSecondary: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 12,
      borderRadius: 12,
    },
    actionBtnSecondaryText: {
      fontWeight: '700',
      fontSize: 14,
    },
    cancelBtnFull: {
      flex: 1,
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
