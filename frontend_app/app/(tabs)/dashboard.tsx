import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../../src/theme';
import { fetchOfficerDashboard, OfficerDashboard } from '../../src/api/doca';
import { InspectionTrendChart } from '../../src/components/InspectionTrendChart';
import { InspectionActivityTimeline } from '../../src/components/InspectionActivityTimeline';

export default function DashboardScreen() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<OfficerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await fetchOfficerDashboard();
      setDashboard(data);
    } catch (err: any) {
      setError(err?.message || 'Could not refresh dashboard data. Please check network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activity = dashboard?.recent_activity ?? [];
  const pass = activity.filter(a => a.compliance_result === 'PASS').length;
  const fail = activity.filter(a => a.compliance_result === 'FAIL').length;
  const review = activity.filter(a => a.compliance_result === 'REVIEW').length;
  const total = dashboard?.my_total_inspections ?? 0;

  const judged = pass + fail + review || 1;
  const compliantPercent = Math.round((pass / judged) * 100);
  const nonCompliantPercent = Math.round((fail / judged) * 100);
  const reviewPercent = Math.round((review / judged) * 100);

  const showColors = total > 0;

  const trendPoints = dashboard?.trend_7d?.map(t => t.count);
  const trendDates = dashboard?.trend_7d?.map(t => {
    const d = new Date(t.date);
    return `${d.getDate().toString().padStart(2, '0')} ${d.toLocaleString('default', { month: 'short' })}`;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.push('/')}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '600' }]}>Dashboard</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
      >
        {error ? (
          <View style={{ marginHorizontal: Spacing.lg, marginTop: Spacing.md, padding: 12, backgroundColor: '#FFEBEE', borderRadius: 8, borderWidth: 1, borderColor: '#FFCDD2', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialIcons name="error-outline" size={18} color="#C62828" />
            <Text style={{ color: '#C62828', fontSize: 12, flex: 1 }}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 12 }]}>Loading your dashboard…</Text>
          </View>
        ) : (
          <>
            <View style={styles.distributionCard}>
              <Text style={[Typography.titleSmall, { fontWeight: '600', marginBottom: 4 }]}>Compliance Distribution</Text>
              <Text style={[Typography.labelSmall, { color: Colors.textTertiary, marginBottom: 16 }]}>
                Based on your {total} total inspection{total !== 1 ? 's' : ''}
              </Text>
              <View style={styles.distributionRow}>
                <View style={styles.distributionChart}>
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

                <View style={styles.distributionLegends}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
                    <Text style={styles.legendText}>Compliant</Text>
                    <Text style={styles.legendValue}>{pass} <Text style={styles.legendPercent}>({compliantPercent}%)</Text></Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#E65100' }]} />
                    <Text style={styles.legendText}>Non-Compliant</Text>
                    <Text style={styles.legendValue}>{fail} <Text style={styles.legendPercent}>({nonCompliantPercent}%)</Text></Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#FDB617' }]} />
                    <Text style={styles.legendText}>Needs Review</Text>
                    <Text style={styles.legendValue}>{review} <Text style={styles.legendPercent}>({reviewPercent}%)</Text></Text>
                  </View>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} />
                    <Text style={styles.legendText}>Not Applicable</Text>
                    <Text style={styles.legendValue}>0 <Text style={styles.legendPercent}>(0%)</Text></Text>
                  </View>
                </View>
              </View>

              {dashboard && (
                <View style={styles.completionRow}>
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary, flex: 1 }]}>
                    Completion rate
                  </Text>
                  <Text style={[Typography.labelSmall, { fontWeight: '700', color: Colors.primary }]}>
                    {Math.round(dashboard.my_completion_rate * 100)}%
                  </Text>
                  <View style={styles.completionBarBg}>
                    <View style={[styles.completionBarFill, { width: `${Math.round(dashboard.my_completion_rate * 100)}%` as any }]} />
                  </View>
                </View>
              )}
            </View>

            <InspectionTrendChart currentTotal={total} dataPoints={trendPoints} dates={trendDates} />
            <InspectionActivityTimeline activity={activity} />
          </>
        )}
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
  },
  completionRow: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  completionBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  completionBarFill: {
    height: 6,
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
});
