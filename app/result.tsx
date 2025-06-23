import { Animated, StyleSheet, View, Share, Button } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useRef, useCallback } from 'react';

export default function ResultScreen() {
  const { text, imageUri } = useLocalSearchParams<{ text: string; imageUri?: string }>();
  const opacity = useRef(new Animated.Value(0)).current;

  const onShare = useCallback(async () => {
    if (!imageUri) return;
    try {
      await Share.share({ url: imageUri });
    } catch (e) {
      console.warn('Share error:', e);
    }
  }, [imageUri]);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Result',
          headerRight: () =>
            imageUri ? <Button title="Share" onPress={onShare} /> : null,
        }}
      />
      <View style={styles.container}>
        {imageUri && <Image source={{ uri: imageUri }} style={styles.image} />}
        <Animated.Text style={[styles.text, { opacity }]}>{text}</Animated.Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: 200, height: 200, marginBottom: 16, resizeMode: 'contain' },
  text: { fontSize: 24, textAlign: 'center' },
});
