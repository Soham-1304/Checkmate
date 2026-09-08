import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../src/theme';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<boolean>(false);
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

  const handleCapture = () => {
    // Navigate to processing or result screen directly for mockup purposes
    router.replace('/analysis/123');
  };

  return (
    <SafeAreaView style={styles.container}>
      <CameraView 
        style={styles.camera} 
        facing="back"
        enableTorch={flash}
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
});
