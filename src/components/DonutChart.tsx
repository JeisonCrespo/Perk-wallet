import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';
import { CategoryBreakdown } from '../types/finance';
import { useTheme } from '../context/ThemeContext';
import { formatMoney } from '../constants/currencies';

interface DonutChartProps {
  data: CategoryBreakdown[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  currency?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 210,
  strokeWidth = 26,
  centerLabel = 'Total Gastos',
  currency = 'USD',
}) => {
  const { colors, isDark } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const half = size / 2;

  const totalAmount = data.reduce((sum, item) => sum + item.total, 0);

  let cumulativePercent = 0;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${half}, ${half}`}>
            {data.length === 0 ? (
              <Circle
                cx={half}
                cy={half}
                r={radius}
                stroke={isDark ? '#1E293B' : '#E2E8F0'}
                strokeWidth={strokeWidth}
                fill="transparent"
              />
            ) : (
              data.map((slice) => {
                const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -(cumulativePercent / 100) * circumference;
                cumulativePercent += slice.percentage;

                return (
                  <Circle
                    key={slice.categoryId}
                    cx={half}
                    cy={half}
                    r={radius}
                    stroke={slice.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="butt"
                    fill="transparent"
                  />
                );
              })
            )}
          </G>
        </Svg>

        <View style={styles.centerTextContainer}>
          <Text style={[styles.centerSubtitle, { color: colors.textMuted }]}>{centerLabel}</Text>
          <Text style={[styles.centerAmount, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
            {formatMoney(totalAmount, currency, true)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  centerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  centerAmount: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
});
