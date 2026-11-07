import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Animated,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BankAccount } from '../types/finance';
import { ThemeColors } from '../context/ThemeContext';

interface DraggableAccountListProps {
  accounts: BankAccount[];
  onCommit: (orderedIds: string[]) => Promise<void>;
  colors: ThemeColors;
  isDark: boolean;
  onClose?: () => void;
}

const ROW_HEIGHT = 70;

interface DraggableRowProps {
  account: BankAccount;
  index: number;
  total: number;
  isDark: boolean;
  colors: ThemeColors;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (index: number) => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
  isCurrentlyDragging: boolean;
}

const DraggableRow: React.FC<DraggableRowProps> = ({
  account,
  index,
  total,
  isDark,
  colors,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragMove,
  onDragEnd,
  isCurrentlyDragging,
}) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        onDragStart(index);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy);
        onDragMove(gesture.dy);
      },
      onPanResponderRelease: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => {
          onDragEnd();
        });
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start(() => {
          onDragEnd();
        });
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.rowCard,
        {
          backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
          borderColor: isCurrentlyDragging ? '#10B981' : isFirst ? '#10B981' : colors.cardBorder,
          transform: isCurrentlyDragging ? [{ translateY }] : [],
          zIndex: isCurrentlyDragging ? 999 : 1,
          elevation: isCurrentlyDragging ? 8 : 0,
          shadowOpacity: isCurrentlyDragging ? 0.25 : 0,
        },
        isFirst && (isDark ? styles.primaryRowDark : styles.primaryRowLight),
      ]}
    >
      {/* Indicador de Posición y Drag Handle */}
      <View
        {...panResponder.panHandlers}
        style={styles.dragHandleBox}
      >
        <Ionicons
          name="reorder-two-outline"
          size={24}
          color={isCurrentlyDragging ? '#10B981' : isDark ? '#94A3B8' : '#64748B'}
        />
        <View style={[styles.posBadge, isFirst && styles.posBadgeFirst]}>
          <Text style={[styles.posBadgeText, isFirst && styles.posBadgeTextFirst]}>
            #{index + 1}
          </Text>
        </View>
      </View>

      {/* Ícono de Institución */}
      <View style={[styles.badgeIcon, { backgroundColor: account.color }]}>
        <Ionicons
          name={
            account.type === 'credit'
              ? 'card-outline'
              : account.institution.toLowerCase().includes('paypal')
              ? 'logo-paypal'
              : account.institution.toLowerCase().includes('uber')
              ? 'car-sport-outline'
              : 'wallet-outline'
          }
          size={16}
          color="#FFF"
        />
      </View>

      {/* Datos de la Cuenta */}
      <View style={{ flex: 1, minWidth: 0, marginRight: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={[styles.accName, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {account.name}
          </Text>
          {isFirst && (
            <View style={styles.primaryPill}>
              <Ionicons name="star" size={9} color="#064E3B" />
              <Text style={styles.primaryPillText}>Principal</Text>
            </View>
          )}
        </View>
        <Text style={[styles.accSub, { color: colors.textMuted }]} numberOfLines={1}>
          ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} • {account.institution}
        </Text>
      </View>

      {/* Botones de Flecha para Toque Rápido */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <TouchableOpacity
          disabled={isFirst}
          onPress={onMoveUp}
          style={[styles.arrowBtn, isFirst && { opacity: 0.25 }]}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-up" size={18} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          disabled={isLast}
          onPress={onMoveDown}
          style={[styles.arrowBtn, isLast && { opacity: 0.25 }]}
          activeOpacity={0.6}
        >
          <Ionicons name="chevron-down" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

export const DraggableAccountList: React.FC<DraggableAccountListProps> = ({
  accounts,
  onCommit,
  colors,
  isDark,
  onClose,
}) => {
  const [items, setItems] = useState<BankAccount[]>(accounts);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const dragAccumulator = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    setItems(accounts);
  }, [accounts]);

  const handleDragStart = (idx: number) => {
    setActiveDragIndex(idx);
    dragAccumulator.current = 0;
  };

  const handleDragMove = (dy: number) => {
    if (activeDragIndex === null) return;
    const diff = dy - dragAccumulator.current;
    const threshold = ROW_HEIGHT * 0.6;

    if (diff > threshold && activeDragIndex < itemsRef.current.length - 1) {
      // Mover hacia abajo
      const nextIndex = activeDragIndex + 1;
      const nextItems = [...itemsRef.current];
      const [moved] = nextItems.splice(activeDragIndex, 1);
      nextItems.splice(nextIndex, 0, moved);
      dragAccumulator.current = dy;
      setActiveDragIndex(nextIndex);
      setItems(nextItems);
      onCommit(nextItems.map((a) => a.id));
    } else if (diff < -threshold && activeDragIndex > 0) {
      // Mover hacia arriba
      const nextIndex = activeDragIndex - 1;
      const nextItems = [...itemsRef.current];
      const [moved] = nextItems.splice(activeDragIndex, 1);
      nextItems.splice(nextIndex, 0, moved);
      dragAccumulator.current = dy;
      setActiveDragIndex(nextIndex);
      setItems(nextItems);
      onCommit(nextItems.map((a) => a.id));
    }
  };

  const handleDragEnd = () => {
    setActiveDragIndex(null);
    dragAccumulator.current = 0;
    onCommit(itemsRef.current.map((a) => a.id));
  };

  const swapItems = async (indexA: number, indexB: number) => {
    if (indexB < 0 || indexB >= items.length) return;
    const newItems = [...items];
    const temp = newItems[indexA];
    newItems[indexA] = newItems[indexB];
    newItems[indexB] = temp;
    setItems(newItems);
    await onCommit(newItems.map((a) => a.id));
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        scrollEnabled={activeDragIndex === null}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 420, marginVertical: 8 }}
      >
        {items.map((acc, index) => (
          <DraggableRow
            key={acc.id}
            account={acc}
            index={index}
            total={items.length}
            isDark={isDark}
            colors={colors}
            onMoveUp={() => swapItems(index, index - 1)}
            onMoveDown={() => swapItems(index, index + 1)}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            isCurrentlyDragging={activeDragIndex === index}
          />
        ))}
      </ScrollView>

      {onClose && (
        <TouchableOpacity
          style={styles.commitBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={18} color="#064E3B" />
          <Text style={styles.commitBtnText}>Listo, Guardar Orden</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
  },
  primaryRowLight: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  primaryRowDark: {
    backgroundColor: '#064E3B33',
    borderColor: '#059669',
  },
  dragHandleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
    paddingVertical: 4,
  },
  posBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#94A3B833',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posBadgeFirst: {
    backgroundColor: '#10B981',
  },
  posBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  posBadgeTextFirst: {
    color: '#064E3B',
    fontWeight: '900',
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  accName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accSub: {
    fontSize: 11,
    marginTop: 2,
  },
  primaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#A7F3D0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  primaryPillText: {
    color: '#064E3B',
    fontSize: 9,
    fontWeight: '800',
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#94A3B822',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#A7F3D0',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  commitBtnText: {
    color: '#064E3B',
    fontWeight: '800',
    fontSize: 14,
  },
});
