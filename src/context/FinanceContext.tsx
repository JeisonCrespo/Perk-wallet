import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import {
  BankAccount,
  Category,
  CategoryBreakdown,
  InstallmentDebt,
  LoanRecord,
  MonthlyBudgetItem,
  RecurringItem,
  SavingsGoal,
  Transaction,
  UserProfile,
  SecuritySettings,
} from '../types/finance';
import {
  addDaysToDate,
  calculateNextCycleDate,
  getDb,
  seedDefaultCategoriesOnly,
} from '../db/database';
import { syncRecurringNotifications, syncAllNotifications } from '../services/notificationService';
import { matchAccountForAlert, parseBankAlertsOrCsv } from '../services/bankAutoImportService';

export interface AppBackupPayload {
  version: number;
  exportedAt: string;
  accounts: BankAccount[];
  categories: Category[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  monthlyBudgets?: MonthlyBudgetItem[];
  savingsGoals?: SavingsGoal[];
  loans?: LoanRecord[];
  installmentDebts?: InstallmentDebt[];
}

export interface TransferParams {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fee?: number;
  description?: string;
  date: string;
}

interface FinanceContextType {
  loading: boolean;
  accounts: BankAccount[];
  categories: Category[];
  transactions: Transaction[];
  recurringItems: RecurringItem[];
  monthlyBudgets: MonthlyBudgetItem[];
  savingsGoals: SavingsGoal[];
  loans: LoanRecord[];
  installmentDebts: InstallmentDebt[];
  lastDriveBackupAt: string | null;
  recordDriveBackupTimestamp: () => Promise<void>;
  includedTotalBalance: number;
  ownSavingsBalance: number;
  excludedTotalBalance: number;
  otherPeopleTotalBalance: number;
  netWorthBalance: number;
  hideOtherMoney: boolean;
  toggleHideOtherMoney: () => Promise<void>;
  isOtherPersonAccount: (account: BankAccount) => boolean;
  isOwnSavingsAccount: (account: BankAccount) => boolean;
  // Cuentas y Tarjetas de Crédito
  toggleAccountIncludeInTotal: (accountId: string) => Promise<void>;
  addManualAccount: (account: Omit<BankAccount, 'id' | 'isPlaidConnected'>) => Promise<void>;
  connectCustomUSBank: (account: Omit<BankAccount, 'id' | 'isPlaidConnected'>) => Promise<void>;
  updateAccountBalanceAndMask: (
    accountId: string,
    newName: string,
    newBalance: number,
    newMask?: string,
    newOwnerName?: string
  ) => Promise<void>;
  updateCreditCardDetails: (
    accountId: string,
    creditLimit: number,
    closingDay: number,
    dueDay: number
  ) => Promise<void>;
  deleteAccount: (accountId: string) => Promise<void>;
  reorderAccounts: (orderedAccountIds: string[]) => Promise<void>;
  moveAccount: (accountId: string, direction: 'up' | 'down') => Promise<void>;
  // Categorías (Separadas en Ajustes)
  addCategory: (category: Omit<Category, 'id' | 'isCustom'>) => Promise<void>;
  updateCategory: (
    categoryId: string,
    updates: { name: string; color: string; icon: string }
  ) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  // Presupuestos Mensuales (Apartado Independiente)
  addMonthlyBudget: (budget: Omit<MonthlyBudgetItem, 'id' | 'manualSpent'>) => Promise<void>;
  updateMonthlyBudget: (budget: MonthlyBudgetItem) => Promise<void>;
  addManualSpendToBudget: (budgetId: string, extraAmount: number) => Promise<void>;
  deleteMonthlyBudget: (budgetId: string) => Promise<void>;
  getBudgetSpentAmount: (budget: MonthlyBudgetItem) => number;
  // Metas de Ahorro (Savings Goals)
  addSavingsGoal: (goal: Omit<SavingsGoal, 'id'>) => Promise<void>;
  updateSavingsGoalAmount: (goalId: string, deltaAmount: number) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
  // Préstamos y Deudas (Me deben / Yo debo)
  addLoanRecord: (loan: Omit<LoanRecord, 'id' | 'paidAmount' | 'isSettled'>) => Promise<void>;
  updateLoanRecord: (
    loanId: string,
    updates: {
      personName: string;
      direction: LoanRecord['direction'];
      totalAmount: number;
      paidAmount?: number;
      notes?: string;
      date: string;
      dueDate?: string;
      accountId?: string;
      isSettled?: boolean;
    }
  ) => Promise<void>;
  registerLoanPayment: (loanId: string, paymentAmount: number, fromAccountId?: string) => Promise<void>;
  deleteLoanRecord: (loanId: string) => Promise<void>;
  // Rastreador de Cuotas / Deudas (Affirm, Klarna, Afterpay, Tarjetas) + Bola de Nieve / Avalancha
  addInstallmentDebt: (debt: Omit<InstallmentDebt, 'id'>) => Promise<void>;
  updateInstallmentDebt: (
    debtId: string,
    updates: {
      title: string;
      platform: string;
      totalAmount: number;
      remainingBalance: number;
      minimumPayment: number;
      interestRate: number;
      dueDates: string;
      installmentsTotal: number;
      installmentsPaid: number;
      color: string;
      icon: string;
      frequency?: 'monthly' | 'biweekly' | 'weekly';
      firstDueDate?: string;
      reminderDaysBefore?: number;
      accountId?: string;
    }
  ) => Promise<void>;
  registerInstallmentPayment: (
    debtId: string,
    paymentAmount: number,
    fromAccountId?: string
  ) => Promise<void>;
  deleteInstallmentDebt: (debtId: string) => Promise<void>;
  // Transacciones y Transferencias (Incluye Gastos Hormiga)
  addTransaction: (tx: Omit<Transaction, 'id' | 'isFromPlaid'>) => Promise<void>;
  updateTransaction: (
    txId: string,
    updated: {
      accountId: string;
      toAccountId?: string;
      categoryId: string;
      type: Transaction['type'];
      amount: number;
      fee?: number;
      description: string;
      date: string;
      isAntExpense?: boolean;
    }
  ) => Promise<void>;
  importBankMovementsText: (rawText: string, defaultAccountId?: string) => Promise<number>;
  transferBetweenAccounts: (params: TransferParams) => Promise<void>;
  deleteTransaction: (txId: string) => Promise<void>;
  // Recurrentes, Suscripciones Compartidas y Recordatorios en Android
  addRecurringItem: (item: Omit<RecurringItem, 'id' | 'active'>) => Promise<void>;
  updateRecurringItem: (
    recurringId: string,
    updates: {
      title: string;
      amount: number;
      type: 'expense' | 'income';
      categoryId: string;
      accountId: string;
      frequency: RecurringItem['frequency'];
      nextDueDate: string;
      reminderDaysBefore?: number;
      notes?: string;
    }
  ) => Promise<void>;
  updateRecurringReminderDays: (recurringId: string, reminderDaysBefore: number) => Promise<void>;
  toggleRecurringReimbursed: (recurringId: string) => Promise<void>;
  updateRecurringSharing: (
    recurringId: string,
    params: {
      isShared: boolean;
      sharedWithNames?: string;
      sharedPeopleCount?: number;
      myShareAmount?: number;
    }
  ) => Promise<void>;
  confirmRecurringItem: (recurringId: string, customAmount?: number, customFee?: number) => Promise<void>;
  postponeRecurringItem: (recurringId: string, daysToPostpone: number) => Promise<void>;
  skipRecurringCycle: (recurringId: string) => Promise<void>;
  deleteRecurringItem: (recurringId: string) => Promise<void>;
  // Gráficas
  getCategoryBreakdown: (type: 'expense' | 'income', accountFilterId?: string, yearMonthFilter?: string) => CategoryBreakdown[];
  // Perfil de Usuario, Seguridad y Onboarding
  userProfile: UserProfile;
  securitySettings: SecuritySettings;
  hasCompletedOnboarding: boolean;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => Promise<void>;
  setHasCompletedOnboarding: (completed: boolean) => Promise<void>;
  loginUser: (name: string, email: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  // Respaldo, Google Drive y Reinicio
  isDriveConnected: boolean;
  driveEmail: string;
  connectGoogleDrive: (email?: string) => Promise<void>;
  disconnectGoogleDrive: () => Promise<void>;
  autoDriveBackupEnabled: boolean;
  toggleAutoDriveBackup: (enabled: boolean) => Promise<void>;
  performSilentBackup: () => Promise<void>;
  resetToZero: () => Promise<void>;
  exportBackupJson: () => string;
  importBackupJson: (rawJson: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Jeison',
  email: 'jeison@ejemplo.com',
  phone: '',
  currency: 'USD',
  accountType: 'Personal',
  isLogged: true,
  avatarColor: '#10B981',
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  pinEnabled: false,
  pinCode: '',
  requirePinOnOpen: false,
  biometricEnabled: false,
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [monthlyBudgets, setMonthlyBudgets] = useState<MonthlyBudgetItem[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [installmentDebts, setInstallmentDebts] = useState<InstallmentDebt[]>([]);
  const [lastDriveBackupAt, setLastDriveBackupAtState] = useState<string | null>(null);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveEmail, setDriveEmail] = useState('');
  const [autoDriveBackupEnabled, setAutoDriveBackupEnabled] = useState(true);
  const [hideOtherMoney, setHideOtherMoney] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(DEFAULT_SECURITY_SETTINGS);
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState(true);

  const refreshAll = useCallback(async () => {
    try {
      const db = await getDb();

      await seedDefaultCategoriesOnly(db);

      const savedDriveBackup = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'last_drive_backup_at'"
      );
      if (savedDriveBackup?.value) {
        setLastDriveBackupAtState(savedDriveBackup.value);
      }

      const savedDriveEmail = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'drive_email'"
      );
      if (savedDriveEmail?.value) {
        setDriveEmail(savedDriveEmail.value);
      }

      const savedDriveConn = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'drive_connected'"
      );
      if (savedDriveConn) {
        setIsDriveConnected(savedDriveConn.value === '1');
      } else {
        setIsDriveConnected(Boolean(savedDriveEmail?.value));
      }

      const savedAutoBackup = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'auto_drive_backup_enabled'"
      );
      if (savedAutoBackup) {
        setAutoDriveBackupEnabled(savedAutoBackup.value === '1');
      }

      const savedHideMoney = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'hide_separated_money'"
      );
      if (savedHideMoney) {
        setHideOtherMoney(savedHideMoney.value === '1');
      }

