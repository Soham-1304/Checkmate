import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { fetchMyChecklist, fetchInspections, Assignment, Inspection } from '../src/api/doca';
import { useInspectStore } from '../src/store/inspectStore';

interface NotificationItem {
  id: string;
  type: 'ASSIGNMENT' | 'REVIEW' | 'STATUS_CHANGE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  assignment?: Assignment;
  inspectionId?: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [checklist, inspections] = await Promise.all([
        fetchMyChecklist().catch(() => [] as Assignment[]),
        fetchInspections().catch(() => [] as Inspection[]),
      ]);

      const items: NotificationItem[] = [];

      // 1. Pending assignments alerts
      checklist.forEach((a) => {
        items.push({
          id: `asgn-${a.id}`,
          type: 'ASSIGNMENT',
          title: 'Pending Inspection Assignment',
          message: `Assigned commodity "${a.commodity_name}" is pending inspection${a.due_date ? ` (Due: ${a.due_date})` : ''}.`,
          timestamp: a.due_date ? `Due ${a.due_date}` : 'Action Required',
          read: false,
          assignment: a,
        });
      });

      // 2. Inspection status changes & reviews
      inspections.slice(0, 8).forEach((i) => {
        const isFail = i.compliance_result === 'FAIL';
        const isPass = i.compliance_result === 'PASS';
        const isReview = i.compliance_result === 'REVIEW' || i.status === 'UNDER_REVIEW';
        
        let title = 'Inspection Status Update';
        let type: NotificationItem['type'] = 'STATUS_CHANGE';
        if (isFail) {
          title = 'Non-Compliance Detected';
          type = 'REVIEW';
        } else if (isReview) {
          title = 'Officer Verification Warranted';
          type = 'REVIEW';
        } else if (isPass) {
          title = 'Inspection Passed Successfully';
        }

        items.push({
          id: `insp-${i.id}`,
          type,
          title,
          message: `Inspection #${i.id.slice(0, 8)} (${i.commodity_name || 'Commodity'}): Status is ${i.status.replace('_', ' ')}. Result: ${i.compliance_result || 'PENDING'}.`,
          timestamp: new Date(i.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          read: isPass, // Auto-mark passed ones as read, flag failures/reviews as unread
          inspectionId: i.id,
          actionRoute: `/analysis/${i.id}`,
        });
      });

      // 3. System advisory / Legal metrology enforcement notice
      items.push({
        id: 'sys-directive-2026',
        type: 'SYSTEM',
        title: 'Legal Metrology (Packaged Commodities) Directive',
        message: 'Mandatory font size (≥ 2.0 mm) and MRP declarations are strictly audited across all packaged commodity inspections.',
        timestamp: 'Dept of Consumer Affairs',
        read: true,
      });

      setNotifications(items);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  const handleAction = (item: NotificationItem) => {
    // Mark as read
    setNotifications((prev) => prev.map((n) => n.id === item.id ? { ...n, read: true } : n));

    if (item.assignment) {
      useInspectStore.getState().reset();
      useInspectStore.getState().setAssignment(item.assignment);
      router.push('/scanner');
    } else if (item.actionRoute) {
      router.push(item.actionRoute as any);
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    Alert.alert('All Caught Up', 'All notifications marked as read.');
  };

  const getTypeStyle = (type: NotificationItem['type']) => {
    switch (type) {
      case 'ASSIGNMENT':
        return { icon: 'assignment', color: Colors.primary, bg: Colors.primary + '15' };
      case 'REVIEW':
        return { icon: 'warning-amber', color: '#C62828', bg: '#FFEBEE' };
      case 'STATUS_CHANGE':
        return { icon: 'fact-check', color: '#1565C0', bg: '#E3F2FD' };
      case 'SYSTEM':
        return { icon: 'campaign', color: '#6A1B9A', bg: '#F3E5F5' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Notifications & Updates</Text>
        <Pressable style={styles.markReadBtn} onPress={markAllRead}>
          <Text style={[Typography.labelSmall, { color: Colors.primary, fontWeight: '600' }]}>Mark Read</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadNotifications(true)} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 12 }]}>
              Syncing notifications...
            </Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-none" size={48} color={Colors.borderLight} />
            <Text style={[Typography.titleSmall, { marginTop: 12, color: Colors.textSecondary }]}>
              No notifications
            </Text>
            <Text style={[Typography.bodySmall, { color: Colors.textTertiary, marginTop: 4 }]}>
              You are all caught up on all assignments and inspection updates.
            </Text>
          </View>
        ) : (
          notifications.map((item) => {
            const style = getTypeStyle(item.type);
            return (
              <Pressable
                key={item.id}
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => handleAction(item)}
              >
                <View style={[styles.iconCircle, { backgroundColor: style.bg }]}>
                  <MaterialIcons name={style.icon as any} size={22} color={style.color} />
                </View>

                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <View style={styles.cardHeader}>
                    <Text style={[Typography.titleSmall, { fontWeight: '700', color: Colors.textPrimary, flex: 1 }]}>
                      {item.title}
                    </Text>
                    <Text style={[Typography.labelSmall, { color: Colors.textTertiary, fontSize: 11 }]}>
                      {item.timestamp}
                    </Text>
                  </View>

                  <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 4, lineHeight: 18 }]}>
                    {item.message}
                  </Text>

                  {item.assignment ? (
                    <View style={styles.actionRow}>
                      <View style={styles.actionChip}>
                        <MaterialIcons name="camera-alt" size={14} color={Colors.primary} />
                        <Text style={styles.actionChipText}>Open Camera to Inspect</Text>
                      </View>
                    </View>
                  ) : item.inspectionId ? (
                    <View style={styles.actionRow}>
                      <View style={[styles.actionChip, { backgroundColor: '#E3F2FD' }]}>
                        <MaterialIcons name="visibility" size={14} color="#1565C0" />
                        <Text style={[styles.actionChipText, { color: '#1565C0' }]}>View Inspection Findings</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconButton: { padding: 8 },
  markReadBtn: { padding: 8 },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 6,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  centered: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
