import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Alert, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import { fetchInspectionDetail, fetchReport, fetchCommodities, InspectionDetail, Commodity } from '../../src/api/doca';

export default function InspectionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [commodity, setCommodity] = useState<Commodity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [d, allCommodities] = await Promise.all([
          fetchInspectionDetail(String(id)),
          fetchCommodities().catch(() => [] as Commodity[]),
        ]);
        setDetail(d);
        if (d?.commodity_id) {
          const match = allCommodities.find((c) => c.id === d.commodity_id);
          if (match) setCommodity(match);
        }
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
      if (r?.file_url) {
        await Linking.openURL(r.file_url);
      } else {
        Alert.alert('No report', 'Evaluate the inspection first to generate the PDF.');
      }
    } catch {
      Alert.alert('No report', 'Evaluate the inspection first to generate the PDF.');
    }
  };

  if (loading || !detail) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 16 }]}>
            Loading inspection details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const brandName = detail.brand_name || commodity?.brand_name || '';
  const commodityName = detail.commodity_name || commodity?.generic_name || 'Standard Packaged Commodity';

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
        <View style={styles.headerTitleContainer}>
          <Text style={[Typography.titleMedium, { fontWeight: '700' }]} numberOfLines={1}>
            {brandName ? String(brandName) : 'Inspection Result'}
          </Text>
          <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]} numberOfLines={1}>
            {String(commodityName)}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Commodity Identity Card */}
        <View style={styles.productBanner}>
          <View style={styles.productBadge}>
            <MaterialIcons name="local-offer" size={18} color={Colors.primary} />
            <Text style={styles.productBrandText}>
              {brandName ? String(brandName) : 'Packaged Goods'}
            </Text>
          </View>
          <Text style={[Typography.headlineSmall, styles.productNameText]}>
            {String(commodityName)}
          </Text>
          <Text style={[Typography.labelSmall, styles.productMetaText]}>
            {`Inspection ID: ${String(id).slice(0, 8)} • Status: ${detail.status.replace('_', ' ')}`}
          </Text>
        </View>

        {/* Main Result Card */}
        <View style={styles.resultCard}>
          <View style={styles.chartContainer}>
            <View style={styles.circleOuter}>
              <View style={styles.circleInner}>
                <Text style={[Typography.displayLarge, { color: verdictColor, fontWeight: '700' }]}>
                  {`${score}%`}
                </Text>
                <Text style={[Typography.labelLarge, { color: verdictColor, fontWeight: '600' }]}>
                  {String(verdictLabel)}
                </Text>
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
            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: Colors.primary }]}>
                <MaterialIcons name="check" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>
                  {String(passed)}
                </Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Requirements Passed</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E65100' }]}>
                <MaterialIcons name="warning-amber" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: '#E65100' }]}>
                  {String(fails)}
                </Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Violations Found</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#FFB300' }]}>
                <MaterialIcons name="schedule" size={20} color={Colors.textInverse} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>
                  {String(reviews)}
                </Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Needs Officer Review</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <View style={styles.statRow}>
              <View style={[styles.iconBox, { backgroundColor: '#E0E0E0' }]}>
                <MaterialIcons name="remove" size={20} color={Colors.textSecondary} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={[Typography.titleMedium, { color: Colors.textPrimary }]}>
                  {String(detail.declarations?.length ?? 0)}
                </Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Declarations Extracted</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Findings Section */}
        {detail.findings && detail.findings.length > 0 ? (
          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={[Typography.titleMedium, { fontWeight: '700', marginBottom: Spacing.sm }]}>
              Identified Findings
            </Text>
            {detail.findings.map((f) => (
              <View key={f.id} style={styles.findingCard}>
                <Text style={[Typography.titleMedium, { fontWeight: '600' }]}>{String(f.title)}</Text>
                <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 4 }]}>
                  {String(f.explanation)}
                </Text>
                {f.legal_reference ? (
                  <Text style={[Typography.labelSmall, { color: Colors.primary, marginTop: 8 }]}>
                    {String(f.legal_reference)}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Action Buttons */}
        <Pressable style={styles.primaryButton} onPress={openReport}>
          <MaterialIcons name="picture-as-pdf" size={20} color={Colors.textInverse} style={{ marginRight: 8 }} />
          <Text style={[Typography.button, { color: Colors.textInverse }]}>View Full Report</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/inspections' as any)}>
          <MaterialIcons name="list" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
          <Text style={[Typography.button, { color: Colors.primary }]}>Back to Inspections</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8F9FA' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  headerIcon: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerSpacer: {
    width: 40,
  },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.screenHorizontal, paddingBottom: 40, paddingTop: 16 },
  productBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  productBrandText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productNameText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  productMetaText: {
    color: Colors.textSecondary,
    marginTop: 6,
  },
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
    borderRightColor: '#E65100',
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
  findingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
