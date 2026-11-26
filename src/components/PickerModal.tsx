import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BankAccount, Category } from '../types/finance';
import { useTheme } from '../context/ThemeContext';
import { KeyboardSafeModal } from './KeyboardSafeModal';
import { SmartIcon } from './BrandIcon';
import { formatMoney } from '../constants/currencies';

interface AccountSelectorFieldProps {
  label: string;
  accounts: BankAccount[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  currency?: string;
  placeholder?: string;
  isOtherPersonAccount?: (acc: BankAccount) => boolean;
  isOwnSavingsAccount?: (acc: BankAccount) => boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export const AccountSelectorField: React.FC<AccountSelectorFieldProps> = ({
  label,
  accounts,
  selectedId,
  onSelect,
  currency = 'USD',
  placeholder = 'Selecciona una cuenta...',
  isOtherPersonAccount,
  isOwnSavingsAccount,
  allowEmpty = false,
  emptyLabel = 'Sin cuenta asignada',
}) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.institution.toLowerCase().includes(q) ||
        (a.ownerName && a.ownerName.toLowerCase().includes(q))
    );
  }, [accounts, search]);

  const includedList = useMemo(
    () =>
      filtered.filter(
        (a) =>
          a.includeInTotal &&
          (!isOtherPersonAccount || !isOtherPersonAccount(a)) &&
          (!isOwnSavingsAccount || !isOwnSavingsAccount(a))
      ),
    [filtered, isOtherPersonAccount, isOwnSavingsAccount]
  );

  const excludedOrSavingsList = useMemo(
    () =>
      filtered.filter(
        (a) =>
          (!a.includeInTotal || (isOwnSavingsAccount && isOwnSavingsAccount(a))) &&
          (!isOtherPersonAccount || !isOtherPersonAccount(a))
      ),
    [filtered, isOtherPersonAccount, isOwnSavingsAccount]
  );

  const otherPeopleList = useMemo(
    () => filtered.filter((a) => isOtherPersonAccount && isOtherPersonAccount(a)),
    [filtered, isOtherPersonAccount]
  );

  const renderRow = (acc: BankAccount) => {
    const isSel = acc.id === selectedId;
    return (
      <TouchableOpacity
        key={acc.id}
        style={[
          styles.rowItem,
          {
            backgroundColor: isSel
              ? isDark
                ? '#064E3B44'
                : '#ECFDF5'
              : isDark
              ? '#1E293B'
              : '#F8FAFC',
            borderColor: isSel ? '#10B981' : colors.cardBorder,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => {
          onSelect(acc.id);
          setVisible(false);
        }}
      >
        <View style={[styles.iconBadge, { backgroundColor: acc.color }]}>
          <Ionicons
            name={
              acc.type === 'credit'
                ? 'card-outline'
                : acc.institution.toLowerCase().includes('paypal')
                ? 'logo-paypal'
                : 'wallet-outline'
            }
            size={17}
            color="#FFF"
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, marginRight: 8 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {acc.name}
            {acc.ownerName ? ` (${acc.ownerName})` : ''}
          </Text>
          <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
            {formatMoney(acc.balance, currency, true)} • {acc.institution}
          </Text>
        </View>
        <Ionicons
          name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={isSel ? '#10B981' : colors.textMuted}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.triggerBox,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: colors.cardBorder,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => {
          setSearch('');
          setVisible(true);
        }}
      >
        {selectedAccount ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <View style={[styles.miniDot, { backgroundColor: selectedAccount.color }]} />
            <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
              {selectedAccount.name} • {formatMoney(selectedAccount.balance, currency, true)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.triggerText, { color: colors.textMuted }]} numberOfLines={1}>
            {allowEmpty ? emptyLabel : placeholder}
          </Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <KeyboardSafeModal visible={visible} animationType="slide" onClose={() => setVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Seleccionar Billetera / Cuenta</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
              borderColor: colors.cardBorder,
              color: colors.text,
            },
          ]}
          placeholder="Buscar cuenta o banco..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView style={{ maxHeight: 380 }}>
          {allowEmpty && (
            <TouchableOpacity
              style={[
                styles.rowItem,
                {
                  backgroundColor: !selectedId ? (isDark ? '#064E3B44' : '#ECFDF5') : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: !selectedId ? '#10B981' : colors.cardBorder,
                },
              ]}
              onPress={() => {
                onSelect('');
                setVisible(false);
              }}
            >
              <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{emptyLabel}</Text>
              <Ionicons
                name={!selectedId ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={!selectedId ? '#10B981' : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {includedList.length > 0 && (
            <>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Incluido en el total</Text>
              {includedList.map(renderRow)}
            </>
          )}

          {excludedOrSavingsList.length > 0 && (
            <>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Ahorros / Excluido del total</Text>
              {excludedOrSavingsList.map(renderRow)}
            </>
          )}

          {otherPeopleList.length > 0 && (
            <>
              <Text style={[styles.groupTitle, { color: colors.textMuted }]}>Dinero Ajeno / Terceros</Text>
              {otherPeopleList.map(renderRow)}
            </>
          )}

          {filtered.length === 0 && (
            <Text style={{ color: colors.textMuted, textAlign: 'center', paddingVertical: 20, fontSize: 13 }}>
              No se encontraron cuentas.
            </Text>
          )}
        </ScrollView>
      </KeyboardSafeModal>
    </View>
  );
};

interface CategorySelectorFieldProps {
  label: string;
  categories: Category[];
  selectedId: string;
  onSelect: (categoryId: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export const CategorySelectorField: React.FC<CategorySelectorFieldProps> = ({
  label,
  categories,
  selectedId,
  onSelect,
  placeholder = 'Selecciona categoría...',
  allowEmpty = false,
  emptyLabel = 'Sin categoría vinculada',
}) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const selectedCat = categories.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.triggerBox,
          {
            backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
            borderColor: colors.cardBorder,
          },
        ]}
        activeOpacity={0.75}
        onPress={() => {
          setSearch('');
          setVisible(true);
        }}
      >
        {selectedCat ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <SmartIcon iconName={selectedCat.icon} color={selectedCat.color} size={14} boxSize={26} />
            <Text style={[styles.triggerText, { color: colors.text }]} numberOfLines={1}>
              {selectedCat.name}
            </Text>
          </View>
        ) : (
          <Text style={[styles.triggerText, { color: colors.textMuted }]} numberOfLines={1}>
            {allowEmpty ? emptyLabel : placeholder}
          </Text>
        )}
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <KeyboardSafeModal visible={visible} animationType="slide" onClose={() => setVisible(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Selecciona Categoría</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.searchInput,
            {
              backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
              borderColor: colors.cardBorder,
              color: colors.text,
            },
          ]}
          placeholder="Buscar categoría..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView style={{ maxHeight: 380 }}>
          {allowEmpty && (
            <TouchableOpacity
              style={[
                styles.rowItem,
                {
                  backgroundColor: !selectedId ? (isDark ? '#064E3B44' : '#ECFDF5') : (isDark ? '#1E293B' : '#F8FAFC'),
                  borderColor: !selectedId ? '#10B981' : colors.cardBorder,
                },
              ]}
              onPress={() => {
                onSelect('');
                setVisible(false);
              }}
            >
              <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]}>{emptyLabel}</Text>
              <Ionicons
                name={!selectedId ? 'checkmark-circle' : 'ellipse-outline'}
                size={22}
                color={!selectedId ? '#10B981' : colors.textMuted}
              />
            </TouchableOpacity>
          )}

          {filtered.map((cat) => {
            const isSel = cat.id === selectedId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.rowItem,
                  {
                    backgroundColor: isSel
                      ? isDark
                        ? '#064E3B44'
                        : '#ECFDF5'
                      : isDark
                      ? '#1E293B'
                      : '#F8FAFC',
                    borderColor: isSel ? '#10B981' : colors.cardBorder,
                  },
                ]}
                activeOpacity={0.75}
                onPress={() => {
                  onSelect(cat.id);
                  setVisible(false);
                }}
              >
                <View style={{ marginRight: 10 }}>
                  <SmartIcon iconName={cat.icon} color={cat.color} size={18} boxSize={36} />
                </View>
                <Text style={[styles.rowTitle, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {cat.name}
                </Text>
                <Ionicons
                  name={isSel ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSel ? '#10B981' : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </KeyboardSafeModal>
    </View>
  );
};

const styles = StyleSheet.create({
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  triggerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 46,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  miniDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 7,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    marginTop: 1,
  },
});