      const profileRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'user_profile'"
      );
      if (profileRow?.value) {
        try {
          setUserProfile(JSON.parse(profileRow.value));
        } catch {}
      }

      const securityRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'security_settings'"
      );
      if (securityRow?.value) {
        try {
          setSecuritySettings(JSON.parse(securityRow.value));
        } catch {}
      }

      const onboardingRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'has_completed_onboarding'"
      );
      if (onboardingRow) {
        setHasCompletedOnboardingState(onboardingRow.value === '1' || onboardingRow.value === 'true');
      }

      const rawAccounts = await db.getAllAsync<any>('SELECT * FROM accounts ORDER BY sort_order ASC, rowid ASC');
      setAccounts(
        rawAccounts.map((r) => ({
          id: r.id,
          name: r.name,
          institution: r.institution,
          mask: r.mask ?? undefined,
          type: r.type,
          balance: Number(r.balance),
          currency: r.currency,
          includeInTotal: Boolean(r.include_in_total),
          isPlaidConnected: Boolean(r.is_plaid_connected),
          plaidAccountId: r.plaid_account_id ?? undefined,
          plaidItemId: r.plaid_item_id ?? undefined,
          color: r.color,
          lastSyncedAt: r.last_synced_at ?? undefined,
          ownerName: r.owner_name ?? undefined,
          creditLimit: Number(r.credit_limit || 0),
          closingDay: Number(r.closing_day || 0),
          dueDay: Number(r.due_day || 0),
          sortOrder: Number(r.sort_order ?? 0),
        }))
      );

      const rawCategories = await db.getAllAsync<any>('SELECT * FROM categories ORDER BY name ASC');
      setCategories(
        rawCategories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
          color: c.color,
          icon: c.icon,
          isCustom: Boolean(c.is_custom),
        }))
      );

      const rawBudgets = await db.getAllAsync<any>('SELECT * FROM monthly_budgets ORDER BY rowid DESC');
      setMonthlyBudgets(
        rawBudgets.map((b) => ({
          id: b.id,
          title: b.title,
          limitAmount: Number(b.limit_amount),
          categoryId: b.category_id ?? undefined,
          manualSpent: Number(b.manual_spent || 0),
          color: b.color,
          icon: b.icon,
        }))
      );

      const rawGoals = await db.getAllAsync<any>('SELECT * FROM savings_goals ORDER BY rowid DESC');
      setSavingsGoals(
        rawGoals.map((g) => ({
          id: g.id,
          title: g.title,
          targetAmount: Number(g.target_amount),
          savedAmount: Number(g.saved_amount || 0),
          color: g.color,
          icon: g.icon,
          deadline: g.deadline ?? undefined,
        }))
      );

      const rawLoans = await db.getAllAsync<any>('SELECT * FROM loans ORDER BY is_settled ASC, rowid DESC');
      const mappedLoans: LoanRecord[] = rawLoans.map((l) => ({
        id: l.id,
        personName: l.person_name,
        direction: l.direction,
        totalAmount: Number(l.total_amount),
        paidAmount: Number(l.paid_amount || 0),
        notes: l.notes ?? undefined,
        date: l.date,
        dueDate: l.due_date ?? undefined,
        isSettled: Boolean(l.is_settled),
        accountId: l.account_id ?? undefined,
      }));
      setLoans(mappedLoans);

      const rawDebts = await db.getAllAsync<any>('SELECT * FROM installment_debts ORDER BY rowid DESC');
      const mappedDebts: InstallmentDebt[] = rawDebts.map((d) => ({
        id: d.id,
        title: d.title,
        platform: d.platform,
        totalAmount: Number(d.total_amount),
        remainingBalance: Number(d.remaining_balance),
        minimumPayment: Number(d.minimum_payment || 0),
        interestRate: Number(d.interest_rate || 0),
        dueDates: d.due_dates || 'Mensual',
        installmentsTotal: Number(d.installments_total || 4),
        installmentsPaid: Number(d.installments_paid || 0),
        color: d.color || '#38BDF8',
        icon: d.icon || 'card-outline',
        frequency: d.frequency || 'monthly',
        firstDueDate: d.first_due_date ?? undefined,
        reminderDaysBefore: d.reminder_days ? Number(d.reminder_days) : 1,
        accountId: d.account_id ?? undefined,
      }));
      setInstallmentDebts(mappedDebts);

      const rawTx = await db.getAllAsync<any>(
        'SELECT * FROM transactions ORDER BY date DESC, rowid DESC'
      );
      setTransactions(
        rawTx.map((t) => ({
          id: t.id,
          accountId: t.account_id,
          toAccountId: t.to_account_id ?? undefined,
          categoryId: t.category_id,
          type: t.type,
          amount: Number(t.amount),
          fee: Number(t.fee || 0),
          description: t.description,
          merchantName: t.merchant_name ?? undefined,
          date: t.date,
          isFromPlaid: Boolean(t.is_from_plaid),
          plaidTransactionId: t.plaid_transaction_id ?? undefined,
          recurringId: t.recurring_id ?? undefined,
          isAntExpense: Boolean(t.is_ant_expense),
        }))
      );

      const rawRec = await db.getAllAsync<any>(
        'SELECT * FROM recurring_items WHERE active = 1 ORDER BY next_due_date ASC'
      );
      const mappedRec: RecurringItem[] = rawRec.map((r) => ({
        id: r.id,
        title: r.title,
        amount: Number(r.amount),
        type: r.type,
        categoryId: r.category_id,
        accountId: r.account_id,
        frequency: r.frequency,
        nextDueDate: r.next_due_date,
        postponedUntil: r.postponed_until ?? undefined,
        reminderDaysBefore: r.reminder_days !== undefined ? Number(r.reminder_days) : 1,
        active: Boolean(r.active),
        notes: r.notes ?? undefined,
        isShared: Boolean(r.is_shared),
        sharedWithNames: r.shared_with_names ?? undefined,
        sharedPeopleCount: Number(r.shared_people_count || 1),
        myShareAmount: r.my_share_amount !== undefined && r.my_share_amount !== null ? Number(r.my_share_amount) : undefined,
        reimbursedThisCycle: Boolean(r.reimbursed_this_cycle),
      }));
      setRecurringItems(mappedRec);

      // Programar notificaciones locales en Android para recurrentes, cuotas y préstamos
      syncAllNotifications(mappedRec, mappedDebts, mappedLoans).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const recordDriveBackupTimestamp = async () => {
    const nowIso = new Date().toISOString();
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('last_drive_backup_at', ?)",
      [nowIso]
    );
    setLastDriveBackupAtState(nowIso);
  };

  const toggleHideOtherMoney = async () => {
    const nextVal = !hideOtherMoney;
    setHideOtherMoney(nextVal);
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('hide_separated_money', ?)",
      [nextVal ? '1' : '0']
    );
  };

  // Helper para identificar si una cuenta pertenece a otra persona
  const isOtherPersonAccount = useCallback((account: BankAccount): boolean => {
    if (!account.ownerName || !account.ownerName.trim()) return false;
    const clean = account.ownerName.trim().toLowerCase();
    const ownWords = ['yo', 'mío', 'mio', 'mi dinero', 'personal', 'propio', 'jeison', 'me', 'propia', 'mía', 'mia', 'mío (ahorro)', 'mio (ahorro)'];
    return !ownWords.includes(clean);
  }, []);

  // Helper para saber si una cuenta corresponde a Ahorro Propio (por tipo o porque el dueño se marcó como Mío / Ahorro)
  const isOwnSavingsAccount = useCallback(
    (account: BankAccount): boolean => {
      if (isOtherPersonAccount(account)) return false;
      if (account.type === 'savings') return true;
      if (account.ownerName) {
        const clean = account.ownerName.trim().toLowerCase();
        if (clean.includes('mío') || clean.includes('mio') || clean.includes('ahorro') || clean.includes('personal') || clean.includes('propio')) {
          return true;
        }
      }
      return false;
    },
    [isOtherPersonAccount]
  );

  // Dinero total de otras personas guardado o administrado (se suman entre ellos, nunca con el saldo propio)
  const otherPeopleTotalBalance = useMemo(() => {
    return accounts
      .filter((a) => isOtherPersonAccount(a))
      .reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, isOtherPersonAccount]);

  // Dinero de Ahorro Propio: Cuentas de tipo savings O donde se especificó "Mío / Ahorro"
  const ownSavingsBalance = useMemo(() => {
    return accounts
      .filter((a) => isOwnSavingsAccount(a) && a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, isOwnSavingsAccount]);

  // Saldo Propio Disponible (Checking / efectivo propio para gasto diario)
  // Excluye dinero ajeno Y excluye cualquier cuenta que sea de ahorro o marcada como Mío/Ahorro
  const includedTotalBalance = useMemo(() => {
    return accounts
      .filter((a) => a.includeInTotal && !isOtherPersonAccount(a) && !isOwnSavingsAccount(a) && a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, isOtherPersonAccount, isOwnSavingsAccount]);

  // Cuentas separadas propias (excluidas del saldo de gasto diario, pero propias)
  const excludedTotalBalance = useMemo(() => {
    return accounts
      .filter((a) => !a.includeInTotal && !isOtherPersonAccount(a))
      .reduce((sum, a) => sum + a.balance, 0);
  }, [accounts, isOtherPersonAccount]);

  // PATRIMONIO NETO REAL DEL USUARIO:
  // Suma únicamente los activos PROPIOS del usuario (cuentas incluidas y separadas propias,
  // restando deudas de tarjetas de crédito).
  // Las cuentas separadas o guardadas para OTRAS PERSONAS nunca se suman aquí.
  const netWorthBalance = useMemo(() => {
    const ownAssets = accounts
      .filter((a) => !isOtherPersonAccount(a) && a.type !== 'credit')
      .reduce((sum, a) => sum + a.balance, 0);
    const ownCreditDebt = accounts
      .filter((a) => !isOtherPersonAccount(a) && a.type === 'credit')
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);
    return ownAssets - ownCreditDebt;
  }, [accounts, isOtherPersonAccount]);

  const toggleAccountIncludeInTotal = async (accountId: string) => {
    const db = await getDb();
    const target = accounts.find((a) => a.id === accountId);
    if (!target) return;

    const newVal = target.includeInTotal ? 0 : 1;
    await db.runAsync('UPDATE accounts SET include_in_total = ? WHERE id = ?', [
      newVal,
      accountId,
    ]);
    await refreshAll();
  };

  const addManualAccount = async (account: Omit<BankAccount, 'id' | 'isPlaidConnected'>) => {
    const db = await getDb();
    const id = `acc-${Date.now()}`;
    const nextOrder = accounts.length;
    await db.runAsync(
      `INSERT INTO accounts (
        id, name, institution, mask, type, balance, currency, include_in_total, is_plaid_connected, color,
        owner_name, credit_limit, closing_day, due_day, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        account.name,
        account.institution,
        account.mask ?? null,
        account.type,
        account.balance,
        account.currency || 'USD',
        account.includeInTotal ? 1 : 0,
        account.color,
        account.ownerName?.trim() || null,
        account.creditLimit ?? 0,
        account.closingDay ?? 0,
        account.dueDay ?? 0,
        nextOrder,
      ]
    );
    await refreshAll();
  };

  const connectCustomUSBank = async (account: Omit<BankAccount, 'id' | 'isPlaidConnected'>) => {
    const db = await getDb();
    const id = `acc-usbank-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const nextOrder = accounts.length;
    await db.runAsync(
      `INSERT INTO accounts (
        id, name, institution, mask, type, balance, currency, include_in_total, is_plaid_connected, plaid_account_id, color, last_synced_at,
        owner_name, credit_limit, closing_day, due_day, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        account.name,
        account.institution,
        account.mask ?? null,
        account.type,
        account.balance,
        account.currency || 'USD',
        account.includeInTotal ? 1 : 0,
        `us_bank_${id}`,
        account.color,
        nowIso,
        account.ownerName?.trim() || null,
        account.creditLimit ?? 0,
        account.closingDay ?? 0,
        account.dueDay ?? 0,
        nextOrder,
      ]
    );
    await refreshAll();
  };

  const updateAccountBalanceAndMask = async (
    accountId: string,
    newName: string,
    newBalance: number,
    newMask?: string,
    newOwnerName?: string
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE accounts SET name = ?, balance = ?, mask = ?, owner_name = ? WHERE id = ?`,
      [
        newName.trim(),
        newBalance,
        newMask?.trim() || null,
        newOwnerName?.trim() || null,
        accountId,
      ]
    );
    await refreshAll();
  };

  const updateCreditCardDetails = async (
    accountId: string,
    creditLimit: number,
    closingDay: number,
    dueDay: number
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE accounts SET credit_limit = ?, closing_day = ?, due_day = ? WHERE id = ?`,
      [creditLimit, closingDay, dueDay, accountId]
    );
    await refreshAll();
  };

  const deleteAccount = async (accountId: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM transactions WHERE account_id = ? OR to_account_id = ?', [
      accountId,
      accountId,
    ]);
    await db.runAsync('DELETE FROM recurring_items WHERE account_id = ?', [accountId]);
    await db.runAsync('DELETE FROM accounts WHERE id = ?', [accountId]);
    await refreshAll();
  };

  const reorderAccounts = useCallback(
    async (orderedIds: string[]) => {
      const db = await getDb();
      for (let i = 0; i < orderedIds.length; i++) {
        await db.runAsync('UPDATE accounts SET sort_order = ? WHERE id = ?', [i, orderedIds[i]]);
      }
      await refreshAll();
    },
    [refreshAll]
  );

  const moveAccount = useCallback(
    async (accountId: string, direction: 'up' | 'down') => {
      const currentIndex = accounts.findIndex((a) => a.id === accountId);
      if (currentIndex < 0) return;
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= accounts.length) return;

      const newOrder = [...accounts];
      const [moved] = newOrder.splice(currentIndex, 1);
      newOrder.splice(targetIndex, 0, moved);

      const db = await getDb();
      for (let i = 0; i < newOrder.length; i++) {
        await db.runAsync('UPDATE accounts SET sort_order = ? WHERE id = ?', [i, newOrder[i].id]);
      }
      await refreshAll();
    },
    [accounts, refreshAll]
  );

  const addCategory = async (category: Omit<Category, 'id' | 'isCustom'>) => {
    const db = await getDb();
    const id = `cat-custom-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO categories (id, name, type, color, icon, is_custom) VALUES (?, ?, ?, ?, ?, 1)`,
      [id, category.name.trim(), category.type, category.color, category.icon]
    );
    await refreshAll();
  };

  const updateCategory = async (
    categoryId: string,
    updates: { name: string; color: string; icon: string }
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?`,
      [updates.name.trim(), updates.color, updates.icon, categoryId]
    );
    await refreshAll();
  };

  const deleteCategory = async (categoryId: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM categories WHERE id = ? AND is_custom = 1', [categoryId]);
    await refreshAll();
  };

  // --- PRESUPUESTOS MENSUALES (INDEPENDIENTES DE CATEGORÍAS) ---
  const addMonthlyBudget = async (budget: Omit<MonthlyBudgetItem, 'id' | 'manualSpent'>) => {
    const db = await getDb();
    const id = `budget-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO monthly_budgets (id, title, limit_amount, category_id, manual_spent, color, icon)
       VALUES (?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        budget.title.trim(),
        budget.limitAmount,
        budget.categoryId || null,
        budget.color,
        budget.icon,
      ]
    );
    await refreshAll();
  };

  const addManualSpendToBudget = async (budgetId: string, extraAmount: number) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE monthly_budgets SET manual_spent = MAX(0, manual_spent + ?) WHERE id = ?`,
      [extraAmount, budgetId]
    );
    await refreshAll();
  };

  const updateMonthlyBudget = async (budget: MonthlyBudgetItem) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE monthly_budgets
       SET title = ?, limit_amount = ?, category_id = ?, color = ?, icon = ?
       WHERE id = ?`,
      [
        budget.title.trim(),
        budget.limitAmount,
        budget.categoryId || null,
        budget.color,
        budget.icon,
        budget.id,
      ]
    );
    await refreshAll();
  };

  const deleteMonthlyBudget = async (budgetId: string) => {
    const db = await getDb();
    await db.runAsync(`DELETE FROM monthly_budgets WHERE id = ?`, [budgetId]);
    await refreshAll();
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    const next = { ...userProfile, ...updates };
    setUserProfile(next);
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('user_profile', ?)",
      [JSON.stringify(next)]
    );
  };

  const updateSecuritySettings = async (updates: Partial<SecuritySettings>) => {
    const next = { ...securitySettings, ...updates };
    setSecuritySettings(next);
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('security_settings', ?)",
      [JSON.stringify(next)]
    );
  };

  const setHasCompletedOnboarding = async (completed: boolean) => {
    setHasCompletedOnboardingState(completed);
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('has_completed_onboarding', ?)",
      [completed ? '1' : '0']
    );
  };

  const loginUser = async (name: string, email: string) => {
    await updateUserProfile({
      name: name.trim() || 'Jeison',
      email: email.trim() || 'jeison@ejemplo.com',
      isLogged: true,
    });
  };

  const logoutUser = async () => {
    await updateUserProfile({
      isLogged: false,
    });
  };

  const getBudgetSpentAmount = useCallback(
    (budget: MonthlyBudgetItem): number => {
      const currentYearMonth = new Date().toISOString().slice(0, 7);
      let catSpent = 0;
      if (budget.categoryId) {
        catSpent = transactions
          .filter(
            (t) =>
              t.type === 'expense' &&
              t.categoryId === budget.categoryId &&
              t.date.startsWith(currentYearMonth)
          )
          .reduce((sum, t) => sum + t.amount, 0);
      }
      return catSpent + (budget.manualSpent || 0);
    },
    [transactions]
  );

  // --- METAS DE AHORRO (SAVINGS GOALS) ---
  const addSavingsGoal = async (goal: Omit<SavingsGoal, 'id'>) => {
    const db = await getDb();
    const id = `goal-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO savings_goals (id, title, target_amount, saved_amount, color, icon, deadline)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        goal.title.trim(),
        goal.targetAmount,
        goal.savedAmount || 0,
        goal.color,
        goal.icon,
        goal.deadline || null,
      ]
    );
    await refreshAll();
  };

  const updateSavingsGoalAmount = async (goalId: string, deltaAmount: number) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE savings_goals SET saved_amount = MAX(0, saved_amount + ?) WHERE id = ?`,
      [deltaAmount, goalId]
    );
    await refreshAll();
  };

  const deleteSavingsGoal = async (goalId: string) => {
    const db = await getDb();
    await db.runAsync(`DELETE FROM savings_goals WHERE id = ?`, [goalId]);
    await refreshAll();
  };

  // --- PRÉSTAMOS Y DEUDAS (ME DEBEN / YO DEBO) ---
  const addLoanRecord = async (loan: Omit<LoanRecord, 'id' | 'paidAmount' | 'isSettled'>) => {
    const db = await getDb();
    const id = `loan-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO loans (id, person_name, direction, total_amount, paid_amount, notes, date, due_date, is_settled, account_id)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0, ?)`,
      [
        id,
        loan.personName.trim(),
        loan.direction,
        loan.totalAmount,
        loan.notes || null,
        loan.date,
        loan.dueDate || null,
        loan.accountId || null,
      ]
    );

    // Si asoció una cuenta bancaria, registrar opcionalmente el movimiento
    if (loan.accountId) {
      if (loan.direction === 'lent') {
        // Presté dinero -> Salida de mi cuenta
        await addTransaction({
          accountId: loan.accountId,
          categoryId: 'cat-services',
          type: 'expense',
          amount: loan.totalAmount,
          description: `Préstamo entregado a: ${loan.personName.trim()}`,
          date: loan.date,
        });
      } else {
        // Me prestaron dinero -> Entrada a mi cuenta
        await addTransaction({
          accountId: loan.accountId,
          categoryId: 'cat-income-other',
          type: 'income',
          amount: loan.totalAmount,
          description: `Préstamo recibido de: ${loan.personName.trim()}`,
          date: loan.date,
        });
      }
    }

    await refreshAll();
  };

  const updateLoanRecord = async (
    loanId: string,
    updates: {
      personName: string;
      direction: LoanRecord['direction'];
      totalAmount: number;
      paidAmount?: number;
      notes?: string;
      date: string;
      dueDate?: string;
      accountId?: string;
      isSettled?: boolean;
    }
  ) => {
    const db = await getDb();
    const target = loans.find((l) => l.id === loanId);
    const paid = updates.paidAmount !== undefined ? updates.paidAmount : (target?.paidAmount ?? 0);
    const settled = updates.isSettled !== undefined
      ? (updates.isSettled ? 1 : 0)
      : (paid >= updates.totalAmount ? 1 : 0);

    await db.runAsync(
      `UPDATE loans
       SET person_name = ?, direction = ?, total_amount = ?, paid_amount = ?,
           notes = ?, date = ?, due_date = ?, is_settled = ?, account_id = ?
       WHERE id = ?`,
      [
        updates.personName.trim(),
        updates.direction,
        updates.totalAmount,
        paid,
        updates.notes || null,
        updates.date,
        updates.dueDate || null,
        settled,
        updates.accountId || null,
        loanId,
      ]
    );
    await refreshAll();
  };

  const registerLoanPayment = async (loanId: string, paymentAmount: number, fromAccountId?: string) => {
    const target = loans.find((l) => l.id === loanId);
    if (!target || paymentAmount <= 0) return;

    const newPaid = Math.min(target.totalAmount, target.paidAmount + paymentAmount);
    const settled = newPaid >= target.totalAmount ? 1 : 0;

    const db = await getDb();
    await db.runAsync(
      `UPDATE loans SET paid_amount = ?, is_settled = ? WHERE id = ?`,
      [newPaid, settled, loanId]
    );

    // Si indicó cuenta, registrar el movimiento correspondiente
    if (fromAccountId) {
      const today = new Date().toISOString().split('T')[0];
      if (target.direction === 'lent') {
        // Me devolvieron dinero -> Ingreso
        await addTransaction({
          accountId: fromAccountId,
          categoryId: 'cat-income-other',
          type: 'income',
          amount: paymentAmount,
          description: `Cobro de préstamo: ${target.personName}`,
          date: today,
        });
      } else {
        // Pagué lo que debía -> Gasto
        await addTransaction({
          accountId: fromAccountId,
          categoryId: 'cat-services',
          type: 'expense',
          amount: paymentAmount,
          description: `Pago de préstamo a: ${target.personName}`,
          date: today,
        });
      }
      return;
    }

    await refreshAll();
  };

  const deleteLoanRecord = async (loanId: string) => {
    const target = loans.find((l) => l.id === loanId);
    const db = await getDb();
    if (target) {
      await db.runAsync(
        `DELETE FROM transactions WHERE description LIKE ? OR description LIKE ?`,
        [`%${target.personName.trim()}%`, `%${target.personName.trim()}%`]
      );
    }
    await db.runAsync(`DELETE FROM loans WHERE id = ?`, [loanId]);
    await refreshAll();
  };

  // --- RASTREADOR DE DEUDAS / CUOTAS (AFFIRM, KLARNA, AFTERPAY, TARJETAS) ---
  const addInstallmentDebt = async (debt: Omit<InstallmentDebt, 'id'>) => {
    const db = await getDb();
    const id = `debt-${Date.now()}`;
    await db.runAsync(
      `INSERT INTO installment_debts (
        id, title, platform, total_amount, remaining_balance, minimum_payment,
        interest_rate, due_dates, installments_total, installments_paid, color, icon,
        frequency, first_due_date, reminder_days, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        debt.title.trim(),
        debt.platform.trim() || 'Affirm',
        debt.totalAmount,
        debt.remainingBalance,
        debt.minimumPayment || 0,
        debt.interestRate || 0,
        debt.dueDates.trim() || 'Mensual',
        debt.installmentsTotal || 4,
        debt.installmentsPaid || 0,
        debt.color || '#38BDF8',
        debt.icon || 'card-outline',
        debt.frequency || 'monthly',
        debt.firstDueDate || null,
        debt.reminderDaysBefore ?? 1,
        debt.accountId || null,
      ]
    );
    await refreshAll();
  };

  const updateInstallmentDebt = async (
    debtId: string,
    updates: {
      title: string;
      platform: string;
      totalAmount: number;
      remainingBalance: number;
      minimumPayment: number;
      interestRate: number;
      dueDates: string;
      installmentsTotal: number;
      installmentsPaid: number;
      color: string;
      icon: string;
      frequency?: 'monthly' | 'biweekly' | 'weekly';
      firstDueDate?: string;
      reminderDaysBefore?: number;
      accountId?: string;
    }
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE installment_debts
       SET title = ?, platform = ?, total_amount = ?, remaining_balance = ?,
           minimum_payment = ?, interest_rate = ?, due_dates = ?,
           installments_total = ?, installments_paid = ?, color = ?, icon = ?,
           frequency = ?, first_due_date = ?, reminder_days = ?, account_id = ?
       WHERE id = ?`,
      [
        updates.title.trim(),
        updates.platform.trim() || 'Affirm',
        updates.totalAmount,
        updates.remainingBalance,
        updates.minimumPayment || 0,
        updates.interestRate || 0,
        updates.dueDates.trim() || 'Mensual',
        updates.installmentsTotal || 4,
        updates.installmentsPaid || 0,
        updates.color || '#38BDF8',
        updates.icon || 'card-outline',
        updates.frequency || 'monthly',
        updates.firstDueDate || null,
        updates.reminderDaysBefore ?? 1,
        updates.accountId || null,
        debtId,
      ]
    );
    await refreshAll();
  };

  const registerInstallmentPayment = async (
    debtId: string,
    paymentAmount: number,
    fromAccountId?: string
  ) => {
    const target = installmentDebts.find((d) => d.id === debtId);
    if (!target || paymentAmount <= 0) return;

    const newRemaining = Math.max(0, target.remainingBalance - paymentAmount);
    const newPaidCount = Math.min(
      target.installmentsTotal || 99,
      (target.installmentsPaid || 0) + 1
    );

    const db = await getDb();
    await db.runAsync(
      `UPDATE installment_debts SET remaining_balance = ?, installments_paid = ? WHERE id = ?`,
      [newRemaining, newPaidCount, debtId]
    );

    // Si eligió descontarlo de una cuenta bancaria, registra el movimiento automáticamente
    if (fromAccountId) {
      const today = new Date().toISOString().split('T')[0];
      await addTransaction({
        accountId: fromAccountId,
        categoryId: 'cat-shopping',
        type: 'expense',
        amount: paymentAmount,
        fee: 0,
        description: `Pago cuota: ${target.title} (${target.platform})`,
        date: today,
      });
      return;
    }

    await refreshAll();
  };

  const deleteInstallmentDebt = async (debtId: string) => {
    const target = installmentDebts.find((d) => d.id === debtId);
    const db = await getDb();
    if (target) {
      await db.runAsync(
        `DELETE FROM transactions WHERE description LIKE ?`,
        [`%${target.title.trim()}%`]
      );
    }
    await db.runAsync(`DELETE FROM installment_debts WHERE id = ?`, [debtId]);
    await refreshAll();
  };

  // --- TRANSACCIONES Y TRANSFERENCIAS ---
  const importBankMovementsText = async (
    rawText: string,
    defaultAccountId?: string
  ): Promise<number> => {
    const parsedList = parseBankAlertsOrCsv(rawText);
    if (parsedList.length === 0 || accounts.length === 0) return 0;

    let count = 0;
    for (const item of parsedList) {
      const targetAccId = matchAccountForAlert(accounts, item.detectedBankHint, defaultAccountId);
      if (!targetAccId) continue;

      await addTransaction({
        accountId: targetAccId,
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        fee: 0,
        description: item.description,
        merchantName: item.merchantName,
        date: item.date,
      });
      count++;
    }
    return count;
  };

  const addTransaction = async (tx: Omit<Transaction, 'id' | 'isFromPlaid'>) => {
    const db = await getDb();
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const feeVal = tx.fee && tx.fee > 0 ? tx.fee : 0;

    await db.runAsync(
      `INSERT INTO transactions (
        id, account_id, to_account_id, category_id, type, amount, fee, description, merchant_name, date, is_from_plaid, recurring_id, is_ant_expense
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        id,
        tx.accountId,
        tx.toAccountId ?? null,
        tx.categoryId,
        tx.type,
        tx.amount,
        feeVal,
        tx.description.trim(),
        tx.merchantName ?? null,
        tx.date,
        tx.recurringId ?? null,
        tx.isAntExpense || tx.categoryId === 'cat-ant' ? 1 : 0,
      ]
    );

    const acc = accounts.find((a) => a.id === tx.accountId);
    const isCreditCard = acc?.type === 'credit';

    if (tx.type === 'income') {
      const netIncome = tx.amount - feeVal;
      const delta = isCreditCard ? -netIncome : netIncome;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        delta,
        tx.accountId,
      ]);
    } else if (tx.type === 'expense') {
      const totalOut = tx.amount + feeVal;
      const delta = isCreditCard ? totalOut : -totalOut;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        delta,
        tx.accountId,
      ]);
    }

    await refreshAll();
  };

  const transferBetweenAccounts = async ({
    fromAccountId,
    toAccountId,
    amount,
    fee = 0,
    description,
    date,
  }: TransferParams) => {
    if (fromAccountId === toAccountId || amount <= 0) return;

    const db = await getDb();
    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    const toAcc = accounts.find((a) => a.id === toAccountId);
    const cleanFee = fee > 0 ? fee : 0;

    const txId = `tx-transfer-${Date.now()}`;
    const autoDesc =
      description?.trim() ||
      `Transferencia: ${fromAcc?.name || 'Origen'} → ${toAcc?.name || 'Destino'}`;

    await db.runAsync(
      `INSERT INTO transactions (
        id, account_id, to_account_id, category_id, type, amount, fee, description, date, is_from_plaid
      ) VALUES (?, ?, ?, 'cat-fees', 'transfer', ?, ?, ?, ?, 0)`,
      [txId, fromAccountId, toAccountId, amount, cleanFee, autoDesc, date]
    );

    await db.runAsync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [
      amount + cleanFee,
      fromAccountId,
    ]);

    if (toAcc?.type === 'credit') {
      await db.runAsync('UPDATE accounts SET balance = MAX(0, balance - ?) WHERE id = ?', [
        amount,
        toAccountId,
      ]);
    } else {
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        amount,
        toAccountId,
      ]);
    }

    await refreshAll();
  };

  const revertTxBalanceEffect = async (db: any, target: Transaction) => {
    const feeVal = target.fee || 0;
    const acc = accounts.find((a) => a.id === target.accountId);
    const isCreditCard = acc?.type === 'credit';

    if (target.type === 'transfer' && target.toAccountId) {
      const toAcc = accounts.find((a) => a.id === target.toAccountId);
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        target.amount + feeVal,
        target.accountId,
      ]);
      if (toAcc?.type === 'credit') {
        await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
          target.amount,
          target.toAccountId,
        ]);
      } else {
        await db.runAsync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [
          target.amount,
          target.toAccountId,
        ]);
      }
    } else if (target.type === 'income') {
      const netIncome = target.amount - feeVal;
      const reverseDelta = isCreditCard ? netIncome : -netIncome;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        reverseDelta,
        target.accountId,
      ]);
    } else {
      const totalOut = target.amount + feeVal;
      const reverseDelta = isCreditCard ? -totalOut : totalOut;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        reverseDelta,
        target.accountId,
      ]);
    }
  };

  const applyTxBalanceEffect = async (
    db: any,
    tx: {
      accountId: string;
      toAccountId?: string;
      type: Transaction['type'];
      amount: number;
      fee?: number;
    }
  ) => {
    const feeVal = tx.fee && tx.fee > 0 ? tx.fee : 0;
    const acc = accounts.find((a) => a.id === tx.accountId);
    const isCreditCard = acc?.type === 'credit';

    if (tx.type === 'transfer' && tx.toAccountId) {
      const toAcc = accounts.find((a) => a.id === tx.toAccountId);
      await db.runAsync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [
        tx.amount + feeVal,
        tx.accountId,
      ]);
      if (toAcc?.type === 'credit') {
        await db.runAsync('UPDATE accounts SET balance = MAX(0, balance - ?) WHERE id = ?', [
          tx.amount,
          tx.toAccountId,
        ]);
      } else {
        await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
          tx.amount,
          tx.toAccountId,
        ]);
      }
    } else if (tx.type === 'income') {
      const netIncome = tx.amount - feeVal;
      const delta = isCreditCard ? -netIncome : netIncome;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        delta,
        tx.accountId,
      ]);
    } else if (tx.type === 'expense') {
      const totalOut = tx.amount + feeVal;
      const delta = isCreditCard ? totalOut : -totalOut;
      await db.runAsync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [
        delta,
        tx.accountId,
      ]);
    }
  };

  const deleteTransaction = async (txId: string) => {
    const db = await getDb();
    const target = transactions.find((t) => t.id === txId);
    if (!target) return;

    await revertTxBalanceEffect(db, target);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [txId]);
    await refreshAll();
  };

  const updateTransaction = async (
    txId: string,
    updated: {
      accountId: string;
      toAccountId?: string;
      categoryId: string;
      type: Transaction['type'];
      amount: number;
      fee?: number;
      description: string;
      date: string;
      isAntExpense?: boolean;
    }
  ) => {
    const db = await getDb();
    const target = transactions.find((t) => t.id === txId);
    if (!target || updated.amount <= 0) return;

    // 1. Revertir el efecto del movimiento anterior en los saldos
    await revertTxBalanceEffect(db, target);

    // 2. Actualizar el registro en la base de datos
    const cleanFee = updated.fee && updated.fee > 0 ? updated.fee : 0;
    const isAnt =
      updated.isAntExpense !== undefined
        ? updated.isAntExpense
        : updated.categoryId === 'cat-ant' || Boolean(target.isAntExpense);

    await db.runAsync(
      `UPDATE transactions
       SET account_id = ?, to_account_id = ?, category_id = ?, type = ?, amount = ?, fee = ?, description = ?, merchant_name = ?, date = ?, is_ant_expense = ?
       WHERE id = ?`,
      [
        updated.accountId,
        updated.type === 'transfer' ? updated.toAccountId ?? null : null,
        updated.type === 'transfer' ? 'cat-fees' : updated.categoryId,
        updated.type,
        updated.amount,
        cleanFee,
        updated.description.trim(),
        updated.description.trim(),
        updated.date.trim() || target.date,
        isAnt ? 1 : 0,
        txId,
      ]
    );

    // 3. Aplicar el nuevo efecto en los saldos
    await applyTxBalanceEffect(db, {
      accountId: updated.accountId,
      toAccountId: updated.type === 'transfer' ? updated.toAccountId : undefined,
      type: updated.type,
      amount: updated.amount,
      fee: cleanFee,
    });

    await refreshAll();
  };

  const addRecurringItem = async (item: Omit<RecurringItem, 'id' | 'active'>) => {
    const db = await getDb();
    const id = `rec-${Date.now()}`;
    const peopleCount = item.sharedPeopleCount && item.sharedPeopleCount > 1 ? item.sharedPeopleCount : 1;
    const myShare =
      item.isShared && item.myShareAmount !== undefined
        ? item.myShareAmount
        : item.isShared
        ? item.amount / peopleCount
        : item.amount;

    await db.runAsync(
      `INSERT INTO recurring_items (
        id, title, amount, type, category_id, account_id, frequency, next_due_date, postponed_until, reminder_days, active, notes,
        is_shared, shared_with_names, shared_people_count, my_share_amount, reimbursed_this_cycle
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, 0)`,
      [
        id,
        item.title.trim(),
        item.amount,
        item.type,
        item.categoryId,
        item.accountId,
        item.frequency,
        item.nextDueDate,
        item.postponedUntil ?? null,
        item.reminderDaysBefore !== undefined ? item.reminderDaysBefore : 1,
        item.notes ?? null,
        item.isShared ? 1 : 0,
        item.sharedWithNames?.trim() || null,
        peopleCount,
        myShare,
      ]
    );
    await refreshAll();
  };

  const updateRecurringItem = async (
    recurringId: string,
    updates: {
      title: string;
      amount: number;
      type: 'expense' | 'income';
      categoryId: string;
      accountId: string;
      frequency: RecurringItem['frequency'];
      nextDueDate: string;
      reminderDaysBefore?: number;
      notes?: string;
    }
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items
       SET title = ?, amount = ?, type = ?, category_id = ?, account_id = ?,
           frequency = ?, next_due_date = ?, reminder_days = ?, notes = ?
       WHERE id = ?`,
      [
        updates.title.trim(),
        updates.amount,
        updates.type,
        updates.categoryId,
        updates.accountId,
        updates.frequency,
        updates.nextDueDate,
        updates.reminderDaysBefore !== undefined ? updates.reminderDaysBefore : 1,
        updates.notes?.trim() || null,
        recurringId,
      ]
    );
    await refreshAll();
  };

  const updateRecurringReminderDays = async (recurringId: string, reminderDaysBefore: number) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items SET reminder_days = ? WHERE id = ?`,
      [reminderDaysBefore, recurringId]
    );
    await refreshAll();
  };

  const toggleRecurringReimbursed = async (recurringId: string) => {
    const target = recurringItems.find((r) => r.id === recurringId);
    if (!target) return;
    const db = await getDb();
    const nextVal = target.reimbursedThisCycle ? 0 : 1;
    await db.runAsync(
      `UPDATE recurring_items SET reimbursed_this_cycle = ? WHERE id = ?`,
      [nextVal, recurringId]
    );
    await refreshAll();
  };

  const updateRecurringSharing = async (
    recurringId: string,
    params: {
      isShared: boolean;
      sharedWithNames?: string;
      sharedPeopleCount?: number;
      myShareAmount?: number;
    }
  ) => {
    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items
       SET is_shared = ?, shared_with_names = ?, shared_people_count = ?, my_share_amount = ?
       WHERE id = ?`,
      [
        params.isShared ? 1 : 0,
        params.sharedWithNames?.trim() || null,
        params.sharedPeopleCount || 1,
        params.myShareAmount ?? 0,
        recurringId,
      ]
    );
    await refreshAll();
  };

  const confirmRecurringItem = async (
    recurringId: string,
    customAmount?: number,
    customFee?: number
  ) => {
    const item = recurringItems.find((r) => r.id === recurringId);
    if (!item) return;

    const finalAmount = customAmount !== undefined ? customAmount : item.amount;
    const today = new Date().toISOString().split('T')[0];

    await addTransaction({
      accountId: item.accountId,
      categoryId: item.categoryId,
      type: item.type,
      amount: finalAmount,
      fee: customFee || 0,
      description: `${item.title} (Recurrente confirmado)`,
      date: today,
      recurringId: item.id,
    });

    const nextCycleDate = calculateNextCycleDate(item.nextDueDate, item.frequency);
    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items SET next_due_date = ?, postponed_until = NULL, reimbursed_this_cycle = 0 WHERE id = ?`,
      [nextCycleDate, recurringId]
    );
    await refreshAll();
  };

  const postponeRecurringItem = async (recurringId: string, daysToPostpone: number) => {
    const item = recurringItems.find((r) => r.id === recurringId);
    if (!item) return;

    const baseDate = item.postponedUntil || item.nextDueDate;
    const newDate = addDaysToDate(baseDate, daysToPostpone);

    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items SET next_due_date = ?, postponed_until = ? WHERE id = ?`,
      [newDate, newDate, recurringId]
    );
    await refreshAll();
  };

  const skipRecurringCycle = async (recurringId: string) => {
    const item = recurringItems.find((r) => r.id === recurringId);
    if (!item) return;

    const nextCycleDate = calculateNextCycleDate(item.nextDueDate, item.frequency);
    const db = await getDb();
    await db.runAsync(
      `UPDATE recurring_items SET next_due_date = ?, postponed_until = NULL WHERE id = ?`,
      [nextCycleDate, recurringId]
    );
    await refreshAll();
  };

  const deleteRecurringItem = async (recurringId: string) => {
    const db = await getDb();
    await db.runAsync('DELETE FROM recurring_items WHERE id = ?', [recurringId]);
    await refreshAll();
  };

  const resetToZero = async () => {
    const db = await getDb();
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM recurring_items;
      DELETE FROM accounts;
      DELETE FROM monthly_budgets;
      DELETE FROM savings_goals;
      DELETE FROM loans;
      DELETE FROM installment_debts;
    `);
    await seedDefaultCategoriesOnly(db);
    await refreshAll();
  };

  const exportBackupJson = (): string => {
    const payload: AppBackupPayload = {
      version: 3,
      exportedAt: new Date().toISOString(),
      accounts,
      categories,
      transactions,
      recurringItems,
      monthlyBudgets,
      savingsGoals,
      loans,
      installmentDebts,
    };
    return JSON.stringify(payload, null, 2);
  };

  const importBackupJson = async (rawJson: string) => {
    const parsed: AppBackupPayload = JSON.parse(rawJson);
    if (!parsed || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.categories)) {
      throw new Error('Formato de respaldo inválido');
    }

    const db = await getDb();
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM recurring_items;
      DELETE FROM accounts;
      DELETE FROM categories;
      DELETE FROM monthly_budgets;
      DELETE FROM savings_goals;
      DELETE FROM loans;
      DELETE FROM installment_debts;
    `);

    for (const c of parsed.categories) {
      await db.runAsync(
        `INSERT INTO categories (id, name, type, color, icon, is_custom) VALUES (?, ?, ?, ?, ?, ?)`,
        [c.id, c.name, c.type, c.color, c.icon, c.isCustom ? 1 : 0]
      );
    }

    for (const a of parsed.accounts) {
      await db.runAsync(
        `INSERT INTO accounts (
          id, name, institution, mask, type, balance, currency,
          include_in_total, is_plaid_connected, plaid_account_id, plaid_item_id, color, last_synced_at,
          owner_name, credit_limit, closing_day, due_day
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          a.id,
          a.name,
          a.institution,
          a.mask ?? null,
          a.type,
          a.balance,
          a.currency || 'USD',
          a.includeInTotal ? 1 : 0,
          a.isPlaidConnected ? 1 : 0,
          a.plaidAccountId ?? null,
          a.plaidItemId ?? null,
          a.color,
          a.lastSyncedAt ?? null,
          a.ownerName ?? null,
          a.creditLimit ?? 0,
          a.closingDay ?? 0,
          a.dueDay ?? 0,
        ]
      );
    }

    for (const t of parsed.transactions || []) {
      await db.runAsync(
        `INSERT INTO transactions (
          id, account_id, to_account_id, category_id, type, amount, fee, description, merchant_name, date, is_from_plaid, plaid_transaction_id, recurring_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.accountId,
          t.toAccountId ?? null,
          t.categoryId,
          t.type,
          t.amount,
          t.fee ?? 0,
          t.description,
          t.merchantName ?? null,
          t.date,
          t.isFromPlaid ? 1 : 0,
          t.plaidTransactionId ?? null,
          t.recurringId ?? null,
        ]
      );
    }

    for (const r of parsed.recurringItems || []) {
      await db.runAsync(
        `INSERT INTO recurring_items (
          id, title, amount, type, category_id, account_id, frequency, next_due_date, postponed_until, reminder_days, active, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          r.id,
          r.title,
          r.amount,
          r.type,
          r.categoryId,
          r.accountId,
          r.frequency,
          r.nextDueDate,
          r.postponedUntil ?? null,
          r.reminderDaysBefore !== undefined ? r.reminderDaysBefore : 1,
          r.active ? 1 : 0,
          r.notes ?? null,
        ]
      );
    }

    for (const b of parsed.monthlyBudgets || []) {
      await db.runAsync(
        `INSERT INTO monthly_budgets (id, title, limit_amount, category_id, manual_spent, color, icon)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [b.id, b.title, b.limitAmount, b.categoryId ?? null, b.manualSpent || 0, b.color, b.icon]
      );
    }

    for (const g of parsed.savingsGoals || []) {
      await db.runAsync(
        `INSERT INTO savings_goals (id, title, target_amount, saved_amount, color, icon, deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [g.id, g.title, g.targetAmount, g.savedAmount || 0, g.color, g.icon, g.deadline ?? null]
      );
    }

    for (const l of parsed.loans || []) {
      await db.runAsync(
        `INSERT INTO loans (id, person_name, direction, total_amount, paid_amount, notes, date, due_date, is_settled, account_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          l.id,
          l.personName,
          l.direction,
          l.totalAmount,
          l.paidAmount || 0,
          l.notes ?? null,
          l.date,
          l.dueDate ?? null,
          l.isSettled ? 1 : 0,
          l.accountId ?? null,
        ]
      );
    }

    for (const d of parsed.installmentDebts || []) {
      await db.runAsync(
        `INSERT INTO installment_debts (
          id, title, platform, total_amount, remaining_balance, minimum_payment,
          interest_rate, due_dates, installments_total, installments_paid, color, icon,
          frequency, first_due_date, reminder_days, account_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          d.id,
          d.title,
          d.platform || 'Affirm',
          d.totalAmount,
          d.remainingBalance,
          d.minimumPayment || 0,
          d.interestRate || 0,
          d.dueDates || 'Mensual',
          d.installmentsTotal || 4,
          d.installmentsPaid || 0,
          d.color || '#38BDF8',
          d.icon || 'card-outline',
          d.frequency || 'monthly',
          d.firstDueDate ?? null,
          d.reminderDaysBefore ?? 1,
          d.accountId ?? null,
        ]
      );
    }

    await refreshAll();
  };

  const connectGoogleDrive = useCallback(async (email?: string) => {
    const chosenEmail = email || userProfile.email || 'jeison@gmail.com';
    setIsDriveConnected(true);
    setDriveEmail(chosenEmail);
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('drive_connected', '1')");
    await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('drive_email', ?)", [chosenEmail]);
  }, [userProfile.email]);

  const disconnectGoogleDrive = useCallback(async () => {
    setIsDriveConnected(false);
    const db = await getDb();
    await db.runAsync("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('drive_connected', '0')");
  }, []);

  const toggleAutoDriveBackup = useCallback(async (enabled: boolean) => {
    setAutoDriveBackupEnabled(enabled);
    const db = await getDb();
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('auto_drive_backup_enabled', ?)",
      [enabled ? '1' : '0']
    );
  }, []);

  const performSilentBackup = useCallback(async () => {
    try {
      const json = exportBackupJson();
      const baseDir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
      if (baseDir) {
        const folderUri = `${baseDir}PerkWallet_Respaldos/`;
        const folderInfo = await FileSystem.getInfoAsync(folderUri);
        if (!folderInfo.exists) {
          await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
        }
        const fileUri = `${folderUri}PerkWallet_AutoBackup.json`;
        await FileSystem.writeAsStringAsync(fileUri, json, {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }
      await recordDriveBackupTimestamp();
    } catch (err) {
      console.log('Silent auto backup skipped:', err);
    }
  }, [exportBackupJson]);

  // Auto-backup al iniciar la app o al pasar a segundo plano / salir
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (autoDriveBackupEnabled && isDriveConnected) {
        if (nextAppState === 'active' || nextAppState === 'background') {
          performSilentBackup();
        }
      }
    });
    return () => {
      subscription.remove();
    };
  }, [autoDriveBackupEnabled, isDriveConnected, performSilentBackup]);

  const getCategoryBreakdown = useCallback(
    (
      type: 'expense' | 'income',
      accountFilterId?: string,
      yearMonthFilter?: string
    ): CategoryBreakdown[] => {
      const relevantTx = transactions.filter(
        (t) =>
          (!accountFilterId || accountFilterId === 'all' || t.accountId === accountFilterId) &&
          (!yearMonthFilter || yearMonthFilter === 'all' || t.date.startsWith(yearMonthFilter))
      );

      const map = new Map<string, { total: number; count: number }>();
      let grandTotal = 0;

      for (const tx of relevantTx) {
        if (tx.type === type) {
          const prev = map.get(tx.categoryId) || { total: 0, count: 0 };
          map.set(tx.categoryId, {
            total: prev.total + tx.amount,
            count: prev.count + 1,
          });
          grandTotal += tx.amount;
        }

        if (type === 'expense' && tx.fee && tx.fee > 0) {
          const prevFee = map.get('cat-fees') || { total: 0, count: 0 };
          map.set('cat-fees', {
            total: prevFee.total + tx.fee,
            count: prevFee.count + 1,
          });
          grandTotal += tx.fee;
        }
      }

      if (grandTotal === 0) return [];

      const result: CategoryBreakdown[] = [];
      for (const [categoryId, stats] of map.entries()) {
        const cat = categories.find((c) => c.id === categoryId);
        result.push({
          categoryId,
          categoryName: cat ? cat.name : 'Comisiones / Otros',
          color: cat ? cat.color : '#94A3B8',
          icon: cat ? cat.icon : 'card-outline',
          total: stats.total,
          percentage: (stats.total / grandTotal) * 100,
          count: stats.count,
        });
      }

      return result.sort((a, b) => b.total - a.total);
    },
    [transactions, categories]
  );

  return (
    <FinanceContext.Provider
      value={{
        loading,
        accounts,
        categories,
        transactions,
        recurringItems,
        monthlyBudgets,
        savingsGoals,
        loans,
        installmentDebts,
        lastDriveBackupAt,
        recordDriveBackupTimestamp,
        includedTotalBalance,
        ownSavingsBalance,
        excludedTotalBalance,
        otherPeopleTotalBalance,
        netWorthBalance,
        hideOtherMoney,
        toggleHideOtherMoney,
        isOtherPersonAccount,
        isOwnSavingsAccount,
        toggleAccountIncludeInTotal,
        addManualAccount,
        connectCustomUSBank,
        updateAccountBalanceAndMask,
        updateCreditCardDetails,
        deleteAccount,
        reorderAccounts,
        moveAccount,
        addCategory,
        updateCategory,
        deleteCategory,
        addMonthlyBudget,
        updateMonthlyBudget,
        addManualSpendToBudget,
        deleteMonthlyBudget,
        getBudgetSpentAmount,
        addSavingsGoal,
        updateSavingsGoalAmount,
        deleteSavingsGoal,
        addLoanRecord,
        updateLoanRecord,
        registerLoanPayment,
        deleteLoanRecord,
        addInstallmentDebt,
        updateInstallmentDebt,
        registerInstallmentPayment,
        deleteInstallmentDebt,
        addTransaction,
        updateTransaction,
        importBankMovementsText,
        transferBetweenAccounts,
        deleteTransaction,
        addRecurringItem,
        updateRecurringItem,
        updateRecurringReminderDays,
        toggleRecurringReimbursed,
        updateRecurringSharing,
        confirmRecurringItem,
        postponeRecurringItem,
        skipRecurringCycle,
        deleteRecurringItem,
        getCategoryBreakdown,
        userProfile,
        securitySettings,
        hasCompletedOnboarding,
        updateUserProfile,
        updateSecuritySettings,
        setHasCompletedOnboarding,
        loginUser,
        logoutUser,
        isDriveConnected,
        driveEmail,
        connectGoogleDrive,
        disconnectGoogleDrive,
        autoDriveBackupEnabled,
        toggleAutoDriveBackup,
        performSilentBackup,
        resetToZero,
        exportBackupJson,
        importBackupJson,
        refreshAll,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export function useFinance(): FinanceContextType {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error('useFinance debe usarse dentro de un FinanceProvider');
  }
  return ctx;
}
