export type TransactionType = 'expense' | 'income' | 'transfer';

export type AccountType = 'checking' | 'savings' | 'credit' | 'investment' | 'cash';

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export type DebtPayoffStrategy = 'snowball' | 'avalanche';

export interface BankAccount {
  id: string;
  name: string;
  institution: string;
  mask?: string;
  type: AccountType;
  balance: number;
  currency: string;
  includeInTotal: boolean;
  isPlaidConnected: boolean;
  plaidAccountId?: string;
  plaidItemId?: string;
  color: string;
  lastSyncedAt?: string;
  // Nombre del dueño o etiqueta de quién es este dinero (especialmente útil en cuentas separadas)
  ownerName?: string;
  // Campos exclusivos para control de Tarjetas de Crédito en EE. UU.
  creditLimit?: number; // Límite total de la tarjeta ($ USD)
  closingDay?: number; // Día de corte (Statement Closing Date, 1-31)
  dueDay?: number; // Día límite de pago (Payment Due Date, 1-31)
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color: string;
  icon: string;
  isCustom: boolean;
}

export interface MonthlyBudgetItem {
  id: string;
  title: string; // Ej. "Comida del mes", "Salidas", "Juegos Steam"
  limitAmount: number; // Ej. 200.00
  categoryId?: string; // Opcional: si se vincula a una categoría suma automático, más manualSpent
  manualSpent: number; // Monto manual adicional o directo
  color: string;
  icon: string;
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  currency: string;
  accountType: string; // Ej. "Personal", "Premium", "Negocio"
  isLogged: boolean;
  avatarColor?: string;
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pinCode?: string;
  requirePinOnOpen: boolean;
  biometricEnabled: boolean;
}

export interface SavingsGoal {
  id: string;
  title: string; // Ej. "Fondo de Emergencia", "PC Gamer", "Viaje"
  targetAmount: number;
  savedAmount: number;
  color: string;
  icon: string;
  deadline?: string;
}

export type LoanDirection = 'lent' | 'borrowed'; // 'lent' = Presté (Me deben) | 'borrowed' = Pedí prestado (Yo debo)

export interface LoanRecord {
  id: string;
  personName: string;
  direction: LoanDirection;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  date: string;
  dueDate?: string;
  isSettled: boolean;
  accountId?: string; // Cuenta bancaria de donde se prestó o a donde entró
}

export interface InstallmentDebt {
  id: string;
  title: string; // Ej. "Affirm - Amazon", "Klarna - Ropa", "Afterpay", "Tarjeta Chase"
  platform: string; // Ej. "Affirm", "Klarna", "Afterpay", "PayPal Pay in 4", "Tarjeta / Otro"
  totalAmount: number; // Monto original total ($ USD)
  remainingBalance: number; // Saldo pendiente actual ($ USD)
  minimumPayment: number; // Pago mínimo o cuota ($ USD)
  interestRate: number; // APR % (0% si es sin intereses, o ej. 24% para método Avalancha)
  dueDates: string; // Fecha o fechas de pago (ej. "Días 15 y 30" o "Cada 2 semanas")
  installmentsTotal: number; // Total de cuotas (ej. 4, 6, 12)
  installmentsPaid: number; // Cuotas pagadas hasta ahora
  color: string;
  icon: string;
  frequency?: 'monthly' | 'biweekly' | 'weekly'; // Cada mes, cada 15 días, semanal
  firstDueDate?: string; // Primera fecha de pago (YYYY-MM-DD)
  reminderDaysBefore?: number; // Notificación: 1 o 2 días antes
  accountId?: string; // Cuenta bancaria vinculada para pagar
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  fee?: number;
  description: string;
  merchantName?: string;
  date: string; // YYYY-MM-DD
  isFromPlaid: boolean;
  plaidTransactionId?: string;
  recurringId?: string;
  isAntExpense?: boolean; // 🐜 Gasto Hormiga (café, snack, antojo, compra impulsiva)
}

export interface RecurringItem {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'income';
  categoryId: string;
  accountId: string;
  frequency: RecurrenceFrequency;
  nextDueDate: string;
  postponedUntil?: string;
  reminderDaysBefore?: number; // 1 o 2 días antes (o 0 = el mismo día)
  active: boolean;
  notes?: string;
  // 👥 Suscripciones Compartidas (Netflix, Spotify, etc.)
  isShared?: boolean;
  sharedWithNames?: string; // Ej. "Hermano, Novia"
  sharedPeopleCount?: number; // Total personas dividiendo (incluyéndote, ej. 2, 3, 4)
  myShareAmount?: number; // Lo que te toca a ti realmente ($ USD)
  reimbursedThisCycle?: boolean; // Si ya te pagaron su parte en este ciclo
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string;
  total: number;
  percentage: number;
  count: number;
}
