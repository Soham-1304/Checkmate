import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useAuthStore } from '../../src/store/authStore';
import { useInspectStore } from '../../src/store/inspectStore';
import {
  fetchInspections,
  fetchCommodities,
  fetchMyChecklist,
  getReportPdfUrl,
  Inspection,
  Commodity,
  Assignment,
} from '../../src/api/doca';

export default function InspectionsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'assigned' | 'completed'>('assigned');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [commoditiesMap, setCommoditiesMap] = useState<Record<string, Commodity>>({});

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [checklists, inspList, commList] = await Promise.all([
        fetchMyChecklist().catch(() => [] as Assignment[]),
        fetchInspections().catch(() => [] as Inspection[]),
        fetchCommodities().catch(() => [] as Commodity[]),
      ]);

      setAssignments(checklists);
      setInspections(inspList);
      setCommoditiesMap(Object.fromEntries(commList.map((c) => [c.id, c])));
    } catch {
      Alert.alert('Sync Notice', 'Could not refresh live assignments from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartInspection = (assignment: Assignment) => {
    useInspectStore.getState().reset();
    useInspectStore.getState().setAssignment(assignment, assignment.brand_name);
    router.push('/scanner');
  };

  const handleOpenPdf = async (inspectionId: string) => {
    try {
      const url = getReportPdfUrl(inspectionId);
      await Linking.openURL(url);
    } catch {
      Alert.alert('PDF Viewer', 'Could not open the statutory PDF on this device.');
    }
  };

  // Filtered lists
  const filteredAssignments = assignments.filter((a) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (a.commodity_name || '').toLowerCase().includes(q) ||
      (a.brand_name || '').toLowerCase().includes(q) ||
      (a.notes || '').toLowerCase().includes(q)
    );
  });

  const filteredInspections = inspections.filter((i) => {
    const q = searchQuery.toLowerCase().trim();
    const comm = commoditiesMap[i.commodity_id];
    if (!q) return true;
    return (
      i.id.toLowerCase().includes(q) ||
      (comm?.generic_name || '').toLowerCase().includes(q) ||
      (comm?.brand_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <div>
          <Text style={[Typography.titleLarge, { fontWeight: '700', color: Colors.textPrimary }]}>
            Field Inspections
          </Text>
          <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 2 }]}>
            Legal Metrology Officer: {user?.name || 'Officer'}
          </Text>
        </div>

        <Pressable
          style={styles.quickScanBtn}
          onPress={() => {
            useInspectStore.getState().reset();
            router.push('/scanner');
          }}
        >
          <MaterialIcons name="camera-alt" size={18} color="#fff" />
          <Text style={styles.quickScanText}>Scan Now</Text>
        </Pressable>
      </View>

      {/* Main Tabs Toggle */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'assigned' && styles.tabButtonActive]}
          onPress={() => setActiveTab('assigned')}
        >
          <MaterialIcons
            name="assignment"
            size={18}
            color={activeTab === 'assigned' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'assigned' && styles.tabTextActive]}>
            Assigned to Me
          </Text>
          {assignments.length > 0 && (
            <View style={[styles.badge, activeTab === 'assigned' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{assignments.length}</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => setActiveTab('completed')}
        >
          <MaterialIcons
            name="check-circle"
            size={18}
            color={activeTab === 'completed' ? Colors.primary : Colors.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
            Completed History
          </Text>
          {inspections.length > 0 && (
            <View style={[styles.badge, activeTab === 'completed' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{inspections.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Search Filter Bar */}
      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color={Colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            activeTab === 'assigned'
              ? 'Search assigned commodities or notes...'
              : 'Search completed inspections...'
          }
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </View>

      {/* Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 12 }]}>
              Loading field records...
            </Text>
          </View>
        ) : activeTab === 'assigned' ? (
          /* TAB 1: ASSIGNED TO ME */
          filteredAssignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="task-alt" size={40} color={Colors.primary} />
              </View>
              <Text style={[Typography.titleMedium, { fontWeight: '700', marginTop: 16 }]}>
                No Pending Assignments
              </Text>
              <Text
                style={[
                  Typography.bodySmall,
                  { color: Colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 },
                ]}
              >
                All commodities assigned by the Admin have been checked. You can inspect any random packaging sample in the field.
              </Text>
              <Pressable
                style={styles.emptyCta}
                onPress={() => {
                  useInspectStore.getState().reset();
                  router.push('/scanner');
                }}
              >
                <MaterialIcons name="add-a-photo" size={16} color="#fff" />
                <Text style={styles.emptyCtaText}>Inspect Unassigned Commodity</Text>
              </Pressable>
            </View>
          ) : (
            filteredAssignments.map((a) => (
              <View key={a.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[Typography.titleSmall, { fontWeight: '700', color: Colors.textPrimary }]}>
                      {a.commodity_name || 'Packaged Commodity'}
                    </Text>
                    <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                      {a.brand_name ? `${a.brand_name} · ` : ''}
                      {a.commodity_category ? a.commodity_category.replace(/_/g, ' ') : 'General Packaged Goods'}
                    </Text>
                  </View>
                  <View style={styles.priorityBadge}>
                    <Text style={styles.priorityText}>ASSIGNED</Text>
                  </View>
                </View>

                {a.notes ? (
                  <View style={styles.notesBox}>
                    <MaterialIcons name="info-outline" size={14} color="#017374" style={{ marginTop: 2 }} />
                    <Text style={styles.notesText}>{a.notes}</Text>
                  </View>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.dueBox}>
                    <MaterialIcons name="event" size={14} color={Colors.textTertiary} />
                    <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                      Due: {a.due_date || 'Standard'}
                    </Text>
                  </View>

                  <Pressable style={styles.startBtn} onPress={() => handleStartInspection(a)}>
                    <MaterialIcons name="camera-alt" size={16} color="#fff" />
                    <Text style={styles.startBtnText}>Start Inspection</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )
        ) : (
          /* TAB 2: COMPLETED INSPECTIONS */
          filteredInspections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <MaterialIcons name="history" size={40} color={Colors.textTertiary} />
              </View>
              <Text style={[Typography.titleMedium, { fontWeight: '700', marginTop: 16 }]}>
                No Inspection History
              </Text>
              <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 6 }]}>
                Completed statutory checks will appear here with downloadable certificates.
              </Text>
            </View>
          ) : (
            filteredInspections.map((i) => {
              const comm = commoditiesMap[i.commodity_id];
              const isPass = i.compliance_result === 'PASS';
              const isFail = i.compliance_result === 'FAIL';

              return (
                <View key={i.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.titleSmall, { fontWeight: '700', color: Colors.textPrimary }]}>
                        {comm?.generic_name || i.commodity_name || 'Packaged Commodity'}
                      </Text>
                      <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                        ID: {i.id.slice(0, 8).toUpperCase()} · {new Date(i.created_at).toLocaleDateString()}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.verdictBadge,
                        isPass
                          ? styles.verdictPass
                          : isFail
                          ? styles.verdictFail
                          : styles.verdictReview,
                      ]}
                    >
                      <MaterialIcons
                        name={isPass ? 'check-circle' : isFail ? 'cancel' : 'hourglass-top'}
                        size={12}
                        color={isPass ? '#2E7D32' : isFail ? '#C62828' : '#E65100'}
                      />
                      <Text
                        style={[
                          styles.verdictText,
                          { color: isPass ? '#2E7D32' : isFail ? '#C62828' : '#E65100' },
                        ]}
                      >
                        {isPass ? 'COMPLIANT' : isFail ? 'NON-COMPLIANT' : 'UNDER REVIEW'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.completedActions}>
                    <Pressable
                      style={styles.detailsBtn}
                      onPress={() => router.push(`/analysis/${i.id}`)}
                    >
                      <MaterialIcons name="visibility" size={15} color={Colors.primary} />
                      <Text style={styles.detailsBtnText}>View Details</Text>
                    </Pressable>

                    <Pressable
                      style={styles.pdfBtn}
                      onPress={() => handleOpenPdf(i.id)}
                    >
                      <MaterialIcons name="picture-as-pdf" size={15} color="#fff" />
                      <Text style={styles.pdfBtnText}>Statutory PDF</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  quickScanText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: '#EBEFEA',
    borderRadius: Radius.lg,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: Radius.md,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeActive: {
    backgroundColor: '#E5F0EC',
  },
  badgeInactive: {
    backgroundColor: '#E0E0E0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxl * 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E5F0EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.md,
    marginTop: 20,
  },
  emptyCtaText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#E8EDE9',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  priorityBadge: {
    backgroundColor: '#E5F0EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F3F8F6',
    borderRadius: Radius.sm,
    padding: 8,
    gap: 6,
    marginTop: 8,
    borderLeftWidth: 2.5,
    borderLeftColor: Colors.primary,
  },
  notesText: {
    fontSize: 11,
    color: '#1A4D43',
    flex: 1,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
  },
  dueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.sm,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  verdictPass: {
    backgroundColor: '#E8F5E9',
  },
  verdictFail: {
    backgroundColor: '#FFEBEE',
  },
  verdictReview: {
    backgroundColor: '#FFF3E0',
  },
  verdictText: {
    fontSize: 10,
    fontWeight: '800',
  },
  completedActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F0F4F2',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#E2E8E5',
    backgroundColor: '#fff',
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primary,
  },
  pdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});
