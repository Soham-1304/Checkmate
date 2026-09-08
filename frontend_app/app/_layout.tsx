import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../src/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="scanner" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="processing/[id]" />
        <Stack.Screen name="analysis/[id]" />
        <Stack.Screen name="compliance/[id]" />
        <Stack.Screen name="alert-details/[id]" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="standards/[id]" />
      </Stack>
    </>
  );
}
