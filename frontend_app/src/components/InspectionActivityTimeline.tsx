import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';
import { useInspectionLogStore } from '../store/inspectionLogStore';

export const InspectionActivityTimeline = () => {
  const { logs } = useInspectionLogStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Compliant':
      case 'Approved':
        return Colors.primary;
      case 'Issues Found':
      case 'Rejected':
        return '#E65100';
      case 'Pending':
      case 'AI Review':
        return '#FDB617';
      default:
        return Colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[Typography.labelMedium, { fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5 }]}>
          INSPECTION ACTIVITY
        </Text>
        <Text style={[Typography.labelMedium, { color: Colors.primary, fontWeight: '600' }]}>
          View all →
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineContainer}>
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary }]}>
              No inspection activity yet. Scanned products will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.trackWrapper}>
            {/* Background connecting line */}
            <View style={styles.connectingLine} />

            {logs.map((log, index) => {
              const statusColor = getStatusColor(log.status);

              return (
                <View key={log.id} style={styles.timelineNode}>
                  <View style={[styles.circleWrapper, { borderColor: statusColor }]}>
                    {log.imageUri ? (
                      <Image source={{ uri: log.imageUri }} style={styles.productImage} />
                    ) : (
                      <View style={[styles.productImage, { backgroundColor: statusColor + '20', justifyContent: 'center', alignItems: 'center' }]}>
                         {/* Placeholder box */}
                         <View style={{ width: 24, height: 24, borderWidth: 1.5, borderColor: statusColor, borderStyle: 'dashed' }} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.detailsContainer}>
                    <Text style={styles.productName} numberOfLines={1}>{log.productName || 'Unknown Product'}</Text>
                    <View style={styles.statusRow}>
                      {log.score !== undefined && (
                        <Text style={[styles.scoreText, { color: statusColor }]}>{log.score}%</Text>
                      )}
                      <Text style={styles.statusText}> • {log.status}</Text>
                    </View>
                    <Text style={styles.timeText}>{log.time}</Text>
                  </View>
                </View>
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
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  trackWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  connectingLine: {
    position: 'absolute',
    top: 25, // Center of the 50x50 circle
    left: 25,
    right: 25,
    height: 2,
    backgroundColor: '#E0E0E0',
    zIndex: 0,
  },
  timelineNode: {
    width: 100,
    alignItems: 'center',
    marginRight: 16,
    zIndex: 1,
  },
  circleWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  productImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  detailsContainer: {
    alignItems: 'center',
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  timeText: {
    fontSize: 10,
    color: Colors.textSecondary,
  }
});
