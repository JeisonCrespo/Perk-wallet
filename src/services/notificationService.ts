import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { RecurringItem, InstallmentDebt, LoanRecord } from '../types/finance';

export const ANDROID_CHANNEL_ID = 'recordatorios-recurrentes';

// Configuración para que las notificaciones aparezcan con banner y sonido incluso con la app abierta
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // En entornos donde no esté disponible el módulo nativo aún
}

export async function requestAndroidNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Recordatorios de Pagos e Ingresos Recurrentes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#38BDF8',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch {
    return false;
  }
}

/**
 * Envía una notificación local en Android en 2 segundos para probar que las alertas funcionan
 */
export async function sendTestNotificationNow(): Promise<boolean> {
  const granted = await requestAndroidNotificationPermissions();
  if (!granted) return false;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 FinFlow • Recordatorios Activos',
        body: '¡Tus notificaciones en Android funcionan! Te avisaremos 1 o 2 días antes de cada pago recurrente.',
        sound: 'default',
        color: '#38BDF8',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Sincroniza todos los recordatorios en Android para los gastos e ingresos recurrentes activos
 * Programa aviso 1 o 2 días antes (según reminderDaysBefore) + aviso el mismo día de vencimiento a las 9:00 AM.
 */
export async function syncRecurringNotifications(items: RecurringItem[]): Promise<number> {
  try {
    const granted = await requestAndroidNotificationPermissions();
    if (!granted) return 0;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();
    let scheduledCount = 0;

    for (const item of items) {
      if (!item.active) continue;

      const effectiveDateStr = item.postponedUntil || item.nextDueDate;
      const parts = effectiveDateStr.split('-').map(Number);
      if (parts.length !== 3) continue;

      const [year, month, day] = parts;
      const daysBefore = item.reminderDaysBefore ?? 1;

      // 1. Notificación N días antes (1 o 2 días antes a las 09:00 AM)
      if (daysBefore > 0) {
        const advanceDate = new Date(year, month - 1, day - daysBefore, 9, 0, 0);
        if (advanceDate.getTime() > now.getTime()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Recordatorio (${daysBefore} ${daysBefore === 1 ? 'día' : 'días'} antes): ${item.title}`,
              body: `${
                item.type === 'expense' ? 'Pago programado' : 'Ingreso esperado'
              } de $${item.amount.toFixed(2)} para el ${effectiveDateStr}. Recuerda confirmarlo o posponerlo.`,
              sound: 'default',
              color: '#38BDF8',
              data: { recurringId: item.id, type: 'advance_reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: advanceDate,
              channelId: ANDROID_CHANNEL_ID,
            },
          });
          scheduledCount++;
        }
      }

      // 2. Notificación el mismo día del vencimiento a las 09:00 AM
      const dueDateMorning = new Date(year, month - 1, day, 9, 0, 0);
      if (dueDateMorning.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📅 Hoy vence: ${item.title} ($${item.amount.toFixed(2)})`,
            body: `No se descontará solo. Entra a FinFlow para confirmar o posponer este movimiento.`,
            sound: 'default',
            color: '#F59E0B',
            data: { recurringId: item.id, type: 'due_day' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDateMorning,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch {
    return 0;
  }
}

/**
 * Sincroniza notificaciones completas en Android para Recurrentes, Cuotas (BNPL/Affirm) y Préstamos
 */
export async function syncAllNotifications(
  recurringItems: RecurringItem[],
  installmentDebts: InstallmentDebt[] = [],
  loans: LoanRecord[] = []
): Promise<number> {
  try {
    const granted = await requestAndroidNotificationPermissions();
    if (!granted) return 0;

    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = new Date();
    let scheduledCount = 0;

    // 1. Recurrentes
    for (const item of recurringItems) {
      if (!item.active) continue;
      const effectiveDateStr = item.postponedUntil || item.nextDueDate;
      const parts = effectiveDateStr.split('-').map(Number);
      if (parts.length !== 3) continue;

      const [year, month, day] = parts;
      const daysBefore = item.reminderDaysBefore ?? 1;

      if (daysBefore > 0) {
        const advanceDate = new Date(year, month - 1, day - daysBefore, 9, 0, 0);
        if (advanceDate.getTime() > now.getTime()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `⏰ Recordatorio (${daysBefore}d antes): ${item.title}`,
              body: `${item.type === 'expense' ? 'Pago' : 'Ingreso'} de $${item.amount.toFixed(2)} para el ${effectiveDateStr}.`,
              sound: 'default',
              color: '#38BDF8',
              data: { id: item.id, type: 'recurring' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: advanceDate,
              channelId: ANDROID_CHANNEL_ID,
            },
          });
          scheduledCount++;
        }
      }

      const dueDateMorning = new Date(year, month - 1, day, 9, 0, 0);
      if (dueDateMorning.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📅 Hoy vence: ${item.title} ($${item.amount.toFixed(2)})`,
            body: `Entra a FinFlow para confirmar o posponer este movimiento.`,
            sound: 'default',
            color: '#F59E0B',
            data: { id: item.id, type: 'recurring_today' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDateMorning,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
        scheduledCount++;
      }
    }

    // 2. Cuotas / Affirm / Klarna
    for (const debt of installmentDebts) {
      if (debt.remainingBalance <= 0) continue;

      // Calcular la fecha de la próxima cuota
      let targetDateStr = debt.firstDueDate;
      if (!targetDateStr) {
        // Intento con fecha actual + 15 días o 30 días
        const d = new Date();
        d.setDate(d.getDate() + 15);
        targetDateStr = d.toISOString().split('T')[0];
      }

      const parts = targetDateStr.split('-').map(Number);
      if (parts.length !== 3) continue;
      const [year, month, day] = parts;
      const daysBefore = debt.reminderDaysBefore ?? 1;

      if (daysBefore > 0) {
        const advanceDate = new Date(year, month - 1, day - daysBefore, 9, 0, 0);
        if (advanceDate.getTime() > now.getTime()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `💳 Cuota por vencer: ${debt.platform} (${debt.title})`,
              body: `Vence el ${targetDateStr}. Cuota mínima: $${debt.minimumPayment.toFixed(2)} (Cuota ${debt.installmentsPaid + 1} de ${debt.installmentsTotal}).`,
              sound: 'default',
              color: '#38BDF8',
              data: { debtId: debt.id, type: 'installment_reminder' },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: advanceDate,
              channelId: ANDROID_CHANNEL_ID,
            },
          });
          scheduledCount++;
        }
      }
    }

    // 3. Préstamos con fecha límite
    for (const loan of loans) {
      if (loan.isSettled || !loan.dueDate) continue;
      const parts = loan.dueDate.split('-').map(Number);
      if (parts.length !== 3) continue;
      const [year, month, day] = parts;

      const advanceDate = new Date(year, month - 1, day - 1, 9, 0, 0);
      if (advanceDate.getTime() > now.getTime()) {
        const isLent = loan.direction === 'lent';
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🤝 Préstamo: ${loan.personName}`,
            body: isLent
              ? `Mañana vence el plazo para que ${loan.personName} te devuelva $${(loan.totalAmount - loan.paidAmount).toFixed(2)}.`
              : `Mañana vence tu fecha para pagarle $${(loan.totalAmount - loan.paidAmount).toFixed(2)} a ${loan.personName}.`,
            sound: 'default',
            color: '#A855F7',
            data: { loanId: loan.id, type: 'loan_reminder' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: advanceDate,
            channelId: ANDROID_CHANNEL_ID,
          },
        });
        scheduledCount++;
      }
    }

    return scheduledCount;
  } catch {
    return 0;
  }
}

/**
 * Programa un recordatorio diario recurrente para que el usuario registre sus gastos
 */
export async function scheduleDailyExpenseReminder(hour: number, minute: number): Promise<boolean> {
  const granted = await requestAndroidNotificationPermissions();
  if (!granted) return false;

  try {
    await Notifications.cancelScheduledNotificationAsync('daily-expense-reminder');
  } catch {}

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: 'daily-expense-reminder',
      content: {
        title: '✍️ ¿Registraste tus gastos de hoy?',
        body: 'Mantén tus finanzas al día. Tómate 10 segundos para registrar compras, salidas o transferencias.',
        sound: 'default',
        color: '#10B981',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyExpenseReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync('daily-expense-reminder');
  } catch {}
}
