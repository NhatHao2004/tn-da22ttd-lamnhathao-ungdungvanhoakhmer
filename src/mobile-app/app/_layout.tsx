import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/loading-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider, useLanguage } from '@/contexts/LanguageContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ms, s, vs } from '@/utils/responsive';

const { width } = Dimensions.get('window');

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure that reloading on `/login` keeps a back button present.
  initialRouteName: '(tabs)',
};

function AchievementManager() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const prevPoints = useRef<number | undefined>(undefined);

  // Achievement Toast State
  const [showAchievement, setShowAchievement] = useState(false);
  const [achievementMsg, setAchievementMsg] = useState({ title: '', body: '', emoji: '' });
  const achievementY = useSharedValue(-150);
  const achievementTranslateX = useSharedValue(0);

  const triggerAchievement = (emoji: string, title: string, body: string, badgeName?: string) => {
    setAchievementMsg({ emoji, title, body });
    setShowAchievement(true);
    achievementY.value = withTiming(0, { duration: 600 });

    // Persistent Notification to Firestore
    if (user && badgeName) {
      const { collection, addDoc, serverTimestamp, doc, updateDoc } = require('firebase/firestore');
      const db = require('@/utils/firebaseConfig').db;

      addDoc(collection(db, 'notifications'), {
        toUserId: user.uid,
        fromUserName: '', // Removed 'Hệ thống'
        message: `badge_${badgeName.toLowerCase().replace(' ', '_')}_msg`,
        type: 'achievement',
        isRead: false,
        createdAt: serverTimestamp(),
        points: title
      }).catch((err: any) => console.error("Error saving achievement notification:", err));

      updateDoc(doc(db, 'users', user.uid), {
        rank: badgeName
      }).catch((err: any) => console.error("Error updating user rank:", err));
    }
  };

  const triggeredMilestones = useRef<Set<string>>(new Set());
  const prevUid = useRef<string | null>(null);

  useEffect(() => {
    // If user changed (login/logout), reset trackers
    if (user?.uid !== prevUid.current) {
      prevPoints.current = undefined;
      triggeredMilestones.current = new Set();
      prevUid.current = user?.uid || null;

      // If we just logged in, initialize prevPoints with current value and STOP
      if (user?.points !== undefined) {
        prevPoints.current = user.points;
      }
      return;
    }

    if (user && !user.isAnonymous && prevPoints.current !== undefined) {
      const p = user.points || 0;
      const prev = prevPoints.current;

      // Only trigger if points actually INCREASED
      if (p > prev) {
        const checkMilestone = (val: number, old: number) => {
          if (val >= 500 && old < 500 && !triggeredMilestones.current.has('Legend')) return { emoji: '👑', title: '+ 500 điểm', body: 'Bạn đã đạt cấp độ Huyền Thoại', name: 'Legend' };
          if (val >= 150 && old < 150 && !triggeredMilestones.current.has('Diamond')) return { emoji: '💎', title: '+ 150 điểm', body: 'Bạn đã đạt cấp độ Kim Cương', name: 'Diamond' };
          if (val >= 125 && old < 125 && !triggeredMilestones.current.has('Platinum')) return { emoji: '⭐', title: '+ 125 điểm', body: 'Bạn đã đạt cấp độ Bạch Kim', name: 'Platinum' };
          if (val >= 100 && old < 100 && !triggeredMilestones.current.has('Gold')) return { emoji: '🏅', title: '+ 100 điểm', body: 'Bạn đã đạt cấp độ Vàng', name: 'Gold' };
          if (val >= 50 && old < 50 && !triggeredMilestones.current.has('Silver')) return { emoji: '🥈', title: '+ 50 điểm', body: 'Bạn đã mở khóa huy hiệu Bạc', name: 'Silver' };
          if (val >= 25 && old < 25 && !triggeredMilestones.current.has('Bronze')) return { emoji: '🥉', title: '+ 25 điểm', body: 'Bạn đã mở khóa huy hiệu Đồng', name: 'Bronze' };
          return null;
        };

        const milestone = checkMilestone(p, prev);
        if (milestone) {
          triggeredMilestones.current.add(milestone.name);
          triggerAchievement(milestone.emoji, milestone.title, milestone.body, milestone.name);
        }
      }
    }
    prevPoints.current = user?.points || 0;
  }, [user?.points, user?.uid]);

  const animatedAchievementStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: achievementY.value },
      { translateX: achievementTranslateX.value }
    ],
    opacity: interpolate(achievementY.value, [-100, 0], [0, 1], 'clamp') *
      interpolate(Math.abs(achievementTranslateX.value), [0, width * 0.5], [1, 0], 'clamp'),
  }));

  const achievementGesture = Gesture.Pan()
    .onUpdate((e) => {
      achievementTranslateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > width * 0.3) {
        achievementTranslateX.value = withTiming(e.translationX > 0 ? width : -width, { duration: 300 }, (isFinished) => {
          if (isFinished) {
            runOnJS(setShowAchievement)(false);
            achievementTranslateX.value = 0;
            achievementY.value = -150;
          }
        });
      } else {
        achievementTranslateX.value = withTiming(0);
      }
    });

  if (!showAchievement) return null;

  return (
    <GestureDetector gesture={achievementGesture}>
      <Animated.View style={[styles.achievementContainer, animatedAchievementStyle]}>
        <View style={styles.achievementIcon}>
          <Text style={{ fontSize: ms(28) }}>{achievementMsg.emoji}</Text>
        </View>
        <View style={styles.achievementTextContent}>
          <Text
            style={styles.achievementTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {achievementMsg.body}
          </Text>
          <Text
            style={styles.achievementBody}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
          >
            {achievementMsg.title}
          </Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isAppReady, setIsAppReady] = useState(false);
  // Perfect APK Transition
  useEffect(() => {
    async function hideSplash() {
      // Small 100ms burst to ensure JS background is painted
      await new Promise(resolve => setTimeout(resolve, 100));
      SplashScreen.hideAsync().catch(() => {});
    }
    hideSplash();
  }, []);

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LanguageProvider>
          <AuthProvider>
            <AchievementManager />
            {!isAppReady ? (
              <LoadingScreen 
                onFinish={() => {
                  setIsAppReady(true);
                }} 
              />
            ) : (
              <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                <Stack screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: '#FFFFFF' }
                }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="login" options={{ presentation: 'modal' }} />
                  <Stack.Screen name="register" options={{ presentation: 'modal' }} />
                </Stack>
                <StatusBar style="auto" />
              </ThemeProvider>
            )}
          </AuthProvider>
        </LanguageProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  achievementContainer: {
    position: 'absolute',
    top: vs(40),
    left: s(20),
    right: s(20),
    backgroundColor: '#1E293B',
    borderRadius: ms(20),
    flexDirection: 'row',
    alignItems: 'center',
    padding: s(16),
    paddingBottom: vs(24),
    zIndex: 999999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  achievementIcon: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(16),
  },
  achievementTextContent: {
    flex: 1,
  },
  achievementTitle: {
    color: '#FFFFFF',
    fontSize: ms(16),
    fontWeight: '400',
    marginBottom: vs(5),
  },
  achievementBody: {
    color: '#FFFFFF',
    fontSize: ms(20),
    fontWeight: '600',
    lineHeight: vs(20),
  },
});
