import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Session } from '@supabase/supabase-js';

import { supabase } from '@/supabase';

WebBrowser.maybeCompleteAuthSession();

type Provider = 'google' | 'kakao' | 'apple';

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (provider: Provider) => {
    const redirectTo = AuthSession.makeRedirectUri();
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) console.warn('OAuth error', error.message);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return (
      <View style={styles.container}>
        <Button title="Sign in with Google" onPress={() => signIn('google')} />
        <Button title="Sign in with Kakao" onPress={() => signIn('kakao')} />
        <Button title="Sign in with Apple" onPress={() => signIn('apple')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Logged in as {session.user.email}</Text>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 18 },
});
