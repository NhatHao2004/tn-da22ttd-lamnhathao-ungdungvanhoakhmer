import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLeaderboardUsers } from '@/services/firebase-service';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { Easing, FadeInUp, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, s, vs } from '../../utils/responsive';



type MenuItem = {
  id: string;
  titleKey: string;
  icon: string;
  color?: string;
};

const menuItems: MenuItem[] = [
  { id: 'personal-info', titleKey: 'edit_profile', icon: 'person-outline' },
  { id: 'favorites', titleKey: 'favorites', icon: 'heart-outline' },
  { id: 'medal', titleKey: 'medal', icon: 'ribbon-outline' },
  { id: 'support', titleKey: 'support_feedback', icon: 'chatbox-ellipses-outline' },
  { id: 'settings', titleKey: 'settings', icon: 'settings-outline' },
  { id: 'login', titleKey: 'login', icon: 'power-outline', color: '#0022ffff' },
  { id: 'logout', titleKey: 'logout_full', icon: 'power-outline', color: '#FF4D4D' },
];


// --- Memoized Sub-components ---

const MenuItemComp = React.memo(({ item, index, isLast, isGuestOrLoggingOut, onPress, t }: any) => {
  const iconColor = isGuestOrLoggingOut && item.id !== 'login' ? '#94A3B8' : (item.color || '#555');
  const titleColor = isGuestOrLoggingOut && item.id !== 'login' ? '#94A3B8' : (item.color ? item.color : '#1A1A1A');
  const chevronColor = isGuestOrLoggingOut && item.id !== 'login' ? '#E2E8F0' : (item.color || '#CCC');

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        !isLast && styles.menuItemBorder,
        isGuestOrLoggingOut && item.id !== 'login' && { opacity: 0.5 }
      ]}
      onPress={() => onPress(item.id)}
      activeOpacity={0.6}
    >
      <Ionicons
        name={item.icon as any}
        size={ms(22)}
        color={iconColor}
        style={[
          styles.menuIcon,
          item.id === 'login' && { marginLeft: s(3), marginRight: s(12) }
        ]}
      />
      <Text style={[styles.menuTitle, { color: titleColor }]} numberOfLines={1}>
        {t(item.titleKey)}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={ms(18)}
        color={chevronColor}
      />
    </TouchableOpacity>
  );
});

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [userRank, setUserRank] = useState<string | number>('---');
  const [isLogoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoginRequiredVisible, setLoginRequiredVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const lastFetchTime = useRef<number>(0);

  // Animation for Logout Modal
  const logoutX = useSharedValue(Platform.OS === 'web' ? 0 : 400); // Using 400 as a safe off-screen value

  React.useEffect(() => {
    if (isLogoutModalVisible) {
      logoutX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.poly(4)),
      });
    } else {
      logoutX.value = withTiming(400, { duration: 250 });
    }
  }, [isLogoutModalVisible]);

  const animatedLogoutStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: logoutX.value }]
  }));

  const fetchRank = React.useCallback(async (force = false) => {
    if (!user || user.isAnonymous) {
      if (userRank !== 0) setUserRank(0);
      return;
    }

    const now = Date.now();
    if (!force && lastFetchTime.current && now - lastFetchTime.current < 30000) {
      return;
    }

    try {
      if (user.role === 'Quản trị viên') {
        setUserRank(0);
        return;
      }
      const users = await getLeaderboardUsers(100);
      const index = users.findIndex(u => u.uid === user.uid);
      const newRank = index !== -1 ? index + 1 : '>100';
      setUserRank(newRank);
      lastFetchTime.current = Date.now();
    } catch (error) {
      setUserRank('---');
    }
  }, [user?.uid, userRank]);

  useFocusEffect(
    React.useCallback(() => {
      fetchRank();
    }, [fetchRank])
  );


  const handleLogout = React.useCallback(() => {
    setLogoutModalVisible(true);
  }, []);

  const confirmLogout = React.useCallback(async () => {
    setLogoutModalVisible(false);
    setIsLoggingOut(true);
    await logout();
    router.replace({ pathname: '/(tabs)', params: { toast: 'logout_success' } });
  }, [logout, router]);

  const handleMenuPress = React.useCallback((id: string) => {
    const isGuest = !user || user.isAnonymous;
    if (isGuest && id !== 'login') {
      setLoginRequiredVisible(true);
      return;
    }

    switch (id) {
      case 'logout': handleLogout(); break;
      case 'login': router.push('/login'); break;
      case 'personal-info': router.push('/(tabs)/personal-info'); break;
      case 'favorites': router.push('/(tabs)/favorites'); break;
      case 'medal': router.push('/(tabs)/medal'); break;
      case 'support': router.push('/(tabs)/support'); break;
      case 'settings': router.push('/(tabs)/settings'); break;
    }
  }, [user, handleLogout, router]);


  // Optimized Menu Items Filtering
  const filteredMenuItems = React.useMemo(() => {
    return menuItems.filter(item => {
      const isGuest = !user || user.isAnonymous;
      if (item.id === 'logout') return !isGuest && !isLoggingOut;
      if (item.id === 'login') return isGuest || isLoggingOut;
      return true;
    });
  }, [user, isLoggingOut]);


  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>{t('my_profile')}</Text>
      </View>


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + vs(20) }}
      >
        <Animated.View entering={FadeInUp.springify().damping(20).duration(600)}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              {user?.avatar && (user && !user.isAnonymous && !isLoggingOut) ?
                (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={300}
                  />
                ) : (
                  <Ionicons name="person-circle-outline" size={ms(115)} color="#1e293b" />
                )}
            </View>

            {/* Info */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>
                {(user && !user.isAnonymous && !isLoggingOut) ? user?.name : t('guest')}
              </Text>
              {(user && !user.isAnonymous && !isLoggingOut) && user?.email && (
                <Text style={styles.profileEmail} numberOfLines={1} adjustsFontSizeToFit>{user.email}</Text>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Menu List */}
        <View style={styles.menuList}>
          {filteredMenuItems.map((item, index) => (
            <MenuItemComp
              key={item.id}
              item={item}
              index={index}
              isLast={index === filteredMenuItems.length - 1}
              isGuestOrLoggingOut={(!user || user.isAnonymous || isLoggingOut)}
              onPress={handleMenuPress}
              t={t}
            />
          ))}
        </View>
      </ScrollView>

      {/* Custom Login Modal */}
      <Modal
        visible={isLoginRequiredVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setLoginRequiredVisible(false)}
      >
        <View style={styles.loginModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setLoginRequiredVisible(false)}
          />
          <View style={styles.loginModalContent}>
            <View style={styles.loginModalIconCircle}>
              <Ionicons name="person-circle-outline" size={ms(40)} color="#3B82F6" />
            </View>
            <Text style={styles.loginModalTitle} numberOfLines={1} adjustsFontSizeToFit>{t('login_required')}</Text>
            <Text style={styles.loginModalSub} numberOfLines={1} adjustsFontSizeToFit>{t('login_to_use')}</Text>

            <View style={styles.loginModalActionRow}>
              <TouchableOpacity
                style={styles.loginModalPrimaryBtn}
                onPress={() => {
                  setLoginRequiredVisible(false);
                  router.push('/login');
                }}
              >
                <Text style={styles.loginModalPrimaryBtnText}>{t('login_title')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.loginModalSecondaryBtn}
                onPress={() => setLoginRequiredVisible(false)}
              >
                <Text style={styles.loginModalSecondaryBtnText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={isLogoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setLogoutModalVisible(false)}
          />
          <Animated.View style={[
            styles.logoutContent,
            animatedLogoutStyle,
            { paddingBottom: Math.max(insets.bottom, vs(30)) }
          ]}>
            <View style={styles.logoutHeader}>
              <View style={styles.logoutIconCircle}>
                <Ionicons name="log-out-outline" size={ms(34)} color="#FF4D4D" />
              </View>
              <Text style={styles.logoutMsg} numberOfLines={1} adjustsFontSizeToFit>{t('logout_confirm_msg')}</Text>
            </View>

            <View style={styles.logoutActionRow}>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmLogoutText}>{t('logout')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelLogoutBtn}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelLogoutText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(20),
    minHeight: vs(50),
    paddingBottom: vs(5),
  },
  headerTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1e293b',
    textAlign: 'center',
  },

  // Profile Card
  profileCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: s(33),
    paddingBottom: vs(20),
    paddingTop: vs(5),
    gap: vs(5),
  },
  avatarWrapper: {
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  avatar: {
    width: s(115),
    height: s(115),
    borderRadius: s(60),
    backgroundColor: '#f1f5f9',
  },
  profileInfo: {
    alignItems: 'center',
    gap: vs(2),
    width: '100%',
  },
  profileName: {
    fontSize: ms(24),
    fontWeight: '400',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: ms(32),
  },
  profileEmail: {
    fontSize: ms(14),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: ms(20),
  },

  // Menu
  menuList: {
    paddingHorizontal: s(24),
    paddingTop: vs(0),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(20),
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIcon: {
    marginRight: s(15),
    width: s(24),
    textAlign: 'center',
  },
  menuTitle: {
    flex: 1,
    fontSize: ms(16),
    fontWeight: '400',
    lineHeight: ms(23),
  },

  // Logout Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  logoutContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: s(30),
    borderTopRightRadius: s(30),
    paddingHorizontal: s(25),
    paddingTop: vs(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHandle: {
    width: s(40),
    height: vs(4),
    borderRadius: vs(2),
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: vs(10),
  },
  logoutHeader: {
    alignItems: 'center',
    marginBottom: vs(30),
    paddingTop: vs(15),
  },
  logoutIconCircle: {
    width: s(70),
    height: s(70),
    borderRadius: s(35),
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(15),
  },
  logoutMsg: {
    fontSize: ms(17),
    color: '#1e293b',
    textAlign: 'center',
    fontWeight: '400',
    paddingHorizontal: s(15), // Slightly more padding for better look on one line
  },
  logoutActionRow: {
    gap: vs(12),
    width: '100%',
  },
  confirmLogoutBtn: {
    height: vs(56),
    borderRadius: s(16),
    backgroundColor: '#FF4D4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmLogoutText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
  cancelLogoutBtn: {
    height: vs(56),
    borderRadius: s(16),
    backgroundColor: '#0080ffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelLogoutText: {
    color: '#ffffffff',
    fontSize: ms(16),
    fontWeight: '400',
  },

  // Login Required Modal
  loginModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  loginModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: s(32),
    borderTopRightRadius: s(32),
    paddingHorizontal: s(30),
    paddingTop: vs(25),
    paddingBottom: vs(5),
    width: '100%',
    minHeight: '40%',
    alignItems: 'center',
  },
  loginModalIconCircle: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(20),
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  loginModalTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1e293b',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  loginModalSub: {
    fontSize: ms(15),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(24),
  },
  loginModalActionRow: {
    width: '100%',
    gap: vs(12),
  },
  loginModalPrimaryBtn: {
    backgroundColor: '#3B82F6',
    height: vs(56),
    borderRadius: s(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loginModalPrimaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
  loginModalSecondaryBtn: {
    backgroundColor: '#ff0000ff',
    height: vs(56),
    borderRadius: s(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loginModalSecondaryBtnText: {
    color: 'rgba(255, 255, 255, 1)ff',
    fontSize: ms(16),
    fontWeight: '400',
  },
});
