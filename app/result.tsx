import { Animated, Button, Share, StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';

export default function ResultScreen() {
  const { text } = useLocalSearchParams<{ text: string }>();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const onShare = useCallback(() => {
    Share.share({ message: text ?? '' }).catch((err) => console.warn(err));
  }, [text]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Result' }} />
      <View style={styles.container}>
        <Animated.Text
          style={[styles.text, { opacity, transform: [{ translateY }] }]}
        >
          {text}
        </Animated.Text>
        <Button title="Share" onPress={onShare} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 24, textAlign: 'center' },
});
