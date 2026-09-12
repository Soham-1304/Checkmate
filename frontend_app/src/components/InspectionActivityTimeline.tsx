import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../theme';
import { OfficerDashboard } from '../api/doca';
import { useInspectionLogStore } from '../store/inspectionLogStore';

interface InspectionActivityTimelineProps {
  activity?: OfficerDashboard['recent_activity'];
}

export const InspectionActivityTimeline: React.FC<InspectionActivityTimelineProps> = ({ activity: propActivity }) => {
  const router = useRouter();
  const { logs } = useInspectionLogStore();

  const getStatusColor = (result: string | null | undefined) => {
    switch (result) {
      case 'PASS':
      case 'Compliant':
      case 'Approved':
        return Colors.primary;
      case 'FAIL':
      case 'Issues Found':
      case 'Rejected':
        return '#C62828';
      case 'REVIEW':
      case 'Pending':
      case 'AI Review':
        return '#E6771A';
      default:
        return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string, result: string | null | undefined) => {
    if (result === 'PASS' || status === 'Approved') return 'Compliant';
    if (result === 'FAIL' || status === 'Rejected') return 'Non-Compliant';
    if (result === 'REVIEW' || status === 'AI Review') return 'Needs Review';
    if (status === 'COMPLETED') return 'Completed';
    if (status === 'UNDER_REVIEW') return 'Under Review';
    return 'Pending';
  };

  // Use live dashboard activity if available, or store logs
  const displayItems = propActivity && propActivity.length > 0
    ? propActivity.map((a) => ({
        id: a.id,
        title: a.brand_name || a.commodity_name || 'Inspection',
        subtitle: a.commodity_name && a.brand_name ? a.commodity_name : a.id.slice(0, 8),
        date: new Date(a.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        status: a.status,
        result: a.compliance_result,
      }))
    : logs.map((l) => ({
        id: l.id,
        title: l.productName,
        subtitle: l.companyName,
        date: l.time,
        status: l.status,
        result: l.complianceStatus === 'Compliant' ? 'PASS' : l.complianceStatus === 'Non-Compliant' ? 'FAIL' : undefined,
      }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[Typography.labelMedium, { fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 }]}>
          INSPECTION ACTIVITY
        </Text>
        <Pressable onPress={() => router.push('/(tabs)/inspections' as any)}>
          <Text style={[Typography.labelMedium, { color: Colors.primary, fontWeight: '600' }]}>
            View all →
          </Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineContainer}>
        {displayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="history" size={32} color={Colors.borderLight} />
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: 8, textAlign: 'center' }]}>
              No recent inspection activity. Inspected items will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.trackWrapper}>
            <View style={styles.connectingLine} />

            {displayItems.map((item) => {
              const statusColor = getStatusColor(item.result || item.status);
              const label = getStatusLabel(item.status, item.result);

              return (
                <Pressable
                  key={item.id}
                  style={styles.timelineNode}
                  onPress={() => router.push(`/analysis/${item.id}` as any)}
                >
                  <View style={[styles.circleWrapper, { borderColor: statusColor }]}>
                    <MaterialIcons
                      name={item.result === 'PASS' ? 'check' : item.result === 'FAIL' ? 'close' : 'hourglass-empty'}
                      size={20}
                      color={statusColor}
                    />
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.productName} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
                        {label}
                      </Text>
                    </View>
                    <Text style={styles.timeText}>{item.date}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  timelineContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    width: 320,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  connectingLine: {
    position: 'absolute',
    top: 22,
    left: 25,
    right: 25,
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 0,
  },
  timelineNode: {
    width: 104,
    alignItems: 'center',
    marginRight: 16,
    zIndex: 1,
  },
  circleWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  detailsContainer: {
    alignItems: 'center',
    width: '100%',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
});
