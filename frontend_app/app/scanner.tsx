import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Modal, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../src/theme';
import { fetchMyChecklist, fetchCommodity, Assignment } from '../src/api/doca';
import { useInspectStore } from '../src/store/inspectStore';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [brands, setBrands] = useState<Record<string, string>>({});
  const [loadingList, setLoadingList] = useState(false);

  const { photos, addPhotos, setAssignment } = useInspectStore();
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

  const openAssignedSheet = async () => {
    setSheetVisible(true);
    setLoadingList(true);
    try {
      const list = await fetchMyChecklist();
      setAssignments(list);
      const entries = await Promise.all(
        list.map(async (a) => {
          try {
            const c = await fetchCommodity(a.commodity_id);
            return [a.commodity_id, c.brand_name || ''] as const;
          } catch {
            return [a.commodity_id, ''] as const;
          }
        }),
      );
      setBrands(Object.fromEntries(entries));
      if (!list.length) {
        Alert.alert('No assignments', 'You have no pending assigned commodities.');
      }
    } catch {
      Alert.alert('Load failed', 'Could not fetch your assigned commodities. Check connection.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.7 });
      if (!photo?.uri) return;
      addPhotos([photo.uri]);
      await openAssignedSheet();
    } catch {
      Alert.alert('Capture failed', 'Could not read the camera image.');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.7,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri).filter(Boolean);
      if (!uris.length) return;
      addPhotos(uris);
      await openAssignedSheet();
    } catch {
      Alert.alert('Gallery failed', 'Could not load selected images.');
    }
  };

  const handleAssignment = (a: Assignment) => {
    setAssignment(a, brands[a.commodity_id] || null);
    setSheetVisible(false);
    router.push('/inspect-confirm' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={flash}
        ref={cameraRef}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconButton}>
            <MaterialIcons name="arrow-back" size={28} color={Colors.textInverse} />
          </Pressable>
          <Text style={[Typography.titleLarge, { color: Colors.textInverse }]}>Scan Label</Text>
          <Pressable onPress={() => setFlash(!flash)} style={styles.iconButton}>
            <MaterialIcons name={flash ? "flash-on" : "flash-off"} size={28} color={Colors.textInverse} />
          </Pressable>
        </View>

        <View style={styles.reticleContainer}>
          <View style={styles.reticleBox}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        {photos.length > 0 && (
          <View style={styles.photoBadge}>
            <MaterialIcons name="photo-library" size={16} color="white" />
            <Text style={styles.photoBadgeText}>{photos.length} photo{photos.length > 1 ? 's' : ''}</Text>
          </View>
        )}

        <View style={styles.bottomControls}>
          <Pressable style={styles.iconButton} onPress={handleGallery}>
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

      <Modal transparent visible={sheetVisible} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSheetVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Your Assigned Items</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                  Only commodities assigned to you
                </Text>
              </View>
              <Pressable onPress={() => setSheetVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            {loadingList ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 24 }} />
            ) : (
              <ScrollView>
                {assignments.map((a) => (
                  <Pressable key={a.id} style={styles.assignmentOption} onPress={() => handleAssignment(a)}>
                    <MaterialIcons name="assignment" size={22} color={Colors.primary} />
                    <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                      <Text style={Typography.bodyMedium}>
                        {brands[a.commodity_id] ? `${brands[a.commodity_id]} · ` : ''}{a.commodity_name}
                      </Text>
                      <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                        {a.commodity_barcode || 'No barcode'}{a.due_date ? `  ·  Due ${a.due_date}` : ''}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
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
  photoBadge: {
    position: 'absolute',
    top: 110,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 10,
  },
  photoBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    maxHeight: '65%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  assignmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
});
