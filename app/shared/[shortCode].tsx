import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SharedContentViewer } from '@/components/SharedContentViewer';

export default function SharedContentScreen() {
  const { shortCode } = useLocalSearchParams<{ shortCode: string }>();
  const router = useRouter();

  const handleClose = () => {
    router.back();
  };

  const handleNotFound = () => {
    router.replace('/(tabs)');
  };

  if (!shortCode) {
    handleNotFound();
    return null;
  }

  return (
    <SharedContentViewer
      shortCode={shortCode}
      onClose={handleClose}
      onNotFound={handleNotFound}
    />
  );
}