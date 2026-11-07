import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../../src/context/FinanceContext';
import {
  US_MAJOR_BANKS,
  USBankTemplate,
} from '../../src/services/plaidService';
import { AccountType, BankAccount } from '../../src/types/finance';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';

const OWNER_QUICK_CHIPS = [
  'Mío (Ahorro)',
  'Mío',
  'Mamá',
  'Papá',
  'Hermano/a',
  'Pareja',
  'Familiar',
  'Guardado de otro',
];

export default function AccountsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    accounts,
    includedTotalBalance,
    ownSavingsBalance,
    excludedTotalBalance,
    otherPeopleTotalBalance,
    hideOtherMoney,
    toggleHideOtherMoney,
    isOtherPersonAccount,
    isOwnSavingsAccount,
    toggleAccountIncludeInTotal,
    connectCustomUSBank,
    updateAccountBalanceAndMask,
    addManualAccount,
    updateCreditCardDetails,
    transferBetweenAccounts,
    importBankMovementsText,
    deleteAccount,
  } = useFinance();

  const [showUSBankModal, setShowUSBankModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSmartImportModal, setShowSmartImportModal] = useState(false);
  const [smartImportText, setSmartImportText] = useState('');
  const [smartImportAccId, setSmartImportAccId] = useState('');

  // Estado para agregar banco de EE. UU. (Wells Fargo, Chase, Truist, PayPal, Uber, etc.)
  const [selectedBankTemplate, setSelectedBankTemplate] = useState<USBankTemplate>(US_MAJOR_BANKS[0]);
  const [usBankAccountType, setUsBankAccountType] = useState<AccountType>('checking');
  const [usBankCustomName, setUsBankCustomName] = useState(US_MAJOR_BANKS[0].defaultCheckingName);
  const [usBankBalance, setUsBankBalance] = useState('');
  const [usBankMask, setUsBankMask] = useState('');
  const [usBankIncludeTotal, setUsBankIncludeTotal] = useState(true);
  const [usBankOwnerName, setUsBankOwnerName] = useState('');
  const [usBankCreditLimit, setUsBankCreditLimit] = useState('');
  const [usBankClosingDay, setUsBankClosingDay] = useState('');
  const [usBankDueDay, setUsBankDueDay] = useState('');

  // Estado para nueva cuenta manual o efectivo
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('checking');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [manualOwnerName, setManualOwnerName] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  // Modal para editar fechas de corte/pago y límite de una tarjeta existente
  const [editingCard, setEditingCard] = useState<BankAccount | null>(null);
  const [editLimit, setEditLimit] = useState('');
  const [editClosing, setEditClosing] = useState('');
  const [editDue, setEditDue] = useState('');

  // Modal para editar el saldo real, nombre, dueño y últimos 4 dígitos de cualquier cuenta
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editAccName, setEditAccName] = useState('');
  const [editAccBalance, setEditAccBalance] = useState('');
  const [editAccMask, setEditAccMask] = useState('');
  const [editAccOwnerName, setEditAccOwnerName] = useState('');

  // Estado para transferir entre cuentas
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferFee, setTransferFee] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Separar cuentas mías vs cuentas ajenas / separadas
  const myAccounts = useMemo(() => {
    return accounts.filter((a) => !isOtherPersonAccount(a) && a.includeInTotal);
  }, [accounts, isOtherPersonAccount]);

  const otherAccounts = useMemo(() => {
    return accounts.filter((a) => isOtherPersonAccount(a) || !a.includeInTotal);
  }, [accounts, isOtherPersonAccount]);

  // Cuentas separadas de terceros o con dueño específico
  const separatedAccounts = useMemo(() => {
    return accounts.filter(
      (a) => (!a.includeInTotal && a.type !== 'credit') || Boolean(a.ownerName?.trim())
    );
  }, [accounts]);

  const handleSelectUSBankTemplate = (bank: USBankTemplate, typeOverride?: AccountType) => {
    const targetType = typeOverride || usBankAccountType;
    setSelectedBankTemplate(bank);
    setUsBankAccountType(targetType);
    if (targetType === 'checking') {
      setUsBankCustomName(bank.defaultCheckingName);
      setUsBankIncludeTotal(true);
    } else if (targetType === 'savings') {
      setUsBankCustomName(bank.defaultSavingsName);
      setUsBankIncludeTotal(true);
    } else {
      setUsBankCustomName(bank.defaultCreditName);
      setUsBankIncludeTotal(false);
    }
  };

  const handleConnectDirectUSBank = async () => {
    const parsedBal = parseFloat(usBankBalance) || 0;
    const finalName = usBankCustomName.trim() || selectedBankTemplate.defaultCheckingName;

    await connectCustomUSBank({
      name: finalName,
      institution: selectedBankTemplate.institution,
      mask: usBankMask.trim() || selectedBankTemplate.defaultMask,
      type: usBankAccountType,
      balance: parsedBal,
      currency: 'USD',
      includeInTotal: usBankAccountType === 'credit' ? false : usBankIncludeTotal,
      color: selectedBankTemplate.color,
      ownerName: usBankOwnerName.trim() || undefined,
      creditLimit: usBankAccountType === 'credit' ? parseFloat(usBankCreditLimit) || 0 : 0,
      closingDay: usBankAccountType === 'credit' ? parseInt(usBankClosingDay, 10) || 0 : 0,
      dueDay: usBankAccountType === 'credit' ? parseInt(usBankDueDay, 10) || 0 : 0,
    });

    setUsBankBalance('');
    setUsBankMask('');
    setUsBankOwnerName('');
    setUsBankCreditLimit('');
    setUsBankClosingDay('');
    setUsBankDueDay('');
    setShowUSBankModal(false);
  };

  const handleCreateManualAccount = async () => {
    const parsedBalance = parseFloat(balance) || 0;
    if (!name.trim()) return;

    await addManualAccount({
      name: name.trim(),
      institution: institution.trim() || 'Cuenta Personal',
      type: accountType,
      balance: parsedBalance,
      currency: 'USD',
      includeInTotal: accountType === 'credit' ? false : includeInTotal,
      color: accountType === 'credit' ? '#E11D48' : '#0284C7',
      ownerName: manualOwnerName.trim() || undefined,
      creditLimit: accountType === 'credit' ? parseFloat(creditLimit) || 0 : 0,
      closingDay: accountType === 'credit' ? parseInt(closingDay, 10) || 0 : 0,
      dueDay: accountType === 'credit' ? parseInt(dueDay, 10) || 0 : 0,
    });

    setName('');
    setInstitution('');
    setBalance('');
    setManualOwnerName('');
    setCreditLimit('');
    setClosingDay('');
    setDueDay('');
    setShowManualModal(false);
  };

  const handleSaveCreditCardSettings = async () => {
    if (!editingCard) return;
    await updateCreditCardDetails(
      editingCard.id,
      parseFloat(editLimit) || 0,
      parseInt(editClosing, 10) || 0,
      parseInt(editDue, 10) || 0
    );
    setEditingCard(null);
  };

  const openTransferModal = () => {
    if (accounts.length < 2) {
      Alert.alert(
        'Necesitas al menos 2 cuentas',
        'Crea o agrega al menos dos cuentas para transferir dinero entre ellas.'
      );
      return;
    }
    setFromAccId(accounts[0].id);
    setToAccId(accounts[1].id);
    setTransferAmount('');
    setTransferFee('');
    setTransferNote('');
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = async () => {
    const amt = parseFloat(transferAmount);
    const fee = parseFloat(transferFee) || 0;
    if (!amt || amt <= 0) return;
    if (fromAccId === toAccId) {
      Alert.alert('Error', 'Selecciona cuentas diferentes para origen y destino.');
      return;
    }

    await transferBetweenAccounts({
      fromAccountId: fromAccId,
      toAccountId: toAccId,
      amount: amt,
      fee,
      description: transferNote.trim() || undefined,
      date: new Date().toISOString().split('T')[0],
    });
    setShowTransferModal(false);
  };

  const renderAccountCard = (acc: BankAccount) => {
    const isCredit = acc.type === 'credit';
    const limit = acc.creditLimit || 0;
    const used = Math.abs(acc.balance);
    const utilizationPct = limit > 0 ? (used / limit) * 100 : 0;

    return (
      <View
        key={acc.id}
        style={[
          styles.accountCard,
          !acc.includeInTotal && styles.accountCardExcluded,
        ]}
      >
        <View style={styles.accountTopRow}>
          <View style={[styles.bankBadge, { backgroundColor: acc.color }]}>
            <Ionicons
              name={
                isCredit
                  ? 'card-outline'
                  : acc.institution.toLowerCase().includes('paypal')
                  ? 'logo-paypal'
                  : acc.institution.toLowerCase().includes('uber')
                  ? 'car-sport-outline'
                  : acc.isPlaidConnected
                  ? 'shield-checkmark-outline'
                  : 'wallet-outline'
              }
              size={20}
              color="#FFF"
            />
          </View>

          <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.accountName} numberOfLines={1} ellipsizeMode="tail">{acc.name}</Text>
              {acc.mask && <Text style={styles.accountMask}>•••• {acc.mask}</Text>}
            </View>
            <Text style={styles.accountInstitution} numberOfLines={1} ellipsizeMode="tail">
              {acc.institution} •{' '}
              {isCredit
                ? 'Tarjeta de Crédito'
                : acc.type === 'savings'
                ? 'Savings / Ahorros'
                : 'Checking / Balance'}
            </Text>

            {/* Etiqueta de dueño del dinero cuando tiene ownerName o está separada */}
            {(acc.ownerName || (!acc.includeInTotal && !isCredit)) && (
              <TouchableOpacity
                style={styles.ownerBadgePill}
                onPress={() => {
                  setEditingAccount(acc);
                  setEditAccName(acc.name);
                  setEditAccBalance(String(acc.balance));
                  setEditAccMask(acc.mask || '');
                  setEditAccOwnerName(acc.ownerName || '');
                }}
              >
                <Ionicons name="person-outline" size={12} color={isDark ? '#E9D5FF' : '#7C3AED'} />
                <Text style={styles.ownerBadgeText} numberOfLines={1} ellipsizeMode="tail">
                  {acc.ownerName
                    ? (isOwnSavingsAccount(acc) ? `Mi Ahorro: ${acc.ownerName}` : `Dinero de: ${acc.ownerName}`)
                    : 'Asignar de quién es este dinero'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
            <Text style={styles.accountBalance} numberOfLines={1} adjustsFontSizeToFit>
              ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
            {isCredit && (
              <Text style={styles.creditSubTag} numberOfLines={1}>Saldo usado</Text>
            )}
          </View>
        </View>

        {/* Panel de Control de Tarjeta de Crédito (Corte, Pago y % Utilización FICO) */}
        {isCredit && (
          <View style={styles.creditBox}>
            <View style={styles.creditHeaderRow}>
              <Text style={styles.creditDatesText}>
                Corte (Closing):{' '}
                <Text style={styles.creditHighlight}>
                  {acc.closingDay ? `Día ${acc.closingDay}` : 'Sin definir'}
                </Text>{' '}
                • Pago (Due):{' '}
                <Text style={styles.creditHighlight}>
                  {acc.dueDay ? `Día ${acc.dueDay}` : 'Sin definir'}
                </Text>
              </Text>

              <TouchableOpacity
                style={styles.editCreditBtn}
                onPress={() => {
                  setEditingCard(acc);
                  setEditLimit(limit > 0 ? String(limit) : '');
                  setEditClosing(acc.closingDay ? String(acc.closingDay) : '');
                  setEditDue(acc.dueDay ? String(acc.dueDay) : '');
                }}
              >
                <Text style={styles.editCreditBtnText}>Editar Fechas/Límite</Text>
              </TouchableOpacity>
            </View>

            {limit > 0 && (
              <>
                <View style={styles.creditUtilRow}>
                  <Text style={styles.creditUtilLabel}>
                    Límite: ${limit.toLocaleString()} • Disponible: $
                    {Math.max(0, limit - used).toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.creditUtilPct,
                      {
                        color:
                          utilizationPct > 30
                            ? '#EF4444'
                            : utilizationPct > 10
                            ? '#F59E0B'
                            : '#22C55E',
                      },
                    ]}
                  >
                    Utilización: {utilizationPct.toFixed(1)}%{' '}
                    {utilizationPct <= 30 ? '(Óptimo FICO)' : '(Alto >30%)'}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(utilizationPct, 100)}%`,
                        backgroundColor:
                          utilizationPct > 30
                            ? '#EF4444'
                            : utilizationPct > 10
                            ? '#F59E0B'
                            : '#22C55E',
                      },
                    ]}
                  />
                </View>
              </>
            )}
          </View>
        )}

        <View style={styles.accountFooter}>
          <View style={styles.switchRow}>
            <Switch
              value={acc.includeInTotal}
              onValueChange={() => toggleAccountIncludeInTotal(acc.id)}
              trackColor={{ false: '#334155', true: '#0284C7' }}
              thumbColor={acc.includeInTotal ? '#38BDF8' : '#94A3B8'}
            />
            <Text
              style={[
                styles.switchLabel,
                { color: acc.includeInTotal ? (isDark ? '#38BDF8' : '#0284C7') : (isDark ? '#C084FC' : '#7C3AED') },
              ]}
            >
              {acc.includeInTotal
                ? 'Incluida en mi Saldo Total'
                : `Separada${acc.ownerName ? ` (${acc.ownerName})` : ''}`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: isDark ? '#1E293B' : '#E0F2FE',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isDark ? '#334155' : '#BAE6FD',
              }}
              onPress={() => {
                setEditingAccount(acc);
                setEditAccName(acc.name);
                setEditAccBalance(String(acc.balance));
                setEditAccMask(acc.mask || '');
                setEditAccOwnerName(acc.ownerName || '');
              }}
            >
              <Ionicons name="create-outline" size={14} color={isDark ? '#38BDF8' : '#0284C7'} />
              <Text style={{ color: isDark ? '#38BDF8' : '#0284C7', fontSize: 11, fontWeight: '700' }}>
                Editar / Dueño
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => deleteAccount(acc.id)}>
              <Ionicons name="trash-outline" size={18} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Resumen de separación de cuentas */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel} numberOfLines={1}>DISPONIBLE</Text>
            <Text style={styles.summaryIncludedValue} numberOfLines={1} adjustsFontSizeToFit>
              ${includedTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel} numberOfLines={1}>MIS AHORROS</Text>
            <Text style={[styles.summaryIncludedValue, { color: isDark ? '#34D399' : '#059669' }]} numberOfLines={1} adjustsFontSizeToFit>
              ${ownSavingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <TouchableOpacity
            style={styles.summaryCol}
            onPress={toggleHideOtherMoney}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={styles.summaryLabel} numberOfLines={1}>DINERO AJENO</Text>
              <Ionicons
                name={hideOtherMoney ? 'eye-off-outline' : 'eye-outline'}
                size={12}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.summaryExcludedValue} numberOfLines={1} adjustsFontSizeToFit>
              {hideOtherMoney
                ? '••••••'
                : `$${otherPeopleTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Desglose individual de Cuentas Separadas / Dinero de otras personas */}
        {separatedAccounts.length > 0 && (
          <View style={styles.ownersBreakdownCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Ionicons name="people-circle-outline" size={18} color="#C084FC" />
              <Text style={styles.ownersBreakdownTitle} numberOfLines={1} ellipsizeMode="tail">
                Control de Dinero Separado / Guardado por Persona
              </Text>
            </View>
            {separatedAccounts.map((sepAcc) => (
              <View key={sepAcc.id} style={styles.ownerItemRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, marginRight: 8 }}>
                  <View style={[styles.ownerDot, { backgroundColor: sepAcc.color }]} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.ownerItemPerson} numberOfLines={1} ellipsizeMode="tail">
                      👤 {sepAcc.ownerName?.trim() || 'Cuenta Separada (Sin nombre)'}
                    </Text>
                    <Text style={styles.ownerItemSub} numberOfLines={1} ellipsizeMode="tail">
                      {sepAcc.name} • {sepAcc.institution}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setEditingAccount(sepAcc);
                    setEditAccName(sepAcc.name);
                    setEditAccBalance(String(sepAcc.balance));
                    setEditAccMask(sepAcc.mask || '');
                    setEditAccOwnerName(sepAcc.ownerName || '');
                  }}
                  style={{ alignItems: 'flex-end', minWidth: 70 }}
                >
                  <Text style={styles.ownerItemAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {hideOtherMoney
                      ? '••••••'
                      : `$${sepAcc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Botones Principales: Agregar Banco US, Pasar Dinero y Cuenta Manual */}
        <View style={styles.topButtonsRow}>
          <TouchableOpacity
            style={styles.plaidConnectBtn}
            onPress={() => {
              handleSelectUSBankTemplate(US_MAJOR_BANKS[0], 'checking');
              setUsBankOwnerName('');
              setShowUSBankModal(true);
            }}
          >
            <Ionicons name="business-outline" size={18} color="#0F172A" />
            <Text style={styles.plaidConnectBtnText} numberOfLines={1}>Agregar Banco</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.transferBtn}
            onPress={openTransferModal}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#38BDF8" />
            <Text style={styles.transferBtnText}>Pasar Dinero</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualBtn}
            onPress={() => {
              setManualOwnerName('');
              setShowManualModal(true);
            }}
          >
            <Ionicons name="add-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Botón: Escáner de Alertas Bancarias y CSV (Wells Fargo, Chase, Truist, PayPal, Uber) */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: isDark ? '#052E16' : '#ECFDF5',
            borderWidth: 1,
            borderColor: isDark ? '#22C55E' : '#A7F3D0',
            borderRadius: 12,
            padding: 12,
            marginBottom: 14,
          }}
          onPress={() => {
            setSmartImportAccId(accounts[0]?.id || '');
            setShowSmartImportModal(true);
          }}
        >
          <Ionicons name="flash" size={20} color={isDark ? '#4ADE80' : '#059669'} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: isDark ? '#4ADE80' : '#065F46', fontSize: 13, fontWeight: '800' }}>
              Importar de Google Billetera / Alertas / CSV
            </Text>
            <Text style={{ color: isDark ? '#86EFAC' : '#047857', fontSize: 11, marginTop: 1 }}>
              Pega notificaciones de Google Billetera, Wells Fargo, Chase, Truist, PayPal o Uber.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={isDark ? '#4ADE80' : '#059669'} />
        </TouchableOpacity>

        <Text style={styles.helperNote}>
          Administra tus cuentas de Wells Fargo, Chase, Truist, PayPal, Uber y más. En las cuentas separadas puedes anotar de quién es ese dinero para no mezclarlo con el tuyo.
        </Text>

        {/* Cuentas Personales */}
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#94A3B8' : '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Mis Cuentas ({myAccounts.length})
          </Text>
          {myAccounts.map(renderAccountCard)}
          {myAccounts.length === 0 && (
            <Text style={{ color: isDark ? '#64748B' : '#94A3B8', fontSize: 12, fontStyle: 'italic', marginVertical: 8 }}>
              No tienes cuentas personales configuradas.
            </Text>
          )}
        </View>

        {/* Cuentas Separadas / Dinero de Terceros (Al fondo y con toggle para ocultar/mostrar) */}
        {otherAccounts.length > 0 && (
          <View style={{ marginTop: 8, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={toggleHideOtherMoney}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: isDark ? '#4338CA' : '#DDD6FE',
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="people-outline" size={16} color={isDark ? '#A78BFA' : '#7C3AED'} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: isDark ? '#C4B5FD' : '#6D28D9' }}>
                  Cuentas Separadas / Dinero Ajeno ({otherAccounts.length})
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons
                  name={hideOtherMoney ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={isDark ? '#A78BFA' : '#7C3AED'}
                />
                <Text style={{ fontSize: 12, fontWeight: '700', color: isDark ? '#A78BFA' : '#7C3AED' }}>
                  {hideOtherMoney ? 'Oculto' : 'Visible'}
                </Text>
              </View>
            </TouchableOpacity>

            {!hideOtherMoney && otherAccounts.map(renderAccountCard)}
          </View>
        )}
      </ScrollView>

      {/* Modal para Editar el Saldo Real, Nombre, Dueño y 4 Dígitos de cualquier Cuenta */}
      <KeyboardSafeModal
        visible={Boolean(editingAccount)}
        animationType="fade"
        onClose={() => setEditingAccount(null)}
      >
        <Text style={styles.modalTitle}>
          Editar Cuenta: {editingAccount?.institution}
        </Text>
        <Text style={styles.modalSub}>
          Actualiza el saldo actual en dólares, el nombre o indica de quién es este dinero si es una cuenta separada.
        </Text>

        <Text style={styles.inputLabel}>Nombre de la Cuenta</Text>
        <TextInput
          style={styles.input}
          value={editAccName}
          onChangeText={setEditAccName}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.inputLabel}>
              {editingAccount?.type === 'credit'
                ? 'Deuda Actual en Tarjeta ($ USD)'
                : 'Saldo Actual ($ USD)'}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={editAccBalance}
              onChangeText={setEditAccBalance}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Últimos 4 dígitos</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              maxLength={4}
              value={editAccMask}
              onChangeText={setEditAccMask}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>
          👤 ¿De quién es este dinero? (Para cuentas separadas o dinero guardado)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Mamá, Hermano, Pareja, Guardado para Juan..."
          placeholderTextColor="#64748B"
          value={editAccOwnerName}
          onChangeText={setEditAccOwnerName}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {OWNER_QUICK_CHIPS.map((label) => {
            const isSelected = editAccOwnerName === label;
            return (
              <TouchableOpacity
                key={label}
                style={[
                  styles.chip,
                  isSelected && {
                    borderColor: isDark ? '#C084FC' : '#7C3AED',
                    backgroundColor: isDark ? '#3B0764' : '#EDE9FE',
                  },
                ]}
                onPress={() => setEditAccOwnerName(label)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && {
                      color: isDark ? '#E9D5FF' : '#5B21B6',
                      fontWeight: '700',
                    },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.closeModalBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => setEditingAccount(null)}
          >
            <Text style={styles.closeModalBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.realPlaidBtn, { flex: 1, marginBottom: 0 }]}
            onPress={async () => {
              if (editingAccount) {
                await updateAccountBalanceAndMask(
                  editingAccount.id,
                  editAccName || editingAccount.name,
                  parseFloat(editAccBalance) || 0,
                  editAccMask,
                  editAccOwnerName
                );
                setEditingAccount(null);
              }
            }}
          >
            <Text style={styles.realPlaidBtnText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal de Importación Inteligente de Alertas / SMS / CSV */}
      <KeyboardSafeModal
        visible={showSmartImportModal}
        animationType="slide"
        onClose={() => setShowSmartImportModal(false)}
      >
        <Text style={styles.modalTitle}>
          ⚡ Importar Alertas o CSV (Wells, Chase, Truist, PayPal, Uber)
        </Text>
        <Text style={styles.modalSub}>
          Pega aquí una o varias notificaciones/SMS de tu banco o filas CSV. La app detecta comercio, monto, ícono y cuenta automáticamente.
        </Text>

        <Text style={styles.inputLabel}>Cuenta por defecto (si la alerta no dice el banco)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                smartImportAccId === acc.id && {
                  borderColor: '#4ADE80',
                  backgroundColor: '#14532D',
                },
              ]}
              onPress={() => setSmartImportAccId(acc.id)}
            >
              <Text style={styles.chipText}>{acc.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={styles.inputLabel}>Pega tus alertas o líneas CSV aquí:</Text>
          <TouchableOpacity
            onPress={() =>
              setSmartImportText(
                `Wells Fargo: Purchase of $42.50 at Walmart with card ending 3319\nChase: You made a $19.99 transaction with STEAM GAMES on card 4829\nPayPal: You sent $35.00 to Uber Eats`
              )
            }
          >
            <Text style={{ color: '#38BDF8', fontSize: 11, fontWeight: '700' }}>
              + Poner Ejemplo
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { height: 110, textAlignVertical: 'top', marginTop: 4 }]}
          placeholder={
            'Ejemplos:\n• Chase: You made a $24.50 transaction with AMAZON\n• PayPal: You paid $18.00 to UBER\n• O escribe rápido: "Walmart $38.20"'
          }
          placeholderTextColor="#64748B"
          multiline
          value={smartImportText}
          onChangeText={setSmartImportText}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <TouchableOpacity
            style={[styles.closeModalBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => setShowSmartImportModal(false)}
          >
            <Text style={styles.closeModalBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.realPlaidBtn, { flex: 1, marginBottom: 0 }]}
            onPress={async () => {
              const imported = await importBankMovementsText(
                smartImportText,
                smartImportAccId || accounts[0]?.id
              );
              if (imported > 0) {
                setSmartImportText('');
                setShowSmartImportModal(false);
                Alert.alert(
                  '✓ Movimientos Aplicados',
                  `Se procesaron ${imported} movimientos automáticamente y se actualizaron tus saldos.`
                );
              } else {
                Alert.alert(
                  'No se detectaron montos',
                  'Asegúrate de que el texto incluya el signo de dólar (ej. $25.00).'
                );
              }
            }}
          >
            <Text style={styles.realPlaidBtnText}>Procesar Gastos</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal para Configurar Corte, Pago y Límite de Tarjeta de Crédito */}
      <KeyboardSafeModal
        visible={Boolean(editingCard)}
        animationType="fade"
        onClose={() => setEditingCard(null)}
      >
        <Text style={styles.modalTitle}>
          Configurar Tarjeta: {editingCard?.name}
        </Text>
        <Text style={styles.modalSub}>
          En EE. UU. mantener el uso bajo el 30% antes del día de corte (Statement Closing Date) mejora tu puntaje de crédito (Credit Score).
        </Text>

        <Text style={styles.inputLabel}>Límite de Crédito Total ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 3000"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={editLimit}
          onChangeText={setEditLimit}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Día de Corte (1-31)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 18"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={editClosing}
              onChangeText={setEditClosing}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Día Límite Pago (1-31)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 15"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={editDue}
              onChangeText={setEditDue}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.closeModalBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => setEditingCard(null)}
          >
            <Text style={styles.closeModalBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.realPlaidBtn, { flex: 1, marginBottom: 0 }]}
            onPress={handleSaveCreditCardSettings}
          >
            <Text style={styles.realPlaidBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal para Transferir Dinero entre Cuentas con Comisión Opcional */}
      <KeyboardSafeModal
        visible={showTransferModal}
        animationType="slide"
        onClose={() => setShowTransferModal(false)}
      >
        <Text style={styles.modalTitle}>Pasar Dinero o Pagar Tarjeta</Text>
        <Text style={styles.modalSub}>
          Mueve saldo de una cuenta a otra (o paga tu tarjeta de crédito). Si te cobraron comisión, agrégala opcionalmente.
        </Text>

        <Text style={styles.inputLabel}>De qué cuenta sale (Origen)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                fromAccId === acc.id && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
              ]}
              onPress={() => setFromAccId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} (${acc.balance.toFixed(2)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>A qué cuenta entra o qué tarjeta paga (Destino)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                toAccId === acc.id && { borderColor: '#4ADE80', backgroundColor: '#14532D' },
              ]}
              onPress={() => setToAccId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} (${acc.balance.toFixed(2)})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Monto a Pasar ($ USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={transferAmount}
              onChangeText={setTransferAmount}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Comisión (Opcional $)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={transferFee}
              onChangeText={setTransferFee}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Concepto / Nota (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Pago de tarjeta Chase, Zelle a Truist..."
          placeholderTextColor="#64748B"
          value={transferNote}
          onChangeText={setTransferNote}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={[styles.closeModalBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => setShowTransferModal(false)}
          >
            <Text style={styles.closeModalBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.realPlaidBtn, { flex: 1, marginBottom: 0 }]}
            onPress={handleExecuteTransfer}
          >
            <Text style={styles.realPlaidBtnText}>Transferir Ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Directo de Bancos de EE. UU. (Wells Fargo, Chase, Truist, PayPal, Uber, etc.) */}
      <KeyboardSafeModal
        visible={showUSBankModal}
        animationType="slide"
        onClose={() => setShowUSBankModal(false)}
      >
        <Text style={styles.modalTitle}>Agregar Banco o Billetera</Text>
        <Text style={styles.modalSub}>
          Selecciona tu banco o billetera (Wells Fargo, Chase, Truist, PayPal, Uber, BofA, Capital One, Citi o Amex) e ingresa tu saldo actual.
        </Text>

        <Text style={styles.inputLabel}>1. Selecciona tu Banco o Billetera</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: 6 }}
        >
          {US_MAJOR_BANKS.map((bank) => {
            const isSelected = selectedBankTemplate.id === bank.id;
            return (
              <TouchableOpacity
                key={bank.id}
                style={[
                  styles.usBankPill,
                  { borderColor: isSelected ? bank.color : '#334155' },
                  isSelected && { backgroundColor: bank.color + '28' },
                ]}
                onPress={() => handleSelectUSBankTemplate(bank)}
              >
                <View
                  style={[
                    styles.usBankDot,
                    { backgroundColor: bank.color },
                  ]}
                />
                <Text style={styles.usBankPillText}>{bank.shortName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.inputLabel}>2. Tipo de Cuenta en {selectedBankTemplate.shortName}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              usBankAccountType === 'checking' && styles.typeSelectBtnActive,
            ]}
            onPress={() => handleSelectUSBankTemplate(selectedBankTemplate, 'checking')}
          >
            <Text style={styles.typeSelectText}>Checking / Balance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              usBankAccountType === 'savings' && styles.typeSelectBtnActive,
            ]}
            onPress={() => handleSelectUSBankTemplate(selectedBankTemplate, 'savings')}
          >
            <Text style={styles.typeSelectText}>Savings (Ahorro)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              usBankAccountType === 'credit' && styles.typeSelectBtnActive,
            ]}
            onPress={() => handleSelectUSBankTemplate(selectedBankTemplate, 'credit')}
          >
            <Text style={styles.typeSelectText}>Tarjeta Crédito</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Nombre de la Cuenta</Text>
        <TextInput
          style={styles.input}
          value={usBankCustomName}
          onChangeText={setUsBankCustomName}
          placeholder="Ej. Wells Fargo Checking, PayPal, Uber Pro..."
          placeholderTextColor="#64748B"
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Text style={styles.inputLabel}>
              {usBankAccountType === 'credit'
                ? 'Deuda Usada Actual ($ USD)'
                : 'Tu Saldo Actual ($ USD)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={usBankBalance}
              onChangeText={setUsBankBalance}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Últimos 4 dígitos</Text>
            <TextInput
              style={styles.input}
              placeholder={selectedBankTemplate.defaultMask}
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              maxLength={4}
              value={usBankMask}
              onChangeText={setUsBankMask}
            />
          </View>
        </View>

        {usBankAccountType === 'credit' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Límite ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="3000"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={usBankCreditLimit}
                onChangeText={setUsBankCreditLimit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Día Corte</Text>
              <TextInput
                style={styles.input}
                placeholder="18"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={usBankClosingDay}
                onChangeText={setUsBankClosingDay}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Día Pago</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={usBankDueDay}
                onChangeText={setUsBankDueDay}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.switchRow, { marginTop: 12, marginBottom: 4 }]}>
              <Switch
                value={usBankIncludeTotal}
                onValueChange={setUsBankIncludeTotal}
                trackColor={{ false: '#334155', true: '#0284C7' }}
              />
              <Text style={styles.switchLabel}>
                {usBankIncludeTotal
                  ? 'Sumar esta cuenta a mi Saldo Total'
                  : 'Cuenta Separada (No sumar a mi total)'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              👤 ¿De quién es este dinero? (Opcional: si guardas dinero de alguien más)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Mamá, Hermano, Pareja, Guardado..."
              placeholderTextColor="#64748B"
              value={usBankOwnerName}
              onChangeText={(txt) => {
                setUsBankOwnerName(txt);
                if (txt.trim() && txt !== 'Mío (Ahorro)') {
                  setUsBankIncludeTotal(false);
                }
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
              {OWNER_QUICK_CHIPS.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.chip,
                    usBankOwnerName === label && {
                      borderColor: '#C084FC',
                      backgroundColor: '#3B0764',
                    },
                  ]}
                  onPress={() => {
                    setUsBankOwnerName(label);
                    if (label !== 'Mío (Ahorro)') {
                      setUsBankIncludeTotal(false);
                    }
                  }}
                >
                  <Text style={styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.realPlaidBtn,
            { marginTop: 10, backgroundColor: selectedBankTemplate.color },
          ]}
          onPress={handleConnectDirectUSBank}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
          <Text style={[styles.realPlaidBtnText, { color: '#FFF' }]}>
            Agregar Cuenta de {selectedBankTemplate.shortName}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeModalBtn}
          onPress={() => setShowUSBankModal(false)}
        >
          <Text style={styles.closeModalBtnText}>Cerrar</Text>
        </TouchableOpacity>
      </KeyboardSafeModal>

      {/* Modal para Agregar Cuenta Manual, Efectivo o Dinero Guardado de Otra Persona */}
      <KeyboardSafeModal
        visible={showManualModal}
        animationType="slide"
        onClose={() => setShowManualModal(false)}
      >
        <Text style={styles.modalTitle}>Nueva Cuenta Personal / Dinero Separado</Text>

        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              accountType === 'checking' && styles.typeSelectBtnActive,
            ]}
            onPress={() => setAccountType('checking')}
          >
            <Text style={styles.typeSelectText}>Checking / Efectivo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              accountType === 'savings' && styles.typeSelectBtnActive,
            ]}
            onPress={() => setAccountType('savings')}
          >
            <Text style={styles.typeSelectText}>Ahorro / Guardado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.typeSelectBtn,
              accountType === 'credit' && styles.typeSelectBtnActive,
            ]}
            onPress={() => setAccountType('credit')}
          >
            <Text style={styles.typeSelectText}>Tarjeta Crédito</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Nombre de la cuenta o apartado</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Dinero guardado Mamá, Efectivo Casa, PayPal..."
          placeholderTextColor="#64748B"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.inputLabel}>Banco, App o Lugar</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Wells Fargo, Chase, Truist, PayPal, Uber, Efectivo..."
          placeholderTextColor="#64748B"
          value={institution}
          onChangeText={setInstitution}
        />

        <Text style={styles.inputLabel}>
          {accountType === 'credit' ? 'Deuda / Saldo usado actual ($ USD)' : 'Monto / Saldo Inicial ($ USD)'}
        </Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={balance}
          onChangeText={setBalance}
        />

        {accountType === 'credit' ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Límite Crédito ($)</Text>
              <TextInput
                style={styles.input}
                placeholder="3000"
                placeholderTextColor="#64748B"
                keyboardType="decimal-pad"
                value={creditLimit}
                onChangeText={setCreditLimit}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Día Corte</Text>
              <TextInput
                style={styles.input}
                placeholder="18"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={closingDay}
                onChangeText={setClosingDay}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Día Pago</Text>
              <TextInput
                style={styles.input}
                placeholder="15"
                placeholderTextColor="#64748B"
                keyboardType="number-pad"
                value={dueDay}
                onChangeText={setDueDay}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={[styles.switchRow, { marginTop: 12 }]}>
              <Switch
                value={includeInTotal}
                onValueChange={setIncludeInTotal}
                trackColor={{ false: '#334155', true: '#0284C7' }}
              />
              <Text style={styles.switchLabel}>
                {includeInTotal
                  ? 'Sumar esta cuenta a mi Saldo Total'
                  : 'Separada (No sumar a mi dinero total)'}
              </Text>
            </View>

            <Text style={styles.inputLabel}>
              👤 ¿De quién es este dinero? (Ideal si guardas dinero que no es tuyo)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Mamá, Hermano, Familiar, Amigo..."
              placeholderTextColor="#64748B"
              value={manualOwnerName}
              onChangeText={(txt) => {
                setManualOwnerName(txt);
                if (txt.trim() && txt !== 'Mío (Ahorro)') {
                  setIncludeInTotal(false);
                }
              }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
              {OWNER_QUICK_CHIPS.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.chip,
                    manualOwnerName === label && {
                      borderColor: '#C084FC',
                      backgroundColor: '#3B0764',
                    },
                  ]}
                  onPress={() => {
                    setManualOwnerName(label);
                    if (label !== 'Mío (Ahorro)') {
                      setIncludeInTotal(false);
                    }
                  }}
                >
                  <Text style={styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <TouchableOpacity
            style={[styles.closeModalBtn, { flex: 1, marginTop: 0 }]}
            onPress={() => setShowManualModal(false)}
          >
            <Text style={styles.closeModalBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.realPlaidBtn, { flex: 1, marginBottom: 0 }]}
            onPress={handleCreateManualAccount}
          >
            <Text style={styles.realPlaidBtnText}>Guardar</Text>
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
    summaryBanner: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    summaryCol: { flex: 1 },
    summaryDivider: { width: 1, backgroundColor: colors.cardBorder, marginHorizontal: 14 },
    summaryLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
    summaryIncludedValue: { color: '#38BDF8', fontSize: 20, fontWeight: '800', marginTop: 4 },
    summaryExcludedValue: { color: '#A855F7', fontSize: 20, fontWeight: '800', marginTop: 4 },
    ownersBreakdownCard: {
      backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#4C1D95' : '#DDD6FE',
      marginBottom: 14,
    },
    ownersBreakdownTitle: {
      color: isDark ? '#E9D5FF' : '#6D28D9',
      fontSize: 12,
      fontWeight: '800',
    },
    ownerItemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(109, 40, 217, 0.1)',
    },
    ownerDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    ownerItemPerson: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    ownerItemSub: {
      color: isDark ? '#C4B5FD' : '#7C3AED',
      fontSize: 11,
    },
    ownerItemAmount: {
      color: isDark ? '#E9D5FF' : '#5B21B6',
      fontSize: 14,
      fontWeight: '800',
    },
    ownerBadgePill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      backgroundColor: isDark ? '#3B0764' : '#EDE9FE',
      borderWidth: 1,
      borderColor: isDark ? '#7E22CE' : '#C4B5FD',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      marginTop: 5,
    },
    ownerBadgeText: {
      color: isDark ? '#E9D5FF' : '#6D28D9',
      fontSize: 11,
      fontWeight: '700',
    },
    topButtonsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    plaidConnectBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#A7F3D0',
      paddingVertical: 12,
      borderRadius: 12,
    },
    plaidConnectBtnText: { color: '#064E3B', fontWeight: '800', fontSize: 13 },
    transferBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: isDark ? '#0C382C' : '#E6F4EA',
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#144637' : '#CEEAD6',
    },
    transferBtnText: { color: isDark ? '#A7F3D0' : '#064E3B', fontWeight: '700', fontSize: 13 },
    manualBtn: {
      width: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    helperNote: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 14,
    },
    accountCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    accountCardExcluded: {
      opacity: 0.95,
      borderColor: isDark ? '#4C1D95' : '#8B5CF6',
      borderStyle: 'dashed',
    },
    accountTopRow: { flexDirection: 'row', alignItems: 'center' },
    bankBadge: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    accountName: { color: colors.text, fontSize: 16, fontWeight: '700' },
    accountMask: { color: colors.textMuted, fontSize: 12 },
    accountInstitution: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    accountBalance: { color: colors.text, fontSize: 18, fontWeight: '800' },
    creditSubTag: { color: '#FDA4AF', fontSize: 10, fontWeight: '600' },
    creditBox: {
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderRadius: 12,
      padding: 10,
      marginTop: 12,
    },
    creditHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    creditDatesText: { color: colors.textSecondary, fontSize: 11 },
    creditHighlight: { color: '#38BDF8', fontWeight: '700' },
    editCreditBtn: {
      backgroundColor: colors.card,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    editCreditBtnText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
    creditUtilRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 5,
    },
    creditUtilLabel: { color: colors.textMuted, fontSize: 11 },
    creditUtilPct: { fontSize: 11, fontWeight: '700' },
    progressTrack: {
      height: 6,
      backgroundColor: isDark ? '#0F172A' : '#E2E8F0',
      borderRadius: 999,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 999 },
    accountFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: 12,
      paddingTop: 10,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    switchLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', flexShrink: 1 },
    typeSelectBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    typeSelectBtnActive: {
      backgroundColor: '#0369A1',
      borderColor: '#38BDF8',
    },
    typeSelectText: { color: colors.text, fontSize: 11, fontWeight: '700' },
    usBankPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1.5,
      marginRight: 8,
    },
    usBankDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    usBankPillText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
    },
    modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 6 },
    modalSub: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
    realPlaidBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#4ADE80',
      paddingVertical: 12,
      borderRadius: 12,
      marginBottom: 14,
    },
    realPlaidBtnText: { color: '#052E16', fontWeight: '800', fontSize: 13 },
    closeModalBtn: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
    },
    closeModalBtnText: { color: isDark ? '#94A3B8' : '#64748B', fontWeight: '700' },
    inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 14,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      marginRight: 8,
    },
    chipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  });
