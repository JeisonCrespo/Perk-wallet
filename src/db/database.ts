import * as SQLite from 'expo-sqlite';
import {
  BankAccount,
  Category,
  RecurringItem,
  Transaction,
  RecurrenceFrequency,
} from '../types/finance';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('finanzas_usa.db');
    await initDatabase(dbInstance);
  }
  return dbInstance;
}

export const DEFAULT_CATEGORIES: Category[] = [
  // Categorías de Gastos
  { id: 'cat-housing', name: 'Vivienda / Renta', type: 'expense', color: '#6366F1', icon: 'home-outline', isCustom: false },
  { id: 'cat-groceries', name: 'Supermercado / Comida', type: 'expense', color: '#10B981', icon: 'cart-outline', isCustom: false },
  { id: 'cat-dining', name: 'Restaurantes', type: 'expense', color: '#F59E0B', icon: 'restaurant-outline', isCustom: false },
  { id: 'cat-transport', name: 'Transporte / Gasolina', type: 'expense', color: '#3B82F6', icon: 'car-outline', isCustom: false },
  { id: 'cat-utilities', name: 'Servicios (Luz, Internet)', type: 'expense', color: '#06B6D4', icon: 'flash-outline', isCustom: false },
  { id: 'cat-subscriptions', name: 'Streaming (Netflix, Spotify)', type: 'expense', color: '#E50914', icon: 'mci:netflix', isCustom: false },
  { id: 'cat-gaming', name: 'Gaming (Steam, PlayStation, Xbox)', type: 'expense', color: '#38BDF8', icon: 'mci:steam', isCustom: false },
  { id: 'cat-health', name: 'Salud y Farmacia', type: 'expense', color: '#EC4899', icon: 'medkit-outline', isCustom: false },
  { id: 'cat-shopping', name: 'Compras / Amazon', type: 'expense', color: '#FF9900', icon: 'logo-amazon', isCustom: false },
  { id: 'cat-ant', name: 'Gastos Hormiga (Café, Snacks)', type: 'expense', color: '#F97316', icon: 'cafe-outline', isCustom: false },
  { id: 'cat-fees', name: 'Comisiones Bancarias / ATM', type: 'expense', color: '#94A3B8', icon: 'card-outline', isCustom: false },
  // Categorías de Ingresos
  { id: 'cat-salary', name: 'Nómina / Paycheck', type: 'income', color: '#22C55E', icon: 'cash-outline', isCustom: false },
  { id: 'cat-freelance', name: 'Freelance / Negocio', type: 'income', color: '#14B8A6', icon: 'briefcase-outline', isCustom: false },
  { id: 'cat-investments', name: 'Dividendos / Intereses', type: 'income', color: '#EAB308', icon: 'trending-up-outline', isCustom: false },
];

