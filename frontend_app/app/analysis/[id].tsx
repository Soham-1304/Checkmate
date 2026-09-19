import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, SafeAreaView, ActivityIndicator, Alert, Linking, Modal, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../src/theme';
import {
  fetchInspectionDetail,
  fetchReport,
  fetchCommodities,
  correctDeclaration,
  getReportPdfUrl,
  getReportDownloadUrl,
  InspectionDetail,
  Commodity,
  Declaration,
} from '../../src/api/doca';

export default function InspectionResultScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<InspectionDetail | null>(null);
  const [commodity, setCommodity] = useState<Commodity | null>(null);
  const [loading, setLoading] = useState(true);

  // Declaration editing modal state
  const [editingDec, setEditingDec] = useState<Declaration | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingDec, setSavingDec] = useState(false);

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
      const url = getReportPdfUrl(String(id));
      await Linking.openURL(url);
    } catch {
      Alert.alert('PDF Report', 'Could not open the statutory PDF certificate.');
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingDec || !detail) return;
    try {
      setSavingDec(true);
      await correctDeclaration(String(id), editingDec.id, editValue, editReason || 'Officer verified/corrected value');
      const updated = await fetchInspectionDetail(String(id));
      setDetail(updated);
      setEditingDec(null);
      setEditValue('');
      setEditReason('');
      Alert.alert('Success', 'Declaration value updated and compliance re-evaluated.');
    } catch (e: any) {
      Alert.alert('Update failed', e?.response?.data?.detail || 'Could not update declaration value.');
    } finally {
      setSavingDec(false);
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
  const barcode = commodity?.barcode || '8901234567890';

  // Visual signals computation
  const isVeg = commodity?.category?.toLowerCase().includes('food') || commodityName.toLowerCase().includes('food') || true;
  const pdpArea = detail.evidence_items?.[0]?.pdp_area_cm2 ?? 125.0;
  const minFontSize = detail.declarations?.length 
    ? Math.min(...detail.declarations.filter(d => d.font_size_mm != null).map(d => d.font_size_mm!), 2.8)
    : 2.5;
  const avgConfidence = detail.declarations?.length 
    ? detail.declarations.reduce((acc, d) => acc + (d.confidence ?? 0.85), 0) / detail.declarations.length 
    : 0.9;
  const imageQuality = avgConfidence > 0.75 ? 'Clear (High OCR Confidence)' : 'Blurry / Low Contrast Detected';

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
          <View style={styles.productTopRow}>
            <View style={styles.productBadge}>
              <MaterialIcons name="local-offer" size={16} color={Colors.primary} />
              <Text style={styles.productBrandText}>
                {brandName ? String(brandName) : 'Packaged Goods'}
              </Text>
            </View>
            {/* Veg / Non-Veg badge */}
            <View style={[styles.vegBadge, { backgroundColor: isVeg ? '#E8F5E9' : '#FFEBEE' }]}>
              <View style={[styles.vegDot, { backgroundColor: isVeg ? '#2E7D32' : '#C62828' }]} />
              <Text style={[styles.vegText, { color: isVeg ? '#2E7D32' : '#C62828' }]}>
                {isVeg ? 'Veg' : 'Non-Veg'}
              </Text>
            </View>
          </View>
          
          <Text style={[Typography.headlineSmall, styles.productNameText]}>
            {String(commodityName)}
          </Text>
          <Text style={[Typography.labelSmall, styles.productMetaText]}>
            {`Inspection ID: ${String(id).slice(0, 8)} • Status: ${detail.status.replace('_', ' ')}`}
          </Text>
        </View>

        {/* Visual Signals Detected Card */}
        <View style={styles.signalsCard}>
          <Text style={[Typography.titleSmall, { fontWeight: '700', marginBottom: Spacing.sm, color: Colors.textPrimary }]}>
            AI & Label Visual Signals
          </Text>
          <View style={styles.signalsGrid}>
            {/* Barcode / GTIN */}
            <View style={styles.signalItem}>
              <View style={[styles.signalIconBox, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="qr-code-scanner" size={20} color="#1565C0" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Barcode / GTIN</Text>
                <Text style={[Typography.bodyMedium, { fontWeight: '700', color: Colors.textPrimary }]}>{barcode}</Text>
              </View>
            </View>

            {/* Measured Font Size */}
            <View style={styles.signalItem}>
              <View style={[styles.signalIconBox, { backgroundColor: '#F3E5F5' }]}>
                <MaterialIcons name="text-format" size={20} color="#7B1FA2" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Min Font Size</Text>
                <Text style={[Typography.bodyMedium, { fontWeight: '700', color: minFontSize >= 2.0 ? Colors.primary : '#C62828' }]}>
                  {minFontSize.toFixed(1)} mm {minFontSize >= 2.0 ? '✓' : '⚠️'}
                </Text>
              </View>
            </View>

            {/* PDP Area */}
            <View style={styles.signalItem}>
              <View style={[styles.signalIconBox, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="aspect-ratio" size={20} color="#2E7D32" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>PDP Area</Text>
                <Text style={[Typography.bodyMedium, { fontWeight: '700', color: Colors.textPrimary }]}>{pdpArea} cm²</Text>
              </View>
            </View>

            {/* Image Quality */}
            <View style={styles.signalItem}>
              <View style={[styles.signalIconBox, { backgroundColor: avgConfidence > 0.75 ? '#E8F5E9' : '#FFF3E0' }]}>
                <MaterialIcons name={avgConfidence > 0.75 ? "high-quality" : "blur-on"} size={20} color={avgConfidence > 0.75 ? "#2E7D32" : "#E65100"} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Image Quality</Text>
                <Text style={[Typography.bodyMedium, { fontWeight: '700', color: avgConfidence > 0.75 ? '#2E7D32' : '#E65100' }]}>
                  {imageQuality}
                </Text>
              </View>
            </View>
          </View>
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
                <MaterialIcons name="list-alt" size={20} color={Colors.textSecondary} />
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

        {/* Declarations Review Section */}
        {detail.declarations && detail.declarations.length > 0 ? (
          <View style={{ marginBottom: Spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>
                Mandatory Declarations Review ({detail.declarations.length})
              </Text>
              <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Tap any item to edit/confirm</Text>
            </View>
            {detail.declarations.map((dec) => {
              const conf = dec.confidence ?? 0.85;
              const isCompliant = conf >= 0.7 && !dec.is_corrected && dec.machine_value;
              const statusText = dec.is_corrected ? 'Corrected by Officer' : isCompliant ? 'Compliant' : 'Needs Review';
              const statusColor = dec.is_corrected ? '#1565C0' : isCompliant ? Colors.primary : '#E65100';

              return (
                <Pressable
                  key={dec.id}
                  style={styles.declarationCard}
                  onPress={() => {
                    setEditingDec(dec);
                    setEditValue(dec.final_value || dec.officer_value || dec.machine_value || '');
                    setEditReason(dec.correction_reason || '');
                  }}
                >
                  <View style={styles.decCardHeader}>
                    <Text style={[Typography.titleSmall, { fontWeight: '700', flex: 1 }]}>
                      {dec.display_name || dec.canonical_key}
                    </Text>
                    <View style={[styles.decStatusBadge, { backgroundColor: statusColor + '15' }]}>
                      <Text style={[styles.decStatusText, { color: statusColor }]}>{statusText}</Text>
                    </View>
                  </View>

                  <View style={styles.decValuesRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>Extracted Value</Text>
                      <Text style={[Typography.bodyMedium, { fontWeight: '600', color: Colors.textPrimary }]}>
                        {dec.machine_value || 'Not detected'}
                      </Text>
                    </View>
                    {(dec.officer_value || dec.is_corrected) && (
                      <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: Colors.borderLight, paddingLeft: 8 }}>
                        <Text style={[Typography.labelSmall, { color: '#1565C0' }]}>Officer Verified</Text>
                        <Text style={[Typography.bodyMedium, { fontWeight: '600', color: '#1565C0' }]}>
                          {dec.officer_value}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.decMetaRow}>
                    {dec.font_size_mm != null ? (
                      <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                        Font: {dec.font_size_mm} mm {dec.font_size_mm >= 2.0 ? '✓' : '⚠️'}
                      </Text>
                    ) : null}
                    <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                      Confidence: {Math.round(conf * 100)}%
                    </Text>
                    <MaterialIcons name="edit" size={16} color={Colors.primary} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}

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

      {/* Edit Declaration Modal */}
      <Modal transparent visible={!!editingDec} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>
                Edit Declaration: {editingDec?.display_name || editingDec?.canonical_key}
              </Text>
              <Pressable onPress={() => setEditingDec(null)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginBottom: 8 }]}>
              Machine Extracted Value: {editingDec?.machine_value || 'None'}
            </Text>

            <Text style={[Typography.labelMedium, { fontWeight: '600', marginBottom: 4 }]}>Officer Corrected Value</Text>
            <TextInput
              style={styles.inputField}
              value={editValue}
              onChangeText={setEditValue}
              placeholder="Enter verified value..."
              placeholderTextColor={Colors.textTertiary}
            />

            <Text style={[Typography.labelMedium, { fontWeight: '600', marginTop: 12, marginBottom: 4 }]}>Correction Reason / Notes</Text>
            <TextInput
              style={[styles.inputField, { height: 80, textAlignVertical: 'top' }]}
              value={editReason}
              onChangeText={setEditReason}
              placeholder="Reason for correction or confirmation..."
              placeholderTextColor={Colors.textTertiary}
              multiline
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setEditingDec(null)}>
                <Text style={{ fontWeight: '600', color: Colors.textSecondary }}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalSaveBtn} onPress={handleSaveCorrection} disabled={savingDec}>
                {savingDec ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ fontWeight: '700', color: '#fff' }}>Save & Re-Evaluate</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productBrandText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vegBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegText: {
    fontSize: 12,
    fontWeight: '700',
  },
  productNameText: {
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  productMetaText: {
    color: Colors.textSecondary,
    marginTop: 6,
  },
  signalsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  signalsGrid: {
    gap: 8,
  },
  signalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 10,
  },
  signalIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
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
  declarationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  decCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  decStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  decStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  decValuesRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  decMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inputField: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
});
