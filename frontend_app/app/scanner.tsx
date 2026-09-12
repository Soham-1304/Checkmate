import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Modal, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../src/theme';
import { fetchMyChecklist, fetchCommodities, fetchCommodity, Assignment, Commodity } from '../src/api/doca';
import { useInspectStore } from '../src/store/inspectStore';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'assigned' | 'all'>('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [commodities, setCommodities] = useState<Commodity[]>([]);
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
        <Text style={{ textAlign: 'center', marginBottom: 20, color: 'white' }}>We need your permission to show the camera</Text>
        <Pressable onPress={requestPermission} style={styles.permissionBtn}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const openSelectionSheet = async () => {
    setSheetVisible(true);
    setLoadingList(true);
    try {
      const [list, comms] = await Promise.all([
        fetchMyChecklist().catch(() => [] as Assignment[]),
        fetchCommodities().catch(() => [] as Commodity[]),
      ]);
      setAssignments(list);
      setCommodities(comms);

      // If user has no assignments, auto switch to 'all'
      if (list.length === 0) {
        setActiveTab('all');
      } else {
        setActiveTab('assigned');
      }

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
    } catch {
      Alert.alert('Load failed', 'Could not fetch commodities catalog. Check connection.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleCapture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
      if (!photo?.uri) return;
      addPhotos([photo.uri]);
      await openSelectionSheet();
    } catch {
      Alert.alert('Capture failed', 'Could not read the camera image.');
    }
  };

  const handleGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
      if (result.canceled) return;
      const uris = result.assets.map((a) => a.uri).filter(Boolean);
      if (!uris.length) return;
      addPhotos(uris);
      await openSelectionSheet();
    } catch {
      Alert.alert('Gallery failed', 'Could not load selected images.');
    }
  };

  const handleSelectAssignment = (a: Assignment) => {
    setAssignment(a, brands[a.commodity_id] || null);
    setSheetVisible(false);
    router.push('/inspect-confirm' as any);
  };

  const handleSelectCommodity = (c: Commodity) => {
    // Ad-hoc inspection for commodity
    setAssignment(
      {
        id: '',
        commodity_id: c.id,
        commodity_name: c.generic_name,
        commodity_barcode: c.barcode || '',
        status: 'OPEN',
      },
      c.brand_name || null,
    );
    setSheetVisible(false);
    router.push('/inspect-confirm' as any);
  };

  const filteredAssignments = useMemo(() => {
    if (!searchQuery.trim()) return assignments;
    const q = searchQuery.toLowerCase();
    return assignments.filter((a) =>
      a.commodity_name.toLowerCase().includes(q) ||
      (a.commodity_barcode && a.commodity_barcode.toLowerCase().includes(q)) ||
      (brands[a.commodity_id] && brands[a.commodity_id].toLowerCase().includes(q)),
    );
  }, [assignments, brands, searchQuery]);

  const filteredCommodities = useMemo(() => {
    if (!searchQuery.trim()) return commodities;
    const q = searchQuery.toLowerCase();
    return commodities.filter((c) =>
      c.generic_name.toLowerCase().includes(q) ||
      (c.brand_name && c.brand_name.toLowerCase().includes(q)) ||
      (c.barcode && c.barcode.toLowerCase().includes(q)) ||
      (c.category && c.category.toLowerCase().includes(q)),
    );
  }, [commodities, searchQuery]);

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
          <Pressable style={styles.photoBadge} onPress={openSelectionSheet}>
            <MaterialIcons name="photo-library" size={16} color="white" />
            <Text style={styles.photoBadgeText}>
              {photos.length} photo{photos.length > 1 ? 's' : ''} ready • Tap to inspect
            </Text>
          </Pressable>
        )}

        <View style={styles.bottomControls}>
          <Pressable style={styles.iconButton} onPress={handleGallery}>
            <MaterialIcons name="photo-library" size={32} color={Colors.textInverse} />
          </Pressable>

          <View style={styles.captureContainer}>
            <Pressable style={styles.captureButtonOuter} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </Pressable>
            <Pressable onPress={handleGallery}>
              <Text style={[Typography.labelMedium, styles.uploadText]}>Upload from gallery</Text>
            </Pressable>
          </View>

          <Pressable style={styles.iconButton} onPress={openSelectionSheet}>
            <MaterialIcons name="list-alt" size={32} color={Colors.textInverse} />
          </Pressable>
        </View>
      </CameraView>

      <Modal transparent visible={sheetVisible} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSheetVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[Typography.titleMedium, { fontWeight: '700' }]}>Select Commodity</Text>
                <Text style={[Typography.labelSmall, { color: Colors.textSecondary }]}>
                  Choose item being inspected
                </Text>
              </View>
              <Pressable onPress={() => setSheetVisible(false)}>
                <MaterialIcons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>

            {/* Tab selector: Assigned vs All */}
            <View style={styles.tabContainer}>
              <Pressable
                style={[styles.tabButton, activeTab === 'assigned' && styles.tabButtonActive]}
                onPress={() => setActiveTab('assigned')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'assigned' && styles.tabButtonTextActive]}>
                  My Checklist ({assignments.length})
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
                onPress={() => setActiveTab('all')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>
                  All Commodities ({commodities.length})
                </Text>
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search brand, commodity, barcode..."
                placeholderTextColor={Colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialIcons name="clear" size={18} color={Colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {loadingList ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 32 }} />
            ) : activeTab === 'assigned' ? (
              <ScrollView style={{ flex: 1 }}>
                {filteredAssignments.length === 0 ? (
                  <View style={styles.emptyList}>
                    <MaterialIcons name="assignment-late" size={40} color={Colors.borderLight} />
                    <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 8 }]}>
                      {searchQuery ? 'No matching assignments' : 'No assigned items pending.'}
                    </Text>
                    {commodities.length > 0 && (
                      <Pressable style={styles.switchTabBtn} onPress={() => setActiveTab('all')}>
                        <Text style={styles.switchTabText}>Browse All Commodities →</Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  filteredAssignments.map((a) => (
                    <Pressable key={a.id} style={styles.assignmentOption} onPress={() => handleSelectAssignment(a)}>
                      <View style={styles.iconCircle}>
                        <MaterialIcons name="assignment" size={20} color={Colors.primary} />
                      </View>
                      <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                        <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>
                          {brands[a.commodity_id] ? `${brands[a.commodity_id]} · ` : ''}{a.commodity_name}
                        </Text>
                        <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                          {a.commodity_barcode || 'No barcode'}{a.due_date ? `  ·  Due ${a.due_date}` : ''}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                    </Pressable>
                  ))
                )}
              </ScrollView>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {filteredCommodities.length === 0 ? (
                  <View style={styles.emptyList}>
                    <MaterialIcons name="category" size={40} color={Colors.borderLight} />
                    <Text style={[Typography.bodyMedium, { color: Colors.textSecondary, marginTop: 8 }]}>
                      No commodities found matching "{searchQuery}"
                    </Text>
                  </View>
                ) : (
                  filteredCommodities.map((c) => (
                    <Pressable key={c.id} style={styles.assignmentOption} onPress={() => handleSelectCommodity(c)}>
                      <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                        <MaterialIcons name="inventory-2" size={20} color="#2E7D32" />
                      </View>
                      <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                        <Text style={[Typography.bodyMedium, { fontWeight: '600' }]}>
                          {c.brand_name ? `${c.brand_name} · ` : ''}{c.generic_name}
                        </Text>
                        <Text style={[Typography.labelSmall, { color: Colors.textSecondary, marginTop: 2 }]}>
                          {c.category} {c.barcode ? `· ${c.barcode}` : ''}
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={Colors.textSecondary} />
                    </Pressable>
                  ))
                )}
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  photoBadgeText: {
    color: 'white',
    fontSize: 13,
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
    height: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: Radius.button,
    padding: 3,
    marginBottom: Spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: Radius.button - 2,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    height: 40,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  assignmentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyList: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchTabBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.primary + '15',
    borderRadius: 8,
  },
  switchTabText: {
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
});
