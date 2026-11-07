import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../../src/context/FinanceContext';
import { Transaction, TransactionType } from '../../src/types/finance';
import { SmartIcon } from '../../src/components/BrandIcon';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { DateField } from '../../src/components/DatePickerModal';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    accounts,
    categories,
    transactions,
    recurringItems,
    includedTotalBalance,
    ownSavingsBalance,
    excludedTotalBalance,
    otherPeopleTotalBalance,
    netWorthBalance,
    hideOtherMoney,
    toggleHideOtherMoney,
    isOtherPersonAccount,
    addTransaction,
    updateTransaction,
    importBankMovementsText,
    transferBetweenAccounts,
    deleteTransaction,
    confirmRecurringItem,
    postponeRecurringItem,
    skipRecurringCycle,
  } = useFinance();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editTxType, setEditTxType] = useState<TransactionType>('expense');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxFee, setEditTxFee] = useState('');
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editTxAccId, setEditTxAccId] = useState('');
  const [editTxToAccId, setEditTxToAccId] = useState('');
  const [editTxCatId, setEditTxCatId] = useState('');
  const [editTxIsAnt, setEditTxIsAnt] = useState(false);
  const [showGWalletModal, setShowGWalletModal] = useState(false);
  const [gWalletAmount, setGWalletAmount] = useState('');
  const [gWalletMerchant, setGWalletMerchant] = useState('');
  const [gWalletText, setGWalletText] = useState('');
  const [gWalletAccId, setGWalletAccId] = useState('');

  // Modal Rápido y Filtro de Gastos Hormiga 🐜
  const [showAntModal, setShowAntModal] = useState(false);
  const [antAmount, setAntAmount] = useState('');
  const [antPreset, setAntPreset] = useState('☕ Café / Starbucks');
  const [antCustomDesc, setAntCustomDesc] = useState('');
  const [antAccId, setAntAccId] = useState('');
  const [onlyAntFilter, setOnlyAntFilter] = useState(false);

  const [txType, setTxType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isAntExpense, setIsAntExpense] = useState(false);

  // Buscador y Filtro por Mes en Historial (#1 pedido)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Ordenar cuentas para registrar movimientos: mis cuentas activas primero, luego separadas/ajenas al final
  const sortedAccountsForSelection = useMemo(() => {
    const ownIncluded = accounts.filter((a) => !isOtherPersonAccount(a) && a.includeInTotal);
    const ownExcluded = accounts.filter((a) => !isOtherPersonAccount(a) && !a.includeInTotal);
    const otherPeople = accounts.filter((a) => isOtherPersonAccount(a));
    return [...ownIncluded, ...ownExcluded, ...otherPeople];
  }, [accounts, isOtherPersonAccount]);

  const today = new Date().toISOString().split('T')[0];
  const [txDate, setTxDate] = useState(today);

  const dueRecurring = recurringItems.filter((item) => item.nextDueDate <= today);

  // Obtener lista única de meses (YYYY-MM) presentes en las transacciones
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(today.slice(0, 7));
    for (const t of transactions) {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.slice(0, 7));
      }
    }
    return Array.from(set).sort().reverse();
  }, [transactions, today]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesMonth =
        selectedMonth === 'all' || tx.date.startsWith(selectedMonth);

      if (!matchesMonth) return false;
      if (onlyAntFilter && !(tx.isAntExpense || tx.categoryId === 'cat-ant')) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const cat = categories.find((c) => c.id === tx.categoryId);
      const acc = accounts.find((a) => a.id === tx.accountId);
      return (
        tx.description.toLowerCase().includes(q) ||
        (cat?.name.toLowerCase().includes(q) ?? false) ||
        (acc?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [transactions, selectedMonth, onlyAntFilter, searchQuery, categories, accounts]);

  // Resumen mensual de Gastos Hormiga 🐜
  const currentMonthPrefix = today.slice(0, 7);
  const antExpensesThisMonth = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.type === 'expense' &&
        tx.date.startsWith(currentMonthPrefix) &&
        (tx.isAntExpense || tx.categoryId === 'cat-ant')
    );
  }, [transactions, currentMonthPrefix]);

  const antMonthTotal = useMemo(() => {
    return antExpensesThisMonth.reduce((sum, tx) => sum + tx.amount + (tx.fee || 0), 0);
  }, [antExpensesThisMonth]);

  const filteredTotalExpense = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);
  }, [filteredTransactions]);

  const openNewTransactionModal = (initialType: TransactionType = 'expense') => {
    setTxType(initialType);
    setSelectedAccountId(sortedAccountsForSelection[0]?.id || accounts[0]?.id || '');
    setToAccountId(sortedAccountsForSelection[1]?.id || sortedAccountsForSelection[0]?.id || accounts[0]?.id || '');
    const defaultCat = categories.find(
      (c) => c.type === (initialType === 'income' ? 'income' : 'expense')
    );
    setSelectedCategoryId(defaultCat?.id || '');
    setAmount('');
    setFee('');
    setDescription('');
    setTxDate(today);
    setIsAntExpense(false);
    setShowAddModal(true);
  };

  const handleSaveTransaction = async () => {
    const parsedAmount = parseFloat(amount);
    const parsedFee = parseFloat(fee) || 0;

    if (!parsedAmount || parsedAmount <= 0 || !selectedAccountId) return;

    if (txType === 'transfer') {
      if (!toAccountId || selectedAccountId === toAccountId) {
        Alert.alert(
          'Cuentas iguales',
          'Elige una cuenta de origen y una cuenta de destino diferentes.'
        );
        return;
      }
      await transferBetweenAccounts({
        fromAccountId: selectedAccountId,
        toAccountId,
        amount: parsedAmount,
        fee: parsedFee,
        description: description.trim() || undefined,
        date: txDate || today,
      });
      setShowAddModal(false);
      return;
    }

    if (!selectedCategoryId) return;

    await addTransaction({
      accountId: selectedAccountId,
      categoryId: selectedCategoryId,
      type: txType,
      amount: parsedAmount,
      fee: parsedFee,
      description:
        description.trim() || (txType === 'expense' ? 'Gasto manual' : 'Ingreso manual'),
      date: txDate || today,
      isAntExpense: txType === 'expense' ? (isAntExpense || selectedCategoryId === 'cat-ant') : false,
    });
    setShowAddModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tarjeta de Saldo Principal */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <Text style={styles.heroLabel} numberOfLines={1}>SALDO DISPONIBLE</Text>
            <View style={styles.badgeIncluded}>
              <Text style={styles.badgeIncludedText} numberOfLines={1}>
                {accounts.filter((a) => a.includeInTotal && !isOtherPersonAccount(a)).length} cuentas
              </Text>
            </View>
          </View>

          <Text style={styles.heroBalance} numberOfLines={1} adjustsFontSizeToFit>
            ${includedTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>

          <View style={styles.subBalancesRow}>
            <View style={styles.subBalanceBox}>
              <Text style={styles.subBalanceLabel} numberOfLines={1}>Mis Ahorros</Text>
              <Text style={[styles.subBalanceValue, { color: '#38BDF8' }]} numberOfLines={1} adjustsFontSizeToFit>
                ${ownSavingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.subBalanceDivider} />
            <TouchableOpacity
              style={styles.subBalanceBox}
              onPress={toggleHideOtherMoney}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.subBalanceLabel} numberOfLines={1}>Dinero Ajeno</Text>
                <Ionicons
                  name={hideOtherMoney ? 'eye-off-outline' : 'eye-outline'}
                  size={13}
                  color={colors.textMuted}
                />
              </View>
              <Text style={styles.subBalanceValue} numberOfLines={1} adjustsFontSizeToFit>
                {hideOtherMoney
                  ? '••••••'
                  : `$${otherPeopleTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </Text>
            </TouchableOpacity>
            <View style={styles.subBalanceDivider} />
            <View style={styles.subBalanceBox}>
              <Text style={styles.subBalanceLabel} numberOfLines={1}>Patrimonio Neto</Text>
              <Text style={[styles.subBalanceValue, { color: '#4ADE80' }]} numberOfLines={1} adjustsFontSizeToFit>
                ${netWorthBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Desglose rápido por dueño de cuentas separadas / dinero ajeno (NO sumado al patrimonio) */}
          {accounts.some((a) => (!a.includeInTotal && a.type !== 'credit') || Boolean(a.ownerName)) && (
            <View
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
              }}
            >
              <TouchableOpacity
                onPress={toggleHideOtherMoney}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: hideOtherMoney ? 2 : 6,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                  <Text
                    style={{
                      color: isDark ? '#C084FC' : '#7C3AED',
                      fontSize: 11,
                      fontWeight: '700',
                    }}
                    numberOfLines={1}
                  >
                    👤 Dinero ajeno / Cuentas separadas:
                  </Text>
                  <Ionicons
                    name={hideOtherMoney ? 'eye-off-outline' : 'eye-outline'}
                    size={15}
                    color={isDark ? '#C084FC' : '#7C3AED'}
                  />
                  <Text style={{ color: isDark ? '#A78BFA' : '#7C3AED', fontSize: 11, fontWeight: '700' }}>
                    {hideOtherMoney ? '(Oculto)' : ''}
                  </Text>
                </View>
                {otherPeopleTotalBalance > 0 && (
                  <Text style={{ color: isDark ? '#E9D5FF' : '#5B21B6', fontSize: 11, fontWeight: '800' }}>
                    {hideOtherMoney
                      ? '••••••'
                      : `$${otherPeopleTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                  </Text>
                )}
              </TouchableOpacity>

              {!hideOtherMoney && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  {accounts
                    .filter((a) => (!a.includeInTotal && a.type !== 'credit') || Boolean(a.ownerName))
                    .map((sep) => (
                      <View
                        key={sep.id}
                        style={{
                          backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
                          borderWidth: 1,
                          borderColor: isDark ? '#4C1D95' : '#DDD6FE',
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          maxWidth: '100%',
                        }}
                      >
                        <Text
                          style={{ color: isDark ? '#E9D5FF' : '#6D28D9', fontSize: 11, fontWeight: '700' }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {sep.ownerName ? `${sep.ownerName}: ` : `${sep.name}: `}
                          <Text style={{ color: isDark ? '#F8FAFC' : '#1E293B', fontWeight: '800' }}>
                            ${sep.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}

          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[
                styles.transferQuickBtn,
                {
                  backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  borderColor: isDark ? '#F59E0B' : '#FCD34D',
                },
              ]}
              onPress={() => {
                setAntAccId(sortedAccountsForSelection[0]?.id || accounts[0]?.id || '');
                setAntAmount('');
                setAntPreset('☕ Café / Starbucks');
                setAntCustomDesc('');
                setShowAntModal(true);
              }}
            >
              <Text style={{ fontSize: 12 }}>🐜</Text>
              <Text
                style={[
                  styles.transferQuickText,
                  { color: isDark ? '#FDE68A' : '#92400E' },
                ]}
                numberOfLines={1}
              >
                Hormiga
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.transferQuickBtn,
                {
                  backgroundColor: isDark ? '#052E16' : '#DCFCE7',
                  borderColor: isDark ? '#22C55E' : '#86EFAC',
                },
              ]}
              onPress={() => {
                setGWalletAccId(sortedAccountsForSelection[0]?.id || accounts[0]?.id || '');
                setGWalletAmount('');
                setGWalletMerchant('');
                setGWalletText('');
                setShowGWalletModal(true);
              }}
            >
              <Ionicons name="logo-google" size={13} color={isDark ? '#4ADE80' : '#15803D'} />
              <Text
                style={[
                  styles.transferQuickText,
                  { color: isDark ? '#4ADE80' : '#15803D' },
                ]}
                numberOfLines={1}
              >
                Billetera
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.transferQuickBtn}
              onPress={() => openNewTransactionModal('transfer')}
            >
              <Ionicons name="swap-horizontal-outline" size={14} color="#38BDF8" />
              <Text style={styles.transferQuickText} numberOfLines={1}>
                Pasar
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Radar de Gastos Hormiga del Mes 🐜 */}
        <View
          style={{
            backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
            borderRadius: 16,
            padding: 13,
            borderWidth: 1,
            borderColor: isDark ? '#78350F' : '#FDE68A',
            marginBottom: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontSize: 13, fontWeight: '800' }}>
              🐜 Radar de Gastos Hormiga (Mes actual)
            </Text>
            <Text style={{ color: isDark ? '#D6D3D1' : '#78350F', fontSize: 11, marginTop: 2 }}>
              {antExpensesThisMonth.length === 0
                ? 'Aún no registras cafés, snacks ni antojos este mes.'
                : `${antExpensesThisMonth.length} antojo(s) este mes • Total acumulado: $${antMonthTotal.toFixed(2)}`}
            </Text>
          </View>
          <TouchableOpacity
            style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: 11,
              paddingVertical: 7,
              borderRadius: 9,
            }}
            onPress={() => {
              setAntAccId(sortedAccountsForSelection[0]?.id || accounts[0]?.id || '');
              setAntAmount('');
              setAntPreset('☕ Café / Starbucks');
              setAntCustomDesc('');
              setShowAntModal(true);
            }}
          >
            <Text style={{ color: '#451A03', fontSize: 11, fontWeight: '800' }}>
              + Anotar 🐜
            </Text>
          </TouchableOpacity>
        </View>

        {/* Banner de Recurrentes Pendientes de Confirmación Manual */}
        {dueRecurring.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications-outline" size={20} color="#FBBF24" />
              <Text style={styles.pendingTitle}>
                Por Confirmar ({dueRecurring.length}) — No se aplican solos
              </Text>
            </View>

            {dueRecurring.map((rec) => {
              const acc = accounts.find((a) => a.id === rec.accountId);
              const cat = categories.find((c) => c.id === rec.categoryId);
              return (
                <View key={rec.id} style={styles.pendingCard}>
                  <View style={styles.pendingTopRow}>
                    <SmartIcon
                      iconName={cat?.icon}
                      color={cat?.color}
                      titleForAutoBrand={rec.title}
                      size={20}
                      boxSize={38}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.pendingItemTitle}>{rec.title}</Text>
                      <Text style={styles.pendingItemSub}>
                        {acc?.name || 'Cuenta'} • Programado: {rec.nextDueDate}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.pendingAmount,
                        { color: rec.type === 'income' ? '#4ADE80' : '#F87171' },
                      ]}
                    >
                      {rec.type === 'income' ? '+' : '-'}${rec.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.pendingActionsRow}>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={() => confirmRecurringItem(rec.id)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color="#052E16" />
                      <Text style={styles.confirmBtnText} numberOfLines={1} adjustsFontSizeToFit>
                        Confirmar
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postponeBtn}
                      onPress={() => postponeRecurringItem(rec.id, 3)}
                    >
                      <Ionicons name="time-outline" size={14} color={isDark ? '#E2E8F0' : '#475569'} />
                      <Text style={styles.postponeBtnText} numberOfLines={1}>
                        +3 días
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.postponeBtn}
                      onPress={() => postponeRecurringItem(rec.id, 7)}
                    >
                      <Text style={styles.postponeBtnText} numberOfLines={1}>
                        +7 días
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.postponeBtn,
                        {
                          backgroundColor: isDark ? '#331D1D' : '#FEE2E2',
                          borderColor: isDark ? '#7F1D1D' : '#FCA5A5',
                        },
                      ]}
                      onPress={() => skipRecurringCycle(rec.id)}
                    >
                      <Ionicons name="close-circle-outline" size={14} color="#EF4444" />
                      <Text
                        style={[styles.postponeBtnText, { color: '#EF4444' }]}
                        numberOfLines={1}
                      >
                        Omitir
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Encabezado de Movimientos + Botón Registrar */}
        <View style={styles.sectionHeaderSpread}>
          <Text style={styles.sectionTitle}>Historial de Movimientos</Text>
          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => openNewTransactionModal('expense')}
          >
            <Ionicons name="add" size={18} color="#0F172A" />
            <Text style={styles.addBtnSmallText}>Registrar</Text>
          </TouchableOpacity>
        </View>

        {/* Buscador y Filtro por Mes (#1) */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar comercio, categoría o cuenta (ej. Steam, Walmart)..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.monthFilterScroll}
        >
          <TouchableOpacity
            style={[
              styles.monthChip,
              onlyAntFilter && {
                backgroundColor: '#78350F',
                borderColor: '#F59E0B',
              },
            ]}
            onPress={() => setOnlyAntFilter(!onlyAntFilter)}
          >
            <Text style={[styles.monthChipText, onlyAntFilter && { color: '#FDE68A' }]}>
              🐜 Solo Gastos Hormiga
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.monthChip,
              selectedMonth === 'all' && styles.monthChipActive,
            ]}
            onPress={() => setSelectedMonth('all')}
          >
            <Text style={styles.monthChipText}>Todos los meses</Text>
          </TouchableOpacity>

          {availableMonths.map((ym) => (
            <TouchableOpacity
              key={ym}
              style={[
                styles.monthChip,
                selectedMonth === ym && styles.monthChipActive,
              ]}
              onPress={() => setSelectedMonth(ym)}
            >
              <Text style={styles.monthChipText}>Mes: {ym}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {(searchQuery.trim() !== '' || selectedMonth !== 'all') && (
          <View style={styles.filterSummaryBar}>
            <Text style={styles.filterSummaryText}>
              {filteredTransactions.length} resultados • Total gastos filtrados:{' '}
              <Text style={{ color: '#F87171', fontWeight: '800' }}>
                ${filteredTotalExpense.toFixed(2)}
              </Text>
            </Text>
          </View>
        )}

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={30} color="#38BDF8" />
            <Text style={styles.emptyStateTitle}>Sin movimientos que coincidan</Text>
            <Text style={styles.emptyStateSub}>
              Usa el botón "+ Registrar" arriba para anotar un gasto, ingreso o transferencia.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = categories.find((c) => c.id === tx.categoryId);
            const acc = accounts.find((a) => a.id === tx.accountId);
            const destAcc = tx.toAccountId
              ? accounts.find((a) => a.id === tx.toAccountId)
              : undefined;

            const isTransfer = tx.type === 'transfer';

            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txRow}
                activeOpacity={0.75}
                onPress={() => {
                  setEditingTx(tx);
                  setEditTxType(tx.type);
                  setEditTxAmount(String(tx.amount));
                  setEditTxFee(tx.fee ? String(tx.fee) : '');
                  setEditTxDesc(tx.description);
                  setEditTxDate(tx.date);
                  setEditTxAccId(tx.accountId);
                  setEditTxToAccId(tx.toAccountId || accounts[1]?.id || accounts[0]?.id || '');
                  setEditTxCatId(tx.categoryId);
                  setEditTxIsAnt(Boolean(tx.isAntExpense || tx.categoryId === 'cat-ant'));
                }}
              >
                <View style={{ marginRight: 12 }}>
                  <SmartIcon
                    iconName={isTransfer ? 'swap-horizontal-outline' : cat?.icon}
                    color={isTransfer ? '#38BDF8' : cat?.color}
                    titleForAutoBrand={tx.description}
                  />
                </View>
                <View style={styles.txInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.txDescription} numberOfLines={1} ellipsizeMode="tail">
                      {tx.description}
                    </Text>
                    {(tx.isAntExpense || tx.categoryId === 'cat-ant') && (
                      <View
                        style={{
                          backgroundColor: '#451A03',
                          borderWidth: 1,
                          borderColor: '#F59E0B',
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                        }}
                      >
                        <Text style={{ color: '#FDE68A', fontSize: 10, fontWeight: '800' }}>
                          🐜 Hormiga
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.txMeta} numberOfLines={1} ellipsizeMode="tail">
                    {isTransfer
                      ? `${acc?.name || 'Origen'} → ${destAcc?.name || 'Destino'}`
                      : `${cat?.name || 'General'} • ${acc?.institution || acc?.name}`}
                  </Text>
                  {tx.fee !== undefined && tx.fee > 0 && (
                    <Text style={styles.feeBadgeText} numberOfLines={1} ellipsizeMode="tail">
                      Incluye comisión bancaria: -${tx.fee.toFixed(2)}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                  <Text
                    style={[
                      styles.txAmount,
                      {
                        color:
                          tx.type === 'income'
                            ? '#4ADE80'
                            : tx.type === 'transfer'
                            ? '#38BDF8'
                            : '#F8FAFC',
                      },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '⇄ ' : '-'}$
                    {tx.amount.toFixed(2)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={styles.txDate}>{tx.date}</Text>
                    <Ionicons name="create-outline" size={13} color="#38BDF8" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Modal para Agregar Gasto, Ingreso o Transferencia entre Cuentas con Comisión Opcional */}
      <KeyboardSafeModal
        visible={showAddModal}
        animationType="slide"
        onClose={() => setShowAddModal(false)}
      >
        <Text style={styles.modalTitle}>Nuevo Movimiento</Text>

            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, txType === 'expense' && styles.segmentExpenseActive]}
                onPress={() => {
                  setTxType('expense');
                  const firstCat = categories.find((c) => c.type === 'expense');
                  if (firstCat) setSelectedCategoryId(firstCat.id);
                }}
              >
                <Text style={styles.segmentText}>Gasto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, txType === 'income' && styles.segmentIncomeActive]}
                onPress={() => {
                  setTxType('income');
                  const firstCat = categories.find((c) => c.type === 'income');
                  if (firstCat) setSelectedCategoryId(firstCat.id);
                }}
              >
                <Text style={styles.segmentText}>Ingreso</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, txType === 'transfer' && styles.segmentTransferActive]}
                onPress={() => setTxType('transfer')}
              >
                <Text style={styles.segmentText}>Transferir</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Monto ($ USD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Comisión (Opcional $)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00 (Sin comisión)"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  value={fee}
                  onChangeText={setFee}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>
              {txType === 'transfer'
                ? 'Nota de la transferencia (Opcional)'
                : 'Descripción (Ej. Steam, Netflix, Walmart...)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={
                txType === 'transfer'
                  ? 'Ej. Pasar a cuenta de ahorros / Pago tarjeta...'
                  : 'Ej. Steam, Netflix, Gasolina...'
              }
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
            />

            <DateField
              label="Fecha del movimiento"
              value={txDate}
              onChange={setTxDate}
            />

            <Text style={styles.inputLabel}>
              {txType === 'transfer' ? 'Cuenta Origen (De dónde sale)' : 'Cuenta'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {sortedAccountsForSelection.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.chip,
                    selectedAccountId === acc.id && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={styles.chipText}>
                    {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {txType === 'transfer' ? (
              <>
                <Text style={styles.inputLabel}>Cuenta Destino (A dónde entra)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {sortedAccountsForSelection.map((acc) => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.chip,
                        toAccountId === acc.id && {
                          borderColor: '#4ADE80',
                          backgroundColor: '#14532D',
                        },
                      ]}
                      onPress={() => setToAccountId(acc.id)}
                    >
                      <Text style={styles.chipText}>
                        {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Categoría</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                  {categories
                    .filter((c) => c.type === txType)
                    .map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.chip,
                          selectedCategoryId === cat.id && {
                            borderColor: cat.color,
                            backgroundColor: cat.color + '33',
                          },
                        ]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text style={styles.chipText}>{cat.name}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>

                {txType === 'expense' && (
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: '#1C1917',
                      borderWidth: 1,
                      borderColor: '#78350F',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginTop: 10,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={{ color: '#FDE68A', fontSize: 13, fontWeight: '700' }}>
                        🐜 Es un Gasto Hormiga
                      </Text>
                      <Text style={{ color: '#A8A29E', fontSize: 11 }}>
                        Café, snack, propina, bebida o compra impulsiva pequeña
                      </Text>
                    </View>
                    <Switch
                      value={isAntExpense || selectedCategoryId === 'cat-ant'}
                      onValueChange={(val) => {
                        setIsAntExpense(val);
                        if (val) setSelectedCategoryId('cat-ant');
                      }}
                      trackColor={{ false: '#334155', true: '#F59E0B' }}
                    />
                  </View>
                )}
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTransaction}>
                <Text style={styles.saveBtnText}>
                  {txType === 'transfer' ? 'Transferir' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
      </KeyboardSafeModal>

      {/* Modal para Ver en Detalle y Modificar o Eliminar un Movimiento del Historial */}
      <KeyboardSafeModal
        visible={Boolean(editingTx)}
        animationType="slide"
        onClose={() => setEditingTx(null)}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
            Detalle y Edición del Movimiento
          </Text>
          {editingTx && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#450A0A',
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: '#7F1D1D',
              }}
              onPress={() => {
                const idToDelete = editingTx.id;
                setEditingTx(null);
                deleteTransaction(idToDelete);
              }}
            >
              <Ionicons name="trash-outline" size={14} color="#FCA5A5" />
              <Text style={{ color: '#FCA5A5', fontSize: 11, fontWeight: '700' }}>
                Eliminar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, editTxType === 'expense' && styles.segmentExpenseActive]}
            onPress={() => {
              setEditTxType('expense');
              const firstCat = categories.find((c) => c.type === 'expense');
              if (firstCat) setEditTxCatId(firstCat.id);
            }}
          >
            <Text style={styles.segmentText}>Gasto</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, editTxType === 'income' && styles.segmentIncomeActive]}
            onPress={() => {
              setEditTxType('income');
              const firstCat = categories.find((c) => c.type === 'income');
              if (firstCat) setEditTxCatId(firstCat.id);
            }}
          >
            <Text style={styles.segmentText}>Ingreso</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, editTxType === 'transfer' && styles.segmentTransferActive]}
            onPress={() => setEditTxType('transfer')}
          >
            <Text style={styles.segmentText}>Transferir</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Monto ($ USD)</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={editTxAmount}
              onChangeText={setEditTxAmount}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Comisión ($ USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={editTxFee}
              onChangeText={setEditTxFee}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Descripción / Comercio</Text>
        <TextInput
          style={styles.input}
          value={editTxDesc}
          onChangeText={setEditTxDesc}
        />

        <DateField
          label="Fecha de la transacción"
          value={editTxDate}
          onChange={setEditTxDate}
        />

        <Text style={styles.inputLabel}>
          {editTxType === 'transfer' ? 'Cuenta Origen (De dónde salió)' : 'Cuenta / Tarjeta'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {sortedAccountsForSelection.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                editTxAccId === acc.id && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
              ]}
              onPress={() => setEditTxAccId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {editTxType === 'transfer' ? (
          <>
            <Text style={styles.inputLabel}>Cuenta Destino (A dónde entró)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {sortedAccountsForSelection.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.chip,
                    editTxToAccId === acc.id && {
                      borderColor: '#4ADE80',
                      backgroundColor: '#14532D',
                    },
                  ]}
                  onPress={() => setEditTxToAccId(acc.id)}
                >
                  <Text style={styles.chipText}>
                    {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        ) : (
          <>
            <Text style={styles.inputLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {categories
                .filter((c) => c.type === editTxType)
                .map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      editTxCatId === cat.id && {
                        borderColor: cat.color,
                        backgroundColor: cat.color + '33',
                      },
                    ]}
                    onPress={() => setEditTxCatId(cat.id)}
                  >
                    <Text style={styles.chipText}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            {editTxType === 'expense' && (
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#1C1917',
                  borderWidth: 1,
                  borderColor: '#78350F',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginTop: 10,
                }}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: '#FDE68A', fontSize: 13, fontWeight: '700' }}>
                    🐜 Marcar como Gasto Hormiga
                  </Text>
                  <Text style={{ color: '#A8A29E', fontSize: 11 }}>
                    Aparecerá en tu Radar de Gastos Hormiga del mes
                  </Text>
                </View>
                <Switch
                  value={editTxIsAnt || editTxCatId === 'cat-ant'}
                  onValueChange={(val) => {
                    setEditTxIsAnt(val);
                    if (val) setEditTxCatId('cat-ant');
                  }}
                  trackColor={{ false: '#334155', true: '#F59E0B' }}
                />
              </View>
            )}
          </>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setEditingTx(null)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (!editingTx) return;
              const parsedAmt = parseFloat(editTxAmount);
              const parsedFee = parseFloat(editTxFee) || 0;
              if (!parsedAmt || parsedAmt <= 0 || !editTxAccId) return;

              await updateTransaction(editingTx.id, {
                accountId: editTxAccId,
                toAccountId: editTxType === 'transfer' ? editTxToAccId : undefined,
                categoryId: editTxCatId,
                type: editTxType,
                amount: parsedAmt,
                fee: parsedFee,
                description: editTxDesc.trim() || editingTx.description,
                date: editTxDate.trim() || editingTx.date,
                isAntExpense: editTxType === 'expense' ? (editTxIsAnt || editTxCatId === 'cat-ant') : false,
              });
              setEditingTx(null);
            }}
          >
            <Text style={styles.saveBtnText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Rápido para Registrar Gasto Hormiga 🐜 */}
      <KeyboardSafeModal
        visible={showAntModal}
        animationType="slide"
        onClose={() => setShowAntModal(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Text style={{ fontSize: 22 }}>🐜</Text>
          <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
            Registrar Gasto Hormiga
          </Text>
        </View>
        <Text style={{ color: '#A8A29E', fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          Anota en segundos esos pequeños gastos diarios (café, snacks, bebidas, propinas, compras impulsivas) que a fin de mes suman mucho:
        </Text>

        <Text style={styles.inputLabel}>1. ¿En qué se te fue el antojo?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[
            '☕ Café / Starbucks',
            '🍫 Snack / Dulce',
            '🥤 Bebida / Refresco',
            '🍔 Antojo / Fast Food',
            '🛍️ Compra Impulsiva',
            '🎮 Micro-compra / Juego',
            '💵 Propina / Tip',
            '🛵 Delivery / Cargo extra',
          ].map((preset) => {
            const isSelected = antPreset === preset;
            return (
              <TouchableOpacity
                key={preset}
                style={[
                  styles.chip,
                  isSelected && {
                    borderColor: '#F59E0B',
                    backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  },
                ]}
                onPress={() => setAntPreset(preset)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: isDark ? '#FDE68A' : '#92400E', fontWeight: '700' },
                  ]}
                >
                  {preset}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>2. Monto ($ USD)</Text>
            <TextInput
              style={[styles.input, { fontSize: 17, fontWeight: '800', color: isDark ? '#FDE68A' : '#92400E' }]}
              placeholder="Ej. 5.50"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={antAmount}
              onChangeText={setAntAmount}
            />
          </View>
          <View style={{ flex: 1.3 }}>
            <Text style={styles.inputLabel}>Nota opcional</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Iced Latte, Doritos..."
              placeholderTextColor="#64748B"
              value={antCustomDesc}
              onChangeText={setAntCustomDesc}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>O toca un monto rápido:</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
          {['2.50', '5.00', '7.50', '10.00', '15.00'].map((qAmt) => {
            const isSelected = antAmount === qAmt;
            return (
              <TouchableOpacity
                key={qAmt}
                style={[
                  styles.chip,
                  { flex: 1, marginRight: 0, alignItems: 'center' },
                  isSelected && {
                    borderColor: '#F59E0B',
                    backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  },
                ]}
                onPress={() => setAntAmount(qAmt)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: isDark ? '#FDE68A' : '#92400E', fontWeight: '700' },
                  ]}
                >
                  ${qAmt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.inputLabel}>3. ¿Con qué cuenta o tarjeta pagaste?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {sortedAccountsForSelection.map((acc) => {
            const isSelected = antAccId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.chip,
                  isSelected && {
                    borderColor: '#F59E0B',
                    backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  },
                ]}
                onPress={() => setAntAccId(acc.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected && { color: isDark ? '#FDE68A' : '#92400E', fontWeight: '700' },
                  ]}
                >
                  {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowAntModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#F59E0B' }]}
            onPress={async () => {
              const parsed = parseFloat(antAmount);
              const accId = antAccId || accounts[0]?.id;
              if (!parsed || parsed <= 0 || !accId) {
                Alert.alert('Falta el monto', 'Ingresa cuánto gastaste en este gasto hormiga.');
                return;
              }
              const finalDesc = antCustomDesc.trim()
                ? `${antPreset} — ${antCustomDesc.trim()}`
                : antPreset;
              await addTransaction({
                accountId: accId,
                categoryId: 'cat-ant',
                type: 'expense',
                amount: parsed,
                description: finalDesc,
                date: today,
                isAntExpense: true,
              });
              setShowAntModal(false);
            }}
          >
            <Text style={[styles.saveBtnText, { color: '#451A03' }]}>
              Guardar Hormiga 🐜
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Rápido para Pagos con Google Billetera / Alertas */}
      <KeyboardSafeModal
        visible={showGWalletModal}
        animationType="slide"
        onClose={() => setShowGWalletModal(false)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Ionicons name="logo-google" size={20} color="#4ADE80" />
          <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
            Pago Rápido con Google Billetera
          </Text>
        </View>
        <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 18, marginBottom: 8 }}>
          Registra en 2 segundos lo que acabas de pagar acercando el teléfono con Google Billetera (sin necesidad de copiar notificaciones):
        </Text>

        <Text style={styles.inputLabel}>1. ¿Con qué tarjeta de tu Google Billetera pagaste?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {sortedAccountsForSelection.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                gWalletAccId === acc.id && {
                  borderColor: '#4ADE80',
                  backgroundColor: '#14532D',
                },
              ]}
              onPress={() => setGWalletAccId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} {acc.mask ? `(•••• ${acc.mask})` : ''}{isOtherPersonAccount(acc) ? ' 👤' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>2. Monto Pagado ($ USD)</Text>
            <TextInput
              style={[styles.input, { fontSize: 17, fontWeight: '800', color: '#4ADE80' }]}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={gWalletAmount}
              onChangeText={setGWalletAmount}
            />
          </View>
          <View style={{ flex: 1.4 }}>
            <Text style={styles.inputLabel}>3. ¿Dónde pagaste?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Walmart, Gasolina..."
              placeholderTextColor="#64748B"
              value={gWalletMerchant}
              onChangeText={setGWalletMerchant}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>O toca un comercio rápido:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {[
            'Walmart',
            'Target',
            'Publix',
            'Gasolina / Shell',
            "McDonald's",
            'Starbucks',
            'Chick-fil-A',
            'Uber / Lyft',
            'Costco',
            'CVS / Walgreens',
            'Amazon',
            'Restaurante',
          ].map((place) => (
            <TouchableOpacity
              key={place}
              style={[
                styles.chip,
                gWalletMerchant === place && {
                  borderColor: '#38BDF8',
                  backgroundColor: '#0C4A6E',
                },
              ]}
              onPress={() => setGWalletMerchant(place)}
            >
              <Text style={styles.chipText}>{place}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.inputLabel, { marginTop: 8 }]}>
          Opcional: Si te llegó por SMS de tu banco y lo copiaste, pégalo aquí:
        </Text>
        <TextInput
          style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
          placeholder={'Ej. Wells Fargo SMS: Purchase of $24.50 at WALMART...'}
          placeholderTextColor="#64748B"
          multiline
          value={gWalletText}
          onChangeText={setGWalletText}
        />

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowGWalletModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#22C55E' }]}
            onPress={async () => {
              // Si ingresó monto arriba (modo rápido de 2 segundos sin copiar nada)
              const quickAmt = parseFloat(gWalletAmount);
              if (!isNaN(quickAmt) && quickAmt > 0) {
                const place = gWalletMerchant.trim() || 'Pago con Google Billetera';
                const count = await importBankMovementsText(
                  `${place} $${quickAmt.toFixed(2)}`,
                  gWalletAccId || accounts[0]?.id
                );
                if (count > 0) {
                  setGWalletAmount('');
                  setGWalletMerchant('');
                  setShowGWalletModal(false);
                  return;
                }
              }

              // Si pegó un SMS o texto abajo
              const count = await importBankMovementsText(
                gWalletText,
                gWalletAccId || accounts[0]?.id
              );
              if (count > 0) {
                setGWalletText('');
                setShowGWalletModal(false);
                Alert.alert(
                  '✓ Pago de Google Billetera Registrado',
                  `Se descontó automáticamente de tu tarjeta y se asignó su categoría e ícono.`
                );
              } else {
                Alert.alert(
                  'Ingresa el monto',
                  'Escribe el monto en la casilla de arriba (ej. 18.50) o pega el SMS del banco.'
                );
              }
            }}
          >
            <Text style={[styles.saveBtnText, { color: '#052E16' }]}>
              Registrar Pago
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
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 18,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    heroLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
    },
    badgeIncluded: {
      backgroundColor: '#0369A1',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeIncludedText: { color: '#E0F2FE', fontSize: 11, fontWeight: '600' },
    heroBalance: {
      color: colors.text,
      fontSize: 36,
      fontWeight: '800',
      marginVertical: 10,
    },
    subBalancesRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
      marginTop: 4,
    },
    subBalanceBox: { flex: 1 },
    subBalanceDivider: { width: 1, backgroundColor: colors.cardBorder, marginHorizontal: 12 },
    subBalanceLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
    subBalanceValue: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
    quickActionRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    transferQuickBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE',
      borderWidth: 1,
      borderColor: '#0284C7',
      minWidth: 0,
    },
    transferQuickText: { color: isDark ? '#E0F2FE' : '#0369A1', fontSize: 12, fontWeight: '700' },
    pendingSection: {
      backgroundColor: isDark ? '#1E1B4B' : '#EEF2FF',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? '#4338CA' : '#C7D2FE',
      marginBottom: 20,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    pendingTitle: { color: isDark ? '#FEF08A' : '#4338CA', fontSize: 13, fontWeight: '700' },
    pendingCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pendingTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    pendingItemTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
    pendingItemSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    pendingAmount: { fontSize: 16, fontWeight: '800' },
    pendingActionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    confirmBtn: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: '#4ADE80',
      paddingHorizontal: 6,
      paddingVertical: 8,
      borderRadius: 8,
    },
    confirmBtnText: { color: '#052E16', fontWeight: '700', fontSize: 11 },
    postponeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderRadius: 8,
    },
    postponeBtnText: { color: isDark ? '#E2E8F0' : '#475569', fontSize: 11, fontWeight: '600' },
    sectionHeaderSpread: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
    addBtnSmall: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#38BDF8',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      gap: 4,
    },
    addBtnSmallText: { color: '#0F172A', fontWeight: '700', fontSize: 13 },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 10,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 13,
      paddingVertical: 2,
    },
    monthFilterScroll: {
      marginBottom: 12,
    },
    monthChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginRight: 8,
    },
    monthChipActive: {
      backgroundColor: '#0369A1',
      borderColor: '#38BDF8',
    },
    monthChipText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '600',
    },
    filterSummaryBar: {
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    filterSummaryText: { color: colors.textSecondary, fontSize: 12 },
    emptyState: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    emptyStateTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
    emptyStateSub: {
      color: colors.textMuted,
      fontSize: 13,
      textAlign: 'center',
      marginTop: 6,
      lineHeight: 19,
    },
    txRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: 14,
      borderRadius: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    txInfo: { flex: 1, marginRight: 8, minWidth: 0 },
    txDescription: { color: colors.text, fontSize: 15, fontWeight: '600' },
    txMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
    feeBadgeText: {
      color: '#D97706',
      fontSize: 11,
      fontWeight: '600',
      marginTop: 3,
    },
    txAmount: { fontSize: 15, fontWeight: '700' },
    txDate: { color: colors.textMuted, fontSize: 11 },
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
    modalTitle: { color: colors.text, fontSize: 19, fontWeight: '800', marginBottom: 14 },
    segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
    },
    segmentExpenseActive: { backgroundColor: '#EF4444' },
    segmentIncomeActive: { backgroundColor: '#22C55E' },
    segmentTransferActive: { backgroundColor: '#0284C7' },
    segmentText: { color: '#F8FAFC', fontWeight: '700', fontSize: 13 },
    inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
    },
    chipScroll: { flexDirection: 'row', marginVertical: 4 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      marginRight: 8,
    },
    chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
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
      backgroundColor: '#38BDF8',
      alignItems: 'center',
    },
    saveBtnText: { color: '#0F172A', fontWeight: '800' },
  });
