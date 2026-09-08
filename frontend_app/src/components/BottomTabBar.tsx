import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Dimensions } from '../theme';

interface NavItem {
  icon: keyof typeof MaterialIcons.glyphMap;
  activeIcon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  route: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: 'home', activeIcon: 'home', label: 'Home', route: '/' },
  { icon: 'dashboard', activeIcon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
  { icon: 'assignment', activeIcon: 'assignment', label: 'Inspections', route: '/inspections' },
  { icon: 'person', activeIcon: 'person', label: 'Profile', route: '/profile' },
];

export const BottomTabBar = () => {
  const router = useRouter();
  const pathname = usePathname();

  const getActiveIndex = () => {
    if (pathname.startsWith('/dashboard')) return 1;
    if (pathname.startsWith('/inspections')) return 2;
    if (pathname.startsWith('/profile')) return 3;
    return 0; // Default home
  };

  const currentIndex = getActiveIndex();

  const buildNavItem = (item: NavItem, index: number) => {
    const isSelected = index === currentIndex;
    const color = isSelected ? Colors.primary : Colors.textTertiary;
    return (
      <Pressable key={item.route} style={styles.navItem} onPress={() => router.navigate(`/(tabs)${item.route === '/' ? '' : item.route}` as any)}>
        <MaterialIcons
          name={isSelected ? item.activeIcon : item.icon}
          size={24}
          color={color}
        />
        <Text style={[
          Typography.labelSmall,
          { color: color, fontWeight: isSelected ? '600' : '500', marginTop: 4, fontSize: 10 }
        ]}>
          {item.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.row}>
          {NAV_ITEMS.slice(0, 2).map((item, index) => buildNavItem(item, index))}
          
          <View style={styles.fabContainer}>
            <Pressable style={styles.fab} onPress={() => router.push('/scanner')}>
              <MaterialIcons name="add" size={28} color={Colors.textInverse} />
            </Pressable>
          </View>

          {NAV_ITEMS.slice(2, 4).map((item, index) => buildNavItem(item, index + 2))}
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  safeArea: {
    height: 70,
  },
  row: {
    flexDirection: 'row',
    height: '100%',
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  fabContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
