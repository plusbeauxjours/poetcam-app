import { Stack, router } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  return (
    <>
      <Stack.Screen options={{ title: 'Camera' }} />
      <View style={styles.container}>
        {permission?.granted ? (
          <>
            <Text>Camera Screen</Text>
            <Button title="Show Result" onPress={() => router.push('/result')} />
          </>
        ) : (
          <Button title="Request Permission" onPress={requestPermission} />
        )}
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
