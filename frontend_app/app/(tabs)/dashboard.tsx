import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useStatsStore } from '../../src/store/statsStore';
import { InspectionTrendChart } from '../../src/components/InspectionTrendChart';
import { InspectionActivityTimeline } from '../../src/components/InspectionActivityTimeline';

export default function DashboardScreen() {
  const router = useRouter();
  const stats = useStatsStore();

  const total = stats.checked + stats.inProgress;
  const compliantPercent = total > 0 ? Math.round((stats.compliant / total) * 100) : 0;
  const nonCompliantPercent = total > 0 ? Math.round((stats.issues / total) * 100) : 0;
  const reviewPercent = total > 0 ? Math.round((stats.inProgress / total) * 100) : 0;
  const notApplicablePercent = 0; // Not applicable is always 0 in this simplified app

  // Only show the colored donut if there's actual data
  const showColors = total > 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '600' }]}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.distributionCard}>
          <Text style={[Typography.titleSmall, { fontWeight: '600', marginBottom: 16 }]}>Compliance Distribution</Text>
          <View style={styles.distributionRow}>
            {/* Circular Chart */}
            <View style={styles.distributionChart}>
               {/* If total is 0, show an empty grey ring. Otherwise, show colored segments */}
               {!showColors && (
                 <View style={[styles.donutSegment, { borderColor: '#E0E0E0' }]} />
               )}
               
               {showColors && (
                 <>
                   <View style={[styles.donutSegment, { borderColor: Colors.primary, transform: [{ rotate: '-45deg' }] }]} />
                   <View style={[styles.donutSegment, { borderColor: '#E6771A', borderTopColor: 'transparent', borderRightColor: 'transparent', transform: [{ rotate: '45deg' }] }]} />
                   <View style={[styles.donutSegment, { borderColor: '#FDB617', borderTopColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: 'transparent', transform: [{ rotate: '135deg' }] }]} />
                 </>
               )}
               
               <View style={styles.donutInnerCenter}>
                 <Text style={[Typography.headlineMedium, { fontWeight: '700' }]}>{total}</Text>
                 <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Total</Text>
               </View>
            </View>
            
            {/* Legends */}
            <View style={styles.distributionLegends}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.legendText}>Compliant</Text>
                <Text style={styles.legendValue}>{stats.compliant} <Text style={styles.legendPercent}>({compliantPercent}%)</Text></Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#E65100' }]} />
                <Text style={styles.legendText}>Non-Compliant</Text>
                <Text style={styles.legendValue}>{stats.issues} <Text style={styles.legendPercent}>({nonCompliantPercent}%)</Text></Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#FDB617' }]} />
                <Text style={styles.legendText}>Needs Review</Text>
                <Text style={styles.legendValue}>{stats.inProgress} <Text style={styles.legendPercent}>({reviewPercent}%)</Text></Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
                <Text style={styles.legendText}>Not Applicable</Text>
                <Text style={styles.legendValue}>0 <Text style={styles.legendPercent}>(0%)</Text></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Real-time Inspection Trend Line Chart */}
        <InspectionTrendChart currentTotal={total} />
        
        {/* Horizontal Inspection Activity Timeline */}
        <InspectionActivityTimeline />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  iconButton: { padding: 8 },
  distributionCard: {
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
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  distributionChart: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: Spacing.md,
  },
  donutSegment: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 16,
  },
  donutInnerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    width: 88,
    height: 88,
    borderRadius: 44,
    zIndex: 10,
  },
  distributionLegends: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  legendPercent: {
    color: '#999',
    fontWeight: '400',
  }
});
