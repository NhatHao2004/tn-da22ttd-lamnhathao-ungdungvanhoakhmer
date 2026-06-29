import { QuizSkeleton } from '@/components/quiz-skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getLeaderboardUsers } from '@/services/firebase-service';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function QuizScreen() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [userRank, setUserRank] = useState<string | number>('');
  const [quizLoading, setQuizLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const lastFetchTime = useRef<number>(0);

  const getBadge = (points: number) => {
    if (points >= 500) return { name: t('rank_legend'), emoji: '👑', icon: 'ribbon-outline', color: '#000000ff' };
    if (points >= 150) return { name: t('rank_diamond'), emoji: '🔷', icon: 'diamond-outline', color: '#000000ff' };
    if (points >= 125) return { name: t('rank_platinum'), emoji: '💎', icon: 'sparkles-outline', color: '#000000ff' };
    if (points >= 100) return { name: t('rank_gold'), emoji: '🥇', icon: 'trophy-outline', color: '#000000ff' };
    if (points >= 50) return { name: t('rank_silver'), emoji: '🥈', icon: 'medal-outline', color: '#000000ff' };
    if (points >= 25) return { name: t('rank_bronze'), emoji: '🥉', icon: 'medal-outline', color: '#000000ff' };
    return null;
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuizLoading(false);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  const fetchRank = async (force = false) => {
    if (!user || user.isAnonymous) {
      if (userRank !== 0) setUserRank(0);
      return;
    }

    const now = Date.now();
    if (!force && lastFetchTime.current && now - lastFetchTime.current < 30000) {
      return;
    }

    try {
      // Nếu là Admin thì mặc định hạng 0
      if (user.role === 'Quản trị viên') {
        setUserRank(0);
        return;
      }

      const users = await getLeaderboardUsers(100);
      const index = users.findIndex(u => u.uid === user.uid);
      const newRank = index !== -1 ? index + 1 : '>100';
      if (newRank !== userRank) {
        setUserRank(newRank);
      }
      lastFetchTime.current = Date.now();
    } catch (error) {
      setUserRank('---');
    }
  };

  useEffect(() => {
    fetchRank();
  }, [user?.uid]);

  useFocusEffect(
    React.useCallback(() => {
      fetchRank();
    }, [user?.uid])
  );

  if (quizLoading) {
    return <QuizSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('quiz_title')}</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollContentContainer, { paddingBottom: vs(20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card - Floating */}
        <View style={styles.profileCard}>
          <View style={styles.cardHeader}>
            <View style={styles.avatarWrapper}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.cardAvatar} />
              ) : (
                <Ionicons name="person-circle" size={ms(40)} color="#000000ff" />
              )}
            </View>

            <View style={styles.nameContainer}>
              <Text style={styles.cardName} numberOfLines={1} adjustsFontSizeToFit>{user?.name || t('guest')}</Text>
              <View style={styles.rankBadge}>
                <Text style={styles.cardRankText} numberOfLines={1}>
                  {`${t('current_rank')}: ${userRank}`}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(user && !user.isAnonymous) ? (user.points || 0) : 0}</Text>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('points')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{(user && !user.isAnonymous) ? (user.completedQuizzes || 0) : 0}</Text>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('completed')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                {(() => {
                  const badge = getBadge(user?.points || 0);
                  if (badge) {
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                        <Text style={[styles.statValue, { fontSize: ms(15), color: badge.color }]} numberOfLines={1} adjustsFontSizeToFit>
                          {badge.emoji} {badge.name}
                        </Text>
                      </View>
                    );
                  }
                  return <Ionicons name="medal-outline" size={ms(20)} color="#1E293B" />;
                })()}
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>{t('badge') || 'Huy hiệu'}</Text>
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle} numberOfLines={1} adjustsFontSizeToFit>{t('categories')}</Text>
            <Text style={styles.sectionSubtitle} numberOfLines={1} adjustsFontSizeToFit>{t('choose_topic')}</Text>
          </View>
        </View>

        <View style={styles.bentoContainer}>
          <View style={styles.bentoRow}>
            {/* Pagoda Quiz - Featured & ACTIVE */}
            <View style={{ flex: 1.2 }}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.bentoCard, { height: vs(240) }]}
                onPress={() => {
                  if (!user || user.isAnonymous) {
                    setShowLoginModal(true);
                    return;
                  }
                  router.push('/quiz-pagoda');
                }}
              >
                <View style={styles.bentoTitleContainer}>
                  <Text style={styles.bentoTitle} numberOfLines={2} adjustsFontSizeToFit>{t('pagoda_quiz')}</Text>
                </View>
                <View style={[styles.bentoImageContainer, { flex: 1, marginTop: vs(10) }]}>
                  <Image source={require('@/assets/images/pagoda.jpg')} style={styles.bentoImage} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Right Column – Coming soon items */}
            <View style={{ flex: 1, gap: 15 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.bentoCard, { height: vs(112) }]}
                onPress={() => {
                  if (!user || user.isAnonymous) {
                    setShowLoginModal(true);
                    return;
                  }
                  router.push('/quiz-culture');
                }}
              >
                <View style={[styles.bentoTitleContainer, { height: vs(35) }]}>
                  <Text style={styles.bentoTitleSmall} numberOfLines={1} adjustsFontSizeToFit>{t('culture_quiz')}</Text>
                </View>
                <View style={[styles.bentoImageContainerSmall, { flex: 1 }]}>
                  <Image source={require('@/assets/images/festival.jpg')} style={styles.bentoImage} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.bentoCard, { height: vs(112) }]}
                onPress={() => {
                  if (!user || user.isAnonymous) {
                    setShowLoginModal(true);
                    return;
                  }
                  router.push('/quiz-food');
                }}
              >
                <View style={[styles.bentoTitleContainer, { height: vs(35) }]}>
                  <Text style={styles.bentoTitleSmall} numberOfLines={1} adjustsFontSizeToFit>{t('food_quiz')}</Text>
                </View>
                <View style={[styles.bentoImageContainerSmall, { flex: 1 }]}>
                  <Image source={require('@/assets/images/amthuc.jpg')} style={styles.bentoImage} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Full Width Card - Vocab Quiz */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.bentoCardFull, { marginTop: 10 }]}
            onPress={() => {
              if (!user || user.isAnonymous) {
                setShowLoginModal(true);
                return;
              }
              router.push('/vocab_quiz');
            }}
          >
            <View style={styles.bentoFullContent}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.bentoTitle, { textAlign: 'left' }]} numberOfLines={1} adjustsFontSizeToFit>{t('vocab_quiz')}</Text>
                <Text style={[styles.bentoSubtitle, { textAlign: 'left' }]} numberOfLines={1} adjustsFontSizeToFit>{t('vocab_quiz_subtitle')}</Text>
              </View>
              <View style={styles.bentoImageContainerFull}>
                <Image source={require('@/assets/images/hoctap.jpg')} style={styles.bentoImage} />
              </View>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Custom Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setShowLoginModal(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="person-circle-outline" size={40} color="#3B82F6" />
            </View>
            <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>{t('login_required')}</Text>
            <Text style={styles.modalSub} numberOfLines={1} adjustsFontSizeToFit>{t('login_to_use')}</Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/login');
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>{t('login_user')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: s(20),
    paddingTop: vs(5),
    paddingBottom: vs(20),
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(20),
    paddingTop: vs(0),
    minHeight: vs(50),
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#000000ff',
    lineHeight: vs(32),
  },

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: ms(24),
    paddingHorizontal: s(25),
    paddingTop: vs(20),
    paddingBottom: vs(15),
    marginBottom: vs(15),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    minHeight: vs(160),
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(15),
    marginBottom: vs(12),
  },
  avatarWrapper: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardAvatar: {
    width: '100%',
    height: '100%',
  },
  nameContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#000000ff',
    marginBottom: vs(4),
    lineHeight: vs(32),
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffffff',
    paddingHorizontal: 0,
    paddingVertical: vs(2),
    borderRadius: ms(10),
    alignSelf: 'flex-start',
    gap: s(6),
  },
  cardRankText: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#000000ff',
    lineHeight: vs(26),
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#ffffffff',
    borderRadius: ms(16),
    paddingVertical: vs(15),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: s(5),
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  statValue: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1E293B',
    lineHeight: vs(24),
    textAlign: 'center',
  },
  statLabel: {
    fontSize: ms(13),
    color: '#64748B',
    fontWeight: '400',
    marginTop: vs(4),
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: vs(20),
    alignItems: 'flex-start',
    height: vs(60),
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1E293B',
    textAlign: 'left',
    lineHeight: vs(30),
  },
  sectionSubtitle: {
    fontSize: ms(14),
    color: '#64748B',
    marginTop: vs(2),
    textAlign: 'left',
    lineHeight: vs(20),
  },
  bentoContainer: {
    width: '100%',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: s(15),
  },
  bentoCard: {
    borderRadius: ms(24),
    padding: s(16),
    overflow: 'visible',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.05,
    shadowRadius: s(5),
    elevation: 2,
  },
  bentoTitleContainer: {
    width: '100%',
    height: '25%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(5),
  },
  bentoCardFull: {
    width: '100%',
    height: vs(120),
    borderRadius: ms(24),
    padding: s(20),
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.05,
    shadowRadius: s(5),
    elevation: 2,
  },

  bentoTitle: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#0F172A',
    lineHeight: vs(28),
    textAlign: 'center',
  },
  bentoTitleSmall: {
    fontSize: ms(14),
    fontWeight: '400',
    color: '#0F172A',
    lineHeight: vs(24),
    textAlign: 'center',
  },
  bentoSubtitle: {
    fontSize: ms(12),
    color: '#64748B',
    fontWeight: '400',
    marginTop: vs(2),
    textAlign: 'center',
    lineHeight: vs(18),
  },
  bentoImageContainer: {
    width: s(90),
    height: s(90),
    opacity: 1,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    borderRadius: ms(25),
    overflow: 'hidden',
  },
  bentoImageContainerSmall: {
    width: s(60),
    height: s(60),
    opacity: 1,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: vs(5),
    borderRadius: ms(15),
    overflow: 'hidden',
  },
  bentoImageContainerFull: {
    width: s(80),
    height: s(80),
    opacity: 1,
    backgroundColor: 'transparent',
    borderRadius: ms(20),
    overflow: 'hidden',
  },
  bentoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  bentoFullContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  activeBadge: {
    position: 'absolute',
    bottom: vs(12),
    right: s(12),
    backgroundColor: '#FF6B2C',
    paddingHorizontal: s(8),
    paddingVertical: vs(4),
    borderRadius: ms(8),
  },
  activeBadgeText: {
    color: '#FFF',
    fontSize: ms(10),
    fontWeight: '400',
  },
  comingSoonTag: {
    position: 'absolute',
    bottom: vs(8),
    right: s(8),
    backgroundColor: '#F1F5F9',
    paddingHorizontal: s(6),
    paddingVertical: vs(3),
    borderRadius: ms(6),
  },
  comingSoonTagText: {
    color: '#94A3B8',
    fontSize: ms(9),
    fontWeight: '400',
  },
  comingSoonText: {
    color: '#94A3B8',
    fontSize: ms(9),
    fontWeight: '400',
  },
  bentoDesc: {
    fontSize: ms(12),
    color: '#64748B',
    marginTop: vs(4),
    textAlign: 'left',
  },
  // Pilgimage Card Styles
  pilgrimageCard: {
    marginBottom: vs(20),
    borderRadius: ms(24),
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.2,
    shadowRadius: s(20),
  },
  pilgrimageGradient: {
    padding: s(24),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pilgrimageInfo: {
    flex: 1,
  },
  pLabel: {
    color: '#3B82F6',
    fontSize: ms(10),
    fontWeight: '400',
    letterSpacing: 2,
    marginBottom: vs(4),
  },
  pTitle: {
    color: '#FFF',
    fontSize: ms(24),
    fontWeight: '400',
    marginBottom: vs(4),
  },
  pDesc: {
    color: '#94A3B8',
    fontSize: ms(13),
    fontWeight: '400',
    marginBottom: vs(15),
  },
  pBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFCC00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: ms(12),
    gap: s(6),
  },
  pBadgeText: {
    color: '#000',
    fontSize: ms(11),
    fontWeight: '400',
  },
  pIconBox: {
    marginLeft: s(15),
  },

  // --- Premium Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(24),
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: ms(35),
    borderTopRightRadius: ms(35),
    paddingTop: vs(25),
    paddingHorizontal: s(30),
    paddingBottom: vs(15),
    width: '100%',
    minHeight: '40%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(-10) },
    shadowOpacity: 0.1,
    shadowRadius: s(20),
    elevation: 25,
  },
  modalIconCircle: {
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
  modalTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  modalSub: {
    fontSize: ms(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: vs(22),
    marginBottom: vs(24),
  },
  modalActionRow: {
    width: '100%',
    gap: vs(12),
  },
  modalPrimaryBtn: {
    backgroundColor: '#3B82F6',
    height: vs(56),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: vs(4) },
    shadowOpacity: 0.2,
    shadowRadius: s(8),
    elevation: 4,
  },
  modalPrimaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
  modalSecondaryBtn: {
    backgroundColor: '#EF4444',
    height: vs(56),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalSecondaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
});