async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      institution TEXT NOT NULL,
      mask TEXT,
      type TEXT NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      include_in_total INTEGER NOT NULL DEFAULT 1,
      is_plaid_connected INTEGER NOT NULL DEFAULT 0,
      plaid_account_id TEXT,
      plaid_item_id TEXT,
      color TEXT NOT NULL,
      last_synced_at TEXT,
      owner_name TEXT,
      credit_limit REAL DEFAULT 0,
      closing_day INTEGER DEFAULT 0,
      due_day INTEGER DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      category_id TEXT,
      manual_spent REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      icon TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      target_amount REAL NOT NULL,
      saved_amount REAL NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      deadline TEXT
    );

    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY NOT NULL,
      person_name TEXT NOT NULL,
      direction TEXT NOT NULL,
      total_amount REAL NOT NULL,
      paid_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      date TEXT NOT NULL,
      due_date TEXT,
      is_settled INTEGER NOT NULL DEFAULT 0,
      account_id TEXT
    );

    CREATE TABLE IF NOT EXISTS installment_debts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,
      total_amount REAL NOT NULL,
      remaining_balance REAL NOT NULL,
      minimum_payment REAL NOT NULL DEFAULT 0,
      interest_rate REAL NOT NULL DEFAULT 0,
      due_dates TEXT NOT NULL,
      installments_total INTEGER NOT NULL DEFAULT 4,
      installments_paid INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      frequency TEXT DEFAULT 'monthly',
      first_due_date TEXT,
      reminder_days INTEGER DEFAULT 1,
      account_id TEXT
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      account_id TEXT NOT NULL,
      to_account_id TEXT,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      fee REAL NOT NULL DEFAULT 0,
      description TEXT NOT NULL,
      merchant_name TEXT,
      date TEXT NOT NULL,
      is_from_plaid INTEGER NOT NULL DEFAULT 0,
      plaid_transaction_id TEXT UNIQUE,
      recurring_id TEXT,
      is_ant_expense INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts (id),
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );

    CREATE TABLE IF NOT EXISTS recurring_items (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      frequency TEXT NOT NULL,
      next_due_date TEXT NOT NULL,
      postponed_until TEXT,
      reminder_days INTEGER NOT NULL DEFAULT 1,
      active INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      is_shared INTEGER NOT NULL DEFAULT 0,
      shared_with_names TEXT,
      shared_people_count INTEGER NOT NULL DEFAULT 1,
      my_share_amount REAL DEFAULT 0,
      reimbursed_this_cycle INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (account_id) REFERENCES accounts (id),
      FOREIGN KEY (category_id) REFERENCES categories (id)
    );
  `);

  // Migraciones seguras para bases de datos ya creadas
  try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN fee REAL NOT NULL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN to_account_id TEXT;`); } catch {}
  try { await db.execAsync(`ALTER TABLE transactions ADD COLUMN is_ant_expense INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE accounts ADD COLUMN credit_limit REAL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE accounts ADD COLUMN closing_day INTEGER DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE accounts ADD COLUMN due_day INTEGER DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE accounts ADD COLUMN owner_name TEXT;`); } catch {}
  try { await db.execAsync(`ALTER TABLE accounts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN reminder_days INTEGER NOT NULL DEFAULT 1;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN is_shared INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN shared_with_names TEXT;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN shared_people_count INTEGER NOT NULL DEFAULT 1;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN my_share_amount REAL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE recurring_items ADD COLUMN reimbursed_this_cycle INTEGER NOT NULL DEFAULT 0;`); } catch {}
  try { await db.execAsync(`ALTER TABLE loans ADD COLUMN account_id TEXT;`); } catch {}
  try { await db.execAsync(`ALTER TABLE installment_debts ADD COLUMN frequency TEXT DEFAULT 'monthly';`); } catch {}
  try { await db.execAsync(`ALTER TABLE installment_debts ADD COLUMN first_due_date TEXT;`); } catch {}
  try { await db.execAsync(`ALTER TABLE installment_debts ADD COLUMN reminder_days INTEGER DEFAULT 1;`); } catch {}
  try { await db.execAsync(`ALTER TABLE installment_debts ADD COLUMN account_id TEXT;`); } catch {}

  const initializedFlag = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_settings WHERE key = 'db_seeded'"
  );

  if (!initializedFlag) {
    const countResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM categories'
    );
    if (!countResult || countResult.count === 0) {
      await seedInitialData(db);
    }
    await db.runAsync(
      "INSERT OR REPLACE INTO app_settings (key, value) VALUES ('db_seeded', '1')"
    );
  }
}

