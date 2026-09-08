import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { fetchInspectionDetail, fetchReport, InspectionDetail } from '../../src/api/doca';

export default function InspectionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setDetail(await fetchInspectionDetail(String(id)));
      } catch {
        Alert.alert('Load failed', 'Could not fetch inspection from server.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const openReport = async () => {
    try {
      const r = await fetchReport(String(id));
      if (r.file_url) await Linking.openURL(r.file_url);
      else Alert.alert('No report', 'Evaluate the inspection first to generate the PDF.');
    } catch {
      Alert.alert('No report', 'Evaluate the inspection first to generate the PDF.');
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const verdict = detail.compliance_result ?? 'PENDING';
  const fails = detail.findings.filter((f) => f.title.startsWith('Non-Compliance')).length;
  const reviews = detail.findings.filter((f) => f.title.startsWith('Review Warranted')).length;
  const evaluated = fails + reviews;
  const passed = Math.max(evaluated - fails - reviews, 0);
  const score = evaluated ? Math.round((passed / evaluated) * 100) : 100;
  const verdictLabel = verdict === 'PASS' ? 'Compliant' : verdict === 'FAIL' ? 'Non-Compliant' : verdict === 'REVIEW' ? 'Needs Review' : 'Pending Evaluation';
  const verdictColor = verdict === 'PASS' ? Colors.primary : verdict === 'FAIL' ? '#C62828' : '#E65100';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '600' }]}>Inspection Result</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* Main Card */}
        <View style={styles.resultCard}>
          {/* Circular Chart Representation */}
          <View style={styles.chartContainer}>
            <View style={styles.circleOuter}>
              {/* This is a simple representation. For a real ring chart, react-native-svg is typically used */}
              <View style={styles.circleInner}>
                <Text style={[Typography.displayLarge, { color: verdictColor, fontWeight: '700' }]}>{score}%</Text>
                <Text style={[Typography.labelLarge, { color: verdictColor }]}>{verdictLabel}</Text>
              </View>
            </View>
          </View>

          <Text style={[Typography.bodyLarge, styles.summaryText]}>
            {verdict === 'PASS'
              ? 'Great! This label meets all compliance requirements.'
              : verdict === 'FAIL'
                ? 'This label has compliance violations. Review the findings below.'
                : 'Some declarations need officer confirmation before a final verdict.'}
          </Text>

          {/* Stats List */}
          <View style={styles.statsList}>
            {/* Row 1 */}
            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary }]}>
                <MaterialIcons name="check" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>{passed}</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Requirements Passed</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Row 2 */}
            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E65100' }]}>
                <MaterialIcons name="warning-amber" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: '#E65100' }]}>{fails}</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Violations Found</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Row 3 */}
            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FFB300' }]}>
                <MaterialIcons name="schedule" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>{reviews}</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Needs Officer Review</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Row 4 */}
            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E0E0' }]}>
                <MaterialIcons name="remove" size={20} color={Colors.textSecondary} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>{detail.declarations.length}</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Declarations Extracted</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Findings */}
        {detail.findings.map((f) => (
          <View key={f.id} style={styles.resultCard}>
            <Text style={[Typography.titleMedium, { fontWeight: '600' }]}>{f.title}</Text>
            <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 4 }]}>{f.explanation}</Text>
            <Text style={[Typography.labelSmall, { color: Colors.primary, marginTop: 8 }]}>{f.legal_reference}</Text>
          </View>
        ))}

        {/* Action Buttons */}
        <Pressable style={styles.primaryButton} onPress={openReport}>
          <Text style={[Typography.button, { color: Colors.textInverse }]}>View Full Report</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton}>
          <MaterialIcons name="share" size={20} color={Colors.primary} />
          <Text style={[Typography.button, { color: Colors.primary, marginLeft: 8 }]}>Share Report</Text>
        </Pressable>

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
  },
  headerIcon: {
    padding: 8,
  },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenHorizontal, paddingBottom: 40, paddingTop: 12 },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    shadowColor: Colors.shadowDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  circleOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: Colors.primary,
    borderRightColor: '#E65100', // Mocking the colored segments
    borderBottomColor: '#A7FFEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryText: {
    textAlign: 'center',
    fontWeight: '500',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
    color: Colors.textPrimary,
  },
  statsList: {
    width: '100%',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  statTextContainer: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.button,
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
