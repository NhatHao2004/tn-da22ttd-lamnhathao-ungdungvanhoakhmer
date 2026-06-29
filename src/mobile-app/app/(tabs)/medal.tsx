import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';

import { ms, s, vs } from '@/utils/responsive';
import { Dimensions, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

import { getLeaderboardUsers, UserProfile } from '@/services/firebase-service';
import { useFocusEffect } from '@react-navigation/native';

// Badge thresholds and definitions
const BADGE_DEFINITIONS = [
  { key: 'bronze', minPoints: 25, emoji: '🥉', color: '#CD7F32', bgColor: '#FFF4E6' },
  { key: 'silver', minPoints: 50, emoji: '🥈', color: '#94A3B8', bgColor: '#F1F5F9' },
  { key: 'gold', minPoints: 100, emoji: '🥇', color: '#EAB308', bgColor: '#FEF9E7' },
  { key: 'platinum', minPoints: 125, emoji: '⚜️', color: '#0EA5E9', bgColor: '#F0F9FF' },
  { key: 'diamond', minPoints: 150, emoji: '💎', color: '#3B82F6', bgColor: '#EFF6FF' },
  { key: 'legend', minPoints: 500, emoji: '👑', color: '#A855F7', bgColor: '#FAF5FF' },
];

export default function MedalScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'weekly' | 'all'>('weekly');
  const [currentPage, setCurrentPage] = useState<'leaderboard' | 'achievements'>('achievements');
  const scrollRef = useRef<ScrollView>(null);


  const [leaderboardData, setLeaderboardData] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastFetchTime = useRef<number>(0);

  // Badge Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any>(null);
  const [isBadgeEarned, setIsBadgeEarned] = useState(false);

  const fetchLeaderboard = async (force = false) => {
    // Only fetch if forced or it's been more than 30 seconds
    const now = Date.now();
    if (!force && lastFetchTime.current && now - lastFetchTime.current < 30000) {
      setIsLoading(false);
      return;
    }

    if (!user) {
      if (leaderboardData.length > 0) setLeaderboardData([]);
      setIsLoading(false);
      return;
    }

    try {
      const users = await getLeaderboardUsers(50);
      const filteredUsers = users.filter(u =>
        u.role !== 'Quản trị viên' &&
        u.role !== 'Admin' &&
        u.role !== 'admin'
      );

      // Simple shallow comparison or just check length for now
      if (JSON.stringify(filteredUsers) !== JSON.stringify(leaderboardData)) {
        setLeaderboardData(filteredUsers);
      }
      lastFetchTime.current = Date.now();
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchLeaderboard();
    }, [user?.uid])
  );



  const targetCount = activeTab === 'weekly' ? 10 : 20;

  const getLeaderboardList = () => {
    const list = [...leaderboardData.slice(0, targetCount)];
    while (list.length < targetCount) {
      list.push({ uid: `dummy-${list.length}-${activeTab}`, name: '---', points: 0, avatar: null });
    }
    return list;
  };

  const displayedData = getLeaderboardList();

  const topThree = [displayedData[1], displayedData[0], displayedData[2]]; // 2nd, 1st, 3rd for podium order
  const restOfPlayers = displayedData.slice(3);

  // Stats for Achievements
  const userPoints = (user && !user.isAnonymous) ? (user.points || 0) : 0;
  const userCompletedQuizzes = (user && !user.isAnonymous) ? (user.completedQuizzes || 0) : 0;
  const currentBadge = BADGE_DEFINITIONS.slice().reverse().find(b => userPoints >= b.minPoints);

  const showBadgeDetails = (badge: any, earned: boolean) => {
    setSelectedBadge(badge);
    setIsBadgeEarned(earned);
    setModalVisible(true);
  };

  const renderLeaderboard = () => (
    <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      {/* Background Cement Gray */}
      <View style={styles.headerBackground} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setCurrentPage('achievements')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('leaderboard')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabBackground}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
            onPress={() => setActiveTab('weekly')}
          >
            <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>{t('weekly')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>{t('all_time')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={{ flex: 0 }}>
          {/* Podium Section */}
          <View style={styles.podiumWrapper}>
            <View style={styles.podiumContainer}>

              {/* 1st Place */}
              <View style={[styles.podiumItem, { marginTop: -45 }]}>
                <View style={styles.crownContainer}>
                </View>
                <View style={[styles.avatarContainer, { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#000000ff' }]}>
                  {topThree[1].avatar ? (
                    <Image source={{ uri: topThree[1].avatar }} style={styles.avatar} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={70} color="#CCC" />
                  )}

                </View>

                <Text style={styles.podiumName}>{topThree[1].name}</Text>
                <View style={styles.podiumPoints}>
                  <Text style={styles.podiumPointsText} numberOfLines={1} adjustsFontSizeToFit>
                    {`${topThree[1].points} ${t('points')}`}
                  </Text>
                </View>
                <View style={[styles.podiumBase, { height: 135, backgroundColor: '#ff0000ff' }]}>
                  <Text style={styles.podiumRank}>1</Text>
                </View>
              </View>

              {/* 2nd Place */}
              <View style={styles.podiumItem}>
                <View style={[styles.avatarContainer, { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#000000ff' }]}>
                  {topThree[0].avatar ? (
                    <Image source={{ uri: topThree[0].avatar }} style={styles.avatar} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={70} color="#CCC" />
                  )}

                </View>

                <Text style={styles.podiumName}>{topThree[0].name}</Text>
                <View style={styles.podiumPoints}>
                  <Text style={styles.podiumPointsText} numberOfLines={1} adjustsFontSizeToFit>
                    {`${topThree[0].points} ${t('points')}`}
                  </Text>
                </View>
                <View style={[styles.podiumBase, { height: 100, backgroundColor: '#f8d330ff' }]}>
                  <Text style={styles.podiumRank}>2</Text>
                </View>
              </View>

              {/* 3rd Place */}
              <View style={styles.podiumItem}>
                <View style={[styles.avatarContainer, { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#000000ff' }]}>
                  {topThree[2].avatar ? (
                    <Image source={{ uri: topThree[2].avatar }} style={styles.avatar} />
                  ) : (
                    <Ionicons name="person-circle-outline" size={70} color="#CCC" />
                  )}

                </View>

                <Text style={styles.podiumName}>{topThree[2].name}</Text>
                <View style={styles.podiumPoints}>
                  <Text style={styles.podiumPointsText} numberOfLines={1} adjustsFontSizeToFit>
                    {`${topThree[2].points} ${t('points')}`}
                  </Text>
                </View>
                <View style={[styles.podiumBase, { height: 65, backgroundColor: '#1ca900ff' }]}>
                  <Text style={styles.podiumRank}>3</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Other Players List */}
        <ScrollView
          ref={scrollRef}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 35, paddingBottom: 0 }}
        >

          {restOfPlayers.map((item) => {
            const playerRank = displayedData.findIndex(u => u.uid === item.uid) + 1;
            const isMe = user && item.uid === user.uid;

            return (
              <View
                key={item.uid}
                style={[
                  styles.listItem,
                  isMe && styles.myListItem
                ]}
              >
                <View style={styles.listItemRankContainer}>
                  <Text style={styles.listItemRank}>{playerRank}</Text>
                </View>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.listItemAvatar} />
                ) : (
                  <Ionicons name="person-circle-outline" size={50} color="#CCC" style={styles.listItemAvatar} />
                )}
                <View style={styles.listItemInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.listItemName, isMe && styles.myListItemName]}>
                      {item.name}
                    </Text>
                    {isMe && <View style={styles.meTag}><Text style={styles.meTagText}>{t('you')}</Text></View>}
                  </View>
                  <Text style={styles.listItemPoints}>
                    {`${item.points} ${t('points')}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Animated.View>
  );

  const renderAchievements = () => (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(400)}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View style={styles.headerBackground} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#000000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('achievements')}</Text>
        <TouchableOpacity onPress={() => setCurrentPage('leaderboard')} style={styles.forwardBtn}>
          <Ionicons name="arrow-forward" size={26} color="#000000ff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={achStyles.scrollContent}>
        {/* Stats Row */}
        <View style={achStyles.statsRow}>
          <View style={[achStyles.statCard, { backgroundColor: '#F8FAFC' }]}>
            <Text style={achStyles.statValue}>{userPoints}</Text>
            <Text style={achStyles.statLabel}>{t('total_score')}</Text>
          </View>
          <View style={[achStyles.statCard, { backgroundColor: '#F8FAFC' }]}>
            <Text style={achStyles.statValue}>{userCompletedQuizzes}</Text>
            <Text style={achStyles.statLabel}>{t('quizzes_completed')}</Text>
          </View>
        </View>

        {/* Progress Card */}
        <View style={achStyles.progressCard}>
          <View style={achStyles.progressHeader}>
            <Text style={achStyles.progressTitle}>{t('rank_progress')}</Text>
            {currentBadge && (
              <View style={[achStyles.badgePill, { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#000' }]}>
                <Text style={achStyles.badgePillText}>{currentBadge.emoji} {t(`rank_${currentBadge.key}`)}</Text>
              </View>
            )}
          </View>

          {(() => {
            const nextBadge = BADGE_DEFINITIONS.find(b => b.minPoints > userPoints);
            if (!nextBadge) return <Text style={achStyles.maxLevelText}>🌟 {t('rank_legend')}</Text>;
            const prevMin = currentBadge ? currentBadge.minPoints : 0;
            const progress = Math.min((userPoints - prevMin) / (nextBadge.minPoints - prevMin), 1);
            return (
              <View style={achStyles.progressBody}>
                <View style={achStyles.barContainer}>
                  <View style={[achStyles.barFill, { width: `${progress * 100}%`, backgroundColor: '#3B82F6' }]} />
                </View>
                <Text style={achStyles.progressSubtitle}>
                  {userPoints} / {nextBadge.minPoints} {t('points')} ({t('badge')}: {t(`rank_${nextBadge.key}`)})
                </Text>
              </View>
            );
          })()}
        </View>

        {/* Medal Grid */}
        <Text style={achStyles.sectionTitle}>{t('badge')}</Text>
        <View style={achStyles.grid}>
          {BADGE_DEFINITIONS.map(badge => {
            const isEarned = userPoints >= badge.minPoints;
            return (
              <TouchableOpacity
                key={badge.key}
                style={[achStyles.gridItem, !isEarned && achStyles.gridItemLocked]}
                onPress={() => showBadgeDetails(badge, isEarned)}
              >
                <View style={[achStyles.iconBox, { backgroundColor: isEarned ? badge.bgColor : '#F1F5F9' }]}>
                  <Text style={[achStyles.emoji, !isEarned && { opacity: 0.2 }]}>{badge.emoji}</Text>
                  {!isEarned && (
                    <View style={achStyles.lockOverlay}>
                      <Ionicons name="lock-closed" size={16} color="#94A3B8" />
                    </View>
                  )}
                </View>
                <Text
                  style={[achStyles.gridName, { color: isEarned ? '#1A1A1A' : '#94A3B8' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {t(`rank_${badge.key}`)}
                </Text>
                <Text style={achStyles.gridPoints}>{badge.minPoints} {t('points')}</Text>
                {isEarned && (
                  <View style={[achStyles.checkBadge, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="checkmark" size={10} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Custom Badge Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <TouchableOpacity
            style={modalStyles.backdrop}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <Animated.View entering={FadeInDown.duration(400)} style={modalStyles.content}>
            {selectedBadge && (
              <>
                <View style={[modalStyles.iconCircle, { backgroundColor: isBadgeEarned ? selectedBadge.bgColor : '#F1F5F9' }]}>
                  <Text style={[modalStyles.largeEmoji, !isBadgeEarned && { opacity: 0.2 }]}>
                    {selectedBadge.emoji}
                  </Text>
                  {!isBadgeEarned && (
                    <View style={modalStyles.lockOverlay}>
                      <Ionicons name="lock-closed" size={40} color="#94A3B8" />
                    </View>
                  )}
                </View>

                <Text style={modalStyles.title}>
                  {t(`rank_${selectedBadge.key}`)}
                </Text>

                <Text
                  style={modalStyles.message}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {isBadgeEarned
                    ? `${t('congrats_earned')} ${t(`rank_${selectedBadge.key}`)}`
                    : t('badge_locked_message').split(/(\{points\})|(\{name\})/g).map((part, index) => {
                      if (part === '{points}') return <Text key={index} style={{ color: '#EF4444', fontWeight: '700' }}>{selectedBadge.minPoints}</Text>;
                      if (part === '{name}') return <Text key={index} style={{ color: '#1A1A1A', fontWeight: '600' }}>{t(`rank_${selectedBadge.key}`)}</Text>;
                      return part;
                    })
                  }
                </Text>

                <TouchableOpacity
                  style={[modalStyles.button, { backgroundColor: '#3B82F6' }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={modalStyles.buttonText}>{t('close')}</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </Animated.View>
  );

  return currentPage === 'leaderboard' ? renderLeaderboard() : renderAchievements();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // White background
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 478 + 120, // Tall enough to cover the top area
    backgroundColor: '#ffffffff', // Cement Gray
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50, // Increased to account for notch/status bar
    paddingBottom: 15,
  },
  backBtn: {
    width: 24,
  },
  forwardBtn: {
    width: 24,
    alignItems: 'flex-end',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '400',
    color: '#1A1A1A', // Black text
    lineHeight: 32,
  },
  tabContainer: {
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 0,
  },
  tabBackground: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 4,
    width: width * 0.8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    minHeight: 44,
  },
  activeTab: {
    backgroundColor: '#008cffff',
    elevation: 3,
  },
  tabText: {
    color: '#000000ff',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '400',
    lineHeight: 20,
  },
  podiumWrapper: {
    marginTop: 70,
    paddingBottom: 0,
  },
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  podiumItem: {
    alignItems: 'center',
    width: (width - 60) / 3,
  },
  avatarContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    position: 'relative', marginBottom: 8, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#F5F5F5',
  },
  avatar: { width: '100%', height: '100%', borderRadius: 40 },
  crownContainer: { position: 'absolute', top: -20, zIndex: 10 },
  podiumName: { color: '#1A1A1A', fontSize: 12, fontWeight: '400', marginBottom: 5, textAlign: 'center', lineHeight: 18 },
  podiumPoints: { backgroundColor: '#F3F4F6', paddingHorizontal: 4, paddingVertical: 4, borderRadius: 12, marginBottom: 10, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
  podiumPointsText: { color: '#000000', fontSize: 12, fontWeight: '400', lineHeight: 16, textAlign: 'center' },
  podiumBase: { width: '100%', borderTopLeftRadius: 15, borderTopRightRadius: 15, justifyContent: 'flex-start', alignItems: 'center', paddingTop: 10 },
  podiumRank: { color: '#FFF', fontSize: 36, fontWeight: '400', opacity: 0.9, lineHeight: 44 },
  listContainer: { flex: 1, marginTop: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  listItemRankContainer: { width: 35, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  listItemRank: { fontSize: 14, fontWeight: '400', color: '#1A1A1A', lineHeight: 22 },
  listItemAvatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 16, fontWeight: '400', color: '#1A1A1A', marginBottom: 2 },
  listItemPoints: { fontSize: 14, color: '#666' },
  myListItem: { backgroundColor: '#ffffffff', paddingVertical: 13, marginHorizontal: 0, marginVertical: 0 },
  myListItemName: { color: '#000000ff' },
  meTag: { backgroundColor: '#764eb4ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  meTagText: { color: '#FFF', fontSize: 10, fontWeight: '400' },
});

const achStyles = StyleSheet.create({
  scrollContent: { paddingHorizontal: s(25), paddingTop: vs(20), paddingBottom: vs(40) },
  statsRow: { flexDirection: 'row', gap: s(15), marginBottom: vs(25) },
  statCard: { flex: 1, borderRadius: ms(20), padding: s(15), alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  statIconCircle: { width: ms(40), height: ms(40), borderRadius: ms(20), justifyContent: 'center', alignItems: 'center', marginBottom: vs(12) },
  statValue: { fontSize: ms(24), fontWeight: 'bold', color: '#1A1A1A' },
  statLabel: { fontSize: ms(12), color: '#64748B', marginTop: vs(4) },
  progressCard: { backgroundColor: '#FFF', borderRadius: ms(24), padding: s(20), marginBottom: vs(13), shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(20) },
  progressTitle: { fontSize: ms(16), fontWeight: '400', color: '#1A1A1A' },
  badgePill: { paddingHorizontal: s(10), paddingVertical: vs(5), borderRadius: ms(12) },
  badgePillText: { fontSize: ms(12), fontWeight: '600', color: '#1A1A1A' },
  progressBody: { gap: vs(10) },
  barContainer: { height: vs(10), backgroundColor: '#F1F5F9', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 5 },
  progressSubtitle: { fontSize: ms(11), color: '#64748B', textAlign: 'center' },
  maxLevelText: { fontSize: ms(14), fontWeight: '600', color: '#1A1A1A', textAlign: 'center' },
  sectionTitle: { fontSize: ms(18), fontWeight: '400', color: '#1A1A1A', marginBottom: vs(15) },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: s(12) },
  gridItem: {
    width: (Dimensions.get('window').width - s(50) - s(24) - 6) / 3,
    backgroundColor: '#FFF',
    borderRadius: ms(20),
    paddingVertical: vs(15),
    paddingHorizontal: s(5),
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  gridItemLocked: { opacity: 0.6 },
  iconBox: { width: ms(60), height: ms(60), borderRadius: ms(30), justifyContent: 'center', alignItems: 'center', marginBottom: vs(10) },
  emoji: { fontSize: ms(28) },
  lockOverlay: { position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  gridName: { fontSize: ms(11), fontWeight: '600', marginBottom: vs(4), textAlign: 'center' },
  gridPoints: { fontSize: ms(9), color: '#94A3B8' },
  checkBadge: { position: 'absolute', padding: 2, top: -5, right: -5, width: ms(22), height: ms(22), borderRadius: ms(11), justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFF' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    width: width * 0.85,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  largeEmoji: {
    fontSize: 60,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});