export async function seedDefaultCategoriesOnly(db: SQLite.SQLiteDatabase): Promise<void> {
  for (const cat of DEFAULT_CATEGORIES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO categories (id, name, type, color, icon, is_custom) VALUES (?, ?, ?, ?, ?, ?)`,
      [cat.id, cat.name, cat.type, cat.color, cat.icon, cat.isCustom ? 1 : 0]
    );
  }
}

async function seedInitialData(db: SQLite.SQLiteDatabase): Promise<void> {
  await seedDefaultCategoriesOnly(db);

  const initialAccounts: BankAccount[] = [
    {
      id: 'acc-chase-checking',
      name: 'Chase Total Checking',
      institution: 'JPMorgan Chase',
      mask: '4829',
      type: 'checking',
      balance: 3450.75,
      currency: 'USD',
      includeInTotal: true,
      isPlaidConnected: true,
      plaidAccountId: 'plaid_chase_01',
      color: '#1D4ED8',
      lastSyncedAt: new Date().toISOString(),
    },
    {
      id: 'acc-bofa-credit',
      name: 'Customized Cash Rewards (Tarjeta)',
      institution: 'Bank of America',
      mask: '9912',
      type: 'credit',
      balance: 420.00, // Deuda actual usada en la tarjeta
      currency: 'USD',
      includeInTotal: false,
      isPlaidConnected: true,
      plaidAccountId: 'plaid_bofa_01',
      color: '#DC2626',
      lastSyncedAt: new Date().toISOString(),
      creditLimit: 3000,
      closingDay: 18,
      dueDay: 15,
    },
    {
      id: 'acc-ally-savings',
      name: 'Fondo de Emergencia (Ahorros)',
      institution: 'Ally Bank / High Yield',
      mask: '7740',
      type: 'savings',
      balance: 10500.00,
      currency: 'USD',
      includeInTotal: false,
      isPlaidConnected: true,
      plaidAccountId: 'plaid_ally_01',
      color: '#7C3AED',
      lastSyncedAt: new Date().toISOString(),
    },
  ];

  for (const acc of initialAccounts) {
    await db.runAsync(
      `INSERT INTO accounts (
        id, name, institution, mask, type, balance, currency,
        include_in_total, is_plaid_connected, plaid_account_id, color, last_synced_at,
        credit_limit, closing_day, due_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        acc.id,
        acc.name,
        acc.institution,
        acc.mask ?? null,
        acc.type,
        acc.balance,
        acc.currency,
        acc.includeInTotal ? 1 : 0,
        acc.isPlaidConnected ? 1 : 0,
        acc.plaidAccountId ?? null,
        acc.color,
        acc.lastSyncedAt ?? null,
        acc.creditLimit ?? 0,
        acc.closingDay ?? 0,
        acc.dueDay ?? 0,
      ]
    );
  }

  // Presupuestos mensuales independientes de ejemplo
  await db.runAsync(
    `INSERT INTO monthly_budgets (id, title, limit_amount, category_id, manual_spent, color, icon)
     VALUES ('b-food', 'Comida y Supermercado', 200, 'cat-groceries', 0, '#10B981', 'cart-outline')`
  );
  await db.runAsync(
    `INSERT INTO monthly_budgets (id, title, limit_amount, category_id, manual_spent, color, icon)
     VALUES ('b-games', 'Juegos y Suscripciones', 80, 'cat-gaming', 0, '#38BDF8', 'mci:steam')`
  );

  // Meta de ahorro de ejemplo
  await db.runAsync(
    `INSERT INTO savings_goals (id, title, target_amount, saved_amount, color, icon, deadline)
     VALUES ('goal-1', 'Fondo de Emergencia US', 5000, 1250, '#10B981', 'mci:piggy-bank-outline', '2027-06-01')`
  );

  // Préstamo de ejemplo
  const today = new Date().toISOString().split('T')[0];
  await db.runAsync(
    `INSERT INTO loans (id, person_name, direction, total_amount, paid_amount, notes, date, is_settled)
     VALUES ('loan-1', 'Carlos (Zelle)', 'lent', 150, 50, 'Préstamo para arreglo del carro', ?, 0)`,
    [today]
  );

  const sampleTransactions: Transaction[] = [
    {
      id: 'tx-1',
      accountId: 'acc-chase-checking',
      categoryId: 'cat-salary',
      type: 'income',
      amount: 2850.0,
      fee: 0,
      description: 'Direct Deposit - Payroll',
      merchantName: 'ADP Payroll',
      date: today,
      isFromPlaid: true,
      plaidTransactionId: 'plaid_tx_1',
    },
    {
      id: 'tx-2',
      accountId: 'acc-chase-checking',
      categoryId: 'cat-groceries',
      type: 'expense',
      amount: 164.80,
      fee: 0,
      description: 'Whole Foods Market',
      merchantName: 'Whole Foods',
      date: today,
      isFromPlaid: true,
      plaidTransactionId: 'plaid_tx_2',
    },
    {
      id: 'tx-3',
      accountId: 'acc-bofa-credit',
      categoryId: 'cat-gaming',
      type: 'expense',
      amount: 59.99,
      fee: 0,
      description: 'Steam Store - Videojuego',
      merchantName: 'Steam',
      date: today,
      isFromPlaid: true,
      plaidTransactionId: 'plaid_tx_3',
    },
  ];

  for (const tx of sampleTransactions) {
    await db.runAsync(
      `INSERT INTO transactions (
        id, account_id, category_id, type, amount, fee, description, merchant_name, date, is_from_plaid, plaid_transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tx.id,
        tx.accountId,
        tx.categoryId,
        tx.type,
        tx.amount,
        tx.fee ?? 0,
        tx.description,
        tx.merchantName ?? null,
        tx.date,
        tx.isFromPlaid ? 1 : 0,
        tx.plaidTransactionId ?? null,
      ]
    );
  }

  const sampleRecurring: RecurringItem[] = [
    {
      id: 'rec-rent',
      title: 'Renta del Apartamento',
      amount: 1450.0,
      type: 'expense',
      categoryId: 'cat-housing',
      accountId: 'acc-chase-checking',
      frequency: 'monthly',
      nextDueDate: today,
      active: true,
      notes: 'No descontar hasta confirmar',
    },
    {
      id: 'rec-netflix',
      title: 'Netflix 4K',
      amount: 22.99,
      type: 'expense',
      categoryId: 'cat-subscriptions',
      accountId: 'acc-bofa-credit',
      frequency: 'monthly',
      nextDueDate: today,
      active: true,
      notes: 'Suscripción mensual Netflix',
    },
  ];

  for (const rec of sampleRecurring) {
    await db.runAsync(
      `INSERT INTO recurring_items (
        id, title, amount, type, category_id, account_id, frequency, next_due_date, postponed_until, active, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.id,
        rec.title,
        rec.amount,
        rec.type,
        rec.categoryId,
        rec.accountId,
        rec.frequency,
        rec.nextDueDate,
        rec.postponedUntil ?? null,
        rec.active ? 1 : 0,
        rec.notes ?? null,
      ]
    );
  }
}

export function calculateNextCycleDate(currentDateStr: string, frequency: RecurrenceFrequency): string {
  const [year, month, day] = currentDateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'biweekly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function addDaysToDate(dateStr: string, daysToAdd: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + daysToAdd);

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
