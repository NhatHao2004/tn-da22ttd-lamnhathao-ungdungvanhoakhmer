import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../contexts/AuthContext';
import { db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - s(48)) / 2;

// --- Optimized Sub-components ---

const StatCard = memo(({ label, count, icon, onPress }: any) => (
  <TouchableOpacity
    style={styles.statCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.iconBox}>
      {icon}
    </View>
    <View style={styles.statInfoRow}>
      <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
      <View style={styles.statNumberGroup}>
        <Text style={styles.statNumber}>{count}</Text>
      </View>
    </View>
  </TouchableOpacity>
));
StatCard.displayName = 'StatCard';

const PodiumItem = memo(({ user, index }: any) => {
  const rank = index + 1;
  const barColor = useMemo(() => {
    if (rank === 1) return '#ef4444';
    if (rank === 2) return '#facc15';
    if (rank === 3) return '#22c55e';
    return '#94a3b8';
  }, [rank]);

  const barHeight = useMemo(() => {
    if (rank === 1) return vs(125);
    if (rank === 2) return vs(105);
    if (rank === 3) return vs(90);
    return vs(70);
  }, [rank]);

  return (
    <View style={styles.podiumCol}>
      <View style={styles.userHead}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={rank === 1 ? styles.avatarLarge : styles.avatarMini}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, rank === 1 && styles.avatarLarge]}>
              <Ionicons name="person" size={rank === 1 ? ms(24) : ms(16)} color="#cbd5e1" />
            </View>
          )}
        </View>
        <View style={styles.podiumTextGroup}>
          <Text style={styles.podiumName} numberOfLines={1} adjustsFontSizeToFit>{user.name || '---'}</Text>
          <Text style={styles.podiumPoints} numberOfLines={1} adjustsFontSizeToFit>{user.points || 0} điểm</Text>
        </View>
      </View>
      <View style={[styles.bar, { height: barHeight, backgroundColor: barColor }]}>
        <Text style={styles.rankNum}>{rank}</Text>
      </View>
    </View>
  );
});
PodiumItem.displayName = 'PodiumItem';

