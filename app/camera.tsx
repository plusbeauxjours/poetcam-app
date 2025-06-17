import { Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function CameraScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Camera' }} />
      <View style={styles.container}>
        <Text>Camera Screen</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
