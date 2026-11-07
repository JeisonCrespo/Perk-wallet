import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../../src/context/FinanceContext';
import { DonutChart } from '../../src/components/DonutChart';
import { GENERAL_ICONS, SmartIcon } from '../../src/components/BrandIcon';
import { KeyboardSafeModal } from '../../src/components/KeyboardSafeModal';
import { useTheme, ThemeColors } from '../../src/context/ThemeContext';

export default function AnalyticsAndBudgetsScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    accounts,
    categories,
    transactions,
    recurringItems,
    includedTotalBalance,
    monthlyBudgets,
    addMonthlyBudget,
    addManualSpendToBudget,
    deleteMonthlyBudget,
    getBudgetSpentAmount,
    getCategoryBreakdown,
  } = useFinance();

  const [viewMode, setViewMode] = useState<'budgets' | 'chart'>('chart');
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Simulación de días hasta el sueldo si el usuario desea ajustar
  const [customDaysToSalary, setCustomDaysToSalary] = useState<number | null>(null);

  const today = new Date().toISOString().split('T')[0];

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

  const filteredTx = useMemo(() => {
    return transactions.filter(
      (t) =>
        (selectedAccountId === 'all' || t.accountId === selectedAccountId) &&
        (selectedMonth === 'all' || t.date.startsWith(selectedMonth))
    );
  }, [transactions, selectedAccountId, selectedMonth]);

  const breakdown = useMemo(() => {
    return getCategoryBreakdown(selectedType, selectedAccountId, selectedMonth);
  }, [getCategoryBreakdown, selectedType, selectedAccountId, selectedMonth]);

  const totalIncome = useMemo(() => {
    return filteredTx
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTx]);

  const totalExpense = useMemo(() => {
    return filteredTx
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);
  }, [filteredTx]);

  // CÁLCULOS DE RUNWAY / SUPERVIVENCIA FINANCIERA CON TU SUELDO 🧭
  const nextPaycheckItem = useMemo(() => {
    return recurringItems
      .filter((r) => r.type === 'income' && r.active)
      .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))[0];
  }, [recurringItems]);

  const autoDaysToPaycheck = useMemo(() => {
    if (!nextPaycheckItem) return null;
    const nextDate = new Date(nextPaycheckItem.nextDueDate);
    const nowDate = new Date(today);
    const diffTime = nextDate.getTime() - nowDate.getTime();
    return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [nextPaycheckItem, today]);

  const daysToNextPaycheck = customDaysToSalary ?? autoDaysToPaycheck ?? 15;

  const currentDayOfMonth = parseInt(today.slice(8, 10), 10) || 1;
  const currentMonthExpenses = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'expense' && t.date.startsWith(today.slice(0, 7)))
      .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);
  }, [transactions, today]);

  const dailyBurnRate = useMemo(() => {
    if (currentMonthExpenses > 0 && currentDayOfMonth > 0) {
      return currentMonthExpenses / currentDayOfMonth;
    }
    if (totalExpense > 0) {
      return totalExpense / 30;
    }
    return 0;
  }, [currentMonthExpenses, currentDayOfMonth, totalExpense]);

  const availableFunds = Math.max(0, includedTotalBalance);

  const runwayDays = useMemo(() => {
    if (dailyBurnRate <= 0) return availableFunds > 0 ? 999 : 0;
    return Math.floor(availableFunds / dailyBurnRate);
  }, [availableFunds, dailyBurnRate]);

  const safeDailyBudget = useMemo(() => {
    if (daysToNextPaycheck <= 0) return availableFunds;
    return availableFunds / daysToNextPaycheck;
  }, [availableFunds, daysToNextPaycheck]);

  const canSurviveUntilPaycheck = runwayDays >= daysToNextPaycheck;
  const leftoverAtPaycheck = Math.max(0, availableFunds - dailyBurnRate * daysToNextPaycheck);
  const deficitAtPaycheck = Math.max(0, dailyBurnRate * daysToNextPaycheck - availableFunds);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (viewMode === 'chart') {
        setViewMode('budgets');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [viewMode]);

  // Modal para Crear un Presupuesto Mensual Independiente
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [budgetTitle, setBudgetTitle] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [linkedCategoryId, setLinkedCategoryId] = useState<string>('');
  const [budgetIcon, setBudgetIcon] = useState('cart-outline');
  const [budgetColor, setBudgetColor] = useState('#10B981');

  // Modal para sumar un gasto rápido directo a un presupuesto
  const [addingSpendBudgetId, setAddingSpendBudgetId] = useState<string | null>(null);
  const [manualSpendInput, setManualSpendInput] = useState('');

  // Radar de Gastos Hormiga del mes actual 🐜
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const antTransactionsThisMonth = transactions.filter(
    (t) =>
      t.type === 'expense' &&
      t.date.startsWith(currentMonthPrefix) &&
      (t.isAntExpense || t.categoryId === 'cat-ant')
  );
  const antTotalThisMonth = antTransactionsThisMonth.reduce(
    (sum, t) => sum + t.amount + (t.fee || 0),
    0
  );
  const monthTotalExpenses = transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(currentMonthPrefix))
    .reduce((sum, t) => sum + t.amount + (t.fee || 0), 0);
  const antPctOfMonth = monthTotalExpenses > 0 ? (antTotalThisMonth / monthTotalExpenses) * 100 : 0;

  const handleSaveNewBudget = async () => {
    const parsedLimit = parseFloat(budgetLimit);
    if (!budgetTitle.trim() || !parsedLimit || parsedLimit <= 0) return;

    await addMonthlyBudget({
      title: budgetTitle.trim(),
      limitAmount: parsedLimit,
      categoryId: linkedCategoryId || undefined,
      color: budgetColor,
      icon: budgetIcon,
    });
    setBudgetTitle('');
    setBudgetLimit('');
    setLinkedCategoryId('');
    setShowAddBudgetModal(false);
  };

  return (
    <View style={styles.container}>
      {/* Selector Superior: Presupuestos del Mes vs Gráfica Circular */}
      <View style={styles.topSwitchRow}>
        <TouchableOpacity
          style={[
            styles.topSwitchBtn,
            viewMode === 'budgets' && styles.topSwitchBtnActive,
          ]}
          onPress={() => setViewMode('budgets')}
        >
          <Ionicons
            name="speedometer-outline"
            size={16}
            color={viewMode === 'budgets' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[
              styles.topSwitchText,
              viewMode === 'budgets' && styles.topSwitchTextActive,
            ]}
            numberOfLines={1}
          >
            Presupuesto
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.topSwitchBtn,
            viewMode === 'chart' && styles.topSwitchBtnActive,
          ]}
          onPress={() => setViewMode('chart')}
        >
          <Ionicons
            name="pie-chart-outline"
            size={16}
            color={viewMode === 'chart' ? '#0F172A' : '#94A3B8'}
          />
          <Text
            style={[
              styles.topSwitchText,
              viewMode === 'chart' && styles.topSwitchTextActive,
            ]}
            numberOfLines={1}
          >
            Gráficas
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {viewMode === 'budgets' ? (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#38BDF8" />
              <Text style={styles.infoBannerText}>
                Aquí agregas todos los presupuestos mensuales que quieras (ej. Comida $200, Salidas $100) separados de tus categorías. Si te pasas del monto no pasa nada ni se bloquea nada, solo te avisa para tu control.
              </Text>
            </View>

            {/* Tarjeta Especial: Radar de Gastos Hormiga del Mes 🐜 */}
            <View
              style={{
                backgroundColor: isDark ? '#1C1917' : '#FEF3C7',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: isDark ? '#78350F' : '#FDE68A',
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 20 }}>🐜</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontSize: 14, fontWeight: '800' }} numberOfLines={1}>
                      Radar de Gastos Hormiga
                    </Text>
                    <Text style={{ color: isDark ? '#A8A29E' : '#B45309', fontSize: 11 }} numberOfLines={1}>
                      Cafés, snacks, bebidas y salidas
                    </Text>
                  </View>
                </View>
                <Text style={{ color: isDark ? '#F59E0B' : '#B45309', fontSize: 17, fontWeight: '800' }}>
                  ${antTotalThisMonth.toFixed(2)}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(antPctOfMonth, 100)}%`,
                      backgroundColor: antPctOfMonth > 20 ? '#EF4444' : '#F59E0B',
                    },
                  ]}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                <Text style={{ color: isDark ? '#D6D3D1' : '#78350F', fontSize: 11, fontWeight: '600' }}>
                  {antTransactionsThisMonth.length} gasto(s) hormiga este mes
                </Text>
                <Text style={{ color: isDark ? '#FDE68A' : '#92400E', fontSize: 11, fontWeight: '700' }}>
                  {antPctOfMonth.toFixed(1)}% del total gastado
                </Text>
              </View>
            </View>

            <View style={styles.headerSpread}>
              <Text style={styles.sectionTitle} numberOfLines={1}>
                Mis Presupuestos ({monthlyBudgets.length})
              </Text>
              <TouchableOpacity
                style={styles.newBudgetBtn}
                onPress={() => setShowAddBudgetModal(true)}
              >
                <Ionicons name="add" size={18} color="#0F172A" />
                <Text style={styles.newBudgetBtnText} numberOfLines={1}>Presupuesto</Text>
              </TouchableOpacity>
            </View>

            {monthlyBudgets.map((b) => {
              const spent = getBudgetSpentAmount(b);
              const limit = b.limitAmount;
              const pct = limit > 0 ? (spent / limit) * 100 : 0;
              const isOver = spent > limit;
              const linkedCat = categories.find((c) => c.id === b.categoryId);

              return (
                <View key={b.id} style={styles.budgetCard}>
                  <View style={styles.breakdownTop}>
                    <View style={styles.breakdownLeft}>
                      <SmartIcon iconName={b.icon} color={b.color} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.budgetTitleText}>{b.title}</Text>
                        <Text style={styles.catCount}>
                          {linkedCat
                            ? `Suma automático gastos de: ${linkedCat.name}`
                            : 'Presupuesto libre / manual'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity onPress={() => deleteMonthlyBudget(b.id)}>
                      <Ionicons name="trash-outline" size={18} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.budgetNumbersRow}>
                    <Text style={styles.budgetSpentBig}>
                      ${spent.toFixed(2)}{' '}
                      <Text style={styles.budgetLimitSmall}>
                        / ${limit.toFixed(2)} ({pct.toFixed(0)}%)
                      </Text>
                    </Text>

                    <Text
                      style={[
                        styles.budgetStatusBadge,
                        { color: isOver ? '#F87171' : '#4ADE80' },
                      ]}
                    >
                      {isOver
                        ? `Sobrepasado por $${(spent - limit).toFixed(2)}`
                        : `Disponibles: $${(limit - spent).toFixed(2)}`}
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: isOver
                            ? '#EF4444'
                            : pct > 80
                            ? '#F59E0B'
                            : '#22C55E',
                        },
                      ]}
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.addManualSpendBtn}
                    onPress={() => {
                      setAddingSpendBudgetId(b.id);
                      setManualSpendInput('');
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={15} color="#CBD5E1" />
                    <Text style={styles.addManualSpendText}>
                      Anote rápido al presupuesto
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        ) : (
          <>
            {/* Selector de Filtro por Mes */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedMonth === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setSelectedMonth('all')}
              >
                <Text style={styles.filterChipText}>Todo el Historial</Text>
              </TouchableOpacity>

              {availableMonths.map((ym) => (
                <TouchableOpacity
                  key={ym}
                  style={[
                    styles.filterChip,
                    selectedMonth === ym && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedMonth(ym)}
                >
                  <Text style={styles.filterChipText}>Mes: {ym}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Selector de Filtro por Cuenta */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.accountFilterScroll}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedAccountId === 'all' && styles.filterChipActive,
                ]}
                onPress={() => setSelectedAccountId('all')}
              >
                <Text style={styles.filterChipText}>Todas las Cuentas</Text>
              </TouchableOpacity>

              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.id}
                  style={[
                    styles.filterChip,
                    selectedAccountId === acc.id && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <Text style={styles.filterChipText}>{acc.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tarjeta Comparativa Ingresos vs Gastos */}
            <View style={styles.cashflowCard}>
              <View style={styles.cashflowCol}>
                <Text style={styles.cashflowLabel} numberOfLines={1}>INGRESOS</Text>
                <Text style={[styles.cashflowVal, { color: '#4ADE80' }]} numberOfLines={1} adjustsFontSizeToFit>
                  +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.cashflowDivider} />
              <View style={styles.cashflowCol}>
                <Text style={styles.cashflowLabel} numberOfLines={1}>GASTOS</Text>
                <Text style={[styles.cashflowVal, { color: '#F87171' }]} numberOfLines={1} adjustsFontSizeToFit>
                  -${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.cashflowDivider} />
              <View style={styles.cashflowCol}>
                <Text style={styles.cashflowLabel} numberOfLines={1}>FLUJO NETO</Text>
                <Text
                  style={[
                    styles.cashflowVal,
                    { color: totalIncome - totalExpense >= 0 ? '#38BDF8' : '#FB923C' },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  ${(totalIncome - totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Text>
              </View>
            </View>

            {/* Selector Gastos vs Ingresos para la Gráfica Circular */}
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  selectedType === 'expense' && styles.toggleExpenseActive,
                ]}
                onPress={() => setSelectedType('expense')}
              >
                <Text style={styles.toggleText} numberOfLines={1}>💸 Gastos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  selectedType === 'income' && styles.toggleIncomeActive,
                ]}
                onPress={() => setSelectedType('income')}
              >
                <Text style={styles.toggleText} numberOfLines={1}>💰 Ingresos</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.chartCard}>
              <DonutChart
                data={breakdown}
                centerLabel={selectedType === 'expense' ? 'Total Gastado' : 'Total Ingresado'}
              />

              {breakdown.length === 0 ? (
                <Text style={styles.emptyText}>
                  No hay movimientos registrados para este filtro.
                </Text>
              ) : (
                <View style={styles.legendList}>
                  {breakdown.map((item) => (
                    <View key={item.categoryId} style={styles.breakdownRow}>
                      <View style={styles.breakdownTop}>
                        <View style={[styles.breakdownLeft, { flex: 1, minWidth: 0, marginRight: 8 }]}>
                          <SmartIcon
                            iconName={item.icon}
                            color={item.color}
                            size={18}
                            boxSize={38}
                          />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.catName} numberOfLines={1} ellipsizeMode="tail">
                              {item.categoryName}
                            </Text>
                            <Text style={styles.catCount}>
                              {item.count} {item.count === 1 ? 'movimiento' : 'movimientos'}
                            </Text>
                          </View>
                        </View>

                        <View style={{ alignItems: 'flex-end', marginLeft: 6 }}>
                          <Text style={styles.catTotal} numberOfLines={1} adjustsFontSizeToFit>
                            ${item.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                          <Text style={[styles.catPercent, { color: item.color }]}>
                            {item.percentage.toFixed(1)}%
                          </Text>
                        </View>
                      </View>

                      <View style={styles.progressTrack}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(item.percentage, 100)}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Runway / Supervivencia Financiera con tu Sueldo 🧭 */}
            <View style={styles.runwayCard}>
              <View style={styles.runwayHeaderRow}>
                <View
                  style={[
                    styles.runwayBadgeIcon,
                    {
                      backgroundColor: canSurviveUntilPaycheck
                        ? (isDark ? '#052E16' : '#DCFCE7')
                        : (isDark ? '#450A0A' : '#FEE2E2'),
                    },
                  ]}
                >
                  <Ionicons
                    name={canSurviveUntilPaycheck ? 'shield-checkmark-outline' : 'warning-outline'}
                    size={20}
                    color={
                      canSurviveUntilPaycheck
                        ? (isDark ? '#4ADE80' : '#16A34A')
                        : (isDark ? '#F87171' : '#DC2626')
                    }
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
                  <Text style={styles.runwayCardTitle} numberOfLines={1}>
                    Runway y Supervivencia Financiera
                  </Text>
                  <Text style={styles.runwayCardSub} numberOfLines={1}>
                    {canSurviveUntilPaycheck
                      ? '🟢 Supervivencia asegurada hasta el próximo sueldo'
                      : '🔴 Cuidado: Tu saldo se agotará antes de cobrar'}
                  </Text>
                </View>
              </View>

              {/* 3 Métricas Principales */}
              <View style={styles.runwayStatsRow}>
                <View style={styles.runwayStatCol}>
                  <Text style={styles.runwayStatLabel} numberOfLines={1}>SALDO DISPONIBLE</Text>
                  <Text style={[styles.runwayStatVal, { color: isDark ? '#38BDF8' : '#0284C7' }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${availableFunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.runwayDivider} />
                <View style={styles.runwayStatCol}>
                  <Text style={styles.runwayStatLabel} numberOfLines={1}>GASTO DIARIO</Text>
                  <Text style={[styles.runwayStatVal, { color: isDark ? '#F87171' : '#DC2626' }]} numberOfLines={1} adjustsFontSizeToFit>
                    ${dailyBurnRate.toFixed(2)}/día
                  </Text>
                </View>
                <View style={styles.runwayDivider} />
                <View style={styles.runwayStatCol}>
                  <Text style={styles.runwayStatLabel} numberOfLines={1}>TIEMPO RUNWAY</Text>
                  <Text
                    style={[
                      styles.runwayStatVal,
                      { color: runwayDays > 15 ? (isDark ? '#4ADE80' : '#16A34A') : runwayDays >= 7 ? (isDark ? '#FBBF24' : '#D97706') : (isDark ? '#F87171' : '#DC2626') },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {runwayDays >= 999 ? '+90 días' : `${runwayDays} ${runwayDays === 1 ? 'día' : 'días'}`}
                  </Text>
                </View>
              </View>

              {/* Barra Visual de Runway */}
              <View style={styles.runwayProgressBox}>
                <View style={styles.runwayProgressBar}>
                  <View
                    style={[
                      styles.runwayProgressFill,
                      {
                        width: `${Math.min(100, Math.max(8, (runwayDays / 30) * 100))}%`,
                        backgroundColor:
                          runwayDays >= 20 ? '#22C55E' : runwayDays >= 10 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.runwayProgressSub}>
                  {runwayDays >= 30
                    ? 'Excelente: Tienes más de 1 mes de autonomía'
                    : runwayDays >= 15
                    ? 'Buen colchón: Tienes más de 2 semanas cubiertas'
                    : runwayDays >= 7
                    ? 'Atención: Te queda 1 semana de saldo a tu ritmo actual'
                    : 'Crítico: Menos de 7 días de saldo disponible'}
                </Text>
              </View>

              {/* Diagnóstico vs Sueldo */}
              <View
                style={[
                  styles.runwayVerdictBox,
                  {
                    backgroundColor: canSurviveUntilPaycheck
                      ? (isDark ? '#052E16' : '#F0FDF4')
                      : (isDark ? '#450A0A' : '#FEF2F2'),
                    borderColor: canSurviveUntilPaycheck
                      ? (isDark ? '#166534' : '#86EFAC')
                      : (isDark ? '#991B1B' : '#FECACA'),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.runwayVerdictTitle,
                    {
                      color: canSurviveUntilPaycheck
                        ? (isDark ? '#86EFAC' : '#15803D')
                        : (isDark ? '#FCA5A5' : '#B91C1C'),
                    },
                  ]}
                >
                  {canSurviveUntilPaycheck
                    ? `✓ Llegas a salvo al día de tu sueldo (en ${daysToNextPaycheck} días)`
                    : `⚠️ Alerta: Te faltarán $${deficitAtPaycheck.toFixed(2)} para llegar a tu sueldo`}
                </Text>

                <Text
                  style={[
                    styles.runwayVerdictDesc,
                    {
                      color: canSurviveUntilPaycheck
                        ? (isDark ? '#E2E8F0' : '#166534')
                        : (isDark ? '#E2E8F0' : '#991B1B'),
                    },
                  ]}
                >
                  {canSurviveUntilPaycheck
                    ? `A tu ritmo de gasto actual ($${dailyBurnRate.toFixed(2)}/día), tu saldo te durará ${runwayDays >= 999 ? '+90' : runwayDays} días. Al día del sueldo te quedarán aproximadamente $${leftoverAtPaycheck.toFixed(2)} de colchón.`
                    : `A tu ritmo de gasto actual ($${dailyBurnRate.toFixed(2)}/día), tu saldo se agotará en ${runwayDays} días, pero aún faltan ${daysToNextPaycheck} días para cobrar tu sueldo. Para sobrevivir hasta ese día, tu gasto diario máximo no debe superar $${safeDailyBudget.toFixed(2)}/día.`}
                </Text>

                <View style={styles.runwaySafeBudgetRow}>
                  <Ionicons name="calculator-outline" size={16} color={isDark ? '#FDE68A' : '#B45309'} />
                  <Text style={[styles.runwaySafeBudgetText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                    Gasto diario máximo recomendado:{' '}
                    <Text style={{ fontWeight: '800', color: isDark ? '#FBBF24' : '#B45309' }}>
                      ${safeDailyBudget.toFixed(2)} / día
                    </Text>
                  </Text>
                </View>
              </View>

              {/* Selector de Días hasta el próximo cobro */}
              <View style={{ marginTop: 12 }}>
                <Text style={styles.runwaySelectorLabel}>
                  {nextPaycheckItem
                    ? `Ingreso programado: ${nextPaycheckItem.title} (${nextPaycheckItem.nextDueDate}) • O simula cuándo cobras:`
                    : '¿En cuántos días cobras tu próximo sueldo / ingreso?'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  {[3, 5, 7, 10, 15, 30].map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.runwayDaysChip,
                        daysToNextPaycheck === d && styles.runwayDaysChipActive,
                      ]}
                      onPress={() => setCustomDaysToSalary(d)}
                    >
                      <Text
                        style={[
                          styles.runwayDaysChipText,
                          daysToNextPaycheck === d && styles.runwayDaysChipTextActive,
                        ]}
                      >
                        {d}d
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {customDaysToSalary !== null && autoDaysToPaycheck !== null && (
                    <TouchableOpacity
                      style={[styles.runwayDaysChip, { backgroundColor: '#334155' }]}
                      onPress={() => setCustomDaysToSalary(null)}
                    >
                      <Text style={[styles.runwayDaysChipText, { color: '#E2E8F0' }]}>
                        Auto ({autoDaysToPaycheck}d)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal para Agregar Presupuesto Mensual Independiente */}
      <KeyboardSafeModal
        visible={showAddBudgetModal}
        animationType="slide"
        onClose={() => setShowAddBudgetModal(false)}
      >
        <Text style={styles.modalTitle}>Nuevo Presupuesto para el Mes</Text>

        <Text style={styles.inputLabel}>
          Nombre del Presupuesto (Ej. Comida, Salidas, Juegos...)
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Comida del mes"
          placeholderTextColor="#64748B"
          value={budgetTitle}
          onChangeText={setBudgetTitle}
        />

        <Text style={styles.inputLabel}>Tope / Meta Mensual ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 200.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={budgetLimit}
          onChangeText={setBudgetLimit}
        />

        <Text style={styles.inputLabel}>
          Opcional: ¿Vincular automáticamente con una categoría de gastos?
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              linkedCategoryId === '' && styles.filterChipActive,
            ]}
            onPress={() => setLinkedCategoryId('')}
          >
            <Text style={styles.filterChipText}>No vincular (Solo manual)</Text>
          </TouchableOpacity>

          {categories
            .filter((c) => c.type === 'expense')
            .map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.filterChip,
                  linkedCategoryId === cat.id && styles.filterChipActive,
                ]}
                onPress={() => {
                  setLinkedCategoryId(cat.id);
                  setBudgetIcon(cat.icon);
                  setBudgetColor(cat.color);
                  if (!budgetTitle.trim()) setBudgetTitle(cat.name);
                }}
              >
                <Text style={styles.filterChipText}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>

        <Text style={styles.inputLabel}>Ícono</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
          {GENERAL_ICONS.slice(0, 24).map((item) => (
            <TouchableOpacity
              key={item.icon}
              style={[
                styles.filterChip,
                budgetIcon === item.icon && styles.filterChipActive,
              ]}
              onPress={() => setBudgetIcon(item.icon)}
            >
              <Text style={styles.filterChipText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setShowAddBudgetModal(false)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNewBudget}>
            <Text style={styles.saveBtnText}>Guardar Presupuesto</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>

      {/* Modal para Anotar Gasto Manual a un Presupuesto */}
      <KeyboardSafeModal
        visible={Boolean(addingSpendBudgetId)}
        animationType="fade"
        onClose={() => setAddingSpendBudgetId(null)}
      >
        <Text style={styles.modalTitle}>Sumar al Presupuesto</Text>
        <Text style={styles.inputLabel}>Monto a sumar a lo gastado este mes ($ USD)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 25.00"
          placeholderTextColor="#64748B"
          keyboardType="decimal-pad"
          value={manualSpendInput}
          onChangeText={setManualSpendInput}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setAddingSpendBudgetId(null)}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={async () => {
              if (addingSpendBudgetId) {
                const amt = parseFloat(manualSpendInput);
                if (!isNaN(amt) && amt !== 0) {
                  await addManualSpendToBudget(addingSpendBudgetId, amt);
                }
                setAddingSpendBudgetId(null);
              }
            }}
          >
            <Text style={styles.saveBtnText}>Sumar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardSafeModal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topSwitchRow: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      gap: 8,
    },
    topSwitchBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    topSwitchBtnActive: {
      backgroundColor: colors.accentLime || '#A7F3D0',
      borderColor: '#34D399',
    },
    topSwitchText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
    topSwitchTextActive: { color: colors.accentLimeText || '#064E3B', fontWeight: '800' },
    scrollContent: { padding: 16, paddingBottom: 40 },
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: isDark ? '#062B20' : '#E8F5E9',
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? '#064E3B' : '#A7F3D0',
      marginBottom: 16,
    },
    infoBannerText: { flex: 1, color: isDark ? '#A7F3D0' : '#065F46', fontSize: 12, lineHeight: 17 },
    headerSpread: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
    newBudgetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accentLime || '#A7F3D0',
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      gap: 4,
    },
    newBudgetBtnText: { color: colors.accentLimeText || '#064E3B', fontWeight: '800', fontSize: 12 },
    budgetCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    budgetTitleText: { color: colors.text, fontSize: 16, fontWeight: '800' },
    budgetNumbersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginTop: 10,
      marginBottom: 6,
    },
    budgetSpentBig: { color: colors.text, fontSize: 18, fontWeight: '800' },
    budgetLimitSmall: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
    budgetStatusBadge: { fontSize: 12, fontWeight: '700' },
    addManualSpendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 12,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
    },
    addManualSpendText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    accountFilterScroll: { marginBottom: 14 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginRight: 8,
    },
    filterChipActive: {
      backgroundColor: isDark ? '#064E3B' : '#A7F3D0',
      borderColor: '#34D399',
    },
    filterChipText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    cashflowCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 14,
    },
    cashflowCol: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
    cashflowDivider: { width: 1, backgroundColor: colors.cardBorder, marginHorizontal: 6 },
    cashflowLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
    cashflowVal: { fontSize: 15, fontWeight: '800', marginTop: 4 },
    toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    toggleBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: colors.card,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      minWidth: 0,
    },
    toggleExpenseActive: { backgroundColor: '#7F1D1D', borderColor: '#EF4444' },
    toggleIncomeActive: { backgroundColor: '#14532D', borderColor: '#22C55E' },
    toggleText: { color: '#F8FAFC', fontSize: 12, fontWeight: '700' },
    chartCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    runwayCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginTop: 16,
    },
    runwayHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    runwayBadgeIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    runwayCardTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    runwayCardSub: {
      color: colors.textMuted,
      fontSize: 11,
      marginTop: 2,
      fontWeight: '600',
    },
    runwayStatsRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1E293B44' : '#F1F5F9',
      borderRadius: 14,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      marginBottom: 12,
    },
    runwayStatCol: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    runwayDivider: {
      width: 1,
      backgroundColor: colors.cardBorder,
      marginHorizontal: 4,
    },
    runwayStatLabel: {
      color: colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    runwayStatVal: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 4,
    },
    runwayProgressBox: {
      marginBottom: 12,
    },
    runwayProgressBar: {
      height: 8,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      borderRadius: 999,
      overflow: 'hidden',
    },
    runwayProgressFill: {
      height: '100%',
      borderRadius: 999,
    },
    runwayProgressSub: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginTop: 5,
      textAlign: 'center',
    },
    runwayVerdictBox: {
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      marginBottom: 8,
    },
    runwayVerdictTitle: {
      fontSize: 13,
      fontWeight: '800',
      marginBottom: 4,
    },
    runwayVerdictDesc: {
      color: isDark ? '#E2E8F0' : '#334155',
      fontSize: 12,
      lineHeight: 18,
    },
    runwaySafeBudgetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    },
    runwaySafeBudgetText: {
      color: isDark ? '#FDE68A' : '#B45309',
      fontSize: 12,
      fontWeight: '600',
    },
    runwaySelectorLabel: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 4,
    },
    runwayDaysChip: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    runwayDaysChipActive: {
      backgroundColor: isDark ? '#064E3B' : '#A7F3D0',
      borderColor: '#34D399',
    },
    runwayDaysChipText: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
    },
    runwayDaysChipTextActive: {
      color: isDark ? '#A7F3D0' : '#064E3B',
      fontWeight: '800',
    },
    emptyText: {
      color: colors.textMuted,
      textAlign: 'center',
      marginVertical: 20,
    },
    legendList: { marginTop: 12 },
    breakdownRow: {
      marginBottom: 16,
    },
    breakdownTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    catName: { color: colors.text, fontSize: 14, fontWeight: '700' },
    catCount: { color: colors.textMuted, fontSize: 11, marginTop: 1, fontWeight: '600' },
    catTotal: { color: colors.text, fontSize: 15, fontWeight: '800' },
    catPercent: { fontSize: 12, fontWeight: '700', marginTop: 1 },
    progressTrack: {
      height: 7,
      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
      borderRadius: 999,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
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