const ActivityCard = memo(({ activity }: any) => (
  <View style={styles.activityCard}>
    <View style={styles.activityMainRow}>
      <View style={styles.activityAvatarBox}>
        {activity.avatar ? (
          <Image
            source={{ uri: activity.avatar }}
            style={styles.activityAvatar}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.activityAvatarPlaceholder}>
            <Ionicons name="person" size={ms(18)} color="#94a3b8" />
          </View>
        )}
      </View>
      <View style={styles.activityInfo}>
        <View style={styles.activityHeaderRow}>
          <Text style={styles.activityItemTitle} numberOfLines={1}>{activity.name}</Text>
        </View>
        <Text style={styles.activityDesc} numberOfLines={1} adjustsFontSizeToFit>Đã đăng ký tài khoản thành công</Text>
      </View>
    </View>
  </View>
));
ActivityCard.displayName = 'ActivityCard';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    content: 0,
    challenges: 0,
    posts: 0
  });
  const [allSortedUsers, setAllSortedUsers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [adminName, setAdminName] = useState('');
  const [adminAvatar, setAdminAvatar] = useState('');
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [pendingPosts, setPendingPosts] = useState(0);
  const [recentFeedbacks, setRecentFeedbacks] = useState<any[]>([]);

  const totalPending = useMemo(() => pendingFeedback + pendingPosts, [pendingFeedback, pendingPosts]);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [quickReply, setQuickReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const leaderboardRef = useRef<ScrollView>(null);
  const { logout, user } = useContext(AuthContext);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const toastY = useSharedValue(-120);

  const triggerToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 3000);
  }, []);

  const insets = useSafeAreaInsets();
  const toastTop = insets.top + vs(8);

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));


  useEffect(() => {
    // Lấy số lượng người dùng (loại bỏ Admin một cách an toàn)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const regularUsers = snap.docs.filter(doc => {
        const data = doc.data();
        return data.role !== 'Quản trị viên' && data['quyền'] !== 'Quản trị viên';
      });
      setStats(prev => ({ ...prev, users: regularUsers.length }));
    }, (err) => console.error('Snapshot users error:', err));

    // Lấy số lượng địa điểm/nội dung
    const unsubDestinations = onSnapshot(collection(db, 'destinations'), (snap) => {
      setStats(prev => ({ ...prev, content: snap.size }));
    }, (err) => console.error('Snapshot destinations error:', err));

    // Lấy số lượng thử thách
    const unsubQuizzes = onSnapshot(collection(db, 'quizzes'), (snap) => {
      setStats(prev => ({ ...prev, challenges: snap.size }));
    }, (err) => console.error('Snapshot quizzes error:', err));

    // Lấy số lượng bài viết và số bài đăng chờ duyệt
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      setStats(prev => ({ ...prev, posts: snap.size }));
      const pendingCount = snap.docs.filter(doc => doc.data().approved === false).length;
      setPendingPosts(prev => {
        if (pendingCount > prev && prev !== 0) {
          triggerToast('Có bài viết mới đang chờ duyệt', 'info');
        }
        return pendingCount;
      });
    }, (err) => console.error('Snapshot posts error:', err));

    // Lấy bảng xếp hạng
    const unsubLeaderboard = onSnapshot(collection(db, 'users'), (snap) => {
      const allUsers = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((u: any) => u.role !== 'Quản trị viên' && u['quyền'] !== 'Quản trị viên');

      const sortedUsers = allUsers.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
      setAllSortedUsers(sortedUsers);
    }, (err) => console.error('Snapshot leaderboard error:', err));

    // Lấy hoạt động gần đây
    const unsubRecent = onSnapshot(collection(db, 'users'), (snap) => {
      const now = new Date().getTime();
      const oneDayInMs = 24 * 60 * 60 * 1000;

      const recentUsers = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((u: any) => {
          // Lọc: Không phải admin VÀ phải trong vòng 24h
          const isAdmin = u.role === 'Quản trị viên' || u['quyền'] === 'Quản trị viên';
          if (isAdmin) return false;

          if (!u.createdAt) return false;
          const createTime = u.createdAt.toDate ? u.createdAt.toDate().getTime() : new Date(u.createdAt).getTime();
          return (now - createTime) < oneDayInMs;
        });

      const sortedRecent = recentUsers.sort((a: any, b: any) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });

      const activities = sortedRecent.slice(0, 5).map((u: any) => ({
        id: u.id,
        name: u.name || u['tên'] || 'Người dùng mới',
        avatar: u.avatar || '',
        timeAgo: getTimeAgo(u.createdAt)
      }));

      setRecentActivities(activities);
    }, (err) => console.error('Snapshot recent activities error:', err));

    let unsubAdmin: any;
    if (user?.uid) {
      unsubAdmin = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setAdminName(data.name || data['tên'] || '');
          setAdminAvatar(data.avatar || '');
        }
      }, (err) => console.error('Snapshot admin context error:', err));
    }
    return () => {
      unsubUsers();
      unsubRecent();
      unsubDestinations();
      unsubQuizzes();
      unsubPosts();
      unsubLeaderboard();
      if (unsubAdmin) unsubAdmin();
    };
  }, []);

  const handleSendQuickReply = async () => {
    if (!quickReply.trim() || !selectedFeedback) return;
    setSendingReply(true);
    try {
      await updateDoc(doc(db, 'feedback', selectedFeedback.id), {
        adminReply: quickReply.trim(),
        repliedAt: new Date()
      });

      // Gửi thông báo cho người dùng
      if (selectedFeedback.userId) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: selectedFeedback.userId,
          fromUserId: user?.uid,
          fromUserName: 'Quản trị viên',
          type: 'reply',
          message: 'feedback_replied_notif',
          createdAt: new Date(),
          isRead: false
        });
      }

      triggerToast('Đã gửi phản hồi thành công', 'success');
      setQuickReply('');
      setShowDetailModal(false);
      setSelectedFeedback(null);
    } catch (error) {
      console.error(error);
      triggerToast('Không thể gửi phản hồi', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  useEffect(() => {
    // Listen for all feedback to handle count and recent list
    // Removing orderBy from Firestore if it causes issues with missing fields or indexes
    const unsubFeedback = onSnapshot(collection(db, 'feedback'), (snap) => {
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      // Sort in memory to be safe
      const sorted = allData.sort((a, b) => {
        const getTime = (ts: any) => {
          if (!ts) return 0;
          if (ts.seconds) return ts.seconds * 1000;
          if (ts.toDate) return ts.toDate().getTime();
          return new Date(ts).getTime();
        };
        return getTime(b.createdAt) - getTime(a.createdAt);
      });

      const unrepliedList = allData.filter((f: any) => {
        const reply = f.adminReply;
        return reply === null || reply === undefined || reply === '' || (typeof reply === 'string' && reply.trim() === '');
      });
      const unrepliedCount = unrepliedList.length;

      const onlyUnreplied = sorted.filter((f: any) => {
        const reply = f.adminReply;
        return reply === null || reply === undefined || reply === '' || (typeof reply === 'string' && reply.trim() === '');
      });

      setRecentFeedbacks(onlyUnreplied.slice(0, 15));

      setPendingFeedback(prev => {
        if (unrepliedCount > prev && prev !== 0) {
          triggerToast(`Bạn có phản hồi mới từ người dùng`, 'info');
        }
        return unrepliedCount;
      });
    }, (err) => console.error('Snapshot feedback error:', err));

    return () => unsubFeedback();
  }, [triggerToast]);

  const getTimeAgo = useCallback((timestamp: any) => {
    if (!timestamp) return 'Vừa xong';
    let date: Date;

    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');

    const now = new Date();
    const isToday = now.toDateString() === date.toDateString();

    if (isToday) {
      return `${hours}:${minutes}`;
    } else {
      return `${hours}:${minutes} ${day}/${month}`;
    }
  }, []);

  // Tính danh sách hiển thị
  const displayedLeaderboard = useMemo(() => {
    const leaderboardLimit = 20;
    const topUsers = allSortedUsers.slice(0, leaderboardLimit);
    return Array.from({ length: leaderboardLimit }, (_, i) => {
      return topUsers[i] || { id: `empty-${i}`, name: '---', points: 0, dummy: true };
    });
  }, [allSortedUsers]);



  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, vs(15)) }]}>
      {/* Premium Toast System */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedToastStyle,
            {
              backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
              shadowColor: toastType === 'success' ? '#10B981' : '#EF4444',
              top: toastTop,
            }
          ]}
        >
          <View style={styles.toastIcon}>
            <Ionicons
              name={toastType === 'success' ? "checkmark" : toastType === 'error' ? "close" : "information-circle"}
              size={ms(20)}
              color="#FFF"
            />
          </View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + vs(40) }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.push('/(admin)/profile' as any)}
            activeOpacity={0.7}
            style={styles.headerAdminInfo}
          >
            <View style={styles.adminHeaderAvatar}>
              {adminAvatar ? (
                <Image
                  source={{ uri: adminAvatar }}
                  style={styles.adminHeaderAvatarImg}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.adminHeaderAvatarPlaceholder}>
                  <Ionicons name="person" size={ms(16)} color="#94a3b8" />
                </View>
              )}
            </View>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
              {adminName || 'Quản trị viên'}
            </Text>
          </TouchableOpacity>
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)')}
              style={styles.notificationBtn}
            >
              <MaterialCommunityIcons name="shield-account-outline" size={ms(26)} color="#000000ff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowFeedbackModal(true)}
              style={styles.notificationBtn}
            >
              <Ionicons name="notifications-outline" size={ms(28)} color="#000000ff" />
              {totalPending > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{totalPending > 99 ? '99+' : totalPending}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Statistics Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            label="Người dùng"
            count={stats.users}
            icon={<Ionicons name="person-outline" size={ms(22)} color="#ef4444" />}
            onPress={() => router.push('/(admin)/user' as any)}
          />
          <StatCard
            label="Nội dung"
            count={stats.content}
            icon={<Ionicons name="chatbubbles-outline" size={ms(22)} color="#3b82f6" />}
            onPress={() => router.push('/(admin)/content' as any)}
          />

          <StatCard
            label="Thử thách"
            count={stats.challenges}
            icon={<Ionicons name="help-circle-outline" size={ms(26)} color="#f59e0b" />}
            onPress={() => router.push('/(admin)/challenges' as any)}
          />
          <StatCard
            label="Bài viết"
            count={stats.posts}
            icon={<MaterialCommunityIcons name="chat-outline" size={ms(25)} color="#ec4899" />}
            onPress={() => router.push('/(admin)/article' as any)}
          />
        </View>

        {/* Leaderboard Chart Section */}
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle} numberOfLines={1} adjustsFontSizeToFit>Bảng xếp hạng người dùng</Text>
        </View>

        <View style={styles.podiumContainer}>
          <ScrollView
            ref={leaderboardRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.podiumScrollContent}
            decelerationRate="fast"
            snapToInterval={s(100)}
          >
            {displayedLeaderboard.map((user, index) => (
              <PodiumItem key={user.id} user={user} index={index} />
            ))}
          </ScrollView>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.activityHeader}>
          <Text style={styles.activityTitle} numberOfLines={1} adjustsFontSizeToFit>Người dùng mới</Text>
          <TouchableOpacity
            style={styles.seeAllBtn}
            onPress={() => router.push('/(admin)/user' as any)}
          >
            <Text style={styles.seeAllText} numberOfLines={1} adjustsFontSizeToFit>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.activityContainer}>
          {recentActivities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
          {recentActivities.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Chưa có hoạt động mới nào</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Feedback Quick View Modal */}
      <Modal
        visible={showFeedbackModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowFeedbackModal(false)}
      >
        <TouchableOpacity
          style={styles.feedbackModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFeedbackModal(false)}
        >
          <View style={[styles.feedbackModalContent, { paddingTop: insets.top + vs(5) }]}>
            <View style={styles.feedbackModalHeader}>
              <TouchableOpacity
                onPress={() => setShowFeedbackModal(false)}
                style={styles.modalBackBtn}
              >
                <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
              </TouchableOpacity>
              <Text
                style={[styles.feedbackModalTitle, { textAlign: 'center', width: '100%' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Thông báo
              </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
              {pendingPosts > 0 && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#fffbeb',
                    borderRadius: s(14),
                    padding: s(14),
                    marginBottom: vs(12),
                    borderWidth: 1,
                    borderColor: '#fde68a',
                    gap: s(12),
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowFeedbackModal(false);
                    router.push('/(admin)/article' as any);
                  }}
                >
                  <View style={{
                    width: s(40),
                    height: s(40),
                    borderRadius: s(20),
                    backgroundColor: '#f59e0b',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                    <Ionicons name="newspaper-outline" size={ms(20)} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: ms(14), fontWeight: '600', color: '#000000ff' }} numberOfLines={1}>
                      {pendingPosts} bài viết chờ duyệt
                    </Text>
                    <Text style={{ fontSize: ms(12), color: '#000000ff', marginTop: vs(2) }} numberOfLines={1}>
                      Nhấn để xem và phê duyệt
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={ms(18)} color="#000000ff" />
                </TouchableOpacity>
              )}
              {recentFeedbacks.length > 0 ? (
                recentFeedbacks.map((f, i) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.feedbackSummaryItem, (!f.adminReply || f.adminReply === '') && styles.newFeedbackItem]}
                    onPress={() => {
                      setSelectedFeedback({
                        ...f,
                        avatar: f.avatar || allSortedUsers.find(u => u.email === f['e-mail'])?.avatar
                      });
                      setQuickReply(f.adminReply || '');
                      setShowDetailModal(true);
                    }}
                  >
                    <View style={styles.feedbackItemHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: s(8) }}>
                        <View style={styles.feedbackListAvatar}>
                          {(f.avatar || allSortedUsers.find(u => u.email === f['e-mail'])?.avatar) ? (
                            <Image
                              source={{ uri: f.avatar || allSortedUsers.find(u => u.email === f['e-mail'])?.avatar }}
                              style={styles.feedbackListAvatarImg}
                              contentFit="cover"
                            />
                          ) : (
                            <Text style={styles.feedbackListAvatarInitial}>
                              {(f.name || f.userName || 'U').charAt(0).toUpperCase()}
                            </Text>
                          )}
                        </View>
                        <View style={{ flex: 1, gap: vs(2) }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.feedbackUserName} numberOfLines={1}>
                              {f.name || f.userName || f.displayName || f['e-mail']?.split('@')[0] || 'Người dùng'}
                            </Text>
                            <Text style={styles.feedbackTime}>{f.createdAt ? getTimeAgo(f.createdAt) : 'Vừa xong'}</Text>
                          </View>
                          <Text style={styles.feedbackSubText} numberOfLines={1} adjustsFontSizeToFit>Đã gửi phản hồi, nhấn vào xem chi tiết</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyFeedback}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="chatbox-ellipses-outline" size={ms(40)} color="#94a3b8" />
                  </View>
                  <Text style={styles.emptyFeedbackText}>Chưa có phản hồi mới nào từ người dùng</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Quick Feedback Detail & Reply Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowDetailModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={[styles.detailModalBox, { paddingTop: insets.top + vs(5), paddingBottom: Math.max(insets.bottom, vs(20)) }]}>
            <View style={styles.detailModalHeader}>
              <TouchableOpacity
                onPress={() => setShowDetailModal(false)}
                style={styles.modalBackBtn}
              >
                <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
              </TouchableOpacity>
              <Text
                style={[styles.detailModalTitle, { textAlign: 'center', width: '100%' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                Chi tiết phản hồi
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={styles.detailScroll}
              contentContainerStyle={{ paddingBottom: vs(20) }}
            >
              <View style={styles.detailUserRow}>
                <View style={[styles.detailAvatar, { backgroundColor: '#eff6ff' }]}>
                  {selectedFeedback?.avatar ? (
                    <Image
                      source={{ uri: selectedFeedback.avatar }}
                      style={styles.detailAvatarImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <Text style={styles.detailAvatarInitial}>
                      {(selectedFeedback?.name || selectedFeedback?.userName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailNameText}>
                    {selectedFeedback?.name || selectedFeedback?.userName || selectedFeedback?.['e-mail']?.split('@')[0] || 'Người dùng'}
                  </Text>
                  <Text style={styles.detailEmailText}>{selectedFeedback?.['e-mail']}</Text>
                </View>
              </View>

              <View style={styles.msgBubble}>
                <Text style={styles.msgContentText}>
                  <Text style={{ fontWeight: '400', color: '#1e293b' }}>Nội dung: </Text>
                  {selectedFeedback?.message || selectedFeedback?.content}
                </Text>
              </View>

              <View style={styles.replySection}>
                <Text style={styles.replyLabel}>Trả lời phản hồi</Text>
                <TextInput
                  style={styles.replyInput}
                  value={quickReply}
                  onChangeText={setQuickReply}
                  placeholder="Nhập nội dung phản hồi..."
                  multiline
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.detailFooter}>
              <TouchableOpacity
                style={[styles.quickCancelBtn]}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.quickCancelText}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickSendBtn, (!quickReply.trim() || sendingReply || quickReply.trim() === selectedFeedback?.adminReply) && styles.disabledBtn]}
                onPress={handleSendQuickReply}
                disabled={!quickReply.trim() || sendingReply || quickReply.trim() === selectedFeedback?.adminReply}
              >
                {sendingReply ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.quickSendText}>Gửi phản hồi</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Toast System inside Modal */}
          {showToast && (
            <Animated.View
              style={[
                styles.toastContainer,
                animatedToastStyle,
                {
                  backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
                  shadowColor: toastType === 'success' ? '#10B981' : '#EF4444',
                  top: toastTop,
                }
              ]}
            >
              <View style={styles.toastIcon}>
                <Ionicons
                  name={toastType === 'success' ? "checkmark" : toastType === 'error' ? "close" : "information-circle"}
                  size={ms(20)}
                  color="#FFF"
                />
              </View>
              <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Logout Modal removed from here, moved to profile.tsx */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(20),
    paddingBottom: vs(5),
    minHeight: vs(60),
  },
  headerTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1e293b',
    letterSpacing: -0.5,
    flex: 1,
  },
  headerAdminInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  adminHeaderAvatar: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  adminHeaderAvatarImg: {
    width: '100%',
    height: '100%',
  },
  adminHeaderAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  menuBtn: {
    padding: s(6),
    backgroundColor: '#fff',
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  trashBtnHeader: {
    padding: s(8),
    backgroundColor: '#fff',
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: s(16),
    justifyContent: 'space-between',
    gap: s(12),
    marginBottom: vs(15),
    marginTop: vs(5),
  },
  statCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: s(24),
    padding: s(14),
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconBox: {
    width: s(38),
    height: s(38),
    borderRadius: s(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(8),
  },
  statInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: vs(4),
  },
  statLabel: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#64748b',
    flex: 1,
  },
  statNumberGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginLeft: s(4),
  },
  statNumber: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#1e293b',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(20),
    marginBottom: vs(10),
  },
  chartTitle: {
    fontSize: ms(16),
    fontWeight: '400',
    color: '#1e293b',
  },
  podiumContainer: {
    marginHorizontal: s(16),
    marginBottom: vs(15),
  },
  podiumScrollContent: {
    paddingHorizontal: s(4),
    alignItems: 'flex-end',
    gap: s(10),
  },
  podiumCol: {
    width: s(90),
    alignItems: 'center',
    paddingHorizontal: s(4),
  },
  userHead: {
    alignItems: 'center',
    marginBottom: vs(10),
    width: '100%',
    minHeight: vs(95),
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    marginBottom: vs(4),
  },
  podiumTextGroup: {
    alignItems: 'center',
    width: '100%',
    height: vs(35),
    justifyContent: 'center',
  },
  avatarMini: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  avatarLarge: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  avatarPlaceholder: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumName: {
    fontSize: ms(10),
    fontWeight: '400',
    color: '#1e293b',
    textAlign: 'center',
    marginTop: vs(10),
  },
  podiumPoints: {
    fontSize: ms(9),
    color: '#94a3b8',
    fontWeight: '400',
    marginTop: vs(1),
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: s(10),
    borderTopRightRadius: s(10),
    borderBottomLeftRadius: s(4),
    borderBottomRightRadius: s(4),
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: vs(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  rankNum: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#fff',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(20),
    marginBottom: vs(15),
  },
  activityTitle: {
    fontSize: ms(16),
    fontWeight: '400',
    color: '#1e293b',
  },
  seeAllBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: s(14),
    paddingVertical: vs(7),
    borderRadius: s(10),
    minWidth: s(90),
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllText: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#fff',
    textAlign: 'center',
  },
  activityContainer: {
    paddingHorizontal: s(16),
    marginBottom: vs(40),
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: s(16),
    padding: s(14),
    marginBottom: vs(12),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(12),
  },
  activityAvatarBox: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(2),
  },
  activityAvatar: {
    width: '100%',
    height: '100%',
  },
  activityAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  activityInfo: {
    flex: 1,
    gap: vs(2),
  },
  activityItemTitle: {
    fontSize: ms(16),
    fontWeight: '400',
    color: '#1e293b',
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityDesc: {
    fontSize: ms(14),
    color: '#64748b',
    fontWeight: '400',
    flex: 1,
  },
  activityTime: {
    fontSize: ms(12),
    color: '#94a3b8',
    fontWeight: '400',
    marginLeft: s(10),
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: vs(75),
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: ms(14),
  },

  // Premium Logout Modal
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoutBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    paddingTop: vs(30),
    paddingBottom: vs(40),
    paddingHorizontal: s(28),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  logoutAvatarCircle: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(14),
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  logoutAvatarInitial: {
    fontSize: ms(28),
    fontWeight: '400',
    color: '#fff',
  },
  logoutTitle: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: vs(4),
  },
  logoutName: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1e293b',
    marginBottom: vs(2),
  },
  logoutEmail: {
    fontSize: ms(13),
    color: '#64748b',
    fontWeight: '400',
    marginBottom: vs(24),
  },
  logoutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: vs(24),
  },
  logoutConfirmBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
    backgroundColor: '#ef4444',
    paddingVertical: vs(16),
    borderRadius: s(18),
    marginBottom: vs(12),
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '400',
  },
  logoutCancelBtn: {
    width: '100%',
    paddingVertical: vs(14),
    borderRadius: s(18),
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  logoutCancelText: {
    color: '#fff',
    fontSize: ms(15),
    fontWeight: '400',
  },
  profileDetailBtn: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    paddingVertical: vs(14),
    borderRadius: s(18),
    alignItems: 'center',
    marginBottom: vs(12),
  },
  profileDetailText: {
    color: '#475569',
    fontSize: ms(15),
    fontWeight: '400',
  },
  // Toast System
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
  notificationBtn: {
    width: s(42),
    height: s(42),
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: vs(2),
    right: s(2),
    backgroundColor: '#ef4444',
    minWidth: ms(20),
    height: ms(20),
    borderRadius: ms(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: ms(10),
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: ms(12),
  },
  feedbackListAvatar: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  feedbackListAvatarImg: {
    width: '100%',
    height: '100%',
  },
  feedbackListAvatarInitial: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#94a3b8',
  },
  // Feedback Modal Styles
  feedbackModalOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  feedbackModalContent: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: s(25),
  },
  feedbackModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(30),
    marginTop: vs(10),
  },
  feedbackModalTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  feedbackCloseBtn: {
    width: ms(36),
    height: ms(36),
    borderRadius: ms(18),
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackSummaryItem: {
    padding: s(12),
    borderRadius: s(12),
    backgroundColor: '#f8fafc',
    marginBottom: vs(10),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  newFeedbackItem: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  feedbackItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(4),
  },
  feedbackUserName: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#1e293b',
    flex: 1,
  },
  newBadge: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: '#3b82f6',
  },
  feedbackPreview: {
    fontSize: ms(13),
    color: '#475569',
    lineHeight: vs(20),
  },
  feedbackSubText: {
    fontSize: ms(14.5),
    color: '#64748b',
    fontWeight: '400',
    fontStyle: 'normal',
  },
  feedbackTime: {
    fontSize: ms(11),
    color: '#94a3b8',
    fontWeight: '400',
    marginLeft: s(8),
  },
  emptyFeedback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: vs(140),
  },
  emptyIconCircle: {
    width: s(80),
    height: s(80),
    borderRadius: s(60),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(25),
  },
  emptyFeedbackText: {
    fontSize: ms(15),
    color: '#94a3b8',
    fontWeight: '400',
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: s(20),
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    marginTop: vs(10),
    paddingTop: vs(12),
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewAllText: {
    fontSize: ms(14),
    fontWeight: '400',
    color: '#3b82f6',
  },
  // Quick Detail Modal Styles
  detailModalOverlay: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailModalBox: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: s(25),
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(25),
    marginTop: vs(10),
  },
  detailModalTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1e293b',
    letterSpacing: -0.5,
  },
  modalBackBtn: {
    width: ms(40),
    height: ms(40),
    borderRadius: ms(12),
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: -s(12),
    zIndex: 10,
  },
  detailScroll: {
    flex: 1,
  },
  detailUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(20),
    gap: s(12),
  },
  detailAvatar: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  detailAvatarInitial: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#3b82f6',
  },
  detailAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: s(23),
  },
  detailNameText: {
    fontSize: ms(16),
    fontWeight: '400',
    color: '#1e293b',
  },
  detailEmailText: {
    fontSize: ms(13),
    color: '#64748b',
  },
  msgBubble: {
    backgroundColor: '#f8fafc',
    padding: s(16),
    borderRadius: s(16),
    marginBottom: vs(10),
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  msgLabel: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: vs(4),
  },
  msgContentText: {
    fontSize: ms(15),
    color: '#334155',
    lineHeight: vs(24),
    textAlign: 'justify',
    includeFontPadding: false,
    paddingBottom: vs(2),
  },
  msgTimeText: {
    fontSize: ms(11),
    color: '#94a3b8',
    marginTop: vs(8),
    textAlign: 'right',
  },
  replySection: {
    marginBottom: vs(10),
  },
  replyLabel: {
    fontSize: ms(13),
    fontWeight: '400',
    color: '#1e293b',
    marginBottom: vs(8),
  },
  replyInput: {
    backgroundColor: '#f8fafc',
    borderRadius: s(12),
    padding: s(12),
    fontSize: ms(15),
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    height: vs(120),
  },
  detailFooter: {
    flexDirection: 'row',
    gap: s(12),
    marginTop: vs(20),
  },
  quickCancelBtn: {
    flex: 1,
    height: vs(46),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff0000ff',
    borderRadius: s(14),
  },
  quickCancelText: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#fff',
  },
  quickSendBtn: {
    flex: 2,
    height: vs(46),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: s(14),
    gap: s(8),
  },
  quickSendText: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#fff',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

export default AdminDashboard;