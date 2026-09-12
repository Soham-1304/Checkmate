import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, Modal, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useRouter } from 'expo-router';
import { AppDrawer } from '../../src/components/AppDrawer';
import { useInspectStore } from '../../src/store/inspectStore';
import { fetchOfficerDashboard, fetchCommodities, OfficerDashboard, Commodity } from '../../src/api/doca';

export default function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  const [isDrawerVisible, setDrawerVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [showDropdown, setShowDropdown] = useState(false);

  // ── Live dashboard data
  const [dashboard, setDashboard] = useState<OfficerDashboard | null>(null);
  const [commoditiesMap, setCommoditiesMap] = useState<Record<string, Commodity>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const periods = ['This Week', 'This Month', 'This Year'];

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [data, commodities] = await Promise.all([
        fetchOfficerDashboard(),
        fetchCommodities().catch(() => [] as Commodity[]),
      ]);
      setDashboard(data);
      const map = Object.fromEntries(commodities.map((c) => [c.id, c]));
      setCommoditiesMap(map);
    } catch {
      Alert.alert('Sync failed', 'Could not load dashboard. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handlePeriodSelect = (period: string) => {
    setSelectedPeriod(period);
    setShowDropdown(false);
  };

  const notificationCount = dashboard?.my_pending_assignments ?? 0;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        useInspectStore.getState().reset();
        useInspectStore.getState().addPhotos([result.assets[0].uri]);
        router.push('/scanner');
      }
    } catch {
      Alert.alert('Upload Error', 'Could not access the image library.');
    }
  };

  // ── Derived stats from live data
  const totalChecked = dashboard?.my_total_inspections ?? 0;
  const pendingAssignments = dashboard?.my_pending_assignments ?? 0;
  const todayCount = dashboard?.today_count ?? 0;
  const completionPct = dashboard
    ? Math.round((dashboard.my_completion_rate ?? 0) * 100)
    : 0;

  const getStatusColor = (result: string | null) => {
    switch (result) {
      case 'PASS': return Colors.primary;
      case 'FAIL': return Colors.nonCompliant;
      case 'REVIEW': return '#E6771A';
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string, result: string | null) => {
    if (result === 'PASS') return 'Compliant';
    if (result === 'FAIL') return 'Non-Compliant';
    if (result === 'REVIEW') return 'AI Review';
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'UNDER_REVIEW') return 'Under Review';
    return 'Pending';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Modal visible={isDrawerVisible} animationType="fade" transparent={true}>
        <AppDrawer onClose={() => setDrawerVisible(false)} />
      </Modal>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadDashboard(true)} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.headerIcon} onPress={() => setDrawerVisible(true)}>
            <MaterialIcons name="menu" size={24} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.brandContainer}>
            <MaterialIcons name="verified" size={20} color={Colors.primary} />
            <Text style={[Typography.titleMedium, { color: Colors.primary, marginLeft: 6, fontWeight: '700' }]}>
              Checkmate
            </Text>
          </View>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/notifications')}>
            <View>
              <MaterialIcons name="notifications-none" size={24} color={Colors.textPrimary} />
              {notificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{notificationCount}</Text>
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginBottom: 4 }]}>
            {getGreeting()}, {user?.name?.split(' ')[0] || 'Officer'} 👋
          </Text>
          <Text style={[Typography.displaySmall, { color: Colors.primary, fontWeight: '800', width: '70%' }]}>
            Let's make compliance effortless.
          </Text>
          <View style={styles.decorativeDots}>
            {[...Array(9)].map((_, i) => (
              <View key={i} style={styles.dot} />
            ))}
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <Text style={[Typography.headlineSmall, { color: Colors.textInverse, fontWeight: '700' }]}>
            Start New{'\n'}Inspection
          </Text>
          <Text style={[Typography.bodySmall, { color: 'rgba(255,255,255,0.8)', marginTop: 8, marginBottom: 24 }]}>
            AI-powered label analysis{'\n'}in seconds
          </Text>
          <View style={styles.heroIconContainer}>
            <MaterialIcons name="document-scanner" size={40} color={Colors.textInverse} style={{ opacity: 0.8 }} />
          </View>
          <Pressable style={styles.scanButton} onPress={() => router.push('/scanner')}>
            <MaterialIcons name="center-focus-strong" size={20} color={Colors.primary} />
            <Text style={[Typography.button, { color: Colors.primary, marginLeft: 8 }]}>Scan Label</Text>
            <MaterialIcons name="camera-alt" size={20} color={Colors.primary} style={{ position: 'absolute', right: 16 }} />
          </Pressable>
          <View style={styles.orContainer}>
            <View style={styles.divider} />
            <Text style={[Typography.labelSmall, { color: 'rgba(255,255,255,0.6)', marginHorizontal: 8 }]}>or</Text>
            <View style={styles.divider} />
          </View>
          <Pressable style={styles.uploadButton} onPress={pickImage}>
            <Text style={[Typography.button, { color: Colors.textInverse }]}>Upload Image</Text>
            <MaterialIcons name="cloud-upload" size={20} color={Colors.textInverse} style={{ marginLeft: 8 }} />
          </Pressable>
        </View>

        {/* Overview Header */}
        <View style={[styles.overviewHeader, { zIndex: 10 }]}>
          <Text style={[Typography.titleLarge, { fontWeight: '700' }]}>Overview</Text>
          <View style={{ position: 'relative' }}>
            <Pressable style={styles.dropdown} onPress={() => setShowDropdown(!showDropdown)}>
              <Text style={[Typography.labelMedium, { color: Colors.textSecondary }]}>{selectedPeriod}</Text>
              <MaterialIcons name={showDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={16} color={Colors.textSecondary} />
            </Pressable>
            {showDropdown && (
              <View style={styles.dropdownMenu}>
                {periods.map((period) => (
                  <Pressable key={period} style={styles.dropdownItem} onPress={() => handlePeriodSelect(period)}>
                    <Text style={[Typography.labelMedium, { color: period === selectedPeriod ? Colors.primary : Colors.textPrimary, fontWeight: period === selectedPeriod ? '600' : '400' }]}>
                      {period}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: Colors.primary }]}>
              <MaterialIcons name="check-circle-outline" size={20} color={Colors.textInverse} />
              <Text style={[Typography.headlineMedium, { color: Colors.textInverse, marginTop: 8, marginBottom: 2 }]}>{totalChecked}</Text>
              <Text style={[Typography.labelSmall, { color: 'rgba(255,255,255,0.8)' }]}>Total</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: Colors.inProgress }]}>
              <MaterialIcons name="today" size={20} color={Colors.textPrimary} />
              <Text style={[Typography.headlineMedium, { color: Colors.textPrimary, marginTop: 8, marginBottom: 2 }]}>{todayCount}</Text>
              <Text style={[Typography.labelSmall, { color: 'rgba(0,0,0,0.6)' }]}>Today</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: Colors.nonCompliant }]}>
              <MaterialIcons name="assignment-late" size={20} color={Colors.textInverse} />
              <Text style={[Typography.headlineMedium, { color: Colors.textInverse, marginTop: 8, marginBottom: 2 }]}>{pendingAssignments}</Text>
              <Text style={[Typography.labelSmall, { color: 'rgba(255,255,255,0.8)' }]}>Pending</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: Colors.successLight }]}>
              <MaterialIcons name="verified-user" size={20} color={Colors.primary} />
              <Text style={[Typography.headlineMedium, { color: Colors.primary, marginTop: 8, marginBottom: 2 }]}>{completionPct}%</Text>
              <Text style={[Typography.labelSmall, { color: Colors.primary }]}>Done</Text>
            </View>
          </View>
        )}

        {/* Recent Activity Log */}
        <View style={styles.recentActivityHeader}>
          <Text style={[Typography.labelSmall, { color: Colors.primary, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '700' }]}>RECENT ACTIVITY</Text>
          <Pressable onPress={() => router.push('/(tabs)/inspections' as any)}>
            <Text style={[Typography.labelMedium, { color: Colors.primary, fontWeight: '600' }]}>View all →</Text>
          </Pressable>
        </View>
        <Text style={[Typography.titleMedium, { paddingHorizontal: Spacing.screenHorizontal, marginBottom: Spacing.md, fontWeight: '700' }]}>Latest inspection log</Text>

        <View style={styles.timelineContainer}>
          {loading ? (
            <View style={styles.emptyStateContainer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : !dashboard?.recent_activity?.length ? (
            <View style={styles.emptyStateContainer}>
              <MaterialIcons name="history" size={48} color={Colors.borderLight} />
              <Text style={[Typography.bodyMedium, { color: Colors.textTertiary, marginTop: 12, textAlign: 'center', paddingHorizontal: 32 }]}>
                No recent activity yet. Start a new inspection to see logs here.
              </Text>
            </View>
          ) : (
            dashboard.recent_activity.map((item, index) => {
              const brand = item.brand_name || (item.commodity_id && commoditiesMap[item.commodity_id]?.brand_name) || '';
              const commodity = item.commodity_name || (item.commodity_id && commoditiesMap[item.commodity_id]?.generic_name) || '';

              return (
                <Pressable key={item.id} onPress={() => router.push(`/analysis/${item.id}` as any)}>
                  <View style={styles.timelineItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.timelineLine, index === (dashboard.recent_activity.length - 1) && { backgroundColor: 'transparent' }]} />
                      <View style={[styles.timelineDot, { borderColor: getStatusColor(item.compliance_result) }]}>
                        {!item.compliance_result && <View style={[styles.timelineDotInner, { backgroundColor: Colors.textSecondary }]} />}
                      </View>
                    </View>

                    <View style={styles.timelineCard}>
                      <View style={styles.timelineRow}>
                        <View style={{ width: 85 }}>
                          <Text style={[Typography.labelSmall, { color: Colors.textSecondary, fontSize: 10 }]}>
                            {new Date(item.created_at).toLocaleDateString()}
                          </Text>
                          <Text style={[Typography.labelSmall, { color: Colors.textTertiary, marginTop: 2, fontSize: 10, fontWeight: '600' }]} numberOfLines={1}>
                            {item.status.replace('_', ' ')}
                          </Text>
                        </View>
                        <View style={{ flex: 1, paddingHorizontal: 6 }}>
                          <Text style={[Typography.labelMedium, { fontWeight: '700', color: Colors.primary }]} numberOfLines={1}>
                            {brand ? String(brand) : (commodity ? String(commodity) : 'Inspection Log')}
                          </Text>
                          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 1, fontSize: 11 }]} numberOfLines={1}>
                            {commodity && brand ? String(commodity) : 'Tap to view details'}
                          </Text>
                        </View>
                        <View style={{ width: 88, alignItems: 'flex-end', justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getStatusColor(item.compliance_result), marginRight: 4 }} />
                            <Text style={[Typography.labelSmall, { color: getStatusColor(item.compliance_result), fontWeight: '600', fontSize: 11 }]}>
                              {getStatusLabel(item.status, item.compliance_result)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  contentContainer: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    paddingVertical: Spacing.md,
  },
  headerIcon: {
    padding: 8,
    position: 'relative',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    backgroundColor: '#E65100',
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.textInverse,
    fontSize: 8,
    fontWeight: 'bold',
  },
  greetingSection: {
    paddingHorizontal: Spacing.screenHorizontal,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    position: 'relative',
  },
  decorativeDots: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.screenHorizontal,
    width: 40,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    opacity: 0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  heroCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: Spacing.screenHorizontal,
    borderRadius: 24,
    padding: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  heroIconContainer: {
    position: 'absolute',
    top: '30%',
    right: '15%',
  },
  scanButton: {
    backgroundColor: Colors.textInverse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.button,
    position: 'relative',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.button,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.button,
    paddingVertical: 4,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    zIndex: 20,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenHorizontal,
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
    alignItems: 'center',
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: Spacing.xl + 16,
    marginBottom: 8,
  },
  timelineContainer: {
    paddingHorizontal: Spacing.screenHorizontal,
    marginTop: 8,
    marginBottom: 40,
  },
  emptyStateContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    bottom: -16,
    width: 1,
    backgroundColor: Colors.borderLight,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    backgroundColor: Colors.surface,
    marginTop: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginLeft: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
