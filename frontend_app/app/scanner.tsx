import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { fetchCommodities, createInspection, uploadEvidence, analyzeAuto, evaluateInspection, Commodity } from '../src/api/doca';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
        <Pressable onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={{ color: 'white' }}>Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) return;
      setPhotoUri(photo.uri);
      const list = await fetchCommodities();
      setCommodities(list);
      setPickerVisible(true);
    } catch {
      Alert.alert('Capture failed', 'Could not read the camera image.');
    }
  };

  const handleCommodity = async (commodity: Commodity) => {
    if (!photoUri) return;
    setPickerVisible(false);
    setBusy('Creating inspection…');
    try {
      const inspection = await createInspection(commodity.id);
      setBusy('Uploading evidence…');
      await uploadEvidence(inspection.id, photoUri, 'BACK_PANEL');
      setBusy('Running AI analysis…');
      await analyzeAuto(inspection.id);
      setBusy('Evaluating compliance…');
      await evaluateInspection(inspection.id);
      router.replace(`/analysis/${inspection.id}` as any);
    } catch {
      Alert.alert('Analysis failed', 'Upload or AI analysis failed. Try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        enableTorch={flash}
        ref={cameraRef}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.textInverse} />
          </Pressable>
          <Text style={[Typography.titleLarge, { color: Colors.textInverse }]}>Scan Label</Text>
          <Pressable onPress={() => setFlash(!flash)} style={styles.iconButton}>
            <MaterialIcons name={flash ? "flash-on" : "flash-off"} size={28} color={Colors.textInverse} />
          </Pressable>
        </View>

        {/* Scanner Reticle / Frame */}
        <View style={styles.reticleContainer}>
          <View style={styles.reticleBox}>
            {/* Top Left */}
            <View style={[styles.corner, styles.topLeft]} />
            {/* Top Right */}
            <View style={[styles.corner, styles.topRight]} />
            {/* Bottom Left */}
            <View style={[styles.corner, styles.bottomLeft]} />
            {/* Bottom Right */}
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomControls}>
          <Pressable style={styles.iconButton}>
            <MaterialIcons name="photo-library" size={32} color={Colors.textInverse} />
          </Pressable>
          
          <View style={styles.captureContainer}>
            <Pressable style={styles.captureButtonOuter} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </Pressable>
            <Text style={[Typography.labelMedium, styles.uploadText]}>Upload from gallery</Text>
          </View>

          <Pressable style={styles.iconButton}>
            <MaterialIcons name="highlight" size={32} color={Colors.textInverse} />
          </Pressable>
        </View>
      </CameraView>

      {/* Busy overlay (create → upload → analyze) */}
      {busy && (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[Typography.bodyMedium, { color: Colors.textPrimary, marginTop: Spacing.md }]}>{busy}</Text>
          </View>
        </View>
      )}

      {/* Commodity picker */}
      <Modal transparent visible={pickerVisible} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Select Commodity</Text>
              <Pressable onPress={() => setPickerVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            {commodities.map((c) => (
              <Pressable key={c.id} style={styles.commodityOption} onPress={() => handleCommodity(c)}>
                <MaterialIcons name="inventory-2" size={20} color={Colors.primary} />
                <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                  <Text style={Typography.bodyMedium}>{c.generic_name}</Text>
                  <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>{c.category}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  iconButton: {
    padding: 8,
  },
  reticleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  reticleBox: {
    width: '80%',
    aspectRatio: 3 / 4,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: 'white',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 20,
    zIndex: 10,
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'white',
  },
  uploadText: {
    color: 'white',
    textDecorationLine: 'underline',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  busyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl * 2,
    alignItems: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  commodityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
