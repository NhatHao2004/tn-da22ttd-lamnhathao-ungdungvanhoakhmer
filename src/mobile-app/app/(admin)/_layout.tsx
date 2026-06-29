import { View, ActivityIndicator, StatusBar as RNStatusBar } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { auth, db } from '../../utils/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { Stack, router } from 'expo-router';

export default function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        const userRole = userData?.role || userData?.['quyền'] || 'Người dùng';
        if (userRole === 'Quản trị viên') {
          setIsAdmin(true);
        } else {
          console.error("Access denied: Not an administrator");
          router.replace('/(tabs)');
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.replace('/(tabs)');
      }
    };

    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontWeight: '400',
            color: '#1e293b',
          },
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#ffffff' }, 
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="user"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="content"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="challenges"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="trash"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="article"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
