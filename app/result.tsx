import { Animated, StyleSheet, View, Image } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function ResultScreen() {
  const { text, imageUri } = useLocalSearchParams<{ text: string; imageUri?: string }>();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Result' }} />
      <View style={styles.container}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : null}
        <Animated.Text style={[styles.text, { opacity }]}>{text}</Animated.Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  image: { width: 150, height: 150, marginBottom: 20, borderRadius: 8 },
  text: { fontSize: 24, textAlign: 'center' },
});
