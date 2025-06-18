import { Button, StyleSheet, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';

export default function ResultScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Result' }} />
      <View style={styles.container}>
        <Text>Result Screen</Text>
        <Button title="Back to Camera" onPress={() => router.replace('/camera')} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
});
