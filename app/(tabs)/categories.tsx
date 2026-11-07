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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useFinance } from '../../src/context/FinanceContext';
import { Category } from '../../src/types/finance';
import { GENERAL_ICONS, SmartIcon } from '../../src/components/BrandIcon';
import { sendTestNotificationNow } from '../../src/services/notificationService';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
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

export default function SettingsAndCategoriesScreen() {
  const {
    accounts,
    transactions,
    recurringItems,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    resetToZero,
    exportBackupJson,
    importBackupJson,
    lastDriveBackupAt,
    recordDriveBackupTimestamp,
  } = useFinance();

  const [tabType, setTabType] = useState<'expense' | 'income'>('expense');
  const { theme, isDark, setTheme, colors } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState(GENERAL_ICONS[0].icon);
  const [iconSearch, setIconSearch] = useState('');

  // Modal de Restauración de Respaldo (.json)
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupJsonInput, setBackupJsonInput] = useState('');

  const filteredCategories = categories.filter((c) => c.type === tabType);

  const filteredIcons = GENERAL_ICONS.filter(
    (item) =>
      !iconSearch.trim() ||
      item.label.toLowerCase().includes(iconSearch.toLowerCase()) ||
      item.group.toLowerCase().includes(iconSearch.toLowerCase())
  );

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
    setShowModal(false);
  };

  /**
   * Genera un archivo real .json y abre el menú nativo de Android para guardarlo directo en Google Drive
   */
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
      setShowBackupModal(false);
      Alert.alert(
        'Respaldo Restaurado',
        'Tus cuentas, movimientos, préstamos, metas y categorías fueron restaurados con éxito.'
      );
    } catch {
      Alert.alert('Error', 'El texto JSON pegado no tiene un formato de respaldo válido.');
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Bloque 0: Apariencia y Tema (Blanco y Negro) 🌓 */}
        <View style={styles.toolsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={18} color={isDark ? '#38BDF8' : '#F59E0B'} />
            <Text style={styles.toolsTitle}>Tema de la App (Blanco y Negro)</Text>
          </View>
          <Text style={styles.driveHelperText}>
            Cambia entre el modo oscuro para la noche o modo claro para el día:
          </Text>

          <View style={styles.themeSwitchRow}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                isDark && styles.themeBtnDarkActive,
              ]}
              onPress={() => setTheme('dark')}
            >
              <Ionicons name="moon" size={15} color={isDark ? '#F8FAFC' : '#94A3B8'} />
              <Text style={[styles.themeBtnText, isDark && styles.themeBtnDarkTextActive]} numberOfLines={1}>
                🌙 Tema Negro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                !isDark && styles.themeBtnLightActive,
              ]}
              onPress={() => setTheme('light')}
            >
              <Ionicons name="sunny" size={15} color={!isDark ? '#0F172A' : '#94A3B8'} />
              <Text style={[styles.themeBtnText, !isDark && styles.themeBtnLightTextActive]} numberOfLines={1}>
                ☀️ Tema Blanco
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bloque 1: Respaldo con Google Drive y Restauración */}
        <View style={styles.toolsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="logo-google" size={18} color="#4ADE80" />
            <Text style={styles.toolsTitle}>Respaldo en Google Drive y Datos</Text>
          </View>
          <Text style={styles.driveHelperText}>
            Guarda una copia completa de tus cuentas, préstamos, presupuestos y movimientos como archivo{' '}
            <Text style={{ color: '#38BDF8', fontWeight: '700' }}>.json</Text> directamente en tu{' '}
            <Text style={{ color: '#4ADE80', fontWeight: '700' }}>Google Drive</Text>.
          </Text>

          {lastDriveBackupAt && (
            <Text style={styles.lastBackupText}>
              ✓ Último respaldo generado: {new Date(lastDriveBackupAt).toLocaleString()}
            </Text>
          )}

          <View style={styles.toolsButtonsRow}>
            <TouchableOpacity
              style={[styles.toolBtnPrimary, { backgroundColor: '#22C55E' }]}
              onPress={handleBackupToGoogleDrive}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#052E16" />
              <Text style={[styles.toolBtnPrimaryText, { color: '#052E16' }]} numberOfLines={1}>
                Guardar en Drive
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toolBtnSecondary}
              onPress={() => setShowBackupModal(true)}
            >
              <Ionicons name="cloud-download-outline" size={16} color="#F8FAFC" />
              <Text style={styles.toolBtnSecondaryText} numberOfLines={1}>Restaurar Copia</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.toolBtnSecondary, { flex: 1 }]}
              onPress={async () => {
                const ok = await sendTestNotificationNow();
                if (ok) {
                  Alert.alert(
                    '🔔 Notificación Programada',
                    'En 2 segundos sonará la notificación de prueba en tu Android.'
                  );
                } else {
                  Alert.alert(
                    'Permiso Requerido',
                    'Activa los permisos de notificación para Finanzas USA en los ajustes de Android.'
                  );
                }
              }}
            >
              <Ionicons name="notifications-outline" size={15} color="#38BDF8" />
              <Text style={[styles.toolBtnSecondaryText, { color: '#38BDF8' }]} numberOfLines={1}>
                Probar Alerta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetDangerBtn, { flex: 1 }]}
              onPress={handleResetZero}
            >
              <Ionicons name="trash-bin-outline" size={15} color="#FCA5A5" />
              <Text style={styles.resetDangerText} numberOfLines={1}>Reiniciar a $0.00</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bloque 2 de Ajustes: Gestión de Categorías (Separadas de Presupuestos) */}
        <View style={styles.headerSpread}>
          <Text style={styles.sectionTitle}>Categorías de la App</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => {
              setEditingCategory(null);
              setName('');
              setSelectedColor(COLOR_PALETTE[0]);
              setSelectedIcon(GENERAL_ICONS[0].icon);
              setShowModal(true);
            }}
          >
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.addBtnText} numberOfLines={1}>Categoría</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              tabType === 'expense' && styles.segmentExpenseActive,
            ]}
            onPress={() => setTabType('expense')}
          >
            <Text style={styles.segmentText} numberOfLines={1}>
              Gastos ({categories.filter((c) => c.type === 'expense').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              tabType === 'income' && styles.segmentIncomeActive,
            ]}
            onPress={() => setTabType('income')}
          >
            <Text style={styles.segmentText} numberOfLines={1}>
              Ingresos ({categories.filter((c) => c.type === 'income').length})
            </Text>
          </TouchableOpacity>
        </View>

        {filteredCategories.map((cat) => (
          <View key={cat.id} style={styles.catCard}>
            <View style={styles.catTopRow}>
              <View style={{ marginRight: 12 }}>
                <SmartIcon iconName={cat.icon} color={cat.color} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catSub}>
                  {cat.isCustom ? 'Categoría personalizada' : 'Categoría base de la app'}
                </Text>
              </View>

              <TouchableOpacity
                style={{ marginLeft: 8 }}
                onPress={() => {
                  setEditingCategory(cat);
                  setName(cat.name);
                  setSelectedColor(cat.color);
                  setSelectedIcon(cat.icon);
                  setShowModal(true);
                }}
              >
                <Ionicons name="create-outline" size={18} color={isDark ? '#38BDF8' : '#0284C7'} />
              </TouchableOpacity>

              {cat.isCustom && (
                <TouchableOpacity
                  style={{ marginLeft: 8 }}
                  onPress={() => deleteCategory(cat.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {/* Bloque 3: Información de la App, Versión 1.0.3 y Estado */}
        <View style={styles.versionCard}>
          <View style={styles.versionHeader}>
            <View style={styles.appLogoCircle}>
              <Ionicons name="wallet" size={20} color="#0F172A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.versionAppName}>Finanzas USA • Personal Finance</Text>
              <Text style={styles.versionSub}>
                Versión 1.0.4 (Build 5 • Expo SDK 58 • Android)
              </Text>
            </View>
            <View style={styles.statusOnlineBadge}>
              <Text style={styles.statusOnlineText}>v1.0.4</Text>
            </View>
          </View>

          <View style={styles.versionDivider} />

          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Bancos US Soportados:</Text>
            <Text style={styles.versionValue}>Wells Fargo, Chase, Truist, PayPal, Uber, BofA, Citi</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Importador Inteligente:</Text>
            <Text style={styles.versionValue}>Alertas Bancarias / SMS / CSV ($0 Gratis)</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Respaldo Cloud:</Text>
            <Text style={styles.versionValue}>Google Drive (.json) + SQLite Local</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Notificaciones Android:</Text>
            <Text style={styles.versionValue}>Recordatorios 1 o 2 días antes (09:00 AM)</Text>
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Estadísticas actuales:</Text>
            <Text style={styles.versionValue}>
              {accounts.length} cuentas • {transactions.length} mov. • {recurringItems.length} recurrentes
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal para Crear/Editar Categoría con 65+ Íconos y Buscador */}
      <KeyboardSafeModal
        visible={showModal}
        animationType="slide"
        onClose={() => setShowModal(false)}
      >
        <Text style={styles.modalTitle}>
          {editingCategory
            ? `Editar Categoría: ${editingCategory.name}`
            : `Nueva Categoría de ${tabType === 'expense' ? 'Gasto' : 'Ingreso'}`}
        </Text>

        <Text style={styles.inputLabel}>Nombre de la Categoría</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Comida, Steam, Mascotas, Gimnasio..."
          placeholderTextColor="#64748B"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.inputLabel}>Color</Text>
        <View style={styles.paletteRow}>
          {COLOR_PALETTE.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorCircle,
                { backgroundColor: color },
                selectedColor === color && styles.colorCircleSelected,
              ]}
              onPress={() => setSelectedColor(color)}
            />
          ))}
        </View>

        <Text style={styles.inputLabel}>
          Buscar Ícono ({filteredIcons.length} disponibles: Netflix, Steam, Walmart, Zelle, Gym...)
        </Text>
        <TextInput
          style={[styles.input, { marginBottom: 8, paddingVertical: 8 }]}
          placeholder="Filtrar ícono (ej. juego, comida, auto, banco...)"
          placeholderTextColor="#64748B"
          value={iconSearch}
          onChangeText={setIconSearch}
        />

        <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={styles.iconGrid} nestedScrollEnabled>
          {filteredIcons.map((item) => (
            <TouchableOpacity
              key={item.icon}
              style={[
                styles.iconOption,
                selectedIcon === item.icon && {
                  borderColor: selectedColor,
                  backgroundColor: selectedColor + '25',
                },
              ]}
              onPress={() => setSelectedIcon(item.icon)}
            >
              <SmartIcon
                iconName={item.icon}
                color={selectedIcon === item.icon ? selectedColor : '#CBD5E1'}
                size={18}
                boxSize={30}
              />
              <Text style={styles.iconOptionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCategory}>
            <Text style={styles.saveBtnText}>
              {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal para Restaurar Respaldo de Google Drive (.json) */}
      <KeyboardSafeModal
        visible={showBackupModal}
        animationType="slide"
        onClose={() => setShowBackupModal(false)}
      >
        <Text style={styles.modalTitle}>Restaurar Respaldo desde Google Drive</Text>
        <Text style={styles.inputLabel}>
          Abre tu archivo .json guardado en Google Drive, copia su contenido y pégalo aquí:
        </Text>
        <TextInput
          style={[styles.input, { height: 130, textAlignVertical: 'top', marginTop: 4 }]}
          placeholder='{"version": 2, "accounts": [...]}'
          placeholderTextColor="#64748B"
          multiline
          value={backupJsonInput}
          onChangeText={setBackupJsonInput}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowBackupModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#22C55E' }]}
            onPress={handleRestoreBackup}
          >
            <Text style={[styles.saveBtnText, { color: '#052E16' }]}>
              Restaurar Copia Ahora
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 16, paddingBottom: 40 },
    toolsCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 20,
    },
    toolsTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
    themeSwitchRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
    themeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    themeBtnDarkActive: { backgroundColor: '#062B20', borderColor: '#34D399' },
    themeBtnLightActive: { backgroundColor: '#FFFFFF', borderColor: '#10B981' },
    themeBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
    themeBtnDarkTextActive: { color: '#34D399' },
    themeBtnLightTextActive: { color: '#064E3B' },
    driveHelperText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 8,
    },
    lastBackupText: {
      color: '#22C55E',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 10,
    },
    toolsButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    toolBtnPrimary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accentLime || '#A7F3D0',
      paddingVertical: 10,
      borderRadius: 10,
    },
    toolBtnPrimaryText: { color: colors.accentLimeText || '#064E3B', fontWeight: '800', fontSize: 12 },
    toolBtnSecondary: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    toolBtnSecondaryText: { color: colors.text, fontWeight: '700', fontSize: 12 },
    resetDangerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? '#450A0A' : '#FEE2E2',
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
    },
    resetDangerText: { color: isDark ? '#FCA5A5' : '#DC2626', fontSize: 12, fontWeight: '700' },
    segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    segmentBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    segmentExpenseActive: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    segmentIncomeActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    segmentText: { color: colors.text, fontWeight: '700', fontSize: 12 },
    headerSpread: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentLime || '#A7F3D0',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      gap: 4,
    },
    addBtnText: { color: colors.accentLimeText || '#064E3B', fontWeight: '800', fontSize: 13 },
    catCard: {
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    catTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    catName: { color: colors.text, fontSize: 15, fontWeight: '700' },
    catSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    versionCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginTop: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    versionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    appLogoCircle: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
    },
    versionAppName: { color: colors.text, fontSize: 15, fontWeight: '800' },
    versionSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    statusOnlineBadge: {
      backgroundColor: isDark ? '#14532D' : '#DCFCE7',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? '#22C55E' : '#86EFAC',
    },
    statusOnlineText: { color: isDark ? '#4ADE80' : '#16A34A', fontSize: 10, fontWeight: '800' },
    versionDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
    },
    versionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
      gap: 8,
    },
    versionLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
    versionValue: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(2, 6, 23, 0.85)' : 'rgba(15, 23, 42, 0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 20,
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
    inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
    },
    paletteRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginVertical: 4,
    },
    colorCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
    },
    colorCircleSelected: {
      borderWidth: 3,
      borderColor: colors.text,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      paddingVertical: 4,
    },
    iconOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    iconOptionLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
    },
    cancelBtnText: { color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' },
    saveBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: colors.accentLime || '#A7F3D0',
      alignItems: 'center',
    },
    saveBtnText: { color: colors.accentLimeText || '#064E3B', fontWeight: '800' },
  });
