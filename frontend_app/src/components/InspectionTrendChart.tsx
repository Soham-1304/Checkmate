import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, TouchableWithoutFeedback } from 'react-native';
import Svg, { Line, Path, Circle, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../theme';
import { MaterialIcons } from '@expo/vector-icons';

interface InspectionTrendChartProps {
  currentTotal: number;
}

export const InspectionTrendChart: React.FC<InspectionTrendChartProps> = ({ currentTotal }) => {
  const [timeframe, setTimeframe] = useState('This Month');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const chartHeight = 160;
  const chartWidth = 300; // Will be responsive with 100% width, but we use a viewBox
  
  // Create 7 data points leading up to currentTotal to simulate real-time historical data
  const dataPoints = [
    Math.floor(currentTotal * 0.1),
    Math.floor(currentTotal * 0.3),
    Math.floor(currentTotal * 0.2), // slight dip
    Math.floor(currentTotal * 0.5),
    Math.floor(currentTotal * 0.7),
    Math.floor(currentTotal * 0.8),
    currentTotal // Today's actual real-time value
  ];

  const maxVal = Math.max(...dataPoints, 600); // Scale to at least 600 like the image, or higher if total exceeds it
  const yAxisLabels = [maxVal, Math.floor(maxVal * 0.75), Math.floor(maxVal * 0.5), Math.floor(maxVal * 0.25), 0];

  // Map data to SVG coordinates
  const paddingX = 40;
  const paddingY = 20;
  const innerWidth = chartWidth - paddingX;
  const innerHeight = chartHeight - paddingY * 2;
  
  const points = dataPoints.map((val, i) => {
    const x = paddingX + (i / (dataPoints.length - 1)) * innerWidth;
    const y = paddingY + innerHeight - (val / maxVal) * innerHeight;
    return { x, y, val };
  });

  const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
  
  // Area under the line
  const areaD = `${pathD} L ${points[points.length-1].x},${paddingY + innerHeight} L ${points[0].x},${paddingY + innerHeight} Z`;

  // Generate X-axis dates based on timeframe
  const today = new Date();
  const dates = [];
  for(let i=6; i>=0; i--) {
    const d = new Date(today);
    if (timeframe === 'This Week') {
      d.setDate(today.getDate() - i);
      dates.push(d.toLocaleString('default', { weekday: 'short' }));
    } else if (timeframe === 'This Month') {
      d.setDate(today.getDate() - (i * 5));
      dates.push(`${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`);
    } else if (timeframe === 'This Year') {
      d.setMonth(today.getMonth() - (i * 2));
      dates.push(d.toLocaleString('default', { month: 'short' }));
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[Typography.titleSmall, { fontWeight: '600' }]}>Inspection Trend</Text>
        <View style={{ zIndex: 100 }}>
          <Pressable style={styles.dropdown} onPress={() => setDropdownOpen(!dropdownOpen)}>
            <Text style={styles.dropdownText}>{timeframe}</Text>
            <MaterialIcons name={dropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} size={16} color={Colors.textSecondary} />
          </Pressable>
          
          {dropdownOpen && (
            <View style={styles.dropdownMenu}>
              {['This Week', 'This Month', 'This Year'].map(option => (
                <Pressable 
                  key={option} 
                  style={[styles.dropdownItem, timeframe === option && styles.dropdownItemActive]}
                  onPress={() => {
                    setTimeframe(option);
                    setDropdownOpen(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, timeframe === option && styles.dropdownItemTextActive]}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.chartContainer}>
        <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth + 20} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.primary} stopOpacity="0.2" />
              <Stop offset="1" stopColor={Colors.primary} stopOpacity="0" />
            </LinearGradient>
          </Defs>

          {/* Grid lines & Y-axis labels */}
          {yAxisLabels.map((val, i) => {
            const y = paddingY + (i / (yAxisLabels.length - 1)) * innerHeight;
            return (
              <React.Fragment key={`grid-${i}`}>
                <Line x1={paddingX} y1={y} x2={chartWidth + 20} y2={y} stroke="#F0F0F0" strokeWidth="1" />
                <SvgText x={paddingX - 10} y={y + 4} fontSize="10" fill={Colors.textSecondary} textAnchor="end">
                  {val}
                </SvgText>
              </React.Fragment>
            );
          })}

          {/* Area */}
          <Path d={areaD} fill="url(#gradient)" />

          {/* Line */}
          <Path d={pathD} fill="none" stroke={Colors.primary} strokeWidth="2" />

          {/* Data points */}
          {points.map((p, i) => (
            <Circle 
              key={`point-${i}`} 
              cx={p.x} 
              cy={p.y} 
              r={i === points.length - 1 ? "4" : "3"} 
              fill={i === points.length - 1 ? "#E65100" : Colors.primary} 
              stroke="#FFF" 
              strokeWidth="2" 
            />
          ))}

          {/* X-axis labels */}
          {dates.map((dateStr, i) => {
            const x = paddingX + (i / (dates.length - 1)) * innerWidth;
            return (
              <SvgText key={`date-${i}`} x={x} y={chartHeight - 2} fontSize="9" fill={Colors.textSecondary} textAnchor="middle">
                {dateStr}
              </SvgText>
            );
          })}
        </Svg>
        
        {/* Tooltip for latest point (Today) */}
        {currentTotal > 0 && (
          <View style={[styles.tooltip, { right: 10, top: points[points.length - 1].y - 45 }]}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: Colors.textPrimary }}>Today</Text>
            <Text style={{ fontSize: 10, color: Colors.textSecondary }}>{currentTotal} Inspections</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dropdownText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 30,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 100,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: {
    backgroundColor: Colors.primary + '10',
  },
  dropdownItemText: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  dropdownItemTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFF',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  }
});
