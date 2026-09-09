import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import {
  createInspection, uploadEvidence, analyzeAuto, evaluateInspection, submitInspection, fetchMyChecklist,
} from '../src/api/doca';
import { useInspectStore } from '../src/store/inspectStore';
import { fetchInspections, fetchCommodities, fetchInspectionDetail } from '../src/api/doca';

const VIEW_TYPES = ['FRONT_PDP', 'BACK_PANEL', 'SIDE_PANEL', 'CLOSEUP'];

export default function InspectConfirmScreen() {
  const router = useRouter();
  const { photos, assignment, brandName, pendingInspectionId, setPendingInspection, addPhotos, removePhoto, reset } = useInspectStore();
  const [pendingMeta, setPendingMeta] = useState<{ title: string; subtitle: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Deep-link from the Inspections list: a pending (photo-less) inspection was
  // chosen, so resolve its commodity from the API for the header card.
  useEffect(() => {
    if (assignment || !pendingInspectionId) return;
    (async () => {
      try {
        const [inspections, commodities] = await Promise.all([fetchInspections(), fetchCommodities()]);
        const insp = inspections.find((i) => i.id === pendingInspectionId);
        if (!insp) return;
        const c = commodities.find((x) => x.id === insp.commodity_id);
        if (c) setPendingMeta({
          title: `${c.brand_name ? c.brand_name + ' · ' : ''}${c.generic_name}`,
          subtitle: c.barcode ?? insp.id.slice(0, 8),
        });
      } catch { /* header shows fallback text */ }
    })();
  }, [assignment, pendingInspectionId]);

  const handleAddMore = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (!result.canceled) {
        addPhotos(result.assets.map((a) => a.uri).filter(Boolean));
      }
    } catch {
      Alert.alert('Gallery failed', 'Could not load selected images.');
    }
  };

  const handleInspect = async () => {
    // Continuation mode: photos are being added to an existing pending inspection.
    if (!assignment && pendingInspectionId) {
      if (!photos.length) {
        Alert.alert('No photos', 'Capture or add at least one label photo.');
        return;
      }
      try {
        for (let i = 0; i < photos.length; i++) {
          setBusy(`Uploading photo ${i + 1} of ${photos.length}…`);
          await uploadEvidence(pendingInspectionId, photos[i], VIEW_TYPES[Math.min(i, VIEW_TYPES.length - 1)]);
        }
        setBusy('Running AI analysis…');
        await analyzeAuto(pendingInspectionId);
        setBusy('Evaluating compliance…');
        await evaluateInspection(pendingInspectionId);
        setBusy('Submitting for review…');
        await submitInspection(pendingInspectionId);
        const doneId = pendingInspectionId;
        setPendingInspection(null);
        reset();
        router.replace(`/analysis/${doneId}` as any);
      } catch (e: any) {
        const msg = e?.response?.data?.detail || e?.message || 'Upload or AI analysis failed. Try again.';
        Alert.alert('Inspection failed', typeof msg === 'string' ? msg : 'Upload or AI analysis failed.');
      } finally {
        setBusy(null);
      }
      return;
    }
    if (!assignment) {
      Alert.alert('No item selected', 'Go back and pick an assigned commodity.');
      return;
    }
    if (!photos.length) {
      Alert.alert('No photos', 'Capture or add at least one label photo.');
      return;
    }
    try {
      setBusy('Creating inspection…');
      const inspection = await createInspection(assignment.commodity_id, assignment.id);
      for (let i = 0; i < photos.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${photos.length}…`);
        await uploadEvidence(inspection.id, photos[i], VIEW_TYPES[Math.min(i, VIEW_TYPES.length - 1)]);
      }
      setBusy('Running AI analysis…');
      await analyzeAuto(inspection.id);
      setBusy('Evaluating compliance…');
      await evaluateInspection(inspection.id);
      setBusy('Submitting for review…');
      await submitInspection(inspection.id);
      reset();
      router.replace(`/analysis/${inspection.id}` as any);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || 'Upload or AI analysis failed. Try again.';
      Alert.alert('Inspection failed', typeof msg === 'string' ? msg : 'Upload or AI analysis failed.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable style={styles.headerIcon} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Confirm Inspection</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.content}>
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <MaterialIcons name="verified" size={22} color={Colors.primary} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <Text style={[Typography.bodyLarge, { fontWeight: '700' }]}>
                {assignment
                  ? `${brandName ? `${brandName} · ` : ''}${assignment.commodity_name}`
                  : pendingMeta?.title ?? 'Pending inspection'}
              </Text>
              <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                {assignment
                  ? `${assignment.commodity_barcode || 'No barcode'}${assignment.due_date ? `  ·  Due ${assignment.due_date}` : ''}`
                  : pendingMeta?.subtitle ?? `Finishing ${pendingInspectionId?.slice(0, 8) ?? ''}`}
              </Text>
            </View>
          </View>
          {!!assignment?.notes && (
            <Text style={[Typography.bodySmall, styles.notes]}>{assignment.notes}</Text>
          )}
        </View>

        <Text style={[Typography.titleSmall, styles.sectionTitle]}>
          Label photos ({photos.length})
        </Text>
        <View style={styles.grid}>
          {photos.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <Image source={{ uri }} style={styles.thumb} />
              <Pressable style={styles.removeBtn} onPress={() => removePhoto(uri)}>
                <MaterialIcons name="close" size={14} color="white" />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addTile} onPress={handleAddMore}>
            <MaterialIcons name="add-photo-alternate" size={28} color={Colors.primary} />
            <Text style={[Typography.labelSmall, { color: Colors.primary }]}>Add</Text>
          </Pressable>
        </View>
        <Text style={[Typography.labelSmall, styles.hint]}>
          Front panel first, then back, sides and close-ups. AI reads MRP, net quantity and declarations from these.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.inspectBtn, (!assignment || !photos.length) && styles.inspectBtnDisabled]}
          onPress={handleInspect}
          disabled={!assignment || !photos.length}
        >
          <MaterialIcons name="fact-check" size={22} color="white" />
          <Text style={styles.inspectText}>INSPECT</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodyMedium, { marginTop: Spacing.md }]}>{busy}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerIcon: { padding: Spacing.xs },
  headerSpacer: { width: 32 },
  body: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  metaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  notes: { color: Colors.textSecondary, marginTop: Spacing.sm },
  sectionTitle: { fontWeight: '700', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumbWrap: { width: '31%', aspectRatio: 3 / 4, borderRadius: Radius.md, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%' },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  addTile: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  hint: { color: Colors.textSecondary, marginTop: Spacing.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  inspectBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inspectBtnDisabled: { opacity: 0.5 },
  inspectText: { color: 'white', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  busyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  busyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    minWidth: 220,
  },
});
