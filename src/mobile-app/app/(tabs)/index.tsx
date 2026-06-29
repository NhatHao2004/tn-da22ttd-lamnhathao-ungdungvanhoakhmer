import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { ms, s, SCREEN_WIDTH, vs } from '@/utils/responsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  RefreshControl,
  StyleSheet as RNStyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const StyleSheet = RNStyleSheet;

const CATEGORY_CARD_WIDTH = (SCREEN_WIDTH - s(40) - (3 * s(8))) / 4;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [featuredDestinations, setFeaturedDestinations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [routeIndex, setRouteIndex] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const toastY = useSharedValue(-120);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 4000);
  };

  const params = useLocalSearchParams();
  useEffect(() => {
    if (!isLoading && params.toast) {
      const timer = setTimeout(() => {
        if (params.toast === 'login_success') {
          triggerToast(t('login_success'), 'success');
          router.setParams({ toast: undefined });
        } else if (params.toast === 'logout_success') {
          triggerToast(t('logout_success'), 'info');
          router.setParams({ toast: undefined });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, params.toast]);

  // Slide animation for notifications
  const slideX = useSharedValue(SCREEN_WIDTH);
  const scrollY = useSharedValue(0);



  // Animation for the notification bell
  const bellRotation = useSharedValue(0);

  // Helper: get local fallback image by category and id
  const getFallbackImage = (category: string, docId?: string) => {
    if (category === 'Chùa') {
      const pagodaImages: any = {
        'pagoda_1': require('@/assets/images/chuaang.jpg'),
        'pagoda_2': require('@/assets/images/chuahang.jpg'),
        'pagoda_3': require('@/assets/images/kampong.jpg'),
        'pagoda_4': require('@/assets/images/salengcu.jpg'),
        'pagoda_5': require('@/assets/images/veluvana.jpg'),
      };
      return pagodaImages[docId || ''] || require('@/assets/images/pagoda.jpg');
    }
    if (category === 'Văn hóa') return require('@/assets/images/lehoi.jpg');
    if (category === 'Ẩm thực') return require('@/assets/images/amthuc.jpg');
    return require('@/assets/images/pagoda.jpg');
  };

  // Helper functions to get local images if needed
  const getAppImage = (item: any, docId?: string) => {
    const { category, imageUrl } = item;
    // Support both HTTP URLs and base64 data URIs
    if (imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('data:'))) {
      return { uri: imageUrl };
    }
    // Fallback logic by category
    return getFallbackImage(category, docId || item.id);
  };

  const [allDestinations, setAllDestinations] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  // Subscribe to raw destinations once
  useEffect(() => {
    if (authLoading) return;
    setIsLoading(true);
    const q = query(collection(db, 'destinations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => {
        const data = doc.data();
        let detailRoute = '/(tabs)/index';
        if (data.category === 'Chùa') detailRoute = '/pagoda-detail';
        else if (data.category === 'Văn hóa') detailRoute = '/culture-detail';
        else if (data.category === 'Ẩm thực') detailRoute = '/food-detail';

        return {
          id: doc.id,
          ...data,
          id_num: data.id,
          name: data.name || '',
          category: data.category,
          image: getAppImage(data, doc.id),
          fallbackImage: getFallbackImage(data.category, doc.id),
          createdAt: data.createdAt,
          isNew: true, // Marker for fresh data
          route: {
            pathname: detailRoute,
            params: { id: doc.id }
          }
        };
      });
      setAllDestinations(allItems);
      setIsLoading(false);
    }, (error) => {
      console.error("Firestore Error in loadFeaturedData:", error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [authLoading]);

  // Compute suggestions based on state and inputs
  useEffect(() => {
    if (allDestinations.length === 0) return;

    // Sort everything by newest first
    const sortedByNewest = [...allDestinations].sort((a, b) => {
      const dateA = a.createdAt?.seconds || (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
      const dateB = b.createdAt?.seconds || (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
      return dateB - dateA;
    });

    const pagodas = sortedByNewest.filter(i => i.category === 'Chùa');
    const cultures = sortedByNewest.filter(i => i.category === 'Văn hóa');
    const foods = sortedByNewest.filter(i => i.category === 'Ẩm thực');

    let featured: any[] = [];
    const userInterests: string[] = user?.interests || [];

    // If refreshKey > 0, we force random shuffling to give new recommendations upon refreshing
    if (userInterests.length > 0 && refreshKey === 0) {
      // Lấy tất cả các mục thuộc các danh mục mà người dùng quan tâm
      const itemsInInterests = sortedByNewest.filter(i => userInterests.includes(i.category));

      if (itemsInInterests.length > 0) {
        // Trộn ngẫu nhiên các mục này để tạo sự đa dạng
        const shuffled = [...itemsInInterests].sort(() => Math.random() - 0.5);
        featured = shuffled.slice(0, 3);
      }

      // Nếu vẫn chưa đủ 3 mục (do danh mục quan tâm ít dữ liệu), bù thêm từ các danh mục khác
      if (featured.length < 3) {
        const others = sortedByNewest.filter(i => !featured.find(f => f.id === i.id));
        featured.push(...others.slice(0, 3 - featured.length));
      }
    } else {
      // Shuffled newest selections
      const shuffledPagodas = [...pagodas].sort(() => Math.random() - 0.5);
      const shuffledCultures = [...cultures].sort(() => Math.random() - 0.5);
      const shuffledFoods = [...foods].sort(() => Math.random() - 0.5);

      const newestPagoda = shuffledPagodas[0] || pagodas[0];
      const newestCulture = shuffledCultures[0] || cultures[0];
      const newestFood = shuffledFoods[0] || foods[0];

      if (newestPagoda) featured.push(newestPagoda);
      if (newestCulture) featured.push(newestCulture);
      if (newestFood) featured.push(newestFood);

      // If still less than 3, just take newest from remaining in random order
      if (featured.length < 3) {
        const remaining = sortedByNewest.filter(i => !featured.find(f => f.id === i.id));
        const shuffledRemaining = remaining.sort(() => Math.random() - 0.5);
        featured.push(...shuffledRemaining.slice(0, 3 - featured.length));
      }
    }

    // Final unique & limit
    featured = featured.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).slice(0, 3);
    setFeaturedDestinations(featured);
  }, [allDestinations, user?.interests, refreshKey, language]);

  const onRefresh = React.useCallback(() => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);

    // Simulate refresh loader spinning to prevent synchronous batching of false state
    setTimeout(() => {
      setRefreshing(false);
    }, 850);
  }, [refreshing]);

  useEffect(() => {
    if (unreadCount > 0) {
      bellRotation.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 100 }),
          withTiming(12, { duration: 100 }),
          withTiming(-12, { duration: 100 }),
          withTiming(12, { duration: 100 }),
          withTiming(0, { duration: 100 }),
          withDelay(2000, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      );
    } else {
      bellRotation.value = withTiming(0, { duration: 300 });
    }
  }, [unreadCount]);

  // Real-time Notifications Listener
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    const { query, collection, where, orderBy, onSnapshot } = require('firebase/firestore');
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const nData = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt?.toDate()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || t('just_now')
      }));
      setNotifications(nData);
      setUnreadCount(nData.filter((n: any) => !n.isRead).length);
    }, (error: any) => {
      // Suppress permission errors when user is likely signed out or blocked
      if (error.code !== 'permission-denied') {
        console.error("Notifications listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    const { writeBatch, doc } = require('firebase/firestore');
    const batch = writeBatch(db);
    notifications.forEach(n => {
      if (!n.isRead) {
        batch.update(doc(db, 'notifications', n.id), { isRead: true });
      }
    });
    await batch.commit();
  };

  const animatedBellStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${bellRotation.value}deg` }],
    };
  });

  const animatedSlideStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideX.value }],
    };
  });

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteNotification = async (id: string) => {
    if (!user) return;
    const { doc, deleteDoc } = require('firebase/firestore');
    try {
      await deleteDoc(doc(db, 'notifications', id));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      if (error.code === 'permission-denied') {
        triggerToast(t('action_error'), 'error');
      } else {
        triggerToast(t('update_failed'), 'error');
      }
      setDeletingId(null);
    }
  };

  const closeNotifications = () => {
    setDeletingId(null); // Reset trạng thái xóa khi đóng
    slideX.value = withTiming(SCREEN_WIDTH, { duration: 300 });
    setTimeout(() => setShowNotifications(false), 300);
  };

  const services = [
    { id: 1, label: t('temple'), icon: require('@/assets/images/pagoda.jpg'), color: '#FF7000', route: '/pagoda' },
    { id: 3, label: t('culture'), icon: require('@/assets/images/festival.jpg'), color: '#A000FF', route: '/culture' },
    { id: 2, label: t('food'), icon: require('@/assets/images/amthuc.jpg'), color: '#FF0050', route: '/food' },
    { id: 4, label: t('language_study'), icon: require('@/assets/images/hoctap.jpg'), color: '#00C850', route: '/language_study' },
  ];

  const toggleFavorite = (id: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const handleCategoryPress = (route: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(route);
  };

  // Track image load errors per featured item
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  return (
    <View style={styles.container}>
      {/* Premium Toast System - At the very top for priority */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedToastStyle,
            {
              backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
              shadowColor: toastType === 'success' ? '#10B981' : '#EF4444',
              top: insets.top + vs(8),
            }
          ]}
        >
          <View style={styles.toastIcon}>
            <Ionicons
              name={toastType === 'error' ? "close" : "checkmark"}
              size={ms(20)}
              color="#FFF"
            />
          </View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}

      <View>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile' as any)}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar as string }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-circle" size={ms(40)} color="#000000ff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.welcomeText}>
              <ThemedText style={styles.helloText}>{t('welcome_hello')}</ThemedText>
              <ThemedText style={styles.userName} numberOfLines={1} adjustsFontSizeToFit>{user?.name || t('guest')}</ThemedText>
            </View>
          </View>
          <View style={styles.headerRightActions}>
            {user?.role === 'Quản trị viên' && (
              <TouchableOpacity
                style={styles.notificationBtnSimple}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.replace('/(admin)');
                }}
              >
                <MaterialCommunityIcons name="shield-account-outline" size={27} color="#000" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.notificationBtnSimple}
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setShowNotifications(true);
                slideX.value = withTiming(0, { duration: 300 });
              }}
            >
              <Animated.View style={animatedBellStyle}>
                <Ionicons name="notifications-outline" size={30} color="#000" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 2 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={50}
              colors={['#FF0050']}
              tintColor="#FF0050"
            />
          }
        >
          {/* Promo Banner */}
          <View style={styles.promoBanner}>
            <Image
              source={require('@/assets/images/banner.png')}
              style={styles.promoImage}
              contentFit="cover"
            />
          </View>

          {/* Categories Grid */}
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>{t('explore_categories')}</ThemedText>
          </View>

          <View style={styles.categoryGrid}>
            {services.map((item, index) => (
              <View
                key={item.id}
                style={styles.categoryCol}
              >
                <TouchableOpacity
                  onPress={() => handleCategoryPress(item.route)}
                  style={styles.serviceCardMini}
                >
                  <Image
                    source={item.icon}
                    style={styles.serviceIconImage}
                    transition={200}
                    contentFit="contain"
                  />
                  <ThemedText style={styles.serviceLabelMini} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.3}>{item.label}</ThemedText>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Featured List Header */}
          <View style={[styles.sectionHeader, { paddingBottom: vs(10), marginTop: vs(8) }]}>
            <ThemedText style={[styles.sectionTitle, { flex: 1, marginRight: s(10) }]} numberOfLines={1} adjustsFontSizeToFit>
              {t('suggestions_for_you')}
            </ThemedText>
            <TouchableOpacity
              style={{ flexShrink: 0 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const cyclicRoutes: any[] = ['/pagoda', '/culture', '/food'];
                const route = cyclicRoutes[routeIndex % cyclicRoutes.length];
                setRouteIndex(prev => prev + 1);
                router.push(route);
              }}
            >
              <ThemedText style={styles.viewAllText} numberOfLines={1}>{t('see_all')}</ThemedText>
            </TouchableOpacity>
          </View>
          {featuredDestinations.map((item, index) => (
            <View
              key={item.id}
              style={styles.featuredCard}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleCategoryPress(item.route)}
              >
                <View style={styles.cardImageContainer}>
                  <Image
                    source={imgErrors[item.id] ? item.fallbackImage : item.image}
                    style={styles.cardImage}
                    transition={300}
                    contentFit="cover"
                    onError={() => {
                      if (!imgErrors[item.id]) {
                        setImgErrors(prev => ({ ...prev, [item.id]: true }));
                      }
                    }}
                  />
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.cardHeaderRow}>
                    <ThemedText style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
                      {language === 'km' ? (item.name_khmer || item.name || item.title) : (item.name || item.title)}
                    </ThemedText>
                  </View>

                  <View style={styles.cardFooter}>
                    {(item.reviews ?? 0) > 0 && (
                      <View style={styles.reviewInfo}>
                        <ThemedText style={styles.reviewText}>{item.reviews} {t('reviews_label')}</ThemedText>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

      </View>

      {/* Notification Center Modal */}
      <Modal
        visible={showNotifications}
        animationType="none"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={closeNotifications}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeNotifications}
        >
          <Animated.View style={[styles.notificationContainer, animatedSlideStyle]}>
            <View style={styles.nHeader}>
              <Text style={styles.nTitle}>{t('notifications_title')}</Text>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    markAllAsRead();
                  }}
                  style={styles.markReadBtn}
                >
                  <Ionicons name="checkmark-done-outline" size={ms(18)} color="#000000ff" />
                  <Text style={styles.markReadText}>{t('mark_all_read') || 'Đọc tất cả'}</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.nList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={notifications.length === 0 ? { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 } : { paddingBottom: 20 }}
            >
              {notifications.length > 0 ? (
                notifications.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.nItem, !item.isRead && styles.nItemUnread]}
                    onLongPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setDeletingId(item.id);
                    }}
                    onPress={async () => {
                      if (deletingId) {
                        setDeletingId(null);
                        return;
                      }
                      // Đánh dấu đã đọc
                      if (!item.isRead) {
                        const { doc, updateDoc } = require('firebase/firestore');
                        await updateDoc(doc(db, 'notifications', item.id), { isRead: true });
                      }

                      closeNotifications();

                      // Chuyển hướng
                      if (item.postId) {
                        if (item.type === 'like') {
                          // Nếu là Like: Chỉ sang Community xem bài viết
                          router.push('/(tabs)/community' as any);
                        } else {
                          // Nếu là Comment/Reply: Sang Community và mở Modal
                          router.push({
                            pathname: '/(tabs)/community',
                            params: {
                              openPostId: item.postId,
                              targetCommentId: item.targetId
                            }
                          } as any);
                        }
                      } else if (item.type === 'reply') {
                        // Đây là phản hồi feedback từ Admin
                        router.push('/(tabs)/support' as any);
                      } else if (item.type === 'achievement') {
                        // Chuyển sang màn hình Thử thách khi click vào thông báo huy hiệu
                        router.push('/(tabs)/quiz' as any);
                      } else {
                        router.push('/(tabs)/community' as any);
                      }
                    }}
                  >
                    <TouchableOpacity
                      style={[
                        styles.nIcon,
                        { backgroundColor: deletingId === item.id ? '#FEE2E2' : (!item.isRead ? '#FEE2E2' : '#F0FDF4') }
                      ]}
                      onPress={() => {
                        if (deletingId === item.id) {
                          deleteNotification(item.id);
                        }
                      }}
                    >
                      {deletingId === item.id ? (
                        <Ionicons name="close" size={24} color="#EF4444" />
                      ) : (
                        <Animated.View style={!item.isRead ? animatedBellStyle : null}>
                          <Ionicons
                            name={!item.isRead ? 'notifications' : 'notifications-outline'}
                            size={18}
                            color={!item.isRead ? '#EF4444' : '#10B981'}
                          />
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.nContent}>
                      <View style={{ flex: 1, marginRight: s(10) }}>
                        <View style={{ flexDirection: 'column' }}>
                          {item.type !== 'achievement' && item.fromUserName && (
                            <Text style={[styles.nItemTitle, { color: '#EF4444', fontWeight: 'bold', fontSize: ms(15) }]} numberOfLines={1}>
                              {item.fromUserName}
                            </Text>
                          )}
                          {(() => {
                            const messageStr = t(item.message);
                            const action = messageStr.includes(': ') ? messageStr.split(': ')[0] : messageStr;
                            return (
                              <Text style={[styles.nItemTitle, { marginTop: vs(1), fontSize: ms(15) }]}>
                                {action}
                              </Text>
                            );
                          })()}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="notifications-off-outline" size={ms(45)} color="#E2E8F0" />
                  <Text style={{ color: '#94A3B8', marginTop: vs(12), fontSize: ms(14) }}>{t('no_notifications')}</Text>
                </View>
              )}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? vs(40) : vs(40),
  },
  featuredCard: {
    width: SCREEN_WIDTH - s(32),
    marginHorizontal: s(16),
    backgroundColor: '#FFF',
    borderRadius: s(20),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: vs(6) },
    shadowOpacity: 0.1,
    shadowRadius: s(12),
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    marginBottom: vs(12),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
    maxWidth: '80%',
  },
  avatar: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: s(50),
    height: s(50),
    borderRadius: s(25),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  welcomeText: {
    justifyContent: 'center',
    gap: vs(1),
  },
  helloText: {
    fontSize: ms(13.5),
    color: '#1E293B',
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1E293B',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationBtnSimple: {
    width: s(52),
    height: s(52),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -vs(4),
    right: -s(4),
    backgroundColor: '#EF4444',
    minWidth: ms(18),
    height: ms(18),
    borderRadius: ms(9),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 99,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: ms(10),
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: ms(12),
  },
  content: {
    flex: 1,
  },
  promoBanner: {
    marginHorizontal: s(24),
    height: vs(160),
    backgroundColor: '#DBEAFE',
    borderRadius: s(28),
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: vs(5),
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  promoImage: {
    ...RNStyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(24),
    marginTop: 0,
    marginBottom: 0,
    paddingTop: vs(5),
    paddingBottom: 0,
  },
  viewAllText: {
    color: '#64748B',
    fontSize: ms(13),
    fontWeight: '400',
  },
  sectionTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1E293B',
    lineHeight: ms(30),
    paddingBottom: 0,
  },
  categoryGrid: {
    flexDirection: 'row',
    paddingHorizontal: s(24),
    justifyContent: 'space-between',
    marginBottom: 0,
    marginTop: vs(12),
  },
  categoryCol: {
    width: CATEGORY_CARD_WIDTH,
  },
  serviceCardMini: {
    backgroundColor: '#FFF',
    borderRadius: s(20),
    paddingVertical: vs(10),
    paddingHorizontal: s(4),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: vs(95),
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.08,
    shadowRadius: s(8),
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  serviceIconImage: {
    width: s(38),
    height: s(38),
    marginBottom: vs(8),
  },
  serviceLabelMini: {
    fontSize: ms(9.5),
    fontWeight: '400',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: ms(13),
    paddingHorizontal: s(2),
    marginTop: vs(2),
  },
  // Toast Styles
  toastContainer: {
    position: 'absolute',
    left: s(16),
    right: s(16),
    height: vs(46),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(14),
    zIndex: 9999,
    elevation: 10,
  },
  toastIcon: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: ms(13),
    fontWeight: '400',
    marginLeft: s(10),
    flex: 1,
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: s(20),
    borderTopRightRadius: s(20),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: s(18),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  cardTitle: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#1E293B',
    flex: 1,
    marginRight: s(10),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewText: {
    fontSize: ms(12),
    color: '#94A3B8',
    fontWeight: '400',
  },
  // Notification Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  notificationContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: s(30),
    borderBottomLeftRadius: s(30),
    width: '85%',
    height: '100%',
    padding: s(24),
    alignSelf: 'flex-end',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -s(5), height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: s(15),
  },
  nHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(15),
    paddingTop: vs(10),
  },
  nTitle: {
    fontSize: ms(20),
    fontWeight: '600',
    color: '#1e293b',
  },
  nList: {
    flex: 1,
  },
  nItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(15),
    marginBottom: vs(20),
    paddingBottom: vs(15),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
    paddingLeft: s(10),
  },
  nItemUnread: {
    backgroundColor: '#eff6ff', // More distinct light blue
    borderRadius: s(12),
    padding: s(15),
    borderBottomWidth: 0,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
    paddingVertical: vs(5),
    paddingHorizontal: s(10),
    backgroundColor: '#eff6ff',
    borderRadius: s(20),
  },
  markReadText: {
    fontSize: ms(11),
    color: '#000000ff',
    fontWeight: '500',
  },
  unreadDot: {
    position: 'absolute',
    top: -s(2),
    right: -s(2),
    width: s(10),
    height: s(10),
    borderRadius: s(5),
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  nIcon: {
    width: s(34),
    height: s(34),
    borderRadius: s(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(-6),
  },
  nContent: {
    flex: 1,
  },
  nItemTitle: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#1e293b',
    lineHeight: vs(21),
    marginBottom: vs(4),
  },
  nItemTime: {
    fontSize: ms(11),
    color: '#94A3B8',
    fontWeight: '400',
  },
  nItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: vs(4),
  },
  deleteBtn: {
    position: 'absolute',
    right: -s(4),
    bottom: -vs(4),
    padding: s(4),
  },
});
