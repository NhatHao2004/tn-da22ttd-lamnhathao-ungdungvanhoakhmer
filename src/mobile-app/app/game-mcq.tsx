import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { getQuizData, updateQuizScore } from '../services/firebase-service';
import { PAGODA_QUIZZES, PagodaQuizData } from '../utils/quizData';

const { width } = Dimensions.get('window');
const POINTS_PER_CORRECT = 5;

type Phase = 'intro' | 'question' | 'result';
type AnswerState = 'idle' | 'correct' | 'wrong';

export default function GameMCQScreen() {
  const router = useRouter();
  const { pagodaId, imageUrl, pagodaLocation, preFetchedData } = useLocalSearchParams<{ 
    pagodaId: string; 
    imageUrl?: string; 
    pagodaLocation?: string;
    preFetchedData?: string;
  }>();

  const { user, refreshUser } = useAuth();
  const { language, t } = useLanguage();
  const isKm = language === 'km';

  const [quizData, setQuizData] = useState<PagodaQuizData | null>(() => {
    if (preFetchedData) {
      try {
        const parsed = JSON.parse(preFetchedData);
        if (parsed && parsed.questions) return parsed;
      } catch (e) {
        console.error("Error parsing preFetchedData in state init:", e);
      }
    }
    return null;
  });
  const [dataLoading, setDataLoading] = useState(!quizData);
  const [phase, setPhase] = useState<Phase>('question');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>('idle');
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState<boolean[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [earned, setEarned] = useState(0);
  const [isShowingFeedback, setIsShowingFeedback] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Check login on mount
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => setShowLoginModal(true), 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Fetch Dynamic Quiz Data
  useEffect(() => {
    const loadQuiz = async () => {
      // 1. Try to use pre-fetched data from navigation
      if (preFetchedData) {
        try {
          const parsed = JSON.parse(preFetchedData);
          if (parsed && parsed.questions) {
            setQuizData(parsed);
            setDataLoading(false);
            return;
          }
        } catch (e) {
          console.error("Error parsing preFetchedData:", e);
        }
      }

      // 2. Otherwise fetch from Firestore
      try {
        const firestoreData = await getQuizData(pagodaId as string);
        if (firestoreData) {
          setQuizData(firestoreData as PagodaQuizData);
        } else {
          // Fallback to local
          const local = PAGODA_QUIZZES.find(p => p.pagodaId === pagodaId) ?? PAGODA_QUIZZES[0];
          setQuizData(local);
        }
      } catch (e) {
        console.error("Error loading quiz data:", e);
        const local = PAGODA_QUIZZES.find(p => p.pagodaId === pagodaId) ?? PAGODA_QUIZZES[0];
        setQuizData(local);
      } finally {
        setDataLoading(false);
      }
    };
    loadQuiz();
  }, [pagodaId, preFetchedData]);

  const heroImage = useMemo(() => {
    // 1. Prioritize dynamic imageUrl from navigation (Firestore Destinations)
    if (typeof imageUrl === 'string' && imageUrl.startsWith('http')) {
      return { uri: imageUrl };
    }
    // 2. Fallback to local quizData image based on ID
    const localQuiz = PAGODA_QUIZZES.find(p => p.pagodaId === pagodaId);
    return localQuiz?.image;
  }, [imageUrl, pagodaId]);

  const currentQuestion = quizData?.questions[questionIndex];
  const TOTAL_QUESTIONS = quizData?.questions.length || 0;
  const isLastQuestion = questionIndex === TOTAL_QUESTIONS - 1;

  // Animations
  const progressAnim = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.5)).current;
  const cardShake = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(0)).current;

  // Update progress bar


  const shakeCard = useCallback(() => {
    Animated.sequence([
      Animated.timing(cardShake, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 6, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: -6, duration: 60, useNativeDriver: true }),
      Animated.timing(cardShake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const showFeedback = useCallback(() => {
    setIsShowingFeedback(true);
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0.7);
    Animated.parallel([
      Animated.spring(feedbackOpacity, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.spring(feedbackScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
    ]).start();
  }, []);

  const moveToNextQuestion = () => {
    setIsShowingFeedback(false);
    setShowExplanation(false);

    if (isLastQuestion) {
      handleFinish(results);
    } else {
      setQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswerState('idle');

      // Reset these for the next round instantly
      contentFade.setValue(1);
      slideUp.setValue(0);
      feedbackOpacity.setValue(0);
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (answerState !== 'idle' || !currentQuestion) return;

    const isCorrect = optionIndex === currentQuestion.correctIndex;
    setSelectedOption(optionIndex);
    setAnswerState(isCorrect ? 'correct' : 'wrong');
    setShowExplanation(true);

    const newResults = [...results, isCorrect];
    setResults(newResults);

    if (isCorrect) {
      setScore(prev => prev + POINTS_PER_CORRECT);
      setCorrectCount(prev => prev + 1);
    } else {
      shakeCard();
    }
    showFeedback();

    // Chạy thanh tiến trình ngay khi trả lời xong câu hỏi đó
    Animated.timing(progressAnim, {
      toValue: (questionIndex + 1),
      duration: 400,
      useNativeDriver: false,
    }).start();
  };

  const handleFinish = async (finalResults: boolean[]) => {
    const earnedTotal = finalResults.filter(Boolean).length * POINTS_PER_CORRECT;
    setPhase('result');

    if (user && earnedTotal > 0) {
      setIsSaving(true);
      setHasSaved(false);
      try {
        const actualCorrectCount = finalResults.filter(Boolean).length;
        const isPerfect = actualCorrectCount === TOTAL_QUESTIONS;

        // Chạy song song: lưu điểm và đảm bảo hiện "Đang lưu" ít nhất 1.2s để UX mượt hơn
        const [added] = await Promise.all([
          updateQuizScore(user.uid, pagodaId as string, earnedTotal, isPerfect),
          new Promise(resolve => setTimeout(resolve, 1200))
        ]);

        setEarned(added);
        await refreshUser();
        setHasSaved(true);
      } catch (e) {
        console.error('Error saving score:', e);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleReplay = () => {
    setPhase('question');
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswerState('idle');
    setScore(0);
    setCorrectCount(0);
    setResults([]);
    setShowExplanation(false);
    setHasSaved(false);
    setIsSaving(false);
    progressAnim.setValue(0);
    contentFade.setValue(1);
    slideUp.setValue(0);
  };

  const getOptionStyle = (index: number) => {
    if (!currentQuestion) return styles.option;
    if (answerState === 'idle') return styles.option;
    if (index === currentQuestion.correctIndex) return [styles.option, styles.optionCorrect];
    if (index === selectedOption && !(index === currentQuestion.correctIndex))
      return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionLetterStyle = (index: number) => {
    if (!currentQuestion) return styles.optionLetterBox;
    if (answerState === 'idle') return styles.optionLetterBox;
    if (index === currentQuestion.correctIndex)
      return [styles.optionLetterBox, { backgroundColor: '#22C55E' }];
    if (index === selectedOption && index !== currentQuestion.correctIndex)
      return [styles.optionLetterBox, { backgroundColor: '#EF4444' }];
    return [styles.optionLetterBox, { backgroundColor: '#E2E8F0' }];
  };

  if (dataLoading || !quizData) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#FF6B2C" />
        <Text style={{ marginTop: vs(12), color: '#64748B' }}>{t('loading_questions')}</Text>
      </View>
    );
  }

  // ─────────────── GUEST VIEW ───────────────
  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: s(24) }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.guestIconCircle}>
          <Ionicons name="lock-closed" size={ms(50)} color="#3B82F6" />
        </View>
        <Text style={styles.guestTitle}>{t('login_required')}</Text>
        <Text style={styles.guestSub}>
          {t('guest_login_msg')}
        </Text>

        <TouchableOpacity
          style={[styles.guestPrimaryBtn, { backgroundColor: '#3B82F6' }]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.guestPrimaryBtnText}>{t('login_now')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.guestSecondaryBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.guestSecondaryBtnText}>{t('go_back_now')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, TOTAL_QUESTIONS],
    outputRange: ['0%', '100%'],
  });

  const stars = correctCount;


  // ─────────────── RESULT SCREEN ───────────────
  if (phase === 'result') {
    const displayPoints = correctCount * POINTS_PER_CORRECT;
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <StatusBar barStyle="dark-content" />

        {/* Stars */}
        <View style={styles.resultStarsRow}>
          {[1, 2, 3, 4, 5].map(s_idx => (
            <Ionicons
              key={s_idx}
              name={s_idx <= stars ? 'star' : 'star-outline'}
              size={ms(44)}
              color={s_idx <= stars ? '#FBBF24' : '#E2E8F0'}
              style={{ marginHorizontal: s(4) }}
            />
          ))}
        </View>

        <Text style={styles.resultTitle}>
          {correctCount === TOTAL_QUESTIONS ? t('excellent') : correctCount >= TOTAL_QUESTIONS * 0.8 ? t('well_done') : t('keep_it_up')}
        </Text>

        {/* Score card */}
        <View style={[styles.resultScoreCard, { borderColor: quizData?.color + '40' }]}>
          <View style={styles.resultScoreRow}>
            <Text style={[styles.resultScoreNum, { color: quizData?.color }]}>+{displayPoints}</Text>
            <Text style={styles.resultScoreLabel}>{t('points_earned')}</Text>
          </View>

          {isSaving && <Text style={styles.savingText}>{t('saving_points')}</Text>}
          {hasSaved && (
            <Text style={styles.savedText}>
              {t('results_saved')}
            </Text>
          )}
        </View>

        <Text style={styles.resultCorrectLabel}>
          {t('answered_correctly')} {correctCount}/{TOTAL_QUESTIONS} {t('questions_count')}
        </Text>

        {/* Result dot row */}
        <View style={styles.resultDotRow}>
          {results.map((r, i) => (
            <View
              key={i}
              style={[styles.resultDot, r ? styles.resultDotGreen : styles.resultDotRed]}
            >
              <Ionicons name={r ? 'checkmark' : 'close'} size={12} color="#FFF" />
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.resultPrimaryBtn, { backgroundColor: quizData.color }]}
          onPress={handleReplay}
        >
          <Ionicons name="refresh" size={18} color="#FFF" />
          <Text style={styles.resultPrimaryBtnText}>{t('replay')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resultSecondaryBtn}
          onPress={() => {
            if (pagodaId?.startsWith('culture_')) {
              router.replace('/quiz-culture');
            } else if (pagodaId?.startsWith('food_')) {
              router.replace('/quiz-food');
            } else {
              router.replace('/quiz-pagoda');
            }
          }}
        >
          <Text style={styles.resultSecondaryBtnText}>{t('choose_another_quiz')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─────────────── QUESTION SCREEN ───────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Decorative background circle */}
      <View style={[styles.bgCircle, { backgroundColor: quizData.color + '05' }]} />

      {/* Modern Header - Remove Close button here */}
      <View style={styles.headerContainer}>
        <View style={styles.headerInfo}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeftSection}>
              <TouchableOpacity onPress={() => setShowExitModal(true)} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={ms(26)} color="#334155" />
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
                {t('question_label')} {questionIndex + 1} / {TOTAL_QUESTIONS}
              </Text>
            </View>
            <View style={styles.scorePill}>
              <Ionicons name="flash" size={ms(16)} color="#F59E0B" />
              <Text style={styles.scorePillText} numberOfLines={1}>{score}</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  { width: progressBarWidth, backgroundColor: quizData.color },
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: contentFade,
          transform: [{ translateY: slideUp }]
        }}>
          {/* Dot Indicators - Floating style */}
          <View style={styles.modernDotRow}>
            {quizData.questions.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.modernDot,
                  i < questionIndex
                    ? results[i]
                      ? styles.modernDotCorrect
                      : styles.modernDotWrong
                    : i === questionIndex
                      ? [styles.modernDotActive, { backgroundColor: quizData.color }]
                      : styles.modernDotEmpty,
                ]}
              />
            ))}
          </View>

          {/* Question Area */}
          <Animated.View
            style={[styles.mainCard, { transform: [{ translateX: cardShake }] }]}
          >
            <Text style={styles.mainQuestionText}>
              {isKm ? (currentQuestion?.questionKm || currentQuestion?.question) : currentQuestion?.question}
            </Text>
          </Animated.View>

          {/* Options Area */}
          <View style={styles.optionsArea}>
            {currentQuestion?.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                activeOpacity={0.8}
                onPress={() => handleAnswer(index)}
                disabled={answerState !== 'idle'}
              >
                <View style={getOptionLetterStyle(index)}>
                  {answerState !== 'idle' && index === currentQuestion?.correctIndex ? (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  ) : answerState !== 'idle' && index === selectedOption && index !== currentQuestion.correctIndex ? (
                    <Ionicons name="close" size={16} color="#FFF" />
                  ) : (
                    <Text style={[
                      styles.optLetter,
                      answerState !== 'idle' && index === currentQuestion.correctIndex ? { color: '#FFF' } : {}
                    ]}>
                      {String.fromCharCode(65 + index)}
                    </Text>
                  )}
                </View>
                <Text style={styles.optText}>
                  {isKm ? (currentQuestion?.optionsKm?.[index] || option) : option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
        <View style={{ height: vs(40) }} />
      </ScrollView>

      {/* New Bottom Feedback UI */}
      {isShowingFeedback && (
        <View style={styles.feedbackBottomWrapper}>
          <View style={[
            styles.feedbackBottomCard,
            answerState === 'wrong' && styles.feedbackBottomCardWrong,
          ]}>
            <View style={styles.feedbackHeaderRow}>
              <View style={[styles.statusIconCircle, answerState === 'wrong' && styles.statusIconCircleWrong]}>
                <Ionicons
                  name={answerState === 'correct' ? 'checkmark' : 'close'}
                  size={24}
                  color="#FFF"
                />
              </View>
              <Text style={[styles.statusText, answerState === 'wrong' && styles.statusTextWrong]}>
                {answerState === 'correct' ? t('amazing') : t('incorrect')}
              </Text>
            </View>

            {currentQuestion?.explanation && (
              <ScrollView
                style={styles.explScroll}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 0 }}
              >
                <Text style={[styles.explTextNew, answerState === 'wrong' && styles.explTextNewWrong]}>
                  {currentQuestion.explanation}
                </Text>
              </ScrollView>
            )}

            <View style={styles.correctAnswerBox}>
              <Text style={[styles.correctAnswerLabel, answerState === 'wrong' && styles.correctAnswerLabelWrong]}>
                {t('correct_answer_label')}
              </Text>
              <Text style={[styles.correctAnswerText, answerState === 'wrong' && styles.correctAnswerTextWrong]}>
                {currentQuestion?.options[currentQuestion.correctIndex]}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.nextBtnNew, answerState === 'wrong' && styles.nextBtnNewWrong]}
              onPress={moveToNextQuestion}
              activeOpacity={0.9}
            >
              <Text style={styles.nextBtnTextNew}>{t('continue_btn')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Custom Exit Modal */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowExitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exitModalContent}>
            <View style={styles.exitIconCircle}>
              <Ionicons name="exit-outline" size={35} color="#EF4444" />
            </View>
            <Text style={styles.exitTitle}>{t('exit_game_title')}</Text>

            <View style={styles.exitActionRow}>
              <TouchableOpacity
                style={styles.stayBtn}
                onPress={() => setShowExitModal(false)}
              >
                <Text style={styles.stayBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('stay_and_play')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmExitBtn}
                onPress={() => {
                  setShowExitModal(false);
                  router.back();
                }}
              >
                <Text style={styles.confirmExitBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('exit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.exitModalContent}>
            <View style={[styles.exitIconCircle, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
              <Ionicons name="person-circle-outline" size={40} color="#3B82F6" />
            </View>
            <Text style={styles.exitTitle}>{t('not_logged_in_title')}</Text>
            <Text
              style={styles.exitSub}
              numberOfLines={2}
            >
              {t('login_to_save_points')}
            </Text>

            <View style={styles.exitActionRow}>
              <TouchableOpacity
                style={styles.stayBtn}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/login');
                }}
              >
                <Text style={styles.stayBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('login_now')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmExitBtn}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.confirmExitBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('maybe_later')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  bgCircle: {
    position: 'absolute',
    top: -vs(100),
    right: -s(100),
    width: s(300),
    height: s(300),
    borderRadius: s(150),
    zIndex: 0,
  },

  // ── MODERN HEADER ──
  headerContainer: {
    paddingTop: vs(52),
    paddingHorizontal: s(16),
    paddingBottom: vs(20),
    height: vs(122),
    backgroundColor: '#FFF',
    borderBottomLeftRadius: s(24),
    borderBottomRightRadius: s(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 10,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'stretch',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(10),
  },
  headerLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    flex: 1,
    marginRight: s(12),
  },
  headerTitle: {
    fontSize: ms(17),
    fontWeight: '600',
    color: '#334155',
  },
  progressContainer: {
    width: '100%',
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressTrack: {
    flex: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: ms(20),
    gap: s(4),
    borderWidth: 1.5,
    borderColor: '#FEF3C7',
    justifyContent: 'center',
    flexShrink: 0,
  },
  scorePillText: {
    fontSize: ms(15),
    fontWeight: '700',
    color: '#D97706',
  },

  // ── SCROLL CONTENT ──
  scrollContent: {
    paddingTop: 30,
    paddingHorizontal: 20,
    flexGrow: 1,
  },

  // ── MODERN DOTS ──
  modernDotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  modernDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modernDotEmpty: {
    backgroundColor: '#CBD5E1',
    width: 6,
    height: 6,
  },
  modernDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  modernDotCorrect: {
    backgroundColor: '#22C55E',
  },
  modernDotWrong: {
    backgroundColor: '#EF4444',
  },

  // ── MAIN QUESTION CARD ──
  mainCard: {
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: 24,
  },
  mainQuestionText: {
    fontSize: 22,
    fontWeight: '400',
    color: '#1E293B',
    lineHeight: 32,
    textAlign: 'center',
  },
  modernExplBox: {
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  modernExplCorrect: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  modernExplWrong: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  modernExplText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'justify',
  },

  // ── OPTIONS AREA ──
  optionsArea: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 18,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCorrect: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  optionWrong: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionDimmed: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
    borderColor: '#F1F5F9',
  },
  optionLetterBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optLetter: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748B',
  },
  optText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: '#334155',
  },
  correctMarker: {
    marginLeft: 8,
  },

  // --- New Bottom Feedback Styles ---
  feedbackBottomWrapper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 2000,
  },
  feedbackBottomCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 36,
    width: '100%',
    maxWidth: 350,
    padding: 30,
    borderWidth: 2,
    borderColor: '#DCFCE7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  feedbackBottomCardWrong: {
    backgroundColor: '#FEF2F2', // Light red
    borderColor: '#FEE2E2',
  },
  feedbackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconCircleWrong: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 20,
    fontWeight: '400',
    color: '#166534',
  },
  statusTextWrong: {
    color: '#991B1B',
  },
  explScroll: {
    width: '100%',
    maxHeight: 250,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1E293B',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 12,
    marginTop: 15,
  },
  explTextNew: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
    fontWeight: '400',
    textAlign: 'center',
  },
  explTextNewWrong: {
    color: '#334155',
  },
  nextBtnNew: {
    backgroundColor: '#22C55E',
    height: 60,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nextBtnNewWrong: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  nextBtnTextNew: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '400',
  },
  correctAnswerBox: {
    marginTop: 10,
    marginBottom: 20,
    alignSelf: 'center',
    alignItems: 'center',
    gap: 0,
  },
  correctAnswerLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  correctAnswerLabelWrong: {
    color: '#64748B',
  },
  correctAnswerText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1E293B',
    textAlign: 'center',
  },
  correctAnswerTextWrong: {
    color: '#1E293B',
  },

  // ── RESULT SCREEN ──
  resultStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultTitle: { fontSize: 26, fontWeight: '400', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  resultScoreCard: {
    width: '100%', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 24, padding: 24, borderWidth: 2, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07, shadowRadius: 12, elevation: 4,
  },
  resultScoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  resultScoreNum: { fontSize: 52, fontWeight: '400' },
  resultScoreLabel: { fontSize: 16, color: '#64748B', fontWeight: '400' },
  savingText: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
  savedText: { fontSize: 12, color: '#22C55E', fontWeight: '400', marginTop: 6 },
  resultCorrectLabel: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  resultDotRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  resultDot: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  resultDotGreen: { backgroundColor: '#22C55E' },
  resultDotRed: { backgroundColor: '#EF4444' },
  resultPrimaryBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 18, marginBottom: 12,
  },
  resultPrimaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '400' },
  resultSecondaryBtn: {
    paddingVertical: 12,
  },
  resultSecondaryBtnText: { color: '#64748B', fontSize: 14, fontWeight: '400', textAlign: 'center' },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },
  exitModalContent: {
    backgroundColor: '#FFF',
    borderRadius: ms(30),
    padding: s(30),
    width: '100%',
    maxWidth: s(340),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(10) },
    shadowOpacity: 0.1,
    shadowRadius: s(20),
    elevation: 10,
  },
  exitIconCircle: {
    width: s(80),
    height: s(80),
    borderRadius: s(40),
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(15),
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  exitTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: vs(25),
    textAlign: 'center',
    alignSelf: 'stretch',
  },
  exitSub: {
    fontSize: ms(17),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: vs(24),
    marginBottom: vs(28),
    alignSelf: 'stretch',
    fontWeight: '400',
  },
  exitActionRow: {
    width: '100%',
    gap: vs(12),
  },
  stayBtn: {
    backgroundColor: '#3B82F6',
    height: vs(56),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  stayBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
  confirmExitBtn: {
    backgroundColor: '#EF4444',
    height: vs(56),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  confirmExitBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },

  // --- Guest View Styles ---
  guestIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestSub: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  guestPrimaryBtn: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  guestPrimaryBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '400',
  },
  guestSecondaryBtn: {
    width: '100%',
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  guestSecondaryBtnText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '400',
  },
});
