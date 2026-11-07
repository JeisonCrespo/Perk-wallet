import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';
import { POPULAR_CURRENCIES, CurrencyOption } from '../constants/currencies';

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenOnboarding?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  visible,
  onClose,
  onOpenOnboarding,
}) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    userProfile,
    updateUserProfile,
    securitySettings,
    updateSecuritySettings,
    logoutUser,
    loginUser,
  } = useFinance();

  // Submodales para opciones
  const [activeSubModal, setActiveSubModal] = useState<
    'personal' | 'security' | 'help' | 'login' | 'currency' | null
  >(null);

  // Estados locales para Personal Information
  const [editName, setEditName] = useState(userProfile.name);
  const [editEmail, setEditEmail] = useState(userProfile.email);
  const [editPhone, setEditPhone] = useState(userProfile.phone || '');
  const [editCurrency, setEditCurrency] = useState(userProfile.currency || 'USD');
  const [editAccountType, setEditAccountType] = useState(userProfile.accountType || 'Personal');

  // Búsqueda de moneda
  const [currencySearch, setCurrencySearch] = useState('');

  // Estados locales para Seguridad (PIN)
  const [pinInput, setPinInput] = useState(securitySettings.pinCode || '');
  const [pinEnabled, setPinEnabled] = useState(securitySettings.pinEnabled);
  const [requirePinOnOpen, setRequirePinOnOpen] = useState(securitySettings.requirePinOnOpen);

  // Notificaciones locales
  const [notifEnabled, setNotifEnabled] = useState(true);

  // Login modal
  const [loginNameInput, setLoginNameInput] = useState('');
  const [loginEmailInput, setLoginEmailInput] = useState('');

  // Selección de Foto de Perfil desde Galería
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

  const openPersonalModal = () => {
    setEditName(userProfile.name);
    setEditEmail(userProfile.email);
    setEditPhone(userProfile.phone || '');
    setEditCurrency(userProfile.currency || 'USD');
    setEditAccountType(userProfile.accountType || 'Personal');
    setActiveSubModal('personal');
  };

  const handleSavePersonal = async () => {
    if (!editName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }
    await updateUserProfile({
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim(),
      currency: editCurrency.trim(),
      accountType: editAccountType.trim(),
    });
    setActiveSubModal(null);
  };

  const openSecurityModal = () => {
    setPinInput(securitySettings.pinCode || '');
    setPinEnabled(securitySettings.pinEnabled);
    setRequirePinOnOpen(securitySettings.requirePinOnOpen);
    setActiveSubModal('security');
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
    Alert.alert('Seguridad actualizada', 'Tus preferencias de PIN han sido guardadas.');
    setActiveSubModal(null);
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
      setActiveSubModal('login');
    }
  };

  const handleLoginSubmit = async () => {
    if (!loginNameInput.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa tu nombre.');
      return;
    }
    await loginUser(loginNameInput, loginEmailInput);
    setActiveSubModal(null);
  };

  const filteredCurrencies = POPULAR_CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Barra Superior */}
        <View style={[styles.headerBar, { backgroundColor: isDark ? '#062B20' : '#083E31' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-down" size={26} color="#F0FDF4" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Avatar y Datos Principales */}
          <View style={styles.profileHero}>
            <View style={styles.avatarWrapper}>
              <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85}>
                {userProfile.avatarUri ? (
                  <Image source={{ uri: userProfile.avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View
                    style={[
                      styles.avatarLarge,
                      { backgroundColor: userProfile.avatarColor || '#10B981' },
                    ]}
                  >
                    <Text style={styles.avatarInitial}>
                      {(userProfile.name || 'J').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarEditBadge}
                onPress={handlePickAvatar}
                activeOpacity={0.8}
              >
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.userNameText, { color: colors.text }]}>
              {userProfile.name || 'Your Name'}
            </Text>
            <Text style={[styles.userEmailText, { color: colors.textMuted }]}>
              {userProfile.email || 'your.email@example.com'}
            </Text>

            <TouchableOpacity
              style={styles.accountTypePill}
              onPress={() => setActiveSubModal('currency')}
              activeOpacity={0.7}
            >
              <Text style={styles.accountTypePillText}>
                {userProfile.accountType || 'Personal'} • {userProfile.currency || 'USD'} ▾
              </Text>
            </TouchableOpacity>
          </View>

          {/* Grupo de Opciones Estilo Mockup */}
          <View style={[styles.menuCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* 1. Personal Information */}
            <TouchableOpacity style={styles.menuItem} onPress={openPersonalModal} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                <Ionicons name="person-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Personal information</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                  {userProfile.name} • {userProfile.email}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* 2. Security */}
            <TouchableOpacity style={styles.menuItem} onPress={openSecurityModal} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Security</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                  {securitySettings.pinEnabled ? 'PIN activado' : 'PIN desactivado'} • Cifrado local
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* 3. Notifications */}
            <View style={styles.menuItem}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                <Ionicons name="notifications-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Notifications</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                  Recordatorios de facturas y cuotas
                </Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: '#334155', true: '#34D399' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* 4. Dark Mode */}
            <View style={styles.menuItem}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                <Ionicons name="moon-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Dark mode</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
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

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* 5. Help Centre */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => setActiveSubModal('help')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                <Ionicons name="help-circle-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text style={[styles.menuItemTitle, { color: colors.text }]}>Help centre</Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                  Preguntas frecuentes y soporte
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

            {/* 6. Ver Bienvenida (Get Started) */}
            {onOpenOnboarding && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    onOpenOnboarding();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: isDark ? '#144637' : '#DCFCE7' }]}>
                    <Ionicons name="rocket-outline" size={20} color={isDark ? '#34D399' : '#064E3B'} />
                  </View>
                  <View style={styles.menuItemTextCol}>
                    <Text style={[styles.menuItemTitle, { color: colors.text }]}>
                      Ver Bienvenida (Get Started)
                    </Text>
                    <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                      Replay de la animación y presentación
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />
              </>
            )}

            {/* 7. Log out / Iniciar Sesión */}
            <TouchableOpacity style={styles.menuItem} onPress={handleToggleLogout} activeOpacity={0.7}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: userProfile.isLogged ? '#FEE2E2' : '#DCFCE7' },
                ]}
              >
                <Ionicons
                  name={userProfile.isLogged ? 'log-out-outline' : 'log-in-outline'}
                  size={20}
                  color={userProfile.isLogged ? '#EF4444' : '#059669'}
                />
              </View>
              <View style={styles.menuItemTextCol}>
                <Text
                  style={[
                    styles.menuItemTitle,
                    { color: userProfile.isLogged ? '#EF4444' : '#059669', fontWeight: '800' },
                  ]}
                >
                  {userProfile.isLogged ? 'Log out' : 'Iniciar sesión'}
                </Text>
                <Text style={[styles.menuItemSub, { color: colors.textMuted }]}>
                  {userProfile.isLogged ? 'Cambiar cuenta o modo invitado' : 'Ingresa tus datos de usuario'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* --- SUBMODAL: PERSONAL INFORMATION --- */}
        <Modal
          visible={activeSubModal === 'personal'}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSubModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Personal Information</Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nombre Completo</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nombre"
                placeholderTextColor="#64748B"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>
                Correo Electrónico
              </Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>
                Teléfono (Opcional)
              </Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>
                Moneda Principal
              </Text>
              <TouchableOpacity
                style={[styles.inputField, { backgroundColor: colors.inputBg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => setActiveSubModal('currency')}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>{editCurrency}</Text>
                <Text style={{ color: colors.textMuted }}>Cambiar moneda ➔</Text>
              </TouchableOpacity>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  onPress={() => setActiveSubModal(null)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSavePersonal}>
                  <Text style={styles.confirmBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- SUBMODAL: CURRENCY SELECTOR (GRAN LISTA DE MONEDAS) --- */}
        <Modal
          visible={activeSubModal === 'currency'}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSubModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card, maxHeight: '80%' }]}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Elegir Moneda Principal</Text>

              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text, marginBottom: 12 }]}
                placeholder="Buscar país o divisa (USD, EUR, Peso...)"
                placeholderTextColor="#64748B"
                value={currencySearch}
                onChangeText={setCurrencySearch}
              />

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {filteredCurrencies.map((item: CurrencyOption) => {
                  const isSelected = (editCurrency || userProfile.currency) === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      style={[
                        styles.currencyRow,
                        isSelected && { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
                      ]}
                      onPress={async () => {
                        setEditCurrency(item.code);
                        await updateUserProfile({ currency: item.code });
                        setActiveSubModal(null);
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
                style={[styles.cancelBtn, { marginTop: 12, backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                onPress={() => setActiveSubModal(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- SUBMODAL: SECURITY --- */}
        <Modal
          visible={activeSubModal === 'security'}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSubModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Seguridad y Bloqueo</Text>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchRowTitle, { color: colors.text }]}>Activar PIN de 4 dígitos</Text>
                  <Text style={[styles.switchRowDesc, { color: colors.textMuted }]}>
                    Protege el acceso a tus finanzas
                  </Text>
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
                  <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>
                    Código PIN (4 o 6 dígitos numéricos)
                  </Text>
                  <TextInput
                    style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                    value={pinInput}
                    onChangeText={setPinInput}
                    placeholder="****"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    maxLength={6}
                    secureTextEntry
                  />

                  <View style={[styles.switchRow, { marginTop: 12 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.switchRowTitle, { color: colors.text }]}>
                        Requerir al abrir la app
                      </Text>
                      <Text style={[styles.switchRowDesc, { color: colors.textMuted }]}>
                        Pedir el PIN al iniciar la aplicación
                      </Text>
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

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  onPress={() => setActiveSubModal(null)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cerrar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveSecurity}>
                  <Text style={styles.confirmBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* --- SUBMODAL: HELP CENTRE --- */}
        <Modal
          visible={activeSubModal === 'help'}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSubModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Centro de Ayuda</Text>

              <ScrollView style={{ maxHeight: 300, marginVertical: 10 }}>
                <Text style={[styles.helpQ, { color: colors.text }]}>¿Cómo funcionan mis cuentas separadas?</Text>
                <Text style={[styles.helpA, { color: colors.textMuted }]}>
                  En Bancos puedes marcar cuentas como dinero ajeno o ahorro propio. El dinero ajeno no se mezcla con
                  tu saldo disponible y puedes ocultarlo con el botón de ojo.
                </Text>

                <Text style={[styles.helpQ, { color: colors.text, marginTop: 10 }]}>
                  ¿Dónde se guardan mis datos?
                </Text>
                <Text style={[styles.helpA, { color: colors.textMuted }]}>
                  Todos tus datos se almacenan exclusivamente de forma local y privada en tu teléfono usando SQLite.
                </Text>

                <Text style={[styles.helpQ, { color: colors.text, marginTop: 10 }]}>
                  ¿Cómo hago una copia de seguridad?
                </Text>
                <Text style={[styles.helpA, { color: colors.textMuted }]}>
                  En la pestaña "Ajustes", pulsa "Copia de Seguridad" para generar y compartir un archivo .json
                  con todos tus movimientos en Google Drive.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={[styles.confirmBtn, { width: '100%' }]}
                onPress={() => setActiveSubModal(null)}
              >
                <Text style={styles.confirmBtnText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* --- SUBMODAL: LOGIN --- */}
        <Modal
          visible={activeSubModal === 'login'}
          animationType="slide"
          transparent
          onRequestClose={() => setActiveSubModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeading, { color: colors.text }]}>Iniciar Sesión</Text>
              <Text style={[styles.switchRowDesc, { color: colors.textMuted, marginBottom: 12 }]}>
                Ingresa tus datos para identificarte en tu app de finanzas.
              </Text>

              <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Nombre</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={loginNameInput}
                onChangeText={setLoginNameInput}
                placeholder="Ej. Jeison"
                placeholderTextColor="#64748B"
              />

              <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 10 }]}>Correo</Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.inputBg, color: colors.text }]}
                value={loginEmailInput}
                onChangeText={setLoginEmailInput}
                placeholder="Ej. jeison@ejemplo.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}
                  onPress={() => setActiveSubModal(null)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.confirmBtn} onPress={handleLoginSubmit}>
                  <Text style={styles.confirmBtnText}>Entrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#F0FDF4',
    fontSize: 18,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHero: {
    alignItems: 'center',
    marginVertical: 18,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#34D399',
  },
  avatarLarge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#34D399',
  },
  avatarInitial: {
    color: '#064E3B',
    fontSize: 36,
    fontWeight: '800',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 13,
    marginTop: 2,
  },
  accountTypePill: {
    backgroundColor: '#10B98122',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 8,
  },
  accountTypePillText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  menuCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemTextCol: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  menuItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputField: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  switchRowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  switchRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#A7F3D0',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#064E3B',
    fontWeight: '800',
    fontSize: 14,
  },
  helpQ: {
    fontSize: 14,
    fontWeight: '700',
  },
  helpA: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
