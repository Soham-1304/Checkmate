import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, TextInput, Alert, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { useInspectionLogStore, InspectionLog } from '../../src/store/inspectionLogStore';
import { useInspectStore } from '../../src/store/inspectStore';
import { useAuthStore } from '../../src/store/authStore';
import { fetchInspections, fetchCommodities } from '../../src/api/doca';

export default function InspectionsScreen() {
  const { logs } = useInspectionLogStore();
  const { user } = useAuthStore();
  const router = useRouter();
  const [apiLogs, setApiLogs] = useState<InspectionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [inspections, commodities] = await Promise.all([fetchInspections(), fetchCommodities()]);
        const byId = Object.fromEntries(commodities.map((c) => [c.id, c]));
        setApiLogs(
          inspections.map((i): InspectionLog => ({
            id: i.id,
            time: new Date(i.created_at).toLocaleDateString(),
            productName: byId[i.commodity_id]?.generic_name ?? i.commodity_id.slice(0, 8),
            companyName: byId[i.commodity_id]?.category ?? '—',
            officerName: user?.name ?? 'Officer',
            // Workflow first: nothing verified until a final decision exists.
            // DRAFT/IN_PROGRESS (no decision yet) => 'Pending', no compliance chip.
            // UNDER_REVIEW (officer done, admin pending) => 'AI Review'.
            // COMPLETED => 'Approved' (+ final verdict chip).
            status: (i.status === 'COMPLETED' || i.final_decision?.startsWith('APPROVED')
              ? 'Approved'
              : i.status === 'UNDER_REVIEW'
                ? 'AI Review'
                : 'Pending') as InspectionLog['status'],
            complianceStatus: (i.final_decision
              ? (i.compliance_result === 'PASS'
                ? 'Compliant'
                : i.compliance_result === 'FAIL'
                  ? 'Non-Compliant'
                  : undefined)
              : undefined) as InspectionLog['complianceStatus'],
          })),
        );
      } catch {
        Alert.alert('Sync failed', 'Showing cached inspections. Pull to retry by reopening this tab.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const sourceLogs = apiLogs.length ? apiLogs : logs;
  
  // Backend already scopes to the officer's own inspections; the name filter
  // only applies to legacy locally-logged rows.
  const currentOfficerName = user?.name?.split(' ')[0] || 'Officer';
  const myLogs = apiLogs.length
    ? sourceLogs
    : sourceLogs.filter(log => log.officerName === currentOfficerName);

  const [searchQuery, setSearchQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // Filtering state
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [complianceFilter, setComplianceFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [officerFilter, setOfficerFilter] = useState<string | null>(null);
  const [moreFilter, setMoreFilter] = useState<string | null>(null);
  
  // Modal Picker State
  const [pickerConfig, setPickerConfig] = useState<{ visible: boolean; title: string; options: string[]; onSelect: (val: string | null) => void } | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const handleExport = (type: string) => {
    setShowExportMenu(false);
    Alert.alert('Export Started', `Your ${type} report is being generated and will download shortly.`);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Approved':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'Pending':
      case 'AI Review':
        return { bg: '#FFF3E0', text: '#E65100' };
      default:
        return { bg: '#F5F5F5', text: Colors.textSecondary };
    }
  };

  const getComplianceBadgeStyle = (status?: string) => {
    switch (status) {
      case 'Compliant':
        return { bg: '#E8F5E9', text: '#2E7D32' };
      case 'Non-Compliant':
        return { bg: '#FFEBEE', text: '#C62828' };
      default:
        return { bg: '#F5F5F5', text: Colors.textSecondary };
    }
  };

  const getAIReviewColor = (level?: string) => {
    switch (level) {
      case 'High':
        return '#C62828';
      case 'Medium':
        return '#E65100';
      case 'Low':
        return '#2E7D32';
      default:
        return Colors.textSecondary;
    }
  };

  // 1. Apply Search and Filters
  const filteredLogs = myLogs.filter(log => {
    const matchesSearch = 
      log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.officerName.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter ? log.status === statusFilter : true;
    const matchesCompliance = complianceFilter ? log.complianceStatus === complianceFilter : true;
    const matchesOfficer = officerFilter ? log.officerName === officerFilter : true;
    const matchesDate = dateFilter === 'Today' ? log.time.includes('Today') : true; // Simplistic date filter for demo

    return matchesSearch && matchesStatus && matchesCompliance && matchesOfficer && matchesDate;
  });

  // 2. Pagination Logic
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const paginatedLogs = filteredLogs.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (safeCurrentPage < totalPages) setCurrentPage(safeCurrentPage + 1);
  };

  const handlePrevPage = () => {
    if (safeCurrentPage > 1) setCurrentPage(safeCurrentPage - 1);
  };

  const openStatusPicker = () => {
    setPickerConfig({
      visible: true,
      title: 'Filter by Status',
      options: ['Pending', 'Approved', 'AI Review', 'Rejected'],
      onSelect: setStatusFilter,
    });
  };

  const openCompliancePicker = () => {
    setPickerConfig({
      visible: true,
      title: 'Filter by Compliance',
      options: ['Compliant', 'Non-Compliant'],
      onSelect: setComplianceFilter,
    });
  };

  const openDatePicker = () => {
    setPickerConfig({
      visible: true,
      title: 'Date Range',
      options: ['Today', 'This Week', 'This Month', 'This Year'],
      onSelect: setDateFilter,
    });
  };

  const openOfficerPicker = () => {
    // Dynamically get unique officers from the filtered logs
    const officers = Array.from(new Set(myLogs.map(log => log.officerName))).filter(Boolean);
    setPickerConfig({
      visible: true,
      title: 'Filter by Officer',
      options: officers.length > 0 ? officers : ['No Officers Available'],
      onSelect: (val) => val === 'No Officers Available' ? null : setOfficerFilter(val),
    });
  };

  const openExportPicker = () => {
    setPickerConfig({
      visible: true,
      title: 'Export Inspections',
      options: ['Export as PDF', 'Export as Excel', 'Export as CSV'],
      onSelect: (val) => {
        if (val) {
          const type = val.split(' ').pop() || 'File';
          handleExport(type);
        }
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={[Typography.displaySmall, { fontWeight: '700', color: Colors.primary }]}>Inspections</Text>
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 4 }]}>
            View and manage all inspections across regions.
          </Text>
        </View>

        {/* Sticky Filters & Search Section */}
        <View style={styles.stickyContainer}>
          {/* Filters Row */}
          <View style={styles.filtersWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScrollContent}>
              <View style={styles.filterGroup}>
                <Pressable 
                  style={[styles.filterDropdown, dateFilter ? { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' } : { borderColor: Colors.borderLight }]} 
                  onPress={openDatePicker}
                >
                  <Text style={[styles.filterText, dateFilter ? { color: Colors.primary, fontWeight: '600' } : {}]}>
                    {dateFilter || 'Date Range'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={16} color={dateFilter ? Colors.primary : Colors.textSecondary} />
                </Pressable>

                <Pressable 
                  style={[styles.filterDropdown, statusFilter ? { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' } : { borderColor: Colors.borderLight }]} 
                  onPress={openStatusPicker}
                >
                  <Text style={[styles.filterText, statusFilter ? { color: Colors.primary, fontWeight: '600' } : {}]}>
                    {statusFilter || 'Status'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={16} color={statusFilter ? Colors.primary : Colors.textSecondary} />
                </Pressable>

                <Pressable 
                  style={[styles.filterDropdown, complianceFilter ? { borderColor: Colors.primary, backgroundColor: Colors.primary + '10' } : { borderColor: Colors.borderLight }]} 
                  onPress={openCompliancePicker}
                >
                  <Text style={[styles.filterText, complianceFilter ? { color: Colors.primary, fontWeight: '600' } : {}]}>
                    {complianceFilter || 'Compliance'}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={16} color={complianceFilter ? Colors.primary : Colors.textSecondary} />
                </Pressable>
              </View>

              <View style={{ width: 24 }} />
              
              {/* Export Button */}
              <View style={{ position: 'relative' }}>
                <Pressable 
                  style={[styles.filterDropdown, { borderColor: Colors.borderLight, borderWidth: 1 }]}
                  onPress={openExportPicker}
                >
                  <MaterialIcons name="file-download" size={16} color={Colors.textPrimary} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterText, { color: Colors.textPrimary, fontWeight: '600' }]}>Export</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search inspections, company, product, officer..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  setCurrentPage(1); // Reset page on search
                }}
              />
            </View>
          </View>
        </View>

        {/* Data Table */}
        <View style={styles.tableWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.horizontalScroll}>
            <View>
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Inspection ID</Text>
                <Text style={[styles.tableHeaderCell, { width: 110 }]}>Product</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Status</Text>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Compliance</Text>
                <Text style={[styles.tableHeaderCell, { width: 56 }]}>Photo</Text>
              </View>

              {/* Table Body */}
              {loading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={[styles.emptyStateText, { marginTop: 12 }]}>Syncing inspections…</Text>
                </View>
              ) : paginatedLogs.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="assignment" size={48} color={Colors.borderLight} />
                  <Text style={[styles.emptyStateText, { marginTop: 12 }]}>No inspections found matching your criteria.</Text>
                </View>
              ) : (
                paginatedLogs.map((log, index) => {
                  const statusStyle = getStatusBadgeStyle(log.status);
                  const complianceStyle = getComplianceBadgeStyle(log.complianceStatus);

                  return (
                    <Pressable key={log.id} onPress={() => router.push(`/analysis/${log.id}` as any)}
                      style={[styles.tableRow, index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}>
                      <Text style={[styles.tableCell, { width: 100, fontWeight: '600', color: Colors.textSecondary }]} numberOfLines={1}>{log.id.slice(0, 8)}</Text>
                      <Text style={[styles.tableCell, { width: 110 }]} numberOfLines={1}>{log.productName}</Text>
                      
                      <View style={[styles.tableCell, { width: 80, justifyContent: 'center' }]}>
                        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.badgeText, { color: statusStyle.text }]} numberOfLines={1}>{log.status}</Text>
                        </View>
                      </View>
                      
                      <View style={[styles.tableCell, { width: 100, justifyContent: 'center' }]}>
                        {log.complianceStatus ? (
                          <View style={[styles.badge, { backgroundColor: complianceStyle.bg }]}>
                            <Text style={[styles.badgeText, { color: complianceStyle.text }]} numberOfLines={1}>{log.complianceStatus}</Text>
                          </View>
                        ) : (
                          <Text style={styles.tableCell}>-</Text>
                        )}
                      </View>
                      {(() => {
                        const needsPhoto =
                          log.status !== 'Approved' &&
                          (log.status === 'Pending' || !log.complianceStatus);
                        return (
                          <View style={[styles.tableCell, { width: 56, alignItems: 'center', justifyContent: 'center' }]}>
                            {needsPhoto ? (
                              <Pressable
                                onPress={(e: any) => {
                                  e?.stopPropagation?.();
                                  useInspectStore.getState().reset();
                                  useInspectStore.getState().setPendingInspection(log.id);
                                  router.push('/inspect-confirm' as any);
                                }}
                                style={styles.photoAction}
                                accessibilityLabel={`Add label photo to inspection ${log.id.slice(0, 8)}`}
                              >
                                <MaterialIcons name="add-a-photo" size={18} color="#FFFFFF" />
                              </Pressable>
                            ) : (
                              <MaterialIcons name="check-circle" size={18} color={Colors.primary} />
                            )}
                          </View>
                        );
                      })()}
                    </Pressable>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>

        {/* Pagination */}
        {totalItems > 0 && (
          <View style={styles.paginationContainer}>
            <Text style={styles.paginationText}>
              Showing {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(safeCurrentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} results
            </Text>
            <View style={styles.paginationControls}>
              <Pressable style={styles.pageButton} onPress={handlePrevPage}>
                <MaterialIcons name="chevron-left" size={20} color={safeCurrentPage > 1 ? Colors.textPrimary : Colors.textTertiary} />
              </Pressable>
              
              <Pressable style={[styles.pageButton, styles.pageButtonActive]}>
                <Text style={styles.pageButtonTextActive}>{safeCurrentPage}</Text>
              </Pressable>
              
              {safeCurrentPage < totalPages && (
                <Pressable style={styles.pageButton} onPress={handleNextPage}>
                  <Text style={styles.pageButtonText}>{safeCurrentPage + 1}</Text>
                </Pressable>
              )}
              
              {safeCurrentPage + 1 < totalPages && (
                <Pressable style={styles.pageButton}>
                  <Text style={styles.pageButtonText}>...</Text>
                </Pressable>
              )}
              
              {safeCurrentPage < totalPages && safeCurrentPage + 1 !== totalPages && (
                <Pressable style={styles.pageButton} onPress={() => setCurrentPage(totalPages)}>
                  <Text style={styles.pageButtonText}>{totalPages}</Text>
                </Pressable>
              )}
              
              <Pressable style={styles.pageButton} onPress={handleNextPage}>
                <MaterialIcons name="chevron-right" size={20} color={safeCurrentPage < totalPages ? Colors.textPrimary : Colors.textTertiary} />
              </Pressable>
            </View>
            <View style={styles.rowsPerPage}>
              <Text style={styles.paginationText}>10 / page</Text>
              <MaterialIcons name="keyboard-arrow-down" size={16} color={Colors.textSecondary} />
            </View>
          </View>
        )}
        
        {/* Bottom spacer for tabs */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Filter Modal */}
      {pickerConfig && (
        <Modal transparent visible={pickerConfig.visible} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerConfig(null)}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={[Typography.titleSmall, { fontWeight: '700' }]}>{pickerConfig.title}</Text>
                <Pressable onPress={() => setPickerConfig(null)}>
                  <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
                </Pressable>
              </View>
              
              <Pressable 
                style={styles.modalOption} 
                onPress={() => { pickerConfig.onSelect(null); setPickerConfig(null); setCurrentPage(1); }}
              >
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary }]}>All (Clear Filter)</Text>
              </Pressable>
              
              {pickerConfig.options.map(opt => (
                <Pressable 
                  key={opt}
                  style={styles.modalOption} 
                  onPress={() => { pickerConfig.onSelect(opt); setPickerConfig(null); setCurrentPage(1); }}
                >
                  <Text style={Typography.bodyMedium}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    backgroundColor: '#FFFFFF',
  },
  stickyContainer: {
    backgroundColor: '#FFFFFF',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  filtersWrapper: {
    paddingVertical: Spacing.sm,
  },
  filtersScrollContent: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  filterText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginRight: 4,
  },
  exportMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    minWidth: 140,
    zIndex: 100,
  },
  exportMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  exportMenuText: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  tableWrapper: {
    marginTop: Spacing.md,
  },
  horizontalScroll: {
    paddingHorizontal: Spacing.lg,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#FAFAFA',
  },
  tableCell: {
    fontSize: 12,
    color: Colors.textPrimary,
    paddingHorizontal: 8,
    alignSelf: 'center',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  emptyState: {
    padding: Spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    flexWrap: 'wrap',
    gap: 16,
  },
  paginationText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  pageButtonActive: {
    backgroundColor: Colors.primary,
  },
  pageButtonText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pageButtonTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rowsPerPage: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalOption: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  }
});
