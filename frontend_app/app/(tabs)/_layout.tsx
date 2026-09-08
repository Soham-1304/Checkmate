import React from 'react';
import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../src/components/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <BottomTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="inspections" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
