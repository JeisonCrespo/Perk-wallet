import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../../src/context/FinanceContext';
import {
  DebtPayoffStrategy,
  LoanDirection,
  LoanRecord,
  InstallmentDebt,
  RecurrenceFrequency,
  RecurringItem,
} from '../../src/types/finance';
import { BRAND_PRESETS, GENERAL_ICONS, SmartIcon } from '../../src/components/BrandIcon';
import { sendTestNotificationNow } from '../../src/services/notificationService';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { DateField } from '../../src/components/DatePickerModal';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';

type ControlSubTab = 'recurring' | 'debts' | 'loans' | 'goals';

const BNPL_PLATFORMS = [
  { name: 'Affirm', color: '#4F46E5', icon: 'card-outline' },
  { name: 'Klarna', color: '#EC4899', icon: 'pricetag-outline' },
  { name: 'Afterpay', color: '#14B8A6', icon: 'bag-check-outline' },
  { name: 'PayPal Pay in 4', color: '#0070BA', icon: 'logo-paypal' },
  { name: 'Zip / Quadpay', color: '#8B5CF6', icon: 'flash-outline' },
  { name: 'Tarjeta / Cuotas', color: '#EF4444', icon: 'card-outline' },
];

export const calculateProjectedDates = (
  firstDateStr: string,
  freq: 'monthly' | 'biweekly' | 'weekly',
  totalInst: number,
  paidInst: number
) => {
  if (!firstDateStr || !firstDateStr.includes('-')) return [];
  const parts = firstDateStr.split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return [];

  const projected: { installmentNumber: number; dateStr: string; label: string }[] = [];
  const remainingCount = Math.max(0, totalInst - paidInst);

  for (let i = 0; i < remainingCount; i++) {
    const instNumber = paidInst + i + 1;
    const baseDate = new Date(parts[0], parts[1] - 1, parts[2]);

    if (freq === 'monthly') {
      baseDate.setMonth(baseDate.getMonth() + i);
    } else if (freq === 'biweekly') {
      baseDate.setDate(baseDate.getDate() + i * 15);
    } else if (freq === 'weekly') {
      baseDate.setDate(baseDate.getDate() + i * 7);
    }

    const y = baseDate.getFullYear();
    const m = String(baseDate.getMonth() + 1).padStart(2, '0');
    const d = String(baseDate.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const label = baseDate.toLocaleDateString('es-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    projected.push({ installmentNumber: instNumber, dateStr, label });
  }

  return projected;
};

export default function ControlScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    recurringItems,
    accounts,
    categories,
    loans,
    savingsGoals,
    installmentDebts,
    isOtherPersonAccount,
    addRecurringItem,
    updateRecurringItem,
    updateRecurringReminderDays,
    toggleRecurringReimbursed,
    updateRecurringSharing,
    confirmRecurringItem,
    postponeRecurringItem,
    skipRecurringCycle,
    deleteRecurringItem,
    addLoanRecord,
    updateLoanRecord,
    registerLoanPayment,
    deleteLoanRecord,
    addInstallmentDebt,
    updateInstallmentDebt,
    registerInstallmentPayment,
    deleteInstallmentDebt,
    addSavingsGoal,
    updateSavingsGoalAmount,
    deleteSavingsGoal,
  } = useFinance();

  const [subTab, setSubTab] = useState<ControlSubTab>('recurring');

  // Ordenar cuentas para mostrar las propias primero
  const sortedAccounts = useMemo(() => {
    const own = accounts.filter((a) => !isOtherPersonAccount(a) && a.includeInTotal);
    const separated = accounts.filter((a) => isOtherPersonAccount(a) || !a.includeInTotal);
    return [...own, ...separated];
  }, [accounts, isOtherPersonAccount]);

  // Gesto de volver atrás en Android: si está en Cuotas, Préstamos o Metas, regresa a Recurrentes primero
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (subTab !== 'recurring') {
        setSubTab('recurring');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [subTab]);

  // --- Estados Recurrentes y Suscripciones Compartidas (Netflix, Spotify, etc.) ---
  const [showAddRecModal, setShowAddRecModal] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringItem | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(1);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isSharedSub, setIsSharedSub] = useState(false);
  const [sharedWithNames, setSharedWithNames] = useState('');
  const [sharedPeopleCount, setSharedPeopleCount] = useState(2);
  const [customMyShare, setCustomMyShare] = useState('');

  // Modal para editar / activar Suscripción Compartida en un recurrente ya creado
  const [editingSharedRec, setEditingSharedRec] = useState<RecurringItem | null>(null);
  const [editIsShared, setEditIsShared] = useState(true);
  const [editSharedNames, setEditSharedNames] = useState('');
  const [editSharedCount, setEditSharedCount] = useState(2);
  const [editMyShare, setEditMyShare] = useState('');

  const [confirmingItemId, setConfirmingItemId] = useState<string | null>(null);
  const [customConfirmAmount, setCustomConfirmAmount] = useState('');

  // --- Estados Rastreador de Deudas / Cuotas (Affirm, Klarna, etc.) + Bola de Nieve / Avalancha ---
  const [payoffStrategy, setPayoffStrategy] = useState<DebtPayoffStrategy>('snowball');
  const [extraMonthlySnowball, setExtraMonthlySnowball] = useState('');
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [editingDebt, setEditingDebt] = useState<InstallmentDebt | null>(null);
  const [debtTitle, setDebtTitle] = useState('');
  const [debtPlatform, setDebtPlatform] = useState('Affirm');
  const [debtTotalAmount, setDebtTotalAmount] = useState('');
  const [debtRemaining, setDebtRemaining] = useState('');
  const [debtMinPayment, setDebtMinPayment] = useState('');
  const [debtInterestApr, setDebtInterestApr] = useState('0');
  const [debtDueDates, setDebtDueDates] = useState('');
  const [debtInstTotal, setDebtInstTotal] = useState('4');
  const [debtInstPaid, setDebtInstPaid] = useState('0');
  const [debtColor, setDebtColor] = useState('#4F46E5');
  const [debtIcon, setDebtIcon] = useState('card-outline');
  const [debtFrequency, setDebtFrequency] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [debtFirstDueDate, setDebtFirstDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [debtReminderDays, setDebtReminderDays] = useState<number>(1);
  const [debtAccountId, setDebtAccountId] = useState<string>('');

  // Proyección automática de cuotas y fechas calculadas en el calendario
  const projectedDates = useMemo(() => {
    const tot = parseInt(debtInstTotal, 10) || 4;
    const paid = parseInt(debtInstPaid, 10) || 0;
    return calculateProjectedDates(debtFirstDueDate, debtFrequency, tot, paid);
  }, [debtFirstDueDate, debtFrequency, debtInstTotal, debtInstPaid]);

  // Modal Abonar Cuota a Deuda Affirm / Klarna
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [debtPaymentInput, setDebtPaymentInput] = useState('');
  const [debtPayFromAccId, setDebtPayFromAccId] = useState<string>('');

  // --- Estados Préstamos (Me deben / Yo debo) ---
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [editingLoan, setEditingLoan] = useState<LoanRecord | null>(null);
  const [personName, setPersonName] = useState('');
  const [loanDirection, setLoanDirection] = useState<LoanDirection>('lent');
  const [loanAmount, setLoanAmount] = useState('');
  const [loanNotes, setLoanNotes] = useState('');
  const [loanDueDate, setLoanDueDate] = useState('');
  const [loanAccountId, setLoanAccountId] = useState('');
  const [payingLoanId, setPayingLoanId] = useState<string | null>(null);
  const [loanPaymentInput, setLoanPaymentInput] = useState('');
  const [loanPayAccountId, setLoanPayAccountId] = useState('');

  const openNewDebtModal = () => {
    setEditingDebt(null);
    setDebtTitle('');
    setDebtPlatform('Affirm');
    setDebtTotalAmount('');
    setDebtRemaining('');
    setDebtMinPayment('');
    setDebtInterestApr('0');
    setDebtDueDates('');
    setDebtInstTotal('4');
    setDebtInstPaid('0');
    setDebtColor('#4F46E5');
    setDebtIcon('card-outline');
    setDebtFrequency('monthly');
    setDebtFirstDueDate(new Date().toISOString().split('T')[0]);
    setDebtReminderDays(1);
    setDebtAccountId(accounts[0]?.id || '');
    setShowAddDebtModal(true);
  };

  const openEditDebtModal = (debt: InstallmentDebt) => {
    setEditingDebt(debt);
    setDebtTitle(debt.title);
    setDebtPlatform(debt.platform);
    setDebtTotalAmount(String(debt.totalAmount));
    setDebtRemaining(String(debt.remainingBalance));
    setDebtMinPayment(String(debt.minimumPayment));
    setDebtInterestApr(String(debt.interestRate));
    setDebtDueDates(debt.dueDates);
    setDebtInstTotal(String(debt.installmentsTotal));
    setDebtInstPaid(String(debt.installmentsPaid));
    setDebtColor(debt.color);
    setDebtIcon(debt.icon);
    setDebtFrequency(debt.frequency || 'monthly');
    setDebtFirstDueDate(debt.firstDueDate || new Date().toISOString().split('T')[0]);
    setDebtReminderDays(debt.reminderDaysBefore ?? 1);
    setDebtAccountId(debt.accountId || '');
    setShowAddDebtModal(true);
  };

  const openNewLoanModal = () => {
    setEditingLoan(null);
    setPersonName('');
    setLoanDirection('lent');
    setLoanAmount('');
    setLoanNotes('');
    setLoanDueDate('');
    setLoanAccountId(accounts[0]?.id || '');
    setShowLoanModal(true);
  };

  const openEditLoanModal = (loan: LoanRecord) => {
    setEditingLoan(loan);
    setPersonName(loan.personName);
    setLoanDirection(loan.direction);
    setLoanAmount(String(loan.totalAmount));
    setLoanNotes(loan.notes || '');
    setLoanDueDate(loan.dueDate || '');
    setLoanAccountId(loan.accountId || '');
    setShowLoanModal(true);
  };

  // --- Estados Metas de Ahorro ---
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalSaved, setGoalSaved] = useState('');
  const [goalIcon, setGoalIcon] = useState('mci:piggy-bank-outline');
  const [goalColor, setGoalColor] = useState('#10B981');
  const [contributingGoalId, setContributingGoalId] = useState<string | null>(null);
  const [goalContributionInput, setGoalContributionInput] = useState('');

  const openAddRecurringModal = () => {
    setEditingRecurring(null);
    setSelectedAccountId(sortedAccounts[0]?.id || accounts[0]?.id || '');
    const defaultCat = categories.find((c) => c.type === 'expense');
    setSelectedCategoryId(defaultCat?.id || '');
    setTitle('');
    setAmount('');
    setType('expense');
    setFrequency('monthly');
    setIsSharedSub(false);
    setSharedWithNames('');
    setSharedPeopleCount(2);
    setCustomMyShare('');
    setNextDueDate(new Date().toISOString().split('T')[0]);
    setReminderDaysBefore(1);
    setShowAddRecModal(true);
  };

  const openEditRecurringModal = (rec: RecurringItem) => {
    setEditingRecurring(rec);
    setSelectedAccountId(rec.accountId);
    setSelectedCategoryId(rec.categoryId);
    setTitle(rec.title);
    setAmount(String(rec.amount));
    setType(rec.type);
    setFrequency(rec.frequency);
    setIsSharedSub(Boolean(rec.isShared));
    setSharedWithNames(rec.sharedWithNames || '');
    setSharedPeopleCount(rec.sharedPeopleCount && rec.sharedPeopleCount > 1 ? rec.sharedPeopleCount : 2);
    setCustomMyShare(
      rec.myShareAmount !== undefined && rec.myShareAmount > 0 ? String(rec.myShareAmount) : ''
    );
    setNextDueDate(rec.nextDueDate);
    setReminderDaysBefore(rec.reminderDaysBefore ?? 1);
    setShowAddRecModal(true);
  };

  const handleSaveRecurring = async () => {
    const parsed = parseFloat(amount);
    if (!title.trim() || !parsed || parsed <= 0 || !selectedAccountId || !selectedCategoryId) {
      return;
    }

    const parsedMyShare = parseFloat(customMyShare);
    const finalMyShare =
      isSharedSub && !isNaN(parsedMyShare) && parsedMyShare >= 0
        ? parsedMyShare
        : isSharedSub
        ? parsed / Math.max(2, sharedPeopleCount)
        : parsed;

    if (editingRecurring) {
      await updateRecurringItem(editingRecurring.id, {
        title: title.trim(),
        amount: parsed,
        type,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        frequency,
        nextDueDate,
        reminderDaysBefore,
        notes: editingRecurring.notes,
      });
      if (
        isSharedSub !== editingRecurring.isShared ||
        sharedWithNames !== (editingRecurring.sharedWithNames || '')
      ) {
        await updateRecurringSharing(editingRecurring.id, {
          isShared: isSharedSub,
          sharedWithNames: isSharedSub ? sharedWithNames.trim() || undefined : undefined,
          sharedPeopleCount: isSharedSub ? Math.max(2, sharedPeopleCount) : 1,
          myShareAmount: isSharedSub ? finalMyShare : parsed,
        });
      }
      setEditingRecurring(null);
    } else {
      await addRecurringItem({
        title: title.trim(),
        amount: parsed,
        type,
        categoryId: selectedCategoryId,
        accountId: selectedAccountId,
        frequency,
        nextDueDate,
        reminderDaysBefore,
        isShared: isSharedSub,
        sharedWithNames: isSharedSub ? sharedWithNames.trim() || undefined : undefined,
        sharedPeopleCount: isSharedSub ? Math.max(2, sharedPeopleCount) : 1,
        myShareAmount: isSharedSub ? finalMyShare : parsed,
      });
    }
    setShowAddRecModal(false);
  };

  const handleSaveInstallmentDebt = async () => {
    const orig = parseFloat(debtTotalAmount);
    const rem = parseFloat(debtRemaining !== '' ? debtRemaining : debtTotalAmount);
    const minP = parseFloat(debtMinPayment) || 0;
    const apr = parseFloat(debtInterestApr) || 0;
    const totInst = parseInt(debtInstTotal, 10) || 4;
    const paidInst = parseInt(debtInstPaid, 10) || 0;

    if (!debtTitle.trim() || isNaN(rem) || rem < 0) {
      Alert.alert('Datos incompletos', 'Ingresa el nombre de la compra/deuda y el saldo pendiente.');
      return;
    }

    const freqLabel =
      debtFrequency === 'monthly' ? 'Cada Mes' : debtFrequency === 'biweekly' ? 'Cada 15 Días' : 'Semanal';
    const autoDueDates =
      debtDueDates.trim() || `${freqLabel} (Próx: ${debtFirstDueDate})`;

    const finalTotal = !isNaN(orig) && orig >= rem ? orig : rem;
    const finalMinPayment =
      minP > 0 ? minP : Number((rem / Math.max(1, totInst - paidInst)).toFixed(2));

    if (editingDebt) {
      await updateInstallmentDebt(editingDebt.id, {
        title: debtTitle.trim(),
        platform: debtPlatform,
        totalAmount: finalTotal,
        remainingBalance: rem,
        minimumPayment: finalMinPayment,
        interestRate: apr,
        dueDates: autoDueDates,
        installmentsTotal: totInst,
        installmentsPaid: paidInst,
        color: debtColor,
        icon: debtIcon,
        frequency: debtFrequency,
        firstDueDate: debtFirstDueDate,
        reminderDaysBefore: debtReminderDays,
        accountId: debtAccountId || undefined,
      });
    } else {
      await addInstallmentDebt({
        title: debtTitle.trim(),
        platform: debtPlatform,
        totalAmount: finalTotal,
        remainingBalance: rem,
        minimumPayment: finalMinPayment,
        interestRate: apr,
        dueDates: autoDueDates,
        installmentsTotal: totInst,
        installmentsPaid: paidInst,
        color: debtColor,
        icon: debtIcon,
        frequency: debtFrequency,
        firstDueDate: debtFirstDueDate,
        reminderDaysBefore: debtReminderDays,
        accountId: debtAccountId || undefined,
      });
    }

    setEditingDebt(null);
    setShowAddDebtModal(false);
  };

  const handleSaveLoan = async () => {
    const parsed = parseFloat(loanAmount);
    if (!personName.trim() || !parsed || parsed <= 0) return;

    if (editingLoan) {
      await updateLoanRecord(editingLoan.id, {
        personName: personName.trim(),
        direction: loanDirection,
        totalAmount: parsed,
        paidAmount: editingLoan.paidAmount,
        notes: loanNotes.trim() || undefined,
        date: editingLoan.date,
        dueDate: loanDueDate.trim() || undefined,
        accountId: loanAccountId || undefined,
        isSettled: editingLoan.paidAmount >= parsed,
      });
    } else {
      await addLoanRecord({
        personName: personName.trim(),
        direction: loanDirection,
        totalAmount: parsed,
        notes: loanNotes.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        dueDate: loanDueDate.trim() || undefined,
        accountId: loanAccountId || undefined,
      });
    }
    setEditingLoan(null);
    setShowLoanModal(false);
  };

  const handleSaveGoal = async () => {
    const target = parseFloat(goalTarget);
    const saved = parseFloat(goalSaved) || 0;
    if (!goalTitle.trim() || !target || target <= 0) return;

    await addSavingsGoal({
      title: goalTitle.trim(),
      targetAmount: target,
      savedAmount: saved,
      color: goalColor,
      icon: goalIcon,
    });
    setGoalTitle('');
    setGoalTarget('');
    setGoalSaved('');
    setShowGoalModal(false);
  };

  const frequencyLabel: Record<RecurrenceFrequency, string> = {
    weekly: 'Semanal',
    biweekly: 'Quincenal',
    monthly: 'Mensual',
    yearly: 'Anual',
  };

  // Resumen de Suscripciones Compartidas (Netflix, Spotify, etc.)
  const sharedSubscriptions = useMemo(
    () => recurringItems.filter((r) => r.isShared && r.type === 'expense'),
    [recurringItems]
  );

  const sharedStats = useMemo(() => {
    let totalBilled = 0;
    let myTotalRealCost = 0;
    let pendingReimbursement = 0;

    for (const sub of sharedSubscriptions) {
      const count = Math.max(2, sub.sharedPeopleCount || 2);
      const myPart =
        sub.myShareAmount !== undefined && sub.myShareAmount > 0
          ? sub.myShareAmount
          : sub.amount / count;
      const othersPart = Math.max(0, sub.amount - myPart);

      totalBilled += sub.amount;
      myTotalRealCost += myPart;
      if (!sub.reimbursedThisCycle) {
        pendingReimbursement += othersPart;
      }
    }
    return { totalBilled, myTotalRealCost, pendingReimbursement };
  }, [sharedSubscriptions]);

  // Ordenamiento de Deudas / Cuotas según Método Bola de Nieve ❄️ vs Avalancha 🏔️
  const sortedDebts = useMemo(() => {
    const active = installmentDebts.filter((d) => d.remainingBalance > 0);
    const settled = installmentDebts.filter((d) => d.remainingBalance <= 0);

    active.sort((a, b) => {
      if (payoffStrategy === 'snowball') {
        // Bola de Nieve: Menor saldo pendiente primero para ganar impulso rápido
        if (a.remainingBalance !== b.remainingBalance) {
          return a.remainingBalance - b.remainingBalance;
        }
        return b.interestRate - a.interestRate;
      } else {
        // Avalancha: Mayor tasa de interés APR % primero (o mayor pago mínimo si ambos son 0% APR)
        if (b.interestRate !== a.interestRate) {
          return b.interestRate - a.interestRate;
        }
        return b.remainingBalance - a.remainingBalance;
      }
    });

    return [...active, ...settled];
  }, [installmentDebts, payoffStrategy]);

  const totalDebtRemaining = useMemo(
    () => installmentDebts.reduce((sum, d) => sum + d.remainingBalance, 0),
    [installmentDebts]
  );

  const totalMinimumMonthly = useMemo(
    () =>
      installmentDebts
        .filter((d) => d.remainingBalance > 0)
        .reduce((sum, d) => sum + d.minimumPayment, 0),
    [installmentDebts]
  );

  const estimatedMonthsToPayoffAll = useMemo(() => {
    const extra = parseFloat(extraMonthlySnowball) || 0;
    const monthlyPower = totalMinimumMonthly + extra;
    if (totalDebtRemaining <= 0 || monthlyPower <= 0) return 0;
    return Math.ceil(totalDebtRemaining / monthlyPower);
  }, [totalDebtRemaining, totalMinimumMonthly, extraMonthlySnowball]);

  // Totales de préstamos pendientes
  const totalOwedToMe = loans
    .filter((l) => l.direction === 'lent' && !l.isSettled)
    .reduce((sum, l) => sum + (l.totalAmount - l.paidAmount), 0);

  const totalIOwe = loans
    .filter((l) => l.direction === 'borrowed' && !l.isSettled)
    .reduce((sum, l) => sum + (l.totalAmount - l.paidAmount), 0);

  return (
    <View style={styles.container}>
      {/* Sub-pestañas Superiores: Recurrentes | Cuotas/Affirm | Préstamos | Metas */}
      <View style={styles.topTabsRow}>
        <TouchableOpacity
          style={[styles.topTabBtn, subTab === 'recurring' && styles.topTabBtnActive]}
          onPress={() => setSubTab('recurring')}
        >
          <Ionicons
            name="calendar-outline"
            size={14}
            color={subTab === 'recurring' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[
              styles.topTabText,
              subTab === 'recurring' && styles.topTabTextActive,
            ]}
          >
            Recurrentes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, subTab === 'debts' && styles.topTabBtnActive]}
          onPress={() => setSubTab('debts')}
        >
          <Ionicons
            name="trending-down-outline"
            size={14}
            color={subTab === 'debts' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[styles.topTabText, subTab === 'debts' && styles.topTabTextActive]}
            numberOfLines={1}
          >
            Cuotas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, subTab === 'loans' && styles.topTabBtnActive]}
          onPress={() => setSubTab('loans')}
        >
          <Ionicons
            name="people-outline"
            size={14}
            color={subTab === 'loans' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[styles.topTabText, subTab === 'loans' && styles.topTabTextActive]}
          >
            Préstamos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topTabBtn, subTab === 'goals' && styles.topTabBtnActive]}
          onPress={() => setSubTab('goals')}
        >
          <Ionicons
            name="trophy-outline"
            size={14}
            color={subTab === 'goals' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[styles.topTabText, subTab === 'goals' && styles.topTabTextActive]}
          >
            Metas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ================= VISTA 1: RECURRENTES + SUSCRIPCIONES COMPARTIDAS ================= */}
        {subTab === 'recurring' && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="notifications-outline" size={24} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>
                  Recurrentes + Suscripciones Compartidas (Netflix, Spotify...)
                </Text>
                <Text style={styles.infoDesc}>
                  Recibe recordatorio 1 o 2 días antes en Android. Si compartes Netflix, Spotify u otra suscripción, activa "Compartir" para saber cuánto es tu parte real y cuánto te deben reembolsar.
                </Text>
                <TouchableOpacity
                  style={{
                    marginTop: 8,
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#0369A1',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                  onPress={async () => {
                    const ok = await sendTestNotificationNow();
                    if (ok) {
                      Alert.alert(
                        '🔔 Notificación Enviada',
                        'En 2 segundos verás el recordatorio de prueba en la barra superior de tu teléfono Android.'
                      );
                    } else {
                      Alert.alert(
                        'Permiso de Notificaciones',
                        'Asegúrate de permitir las notificaciones de Finanzas USA / Expo Go en los ajustes de tu Android.'
                      );
                    }
                  }}
                >
                  <Ionicons name="notifications" size={14} color="#F8FAFC" />
                  <Text style={{ color: '#F8FAFC', fontSize: 11, fontWeight: '700' }}>
                    Probar Notificación en Android Ahora
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Resumen de Suscripciones Compartidas */}
            {sharedSubscriptions.length > 0 && (
              <View style={styles.sharedSummaryBanner}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Ionicons name="people-circle" size={18} color={isDark ? '#C084FC' : '#7E22CE'} />
                  <Text style={{ color: isDark ? '#E9D5FF' : '#581C87', fontSize: 13, fontWeight: '800' }}>
                    Resumen de Suscripciones Compartidas ({sharedSubscriptions.length})
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: isDark ? '#C4B5FD' : '#6B21A8', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                      COBRO TOTAL
                    </Text>
                    <Text style={{ color: isDark ? '#F8FAFC' : '#1E1B4B', fontSize: 15, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                      ${sharedStats.totalBilled.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: isDark ? '#C4B5FD' : '#6B21A8', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                      TU PARTE REAL
                    </Text>
                    <Text style={{ color: isDark ? '#38BDF8' : '#0369A1', fontSize: 15, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                      ${sharedStats.myTotalRealCost.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ flex: 1.1, alignItems: 'flex-end', minWidth: 0 }}>
                    <Text style={{ color: isDark ? '#C4B5FD' : '#6B21A8', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>
                      POR COBRAR
                    </Text>
                    <Text style={{ color: isDark ? '#4ADE80' : '#15803D', fontSize: 15, fontWeight: '800', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit>
                      +${sharedStats.pendingReimbursement.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.headerSpread}>
              <Text style={styles.sectionTitle}>Programados ({recurringItems.length})</Text>
              <TouchableOpacity style={styles.newBtn} onPress={openAddRecurringModal}>
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={styles.newBtnText}>Nuevo Recurrente</Text>
              </TouchableOpacity>
            </View>

            {recurringItems.map((item) => {
              const acc = accounts.find((a) => a.id === item.accountId);
              const cat = categories.find((c) => c.id === item.categoryId);
              const remDays = item.reminderDaysBefore ?? 1;
              const peopleCount = Math.max(2, item.sharedPeopleCount || 2);
              const myShare =
                item.isShared && item.myShareAmount !== undefined && item.myShareAmount > 0
                  ? item.myShareAmount
                  : item.isShared
                  ? item.amount / peopleCount
                  : item.amount;
              const othersOweMe = Math.max(0, item.amount - myShare);

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ marginRight: 12 }}>
                      <SmartIcon
                        iconName={cat?.icon}
                        color={cat?.color}
                        titleForAutoBrand={item.title}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        <View style={styles.freqBadge}>
                          <Text style={styles.freqBadgeText}>{frequencyLabel[item.frequency]}</Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.freqBadge,
                            { backgroundColor: '#0C4A6E', borderWidth: 1, borderColor: '#0284C7' },
                          ]}
                          onPress={() => {
                            const nextVal = remDays === 1 ? 2 : remDays === 2 ? 0 : 1;
                            updateRecurringReminderDays(item.id, nextVal);
                          }}
                        >
                          <Text style={[styles.freqBadgeText, { color: '#38BDF8' }]}>
                            🔔 {remDays === 0 ? 'El mismo día' : `${remDays} ${remDays === 1 ? 'día' : 'días'} antes`}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.itemSub}>
                        {cat?.name || 'Categoría'} • Cuenta: {acc?.name || 'General'}
                      </Text>
                      <Text style={styles.dueText}>
                        Próxima fecha: <Text style={styles.dueHighlight}>{item.nextDueDate}</Text>
                        {item.postponedUntil ? ' (Pospuesto)' : ''}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.itemAmount,
                          { color: item.type === 'income' ? '#4ADE80' : '#F87171' },
                        ]}
                      >
                        {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <TouchableOpacity onPress={() => openEditRecurringModal(item)}>
                          <Ionicons name="create-outline" size={17} color="#38BDF8" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingSharedRec(item);
                            setEditIsShared(Boolean(item.isShared));
                            setEditSharedNames(item.sharedWithNames || '');
                            setEditSharedCount(item.sharedPeopleCount && item.sharedPeopleCount > 1 ? item.sharedPeopleCount : 2);
                            setEditMyShare(
                              item.myShareAmount !== undefined && item.myShareAmount > 0
                                ? String(item.myShareAmount.toFixed(2))
                                : String((item.amount / 2).toFixed(2))
                            );
                          }}
                        >
                          <Ionicons
                            name="people-outline"
                            size={17}
                            color={item.isShared ? '#C084FC' : '#38BDF8'}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteRecurringItem(item.id)}>
                          <Ionicons name="trash-outline" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Bloque de Suscripción Compartida (Netflix, Spotify, etc.) */}
                  {item.isShared ? (
                    <View style={styles.sharedSubBox}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#E9D5FF', fontSize: 12, fontWeight: '800' }}>
                            👥 Compartida ({peopleCount} personas)
                            {item.sharedWithNames ? `: ${item.sharedWithNames}` : ''}
                          </Text>
                          <Text style={{ color: '#C4B5FD', fontSize: 11, marginTop: 2 }}>
                            Tu parte real: <Text style={{ color: '#38BDF8', fontWeight: '800' }}>${myShare.toFixed(2)}</Text> • Te reembolsan:{' '}
                            <Text style={{ color: '#4ADE80', fontWeight: '800' }}>+${othersOweMe.toFixed(2)}</Text>
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={[
                            styles.reimbursedChip,
                            item.reimbursedThisCycle
                              ? { backgroundColor: '#14532D', borderColor: '#22C55E' }
                              : { backgroundColor: '#3B0764', borderColor: '#A855F7' },
                          ]}
                          onPress={() => toggleRecurringReimbursed(item.id)}
                        >
                          <Text
                            style={{
                              color: item.reimbursedThisCycle ? '#4ADE80' : '#E9D5FF',
                              fontSize: 11,
                              fontWeight: '800',
                            }}
                          >
                            {item.reimbursedThisCycle ? '✓ Ya me pagaron' : '⏳ Falta cobro'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    item.type === 'expense' && (
                      <TouchableOpacity
                        style={{ marginTop: 8, alignSelf: 'flex-start' }}
                        onPress={() => {
                          setEditingSharedRec(item);
                          setEditIsShared(true);
                          setEditSharedNames('');
                          setEditSharedCount(2);
                          setEditMyShare(String((item.amount / 2).toFixed(2)));
                        }}
                      >
                        <Text style={{ color: '#C084FC', fontSize: 11, fontWeight: '700' }}>
                          👥 ¿Compartes este pago (ej. Netflix/Spotify)? Toca para dividirlo
                        </Text>
                      </TouchableOpacity>
                    )
                  )}

                  <View style={styles.actionsBox}>
                    <TouchableOpacity
                      style={styles.confirmPrimaryBtn}
                      onPress={() => {
                        setConfirmingItemId(item.id);
                        setCustomConfirmAmount(String(item.amount));
                      }}
                    >
                      <Ionicons name="checkmark-done-outline" size={18} color="#052E16" />
                      <Text style={styles.confirmPrimaryText}>Confirmar y Aplicar</Text>
                    </TouchableOpacity>

                    <View style={styles.postponeRow}>
                      <Text style={styles.postponeLabel}>Posponer:</Text>
                      <TouchableOpacity
                        style={styles.postponeChip}
                        onPress={() => postponeRecurringItem(item.id, 1)}
                      >
                        <Text style={styles.postponeChipText}>+1 día</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.postponeChip}
                        onPress={() => postponeRecurringItem(item.id, 3)}
                      >
                        <Text style={styles.postponeChipText}>+3 días</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.postponeChip}
                        onPress={() => postponeRecurringItem(item.id, 7)}
                      >
                        <Text style={styles.postponeChipText}>+1 sem</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.postponeChip, { borderColor: '#F59E0B' }]}
                        onPress={() => skipRecurringCycle(item.id)}
                      >
                        <Text style={[styles.postponeChipText, { color: '#FBBF24' }]}>
                          Saltar ciclo
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ================= VISTA 2: RASTREADOR DE DEUDAS / CUOTAS (AFFIRM, KLARNA) + BOLA DE NIEVE Y AVALANCHA ================= */}
        {subTab === 'debts' && (
          <>
            {/* Selector Interactivo: Método Bola de Nieve ❄️ vs Avalancha 🏔️ */}
            <View style={styles.strategyCard}>
              <Text style={styles.strategyHeaderTitle}>
                Estrategia para Salir de Deudas y Cuotas (Affirm, Klarna, Tarjetas)
              </Text>
              <View style={styles.strategySwitchRow}>
                <TouchableOpacity
                  style={[
                    styles.strategyBtn,
                    payoffStrategy === 'snowball' && styles.strategyBtnSnowballActive,
                  ]}
                  onPress={() => setPayoffStrategy('snowball')}
                >
                  <Ionicons
                    name="snow-outline"
                    size={16}
                    color={payoffStrategy === 'snowball' ? '#0F172A' : '#38BDF8'}
                  />
                  <Text
                    style={[
                      styles.strategyBtnText,
                      payoffStrategy === 'snowball' && { color: '#0F172A', fontWeight: '800' },
                    ]}
                  >
                    ❄️ Bola de Nieve
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.strategyBtn,
                    payoffStrategy === 'avalanche' && styles.strategyBtnAvalancheActive,
                  ]}
                  onPress={() => setPayoffStrategy('avalanche')}
                >
                  <Ionicons
                    name="flame-outline"
                    size={16}
                    color={payoffStrategy === 'avalanche' ? '#0F172A' : '#FB923C'}
                  />
                  <Text
                    style={[
                      styles.strategyBtnText,
                      payoffStrategy === 'avalanche' && { color: '#0F172A', fontWeight: '800' },
                    ]}
                  >
                    🏔️ Avalancha
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.strategyExplanation}>
                {payoffStrategy === 'snowball'
                  ? '❄️ Bola de Nieve (Snowball): Ordena tus deudas de MENOR a MAYOR saldo pendiente. Liquidas rápido la más pequeña primero, ganas motivación y sumas esa cuota liberada para atacar la siguiente.'
                  : '🏔️ Avalancha (Avalanche): Ordena tus deudas de MAYOR a MENOR interés (APR %). Atacas primero la deuda más costosa para ahorrar la mayor cantidad de dinero en intereses.'}
              </Text>

              <View style={styles.debtTotalsRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.loansSummaryLabel} numberOfLines={1}>PENDIENTE</Text>
                  <Text style={[styles.loansSummaryVal, { color: '#F87171', fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${totalDebtRemaining.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.loansSummaryDivider} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.loansSummaryLabel} numberOfLines={1}>PAGO MÍNIMO</Text>
                  <Text style={[styles.loansSummaryVal, { color: '#38BDF8', fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${totalMinimumMonthly.toFixed(2)}
                  </Text>
                </View>
                {estimatedMonthsToPayoffAll > 0 && (
                  <>
                    <View style={styles.loansSummaryDivider} />
                    <View style={{ flex: 0.9, alignItems: 'flex-end', minWidth: 0 }}>
                      <Text style={styles.loansSummaryLabel} numberOfLines={1}>TIEMPO LIBRE</Text>
                      <Text style={[styles.loansSummaryVal, { color: '#4ADE80', fontSize: 16 }]} numberOfLines={1} adjustsFontSizeToFit>
                        {estimatedMonthsToPayoffAll} {estimatedMonthsToPayoffAll === 1 ? 'ciclo' : 'ciclos'}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <Text style={{ color: '#94A3B8', fontSize: 12, flex: 1 }}>
                  💵 ¿Cuánto extra puedes abonar al mes para acelerar la bola de nieve?
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { width: 95, paddingVertical: 6, textAlign: 'center', fontWeight: '800' },
                  ]}
                  placeholder="+$0.00"
                  placeholderTextColor="#64748B"
                  keyboardType="decimal-pad"
                  value={extraMonthlySnowball}
                  onChangeText={setExtraMonthlySnowball}
                />
              </View>
            </View>

            <View style={styles.headerSpread}>
              <Text style={styles.sectionTitle}>
                Mis Cuotas / Affirm ({installmentDebts.length})
              </Text>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={openNewDebtModal}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={styles.newBtnText}>Agregar Cuota / Affirm</Text>
              </TouchableOpacity>
            </View>

            {sortedDebts.length === 0 ? (
              <View style={styles.card}>
                <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>
                  No tienes compras a cuotas o deudas registradas
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
                  Toca "+ Agregar Cuota / Affirm" arriba para llevar tus planes de pago de Affirm, Klarna, Afterpay, PayPal Pay in 4 o tarjetas con su barra de avance.
                </Text>
              </View>
            ) : (
              sortedDebts.map((debt, index) => {
                const paidAmount = Math.max(0, debt.totalAmount - debt.remainingBalance);
                const pct =
                  debt.totalAmount > 0
                    ? Math.min(100, (paidAmount / debt.totalAmount) * 100)
                    : 0;
                const isSettled = debt.remainingBalance <= 0;
                const isPriorityOne = index === 0 && !isSettled;
                const extraNum = parseFloat(extraMonthlySnowball) || 0;
                const recommendedPayment = isPriorityOne
                  ? debt.minimumPayment + extraNum
                  : debt.minimumPayment;

                return (
                  <View
                    key={debt.id}
                    style={[
                      styles.card,
                      isPriorityOne && {
                        borderColor: payoffStrategy === 'snowball' ? '#38BDF8' : '#FB923C',
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    {isPriorityOne && (
                      <View
                        style={[
                          styles.priorityBanner,
                          {
                            backgroundColor:
                              payoffStrategy === 'snowball' ? '#0C4A6E' : '#431407',
                          },
                        ]}
                      >
                        <Ionicons
                          name={payoffStrategy === 'snowball' ? 'snow' : 'flame'}
                          size={14}
                          color={payoffStrategy === 'snowball' ? '#38BDF8' : '#FB923C'}
                        />
                        <Text
                          style={{
                            color: payoffStrategy === 'snowball' ? '#E0F2FE' : '#FFEDD5',
                            fontSize: 11,
                            fontWeight: '800',
                          }}
                        >
                          {payoffStrategy === 'snowball'
                            ? '🎯 OBJETIVO #1 BOLA DE NIEVE (Menor Saldo — Liquídala primero)'
                            : '🔥 OBJETIVO #1 AVALANCHA (Mayor Interés / Prioridad)'}
                        </Text>
                      </View>
                    )}

                    <View style={styles.cardHeader}>
                      <View style={{ marginRight: 12 }}>
                        <SmartIcon iconName={debt.icon} color={debt.color} />
                      </View>

                      <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">{debt.title}</Text>
                          <View
                            style={[
                              styles.freqBadge,
                              { backgroundColor: debt.color + '25', borderWidth: 1, borderColor: debt.color },
                            ]}
                          >
                            <Text style={[styles.freqBadgeText, { color: colors.text }]}>
                              {debt.platform}
                            </Text>
                          </View>
                          {debt.interestRate > 0 ? (
                            <View style={[styles.freqBadge, { backgroundColor: '#450A0A' }]}>
                              <Text style={[styles.freqBadgeText, { color: '#FCA5A5' }]}>
                                {debt.interestRate}% APR
                              </Text>
                            </View>
                          ) : (
                            <View style={[styles.freqBadge, { backgroundColor: '#052E16' }]}>
                              <Text style={[styles.freqBadgeText, { color: '#86EFAC' }]}>
                                0% Interés
                              </Text>
                            </View>
                          )}
                          {debt.frequency && (
                            <View style={[styles.freqBadge, { backgroundColor: isDark ? '#1E293B' : '#E0F2FE' }]}>
                              <Text style={[styles.freqBadgeText, { color: isDark ? '#38BDF8' : '#0284C7' }]}>
                                {debt.frequency === 'monthly' ? 'Mensual' : debt.frequency === 'biweekly' ? 'Cada 15d' : 'Semanal'}
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text style={styles.itemSub} numberOfLines={1} ellipsizeMode="tail">
                          📅 Fechas de pago: <Text style={{ color: colors.text, fontWeight: '700' }}>{debt.dueDates}</Text>
                        </Text>
                        <Text style={styles.dueText} numberOfLines={1} ellipsizeMode="tail">
                          Pago mínimo / cuota:{' '}
                          <Text style={{ color: '#38BDF8', fontWeight: '800' }}>
                            ${debt.minimumPayment.toFixed(2)}
                          </Text>
                          {isPriorityOne && extraNum > 0
                            ? ` (Con bola de nieve: $${recommendedPayment.toFixed(2)})`
                            : ''}{' '}
                          • Cuotas: {debt.installmentsPaid}/{debt.installmentsTotal}
                        </Text>
                        {Boolean(debt.accountId) && (
                          <Text style={{ color: isDark ? '#A78BFA' : '#7C3AED', fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                            💳 Cuenta: {accounts.find((a) => a.id === debt.accountId)?.name || 'Vinculada'}
                          </Text>
                        )}
                      </View>

                      <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
                        <Text
                          style={[
                            styles.itemAmount,
                            { color: isSettled ? '#4ADE80' : '#F87171' },
                          ]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          ${debt.remainingBalance.toFixed(2)}
                        </Text>
                        <Text style={{ color: '#64748B', fontSize: 10 }}>
                          de ${debt.totalAmount.toFixed(2)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                          <TouchableOpacity onPress={() => openEditDebtModal(debt)}>
                            <Ionicons name="create-outline" size={17} color={isDark ? '#38BDF8' : '#0284C7'} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => deleteInstallmentDebt(debt.id)}>
                            <Ionicons name="trash-outline" size={16} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Barrita de Progreso de la Deuda / Cuotas */}
                    <View style={{ marginTop: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>
                          Pagado: ${paidAmount.toFixed(2)} ({pct.toFixed(0)}%)
                        </Text>
                        <Text style={{ color: isSettled ? '#4ADE80' : '#FBBF24', fontSize: 11, fontWeight: '700' }}>
                          {isSettled
                            ? '✓ ¡Deuda Liquidada!'
                            : `Faltan $${debt.remainingBalance.toFixed(2)}`}
                        </Text>
                      </View>
                      <View style={[styles.progressTrack, { marginTop: 0, height: 9 }]}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${pct}%`,
                              backgroundColor: isSettled ? '#22C55E' : debt.color,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {!isSettled && (
                      <TouchableOpacity
                        style={[styles.confirmPrimaryBtn, { marginTop: 12, marginBottom: 0 }]}
                        onPress={() => {
                          setPayingDebtId(debt.id);
                          setDebtPaymentInput(
                            String(Math.min(debt.remainingBalance, recommendedPayment))
                          );
                          setDebtPayFromAccId('');
                        }}
                      >
                        <Ionicons name="checkmark-circle-outline" size={17} color="#052E16" />
                        <Text style={styles.confirmPrimaryText}>
                          Abonar Cuota (${Math.min(debt.remainingBalance, recommendedPayment).toFixed(2)})
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ================= VISTA 3: PRÉSTAMOS (ME DEBEN / YO DEBO) ================= */}
        {subTab === 'loans' && (
          <>
            <View style={styles.loansSummaryCard}>
              <View style={styles.loansSummaryCol}>
                <Text style={styles.loansSummaryLabel}>ME DEBEN (PRESTÉ)</Text>
                <Text style={[styles.loansSummaryVal, { color: '#4ADE80' }]}>
                  +${totalOwedToMe.toFixed(2)}
                </Text>
              </View>
              <View style={styles.loansSummaryDivider} />
              <View style={styles.loansSummaryCol}>
                <Text style={styles.loansSummaryLabel}>YO DEBO (PEDÍ PRESTADO)</Text>
                <Text style={[styles.loansSummaryVal, { color: '#F87171' }]}>
                  -${totalIOwe.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.headerSpread}>
              <Text style={styles.sectionTitle}>Registro de Préstamos ({loans.length})</Text>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={openNewLoanModal}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={styles.newBtnText}>Anote Préstamo</Text>
              </TouchableOpacity>
            </View>

            {loans.map((loan) => {
              const remaining = Math.max(0, loan.totalAmount - loan.paidAmount);
              const pct = loan.totalAmount > 0 ? (loan.paidAmount / loan.totalAmount) * 100 : 0;
              const isLent = loan.direction === 'lent';

              return (
                <View key={loan.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ marginRight: 12 }}>
                      <SmartIcon
                        iconName={isLent ? 'arrow-up-circle-outline' : 'arrow-down-circle-outline'}
                        color={isLent ? '#4ADE80' : '#F87171'}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.itemTitle}>{loan.personName}</Text>
                        <View
                          style={[
                            styles.freqBadge,
                            { backgroundColor: isLent ? '#14532D' : '#7F1D1D' },
                          ]}
                        >
                          <Text
                            style={[
                              styles.freqBadgeText,
                              { color: isLent ? '#86EFAC' : '#FCA5A5' },
                            ]}
                          >
                            {isLent ? 'Me debe' : 'Le debo'}
                          </Text>
                        </View>
                      </View>

                      {loan.notes ? <Text style={styles.itemSub}>{loan.notes}</Text> : null}
                      <Text style={styles.dueText}>
                        Abonado: ${loan.paidAmount.toFixed(2)} de ${loan.totalAmount.toFixed(2)} •{' '}
                        <Text style={styles.dueHighlight}>
                          {loan.isSettled ? '¡Pagado completo!' : `Faltan $${remaining.toFixed(2)}`}
                        </Text>
                      </Text>
                      {Boolean(loan.accountId) && (
                        <Text style={{ color: isDark ? '#A78BFA' : '#7C3AED', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                          🏦 Cuenta: {accounts.find((a) => a.id === loan.accountId)?.name || 'Asignada'}
                        </Text>
                      )}
                      {Boolean(loan.dueDate) && (
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                          📅 Promesa / Vencimiento: {loan.dueDate}
                        </Text>
                      )}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.itemAmount,
                          { color: isLent ? '#4ADE80' : '#F87171' },
                        ]}
                      >
                        ${remaining.toFixed(2)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <TouchableOpacity onPress={() => openEditLoanModal(loan)}>
                          <Ionicons name="create-outline" size={17} color={isDark ? '#38BDF8' : '#0284C7'} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => deleteLoanRecord(loan.id)}>
                          <Ionicons name="trash-outline" size={16} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isLent ? '#22C55E' : '#38BDF8',
                        },
                      ]}
                    />
                  </View>

                  {!loan.isSettled && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                      <TouchableOpacity
                        style={[styles.confirmPrimaryBtn, { flex: 1, marginBottom: 0 }]}
                        onPress={() => {
                          setPayingLoanId(loan.id);
                          setLoanPaymentInput(String(remaining));
                        }}
                      >
                        <Ionicons name="cash-outline" size={16} color="#052E16" />
                        <Text style={styles.confirmPrimaryText}>
                          Registrar Abono / Pago
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ================= VISTA 4: METAS DE AHORRO ================= */}
        {subTab === 'goals' && (
          <>
            <View style={styles.infoBox}>
              <Ionicons name="trophy-outline" size={22} color="#4ADE80" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: '#4ADE80' }]}>
                  Metas de Ahorro (Savings Goals)
                </Text>
                <Text style={styles.infoDesc}>
                  Crea metas para tu Fondo de Emergencia, un viaje, un auto o una PC Gamer y ve cuánto llevas ahorrado en cada una.
                </Text>
              </View>
            </View>

            <View style={styles.headerSpread}>
              <Text style={styles.sectionTitle}>Mis Metas ({savingsGoals.length})</Text>
              <TouchableOpacity
                style={styles.newBtn}
                onPress={() => setShowGoalModal(true)}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={styles.newBtnText}>Nueva Meta</Text>
              </TouchableOpacity>
            </View>

            {savingsGoals.map((goal) => {
              const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
              const missing = Math.max(0, goal.targetAmount - goal.savedAmount);

              return (
                <View key={goal.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ marginRight: 12 }}>
                      <SmartIcon iconName={goal.icon} color={goal.color} />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{goal.title}</Text>
                      <Text style={styles.dueText}>
                        Ahorrado: <Text style={{ color: '#4ADE80', fontWeight: '700' }}>${goal.savedAmount.toFixed(2)}</Text> de ${goal.targetAmount.toFixed(2)} ({pct.toFixed(0)}%)
                      </Text>
                      <Text style={styles.itemSub}>
                        {missing === 0 ? '¡Meta completada!' : `Te faltan $${missing.toFixed(2)}`}
                      </Text>
                    </View>

                    <TouchableOpacity onPress={() => deleteSavingsGoal(goal.id)}>
                      <Ionicons name="trash-outline" size={16} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: goal.color,
                        },
                      ]}
                    />
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity
                      style={[styles.confirmPrimaryBtn, { flex: 1, marginBottom: 0 }]}
                      onPress={() => {
                        setContributingGoalId(goal.id);
                        setGoalContributionInput('');
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={16} color="#052E16" />
                      <Text style={styles.confirmPrimaryText}>Abonar a esta Meta</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Modal para Configurar / Editar Suscripción Compartida (Netflix, Spotify, etc.) */}
      <KeyboardSafeModal
        visible={Boolean(editingSharedRec)}
        animationType="fade"
        onClose={() => setEditingSharedRec(null)}
      >
        <Text style={styles.modalTitle}>
          👥 Suscripción Compartida: {editingSharedRec?.title}
        </Text>
        <Text style={{ color: '#94A3B8', fontSize: 12, lineHeight: 18, marginBottom: 10 }}>
          Si tú pagas la suscripción completa (${editingSharedRec?.amount.toFixed(2)}) pero la compartes con amigos o familia, configura aquí entre cuántos se divide.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
          <Switch
            value={editIsShared}
            onValueChange={setEditIsShared}
            trackColor={{ false: '#334155', true: '#7E22CE' }}
            thumbColor={editIsShared ? '#E9D5FF' : '#94A3B8'}
          />
          <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
            {editIsShared ? 'Sí, comparto esta suscripción' : 'No, la pago yo solo'}
          </Text>
        </View>

        {editIsShared && editingSharedRec && (
          <>
            <Text style={styles.inputLabel}>¿Entre cuántas personas se divide en total (incluyéndote)?</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
              {[2, 3, 4, 5, 6].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.chip,
                    { flex: 1, marginRight: 0, alignItems: 'center' },
                    editSharedCount === num && {
                      borderColor: '#C084FC',
                      backgroundColor: '#3B0764',
                    },
                  ]}
                  onPress={() => {
                    setEditSharedCount(num);
                    setEditMyShare((editingSharedRec.amount / num).toFixed(2));
                  }}
                >
                  <Text style={styles.chipText}>{num} pers.</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>¿Con quiénes la compartes?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Hermano, Novia, Carlos..."
              placeholderTextColor="#64748B"
              value={editSharedNames}
              onChangeText={setEditSharedNames}
            />

            <Text style={styles.inputLabel}>
              Tu parte real en $ USD (El resto se contará como reembolso por cobrar)
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={editMyShare}
              onChangeText={setEditMyShare}
            />
          </>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setEditingSharedRec(null)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#A855F7' }]}
            onPress={async () => {
              if (!editingSharedRec) return;
              const parsedMy = parseFloat(editMyShare);
              await updateRecurringSharing(editingSharedRec.id, {
                isShared: editIsShared,
                sharedWithNames: editSharedNames,
                sharedPeopleCount: editSharedCount,
                myShareAmount:
                  !isNaN(parsedMy) && parsedMy >= 0
                    ? parsedMy
                    : editingSharedRec.amount / editSharedCount,
              });
              setEditingSharedRec(null);
            }}
          >
            <Text style={[styles.saveBtnText, { color: '#FFF' }]}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Agregar / Editar Deuda / Cuota (Affirm, Klarna, Afterpay, Tarjetas) */}
      <KeyboardSafeModal
        visible={showAddDebtModal}
        animationType="slide"
        onClose={() => {
          setShowAddDebtModal(false);
          setEditingDebt(null);
        }}
      >
        <Text style={styles.modalTitle}>
          {editingDebt ? 'Editar Cuota / Deuda BNPL' : 'Nueva Deuda / Plan de Cuotas (Affirm, Klarna...)'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
          Anota o modifica tus compras a plazos con proyección automática de fechas en el calendario y recordatorios.
        </Text>

        <Text style={styles.inputLabel}>Plataforma o Tipo de Deuda</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {BNPL_PLATFORMS.map((p) => (
            <TouchableOpacity
              key={p.name}
              style={[
                styles.brandQuickChip,
                debtPlatform === p.name && {
                  borderColor: p.color,
                  backgroundColor: p.color + '33',
                },
              ]}
              onPress={() => {
                setDebtPlatform(p.name);
                setDebtColor(p.color);
                setDebtIcon(p.icon);
              }}
            >
              <Text style={styles.brandQuickText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>¿Qué compraste o qué deuda es?</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Affirm - Amazon, Klarna - Zapatos, Teléfono..."
          placeholderTextColor="#64748B"
          value={debtTitle}
          onChangeText={setDebtTitle}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Saldo Pendiente Actual ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 180.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={debtRemaining}
              onChangeText={(v) => {
                setDebtRemaining(v);
                if (!debtTotalAmount) setDebtTotalAmount(v);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Monto Original Total ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 240.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={debtTotalAmount}
              onChangeText={setDebtTotalAmount}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Pago Mínimo / Cuota ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 60.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={debtMinPayment}
              onChangeText={setDebtMinPayment}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Interés APR % (0 si es sin interés)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={debtInterestApr}
              onChangeText={setDebtInterestApr}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Total de Cuotas</Text>
            <TextInput
              style={styles.input}
              placeholder="4"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={debtInstTotal}
              onChangeText={setDebtInstTotal}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Cuotas Ya Pagadas</Text>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor="#64748B"
              keyboardType="number-pad"
              value={debtInstPaid}
              onChangeText={setDebtInstPaid}
            />
          </View>
        </View>

        {/* Frecuencia de las cuotas */}
        <Text style={styles.inputLabel}>📅 Frecuencia de los pagos</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
          {[
            { id: 'monthly' as const, label: 'Cada Mes' },
            { id: 'biweekly' as const, label: 'Cada 15 Días' },
            { id: 'weekly' as const, label: 'Semanal' },
          ].map((f) => {
            const isSel = debtFrequency === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.chip,
                  { flex: 1, alignItems: 'center' },
                  isSel && {
                    borderColor: isDark ? '#38BDF8' : '#0284C7',
                    backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE',
                  },
                ]}
                onPress={() => setDebtFrequency(f.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && {
                      color: isDark ? '#38BDF8' : '#0284C7',
                      fontWeight: '700',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Primera fecha de pago de la cuota */}
        <DateField
          label="🗓️ Primera fecha de pago de la cuota"
          value={debtFirstDueDate}
          onChange={setDebtFirstDueDate}
          title="Primera Cuota"
        />

        {/* Proyección automática de cuotas restantes en el calendario */}
        {projectedDates.length > 0 && (
          <View
            style={{
              backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
              borderRadius: 12,
              padding: 10,
              borderWidth: 1,
              borderColor: isDark ? '#334155' : '#E2E8F0',
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Ionicons name="calendar-outline" size={15} color={isDark ? '#38BDF8' : '#0284C7'} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: isDark ? '#38BDF8' : '#0284C7' }}>
                Proyección Automática ({projectedDates.length} cuotas restantes)
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
              Fechas calculadas automáticamente según la frecuencia:
            </Text>
            <View style={{ gap: 4 }}>
              {projectedDates.map((p) => {
                const remVal = parseFloat(debtRemaining) || 0;
                const estAmount = remVal > 0 ? (remVal / projectedDates.length).toFixed(2) : '0.00';
                return (
                  <View
                    key={p.installmentNumber}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      paddingVertical: 5,
                      paddingHorizontal: 8,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                      Cuota #{p.installmentNumber}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {p.label}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#4ADE80' : '#16A34A' }}>
                      ${estAmount}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Recordatorio / Notificación */}
        <Text style={styles.inputLabel}>🔔 Recordatorio en el Teléfono (Notificación)</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
          {[
            { days: 1, label: '1 día antes' },
            { days: 2, label: '2 días antes' },
            { days: 0, label: 'El mismo día' },
          ].map((opt) => {
            const isSel = debtReminderDays === opt.days;
            return (
              <TouchableOpacity
                key={opt.days}
                style={[
                  styles.chip,
                  { flex: 1, alignItems: 'center' },
                  isSel && {
                    borderColor: '#F59E0B',
                    backgroundColor: isDark ? '#451A03' : '#FEF3C7',
                  },
                ]}
                onPress={() => setDebtReminderDays(opt.days)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && { color: isDark ? '#FDE68A' : '#92400E', fontWeight: '700' },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Cuenta bancaria vinculada */}
        <Text style={styles.inputLabel}>💳 Cuenta donde se pagan las cuotas (Opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {sortedAccounts.map((acc) => {
            const isSel = debtAccountId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.chip,
                  isSel && {
                    borderColor: isDark ? '#38BDF8' : '#0284C7',
                    backgroundColor: isDark ? '#0C4A6E' : '#E0F2FE',
                  },
                ]}
                onPress={() => setDebtAccountId(isSel ? '' : acc.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && { color: isDark ? '#38BDF8' : '#0284C7', fontWeight: '700' },
                  ]}
                >
                  {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.inputLabel}>Detalle adicional de Fechas (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Días 15 y 30, Cada 2 viernes..."
          placeholderTextColor="#64748B"
          value={debtDueDates}
          onChangeText={setDebtDueDates}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setShowAddDebtModal(false);
              setEditingDebt(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveInstallmentDebt}>
            <Text style={styles.saveBtnText}>
              {editingDebt ? 'Guardar Cambios' : 'Guardar Cuota / Deuda'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Abonar Cuota a Affirm / Klarna / Deuda */}
      <KeyboardSafeModal
        visible={Boolean(payingDebtId)}
        animationType="fade"
        onClose={() => setPayingDebtId(null)}
      >
        <Text style={styles.modalTitle}>Abonar Cuota / Pago a Deuda</Text>
        <Text style={styles.inputLabel}>Monto a abonar ($ USD)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={debtPaymentInput}
          onChangeText={setDebtPaymentInput}
        />

        <Text style={styles.inputLabel}>
          Opcional: ¿Descontar este pago de alguna de tus cuentas bancarias?
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          <TouchableOpacity
            style={[
              styles.chip,
              debtPayFromAccId === '' && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
            ]}
            onPress={() => setDebtPayFromAccId('')}
          >
            <Text style={styles.chipText}>Solo bajar saldo de la deuda</Text>
          </TouchableOpacity>
          {sortedAccounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                debtPayFromAccId === acc.id && {
                  borderColor: '#4ADE80',
                  backgroundColor: '#14532D',
                },
              ]}
              onPress={() => setDebtPayFromAccId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setPayingDebtId(null)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (payingDebtId) {
                const amt = parseFloat(debtPaymentInput);
                if (amt > 0) {
                  await registerInstallmentPayment(
                    payingDebtId,
                    amt,
                    debtPayFromAccId || undefined
                  );
                }
                setPayingDebtId(null);
              }
            }}
          >
            <Text style={styles.saveBtnText}>Confirmar Abono</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Confirmar Recurrente */}
      <KeyboardSafeModal
        visible={Boolean(confirmingItemId)}
        animationType="fade"
        onClose={() => setConfirmingItemId(null)}
      >
        <Text style={styles.modalTitle}>Confirmar Movimiento Recurrente</Text>
        <Text style={styles.inputLabel}>
          Ajusta el monto si este mes varió antes de aplicarlo a tu saldo:
        </Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={customConfirmAmount}
          onChangeText={setCustomConfirmAmount}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setConfirmingItemId(null)}
          >
            <Text style={styles.cancelBtnText}>Todavía no</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (confirmingItemId) {
                const parsed = parseFloat(customConfirmAmount);
                await confirmRecurringItem(
                  confirmingItemId,
                  !isNaN(parsed) && parsed > 0 ? parsed : undefined
                );
                setConfirmingItemId(null);
              }
            }}
          >
            <Text style={styles.saveBtnText}>Confirmar Ahora</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Abonar a Préstamo */}
      <KeyboardSafeModal
        visible={Boolean(payingLoanId)}
        animationType="fade"
        onClose={() => {
          setPayingLoanId(null);
          setLoanPayAccountId('');
        }}
      >
        <Text style={styles.modalTitle}>Registrar Abono o Pago Total</Text>
        <Text style={styles.inputLabel}>Monto abonado ($ USD)</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={loanPaymentInput}
          onChangeText={setLoanPaymentInput}
        />

        <Text style={styles.inputLabel}>Cuenta donde entra/sale el dinero (Opcional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {accounts.map((acc) => {
            const isSel = loanPayAccountId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.chip,
                  isSel && {
                    borderColor: '#22C55E',
                    backgroundColor: isDark ? '#14532D' : '#DCFCE7',
                  },
                ]}
                onPress={() => setLoanPayAccountId(isSel ? '' : acc.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && { color: isDark ? '#86EFAC' : '#15803D', fontWeight: '700' },
                  ]}
                >
                  {acc.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setPayingLoanId(null);
              setLoanPayAccountId('');
            }}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (payingLoanId) {
                const amt = parseFloat(loanPaymentInput);
                if (amt > 0) {
                  await registerLoanPayment(payingLoanId, amt, loanPayAccountId || undefined);
                }
                setPayingLoanId(null);
                setLoanPayAccountId('');
              }
            }}
          >
            <Text style={styles.saveBtnText}>Guardar Abono</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Abonar a Meta de Ahorro */}
      <KeyboardSafeModal
        visible={Boolean(contributingGoalId)}
        animationType="fade"
        onClose={() => setContributingGoalId(null)}
      >
        <Text style={styles.modalTitle}>Abonar a Meta de Ahorro</Text>
        <Text style={styles.inputLabel}>Monto a sumar a tu ahorro ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 100.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={goalContributionInput}
          onChangeText={setGoalContributionInput}
        />
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setContributingGoalId(null)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (contributingGoalId) {
                const amt = parseFloat(goalContributionInput);
                if (!isNaN(amt) && amt !== 0) {
                  await updateSavingsGoalAmount(contributingGoalId, amt);
                }
                setContributingGoalId(null);
              }
            }}
          >
            <Text style={styles.saveBtnText}>Sumar al Ahorro</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Nuevo / Editar Préstamo (Me deben / Yo debo) */}
      <KeyboardSafeModal
        visible={showLoanModal}
        animationType="slide"
        onClose={() => {
          setShowLoanModal(false);
          setEditingLoan(null);
        }}
      >
        <Text style={styles.modalTitle}>
          {editingLoan ? 'Editar Registro de Préstamo' : 'Nuevo Registro de Préstamo'}
        </Text>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              loanDirection === 'lent' && styles.segmentIncomeActive,
            ]}
            onPress={() => setLoanDirection('lent')}
          >
            <Text
              style={[
                styles.segmentText,
                loanDirection === 'lent' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              Presté Dinero (Me deben)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              loanDirection === 'borrowed' && styles.segmentExpenseActive,
            ]}
            onPress={() => setLoanDirection('borrowed')}
          >
            <Text
              style={[
                styles.segmentText,
                loanDirection === 'borrowed' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              Pedí Prestado (Yo debo)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.inputLabel}>Nombre de la Persona o Entidad</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Juan, Hermano, Amigo..."
          placeholderTextColor="#64748B"
          value={personName}
          onChangeText={setPersonName}
        />

        <Text style={styles.inputLabel}>Monto Total ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={loanAmount}
          onChangeText={setLoanAmount}
        />

        {/* Cuenta de donde salió o entró el dinero */}
        <Text style={styles.inputLabel}>
          🏦 {loanDirection === 'lent' ? '¿De qué cuenta prestaste el dinero?' : '¿En qué cuenta recibiste el préstamo?'}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {sortedAccounts.map((acc) => {
            const isSel = loanAccountId === acc.id;
            return (
              <TouchableOpacity
                key={acc.id}
                style={[
                  styles.chip,
                  isSel && {
                    borderColor: loanDirection === 'lent' ? '#22C55E' : '#38BDF8',
                    backgroundColor: isDark
                      ? (loanDirection === 'lent' ? '#14532D' : '#0C4A6E')
                      : (loanDirection === 'lent' ? '#DCFCE7' : '#E0F2FE'),
                  },
                ]}
                onPress={() => setLoanAccountId(isSel ? '' : acc.id)}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSel && {
                      color: isDark
                        ? (loanDirection === 'lent' ? '#86EFAC' : '#38BDF8')
                        : (loanDirection === 'lent' ? '#15803D' : '#0284C7'),
                      fontWeight: '700',
                    },
                  ]}
                >
                  {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <DateField
          label="📅 Fecha de promesa o vencimiento (Opcional)"
          value={loanDueDate}
          onChange={setLoanDueDate}
          placeholder="Elegir fecha de vencimiento..."
          title="Vencimiento del Préstamo"
        />

        <Text style={styles.inputLabel}>Nota o motivo (Opcional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Cena, Pasaje, Zelle..."
          placeholderTextColor="#64748B"
          value={loanNotes}
          onChangeText={setLoanNotes}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setShowLoanModal(false);
              setEditingLoan(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLoan}>
            <Text style={styles.saveBtnText}>
              {editingLoan ? 'Guardar Cambios' : 'Guardar Préstamo'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Nueva Meta de Ahorro */}
      <KeyboardSafeModal
        visible={showGoalModal}
        animationType="slide"
        onClose={() => setShowGoalModal(false)}
      >
        <Text style={styles.modalTitle}>Nueva Meta de Ahorro</Text>

        <Text style={styles.inputLabel}>Nombre de la Meta</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Viaje, PC Gamer, Fondo de Emergencia..."
          placeholderTextColor="#64748B"
          value={goalTitle}
          onChangeText={setGoalTitle}
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Meta Total ($ USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="1500.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={goalTarget}
              onChangeText={setGoalTarget}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Ya Ahorrado ($ USD)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
              value={goalSaved}
              onChangeText={setGoalSaved}
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Ícono</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {GENERAL_ICONS.slice(0, 20).map((item) => (
            <TouchableOpacity
              key={item.icon}
              style={[
                styles.brandQuickChip,
                goalIcon === item.icon && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
              ]}
              onPress={() => setGoalIcon(item.icon)}
            >
              <SmartIcon iconName={item.icon} color="#38BDF8" size={16} boxSize={26} />
              <Text style={styles.brandQuickText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowGoalModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
            <Text style={styles.saveBtnText}>Crear Meta</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal Crear/Editar Recurrente (Incluye opción de Suscripción Compartida) */}
      <KeyboardSafeModal
        visible={showAddRecModal}
        animationType="slide"
        onClose={() => setShowAddRecModal(false)}
      >
        <Text style={styles.modalTitle}>
          {editingRecurring ? 'Editar Recurrente' : 'Nuevo Gasto / Ingreso Recurrente'}
        </Text>

        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, type === 'expense' && styles.segmentExpenseActive]}
            onPress={() => {
              setType('expense');
              const first = categories.find((c) => c.type === 'expense');
              if (first) setSelectedCategoryId(first.id);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                type === 'expense' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              Gasto Recurrente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, type === 'income' && styles.segmentIncomeActive]}
            onPress={() => {
              setType('income');
              const first = categories.find((c) => c.type === 'income');
              if (first) setSelectedCategoryId(first.id);
            }}
          >
            <Text
              style={[
                styles.segmentText,
                type === 'income' ? styles.segmentTextActive : styles.segmentTextInactive,
              ]}
            >
              Ingreso Recurrente
            </Text>
          </TouchableOpacity>
        </View>

        {type === 'expense' && (
          <>
            <Text style={styles.inputLabel}>Atajos de Marcas y Servicios</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {BRAND_PRESETS.map((brand) => (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandQuickChip,
                    title === brand.label && {
                      borderColor: brand.color,
                      backgroundColor: brand.color + '28',
                    },
                  ]}
                  onPress={() => setTitle(brand.label)}
                >
                  <SmartIcon
                    titleForAutoBrand={brand.label}
                    size={16}
                    boxSize={26}
                  />
                  <Text style={styles.brandQuickText}>{brand.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.inputLabel}>Concepto (Ej. Netflix, Spotify, Renta, Quincena)</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre del gasto o ingreso"
          placeholderTextColor="#64748B"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.inputLabel}>Monto Total Cobrado ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            const num = parseFloat(v);
            if (isSharedSub && !isNaN(num)) {
              setCustomMyShare((num / Math.max(2, sharedPeopleCount)).toFixed(2));
            }
          }}
        />

        {/* Opción Suscripción Compartida (Netflix, Spotify, etc.) */}
        {type === 'expense' && (
          <View style={styles.sharedConfigCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Switch
                value={isSharedSub}
                onValueChange={(val) => {
                  setIsSharedSub(val);
                  const num = parseFloat(amount);
                  if (val && !isNaN(num)) {
                    setCustomMyShare((num / Math.max(2, sharedPeopleCount)).toFixed(2));
                  }
                }}
                trackColor={{ false: '#334155', true: '#7E22CE' }}
                thumbColor={isSharedSub ? '#E9D5FF' : '#94A3B8'}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#E9D5FF', fontSize: 13, fontWeight: '800' }}>
                  👥 ¿Es Suscripción Compartida? (Netflix, Spotify...)
                </Text>
                <Text style={{ color: '#C4B5FD', fontSize: 11 }}>
                  Divide el costo entre varios para ver tu parte real y lo que te deben.
                </Text>
              </View>
            </View>

            {isSharedSub && (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.inputLabel}>¿Entre cuántos se divide (incluyéndote)?</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                  {[2, 3, 4, 5, 6].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.chip,
                        { flex: 1, marginRight: 0, alignItems: 'center', paddingHorizontal: 4 },
                        sharedPeopleCount === n && {
                          borderColor: '#C084FC',
                          backgroundColor: '#3B0764',
                        },
                      ]}
                      onPress={() => {
                        setSharedPeopleCount(n);
                        const num = parseFloat(amount);
                        if (!isNaN(num)) {
                          setCustomMyShare((num / n).toFixed(2));
                        }
                      }}
                    >
                      <Text style={styles.chipText}>{n} pers.</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.inputLabel}>¿Con quiénes?</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. Hermano, Novia..."
                      placeholderTextColor="#64748B"
                      value={sharedWithNames}
                      onChangeText={setSharedWithNames}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Tu parte ($ USD)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#64748B"
                      keyboardType="decimal-pad"
                      value={customMyShare}
                      onChangeText={setCustomMyShare}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        <DateField
          label="📅 Fecha del Próximo Vencimiento"
          value={nextDueDate}
          onChange={setNextDueDate}
          title="Próximo Vencimiento"
        />

        <Text style={styles.inputLabel}>🔔 Recordatorio en Android antes del vencimiento</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
          {[
            { days: 1, label: '1 día antes' },
            { days: 2, label: '2 días antes' },
            { days: 3, label: '3 días antes' },
            { days: 0, label: 'El mismo día' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.days}
              style={[
                styles.chip,
                { marginRight: 0, flex: 1, alignItems: 'center', paddingHorizontal: 6 },
                reminderDaysBefore === opt.days && {
                  borderColor: '#38BDF8',
                  backgroundColor: '#0C4A6E',
                },
              ]}
              onPress={() => setReminderDaysBefore(opt.days)}
            >
              <Text style={[styles.chipText, { fontSize: 11 }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Frecuencia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {(['weekly', 'biweekly', 'monthly', 'yearly'] as RecurrenceFrequency[]).map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.chip,
                frequency === freq && { borderColor: '#38BDF8', backgroundColor: '#0C4A6E' },
              ]}
              onPress={() => setFrequency(freq)}
            >
              <Text style={styles.chipText}>{frequencyLabel[freq]}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Cuenta donde se aplicará al confirmar</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {sortedAccounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              style={[
                styles.chip,
                selectedAccountId === acc.id && {
                  borderColor: '#38BDF8',
                  backgroundColor: '#0C4A6E',
                },
              ]}
              onPress={() => setSelectedAccountId(acc.id)}
            >
              <Text style={styles.chipText}>
                {acc.name} (${acc.balance.toFixed(0)}){isOtherPersonAccount(acc) ? ' 👤' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Categoría</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {categories
            .filter((c) => c.type === type)
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

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddRecModal(false)}>
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecurring}>
            <Text style={styles.saveBtnText}>{editingRecurring ? 'Guardar Cambios' : 'Programar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topTabsRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 6,
      gap: 6,
    },
    topTabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingVertical: 9,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    topTabBtnActive: {
      backgroundColor: colors.accentLime || '#A7F3D0',
      borderColor: '#34D399',
    },
    topTabText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
    topTabTextActive: { color: colors.accentLimeText || '#064E3B', fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: isDark ? '#062B20' : '#E8F5E9',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? '#064E3B' : '#A7F3D0',
      marginBottom: 14,
    },
    infoTitle: { color: isDark ? '#34D399' : '#065F46', fontSize: 14, fontWeight: '700' },
    infoDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
    sharedSummaryBanner: {
      backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? '#4C1D95' : '#DDD6FE',
      marginBottom: 16,
    },
    sharedSubBox: {
      backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
      borderRadius: 12,
      padding: 10,
      marginTop: 10,
      borderWidth: 1,
      borderColor: isDark ? '#4C1D95' : '#DDD6FE',
    },
    reimbursedChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
    },
    sharedConfigCard: {
      backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF',
      borderRadius: 12,
      padding: 12,
      marginTop: 10,
      borderWidth: 1,
      borderColor: isDark ? '#4C1D95' : '#DDD6FE',
    },
    strategyCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    strategyHeaderTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
      marginBottom: 10,
    },
    strategySwitchRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 10,
    },
    strategyBtn: {
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
    strategyBtnSnowballActive: {
      backgroundColor: colors.accentLime || '#A7F3D0',
      borderColor: '#34D399',
    },
    strategyBtnAvalancheActive: {
      backgroundColor: '#FB923C',
      borderColor: '#FB923C',
    },
    strategyBtnText: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    strategyExplanation: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 17,
      marginBottom: 12,
    },
    debtTotalsRow: {
      flexDirection: 'row',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      paddingTop: 12,
    },
    priorityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      marginBottom: 10,
    },
    loansSummaryCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 16,
    },
    loansSummaryCol: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
    loansSummaryDivider: { width: 1, backgroundColor: colors.cardBorder, marginHorizontal: 6 },
    loansSummaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
    loansSummaryVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },
    headerSpread: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentLime || '#A7F3D0',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      gap: 4,
    },
    newBtnText: { color: colors.accentLimeText || '#064E3B', fontWeight: '800', fontSize: 13 },
    card: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    itemTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
    freqBadge: {
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    freqBadgeText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
    itemSub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
    dueText: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
    dueHighlight: { color: '#F59E0B', fontWeight: '700' },
    itemAmount: { fontSize: 18, fontWeight: '800' },
    progressTrack: {
      height: 7,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      borderRadius: 999,
      overflow: 'hidden',
      marginTop: 12,
    },
    progressFill: { height: '100%', borderRadius: 999 },
    actionsBox: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: 12,
      paddingTop: 12,
    },
    confirmPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: '#4ADE80',
      paddingVertical: 10,
      borderRadius: 10,
      marginBottom: 10,
    },
    confirmPrimaryText: { color: '#052E16', fontWeight: '800', fontSize: 13 },
    postponeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 6,
    },
    postponeLabel: { color: colors.textMuted, fontSize: 12, marginRight: 4 },
    postponeChip: {
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    postponeChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 12 },
    segmentRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    segmentBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      alignItems: 'center',
    },
    segmentExpenseActive: { backgroundColor: '#EF4444' },
    segmentIncomeActive: { backgroundColor: '#22C55E' },
    segmentText: { fontSize: 13 },
    segmentTextActive: { color: '#FFFFFF', fontWeight: '800' },
    segmentTextInactive: { color: isDark ? '#94A3B8' : '#475569', fontWeight: '700' },
    brandQuickChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
      marginRight: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    },
    brandQuickText: { color: colors.text, fontSize: 12, fontWeight: '700' },
    inputLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },
    input: {
      backgroundColor: colors.inputBg,
      color: colors.text,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
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
