import { Animated, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';

export default function ResultScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
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
        <Animated.Text style={[styles.text, { opacity }]}>{text}</Animated.Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 24, textAlign: 'center' },
});
