import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateQuizScore } from '@/services/firebase-service';
import { db } from '@/utils/firebaseConfig';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');
const POINTS_PER_WORD = 5;

type GameState = 'selection' | 'playing' | 'results';

export default function VocabQuizScreen() {
    const router = useRouter();
    const { t, language } = useLanguage();
    const isKm = language === 'km';
    const { user, refreshUser } = useAuth();

    const [gameState, setGameState] = useState<GameState>('selection');
    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Matching Game State
    const [leftItems, setLeftItems] = useState<{ id: string, text: string }[]>([]);
    const [rightItems, setRightItems] = useState<{ id: string, text: string }[]>([]);
    const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
    const [selectedRight, setSelectedRight] = useState<string | null>(null);
    const [matches, setMatches] = useState<string[]>([]);
    const [wrongMatch, setWrongMatch] = useState<{ left: string, right: string } | null>(null);

    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [hasSaved, setHasSaved] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(120);

    // Fetch categories from Firebase
    useEffect(() => {
        const q = query(collection(db, 'vocab_categories'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            const sortedData = cats.sort((a: any, b: any) => {
                if ((a.order || 99) !== (b.order || 99)) return (a.order || 99) - (b.order || 99);
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setCategories(sortedData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Animations
    const cardShake = useRef(new Animated.Value(0)).current;

    const shakeAnimation = () => {
        Animated.sequence([
            Animated.timing(cardShake, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(cardShake, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(cardShake, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(cardShake, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(cardShake, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const prepareGame = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId);
        if (!category || !category.words) return;

        // Take 10 words for a good matching density on screen
        const words = [...category.words].sort(() => 0.5 - Math.random()).slice(0, 10);

        const leftItemsData: any[] = [];
        const rightItemsData: any[] = [];

        // Mix of types: 0 = Khm on Left/Vie on Right, 1 = Vie on Left/Khm on Right
        const parities = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1].sort(() => 0.5 - Math.random());

        words.forEach((w, index) => {
            const vieText = w.life || w.vie || '';
            if (parities[index] === 0) {
                leftItemsData.push({ id: w.id, text: w.khm, type: 'khm' });
                rightItemsData.push({ id: w.id, text: vieText, type: 'vie' });
            } else {
                leftItemsData.push({ id: w.id, text: vieText, type: 'vie' });
                rightItemsData.push({ id: w.id, text: w.khm, type: 'khm' });
            }
        });

        // Shuffle each column result
        setLeftItems(leftItemsData.sort(() => 0.5 - Math.random()));
        setRightItems(rightItemsData.sort(() => 0.5 - Math.random()));
        setMatches([]);
        setSelectedLeft(null);
        setSelectedRight(null);
        setScore(0);
        setGameState('playing');
        setHasSaved(false);
        setTimeLeft(120);
    };

    const handleMatch = (type: 'left' | 'right', id: string) => {
        if (matches.includes(id)) return;

        if (type === 'left') {
            if (selectedLeft === id) {
                setSelectedLeft(null);
            } else {
                setSelectedLeft(id);
                if (selectedRight) {
                    checkMatch(id, selectedRight);
                }
            }
        } else {
            if (selectedRight === id) {
                setSelectedRight(null);
            } else {
                setSelectedRight(id);
                if (selectedLeft) {
                    checkMatch(selectedLeft, id);
                }
            }
        }
    };

    const checkMatch = (leftId: string, rightId: string) => {
        if (leftId === rightId) {
            // Correct match
            const newMatches = [...matches, leftId];
            setMatches(newMatches);
            setSelectedLeft(null);
            setSelectedRight(null);
            setScore(prev => prev + POINTS_PER_WORD);
            Vibration.vibrate(50);

            // Check if all matched
            if (newMatches.length === leftItems.length) {
                setTimeout(() => setGameState('results'), 800);
            }
        } else {
            // Wrong match
            setWrongMatch({ left: leftId, right: rightId });
            shakeAnimation();
            Vibration.vibrate(100);
            setTimeout(() => {
                setWrongMatch(null);
                setSelectedLeft(null);
                setSelectedRight(null);
            }, 600);
        }
    };

    // Timer Logic
    useEffect(() => {
        let timer: any;
        if (gameState === 'playing' && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (timeLeft === 0 && gameState === 'playing') {
            setGameState('results');
        }
        return () => clearInterval(timer);
    }, [gameState, timeLeft]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const resetGame = () => {
        setGameState('selection');
        setSelectedCategory(null);
        setScore(0);
        setMatches([]);
        setSelectedLeft(null);
        setSelectedRight(null);
        setHasSaved(false);
    };

    // Auto-save results
    useEffect(() => {
        if (gameState === 'results' && user && score > 0 && !hasSaved && !isSaving) {
            saveResults();
        }
    }, [gameState]);

    const saveResults = async () => {
        if (!user || score <= 0 || hasSaved || isSaving) return;

        // Nếu là Admin, không lưu điểm vào CSDL
        if (user.role === 'Quản trị viên') {
            setHasSaved(true);
            return;
        }

        setIsSaving(true);
        try {
            const isPerfect = matches.length === leftItems.length;
            await updateQuizScore(user.uid, selectedCategory as string, score, isPerfect);
            await refreshUser();
            setHasSaved(true);
        } catch (error) {
            console.error('Error saving vocab quiz score:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (gameState === 'selection') {
        return (
            <View style={styles.container}>
                <SafeAreaView style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={28} color="#000000" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
                                {t('vocab_quiz')}
                            </Text>
                        </View>

                        <View style={{ width: 50 }} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={{ paddingBottom: 0 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.categoryList}>
                            {categories.map((category, index) => (
                                <View key={category.id || index} style={styles.categoryMainCard}>
                                    {/* Proxy Image Container */}
                                    <View style={styles.categoryImageContainer}>
                                        <Image
                                            source={
                                                category.imageUrl
                                                    ? { uri: category.imageUrl }
                                                    : (category.title === 'cat_family' || category.id === 'family') ? require('@/assets/images/giadinh.jpg') :
                                                        (category.title === 'cat_food' || category.id === 'food') ? require('@/assets/images/monan.jpg') :
                                                            (category.title === 'cat_greetings' || category.id === 'greetings') ? require('@/assets/images/chaohoi.jpg') :
                                                                (category.title === 'cat_numbers' || category.id === 'numbers') ? require('@/assets/images/sodem.jpg') :
                                                                    require('@/assets/images/giadinh.jpg')
                                            }
                                            style={styles.categoryCardImage}
                                            contentFit="contain"
                                        />
                                    </View>

                                    {/* Content */}
                                    <View style={styles.categoryCardBody}>
                                        <Text style={styles.categoryCardTitle} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.3}>
                                            {isKm && category.titleKm ? category.titleKm : t(category.title)}
                                        </Text>
                                        <Text style={styles.categoryCardSub} adjustsFontSizeToFit numberOfLines={1}>{Math.min(10, category.words?.length || 0)} {t('vocab_challenge_questions')}</Text>

                                        <View style={styles.quizInfoBox}>
                                            <Text style={styles.quizInfoLabel}>{t('correct_answer_points_msg')}</Text>
                                        </View>

                                        {/* Quiz footer */}
                                        <View style={styles.quizSelectionFooter}>
                                            <TouchableOpacity
                                                style={styles.startQuizBtn}
                                                activeOpacity={0.8}
                                                onPress={() => {
                                                    if (!user) {
                                                        Alert.alert(
                                                            t('login_required'),
                                                            t('login_required_long_msg'),
                                                            [
                                                                { text: t('cancel'), style: 'cancel' },
                                                                { text: t('login'), onPress: () => router.push('/login') },
                                                            ]
                                                        );
                                                        return;
                                                    }
                                                    setSelectedCategory(category.id);
                                                    prepareGame(category.id);
                                                }}
                                            >
                                                <Text style={styles.startQuizBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('start_quiz')}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </View>
        );
    }

    const stars = leftItems.length > 0 ? Math.ceil((matches.length / leftItems.length) * 5) : 0;

    if (gameState === 'results') {
        return (
            <View style={styles.resultsContainer}>
                <LinearGradient colors={['#F5F3FF', '#FFF', '#F5F3FF']} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 25 }}>
                    <View style={styles.resultStarsRow}>
                        {[1, 2, 3, 4, 5].map(s => (
                            <Ionicons
                                key={s}
                                name={s <= stars ? 'star' : 'star-outline'}
                                size={44}
                                color={s <= stars ? '#FBBF24' : '#E2E8F0'}
                                style={{ marginHorizontal: 4 }}
                            />
                        ))}
                    </View>
                    <Text style={styles.resultTitle} adjustsFontSizeToFit numberOfLines={1}>
                        {stars === 5 ? t('excellent') : stars >= 4 ? t('well_done') : t('keep_it_up')}
                    </Text>
                    <View style={styles.resultScoreCard}>
                        <Text style={styles.resultScoreNum}>+{score}</Text>
                        <Text style={styles.resultScoreLabel}>{t('points_earned')}</Text>
                        {isSaving && <Text style={styles.savingText}>{t('saving_results')}</Text>}
                        {hasSaved && (
                            <Text style={styles.savedText}>
                                {user?.role === 'Quản trị viên' ? 'Chế độ xem trước' : t('results_saved')}
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity style={styles.resultPrimaryBtn} onPress={() => prepareGame(selectedCategory!)}>
                        <Ionicons name="refresh" size={20} color="#FFF" />
                        <Text style={styles.resultPrimaryBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('replay')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.resultSecondaryBtn} onPress={resetGame}>
                        <Text style={styles.resultSecondaryBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('choose_another_quiz')}</Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']} style={{ backgroundColor: '#FFF' }}>
                <View style={styles.headerContainer}>
                    <TouchableOpacity onPress={() => setShowExitModal(true)} style={styles.headerCloseBtn}>
                        <Ionicons name="arrow-back" size={28} color="#1E293B" />
                    </TouchableOpacity>
                    <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={20} color={timeLeft < 30 ? '#EF4444' : '#1E293B'} />
                        <Text style={[styles.timerText, timeLeft < 30 && { color: '#EF4444' }]}>{formatTime(timeLeft)}</Text>
                    </View>
                    <View style={styles.scorePill}>
                        <Ionicons name="flash" size={16} color="#F59E0B" />
                        <Text style={styles.scorePillText}>{score}</Text>
                    </View>
                </View>
            </SafeAreaView>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                <Animated.View style={{ flex: 1, flexDirection: 'row', padding: 20, gap: 20, transform: [{ translateX: cardShake }] }}>
                    {/* Khmer Column */}
                    <View style={{ flex: 1, gap: 10 }}>
                        {leftItems.map((item) => {
                            const isMatched = matches.includes(item.id);
                            const isSelected = selectedLeft === item.id;
                            const isWrong = wrongMatch?.left === item.id;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => handleMatch('left', item.id)}
                                    disabled={isMatched}
                                    style={[
                                        styles.matchCard,
                                        isSelected && styles.matchCardSelected,
                                        isMatched && styles.matchCardMatched,
                                        isWrong && styles.matchCardWrong,
                                        isMatched && { opacity: 0.3 }
                                    ]}
                                >

                                    <Text style={[styles.matchText, isSelected && styles.matchTextSelected, isMatched && styles.matchTextMatched]}>{item.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Vietnamese Column */}
                    <View style={{ flex: 1, gap: 10 }}>
                        {rightItems.map((item) => {
                            const isMatched = matches.includes(item.id);
                            const isSelected = selectedRight === item.id;
                            const isWrong = wrongMatch?.right === item.id;

                            return (
                                <TouchableOpacity
                                    key={item.id}
                                    onPress={() => handleMatch('right', item.id)}
                                    disabled={isMatched}
                                    style={[
                                        styles.matchCard,
                                        isSelected && styles.matchCardSelected,
                                        isMatched && styles.matchCardMatched,
                                        isWrong && styles.matchCardWrong,
                                        isMatched && { opacity: 0.3 }
                                    ]}
                                >

                                    <Text style={[styles.matchText, isSelected && styles.matchTextSelected, isMatched && styles.matchTextMatched]}>{item.text}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Animated.View>
            </ScrollView>

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
                            <Ionicons name="exit-outline" size={40} color="#EF4444" />
                        </View>
                        <Text style={styles.exitTitle} adjustsFontSizeToFit numberOfLines={1}>{t('exit_game_title')}</Text>

                        <View style={styles.exitActionRow}>
                            <TouchableOpacity
                                style={styles.stayBtn}
                                onPress={() => setShowExitModal(false)}
                            >
                                <Text style={styles.stayBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('continue')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.confirmExitBtn}
                                onPress={() => {
                                    setShowExitModal(false);
                                    resetGame();
                                }}
                            >
                                <Text style={styles.confirmExitBtnText} adjustsFontSizeToFit numberOfLines={1}>{t('exit')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        backgroundColor: '#ffffff',
        paddingTop: vs(13),
        paddingBottom: vs(15),
        paddingHorizontal: s(15),
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: { width: s(40), height: s(40), justifyContent: 'center', alignItems: 'center' },
    headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#0F172A', fontSize: ms(20), fontWeight: '400' },
    content: { flex: 1 },
    introduction: { padding: s(24), backgroundColor: '#FFF', marginBottom: vs(16) },
    introTitle: { fontSize: ms(22), fontWeight: '400', color: '#1E293B', marginBottom: vs(8) },
    introDesc: { fontSize: ms(15), color: '#64748B', lineHeight: vs(22) },
    categoryList: { padding: s(15), gap: vs(15) },
    categoryMainCard: { backgroundColor: '#FFF', borderRadius: ms(24), padding: 0, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
    categoryImageContainer: { width: '100%', aspectRatio: 16 / 10, backgroundColor: '#FFFFFF', padding: s(12) },
    categoryCardImage: { width: '100%', height: '100%', borderRadius: ms(16) },
    categoryCardBody: { padding: s(20), gap: vs(3) },
    categoryCardTitle: { fontSize: ms(18), fontWeight: '400', color: '#1E293B', alignSelf: 'stretch', textAlign: 'center' },
    categoryCardSub: { fontSize: ms(14), color: '#64748B', marginBottom: vs(8), alignSelf: 'stretch', textAlign: 'center' },
    quizSelectionFooter: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: vs(12), marginTop: vs(8) },
    quizInfoBox: { flexDirection: 'row', alignItems: 'center', gap: s(4), alignSelf: 'center', marginBottom: vs(4) },
    quizInfoLabel: { fontSize: ms(11), color: '#000000ff', fontWeight: '400', backgroundColor: '#ffffffff', paddingHorizontal: s(8), paddingVertical: vs(2), borderRadius: ms(6), textTransform: 'uppercase' },
    startQuizBtn: { backgroundColor: '#3B82F6', paddingHorizontal: s(16), paddingVertical: vs(8), borderRadius: ms(12), alignItems: 'center' },
    startQuizBtnText: { color: '#FFF', fontWeight: '400', fontSize: ms(13) },
    resultsContainer: { flex: 1 },
    resultTitle: { fontSize: ms(32), fontWeight: '400', color: '#1E293B', marginBottom: vs(20), alignSelf: 'stretch', textAlign: 'center' },
    resultStarsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: vs(24) },
    resultScoreCard: { width: '100%', backgroundColor: '#FFF', borderRadius: ms(32), padding: s(30), alignItems: 'center', marginBottom: vs(30), elevation: 4 },
    resultScoreNum: { fontSize: ms(56), fontWeight: '400', color: '#7C3AED' },
    resultScoreLabel: { fontSize: ms(16), color: '#64748B', fontWeight: '400' },
    resultPrimaryBtn: { width: '100%', height: vs(60), backgroundColor: '#7C3AED', borderRadius: ms(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s(12) },
    resultPrimaryBtnText: { color: '#FFF', fontSize: ms(18), fontWeight: '400' },
    resultSecondaryBtn: { width: '100%', height: vs(60), alignItems: 'center', justifyContent: 'center' },
    resultSecondaryBtnText: { color: '#64748B', fontSize: ms(16), fontWeight: '400' },
    savingText: { fontSize: ms(12), color: '#94A3B8', marginTop: vs(8) },
    savedText: { fontSize: ms(12), color: '#22C55E', fontWeight: '400', marginTop: vs(8) },
    headerContainer: { paddingHorizontal: s(20), paddingBottom: vs(20), backgroundColor: '#FFF', borderBottomLeftRadius: ms(32), borderBottomRightRadius: ms(32), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerCloseBtn: { width: s(40), height: s(40), justifyContent: 'center', alignItems: 'center' },
    gameHeaderTitle: { fontSize: ms(16), fontWeight: '400', color: '#334155' },
    timerContainer: { flexDirection: 'row', alignItems: 'center', gap: s(6), backgroundColor: '#F1F5F9', paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: ms(20) },
    timerText: { fontSize: ms(16), fontWeight: '400', color: '#1E293B', fontVariant: ['tabular-nums'] },
    scorePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: ms(20), gap: s(6), borderWidth: 1, borderColor: '#FEF3C7' },
    scorePillText: { fontSize: ms(16), fontWeight: '400', color: '#D97706' },
    matchCard: { backgroundColor: '#FFF', borderRadius: ms(20), padding: s(8), height: vs(85), justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9', elevation: 2 },
    matchCardSelected: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
    matchCardMatched: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
    matchCardWrong: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    matchText: { fontSize: ms(16), fontWeight: '400', color: '#1E293B', textAlign: 'center' },
    matchTextSelected: { color: '#3B82F6' },
    matchTextMatched: { color: '#22C55E' },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: s(25),
    },
    exitModalContent: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: ms(32),
        padding: s(30),
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: vs(4) },
        shadowOpacity: 0.25,
        shadowRadius: s(10),
    },
    exitIconCircle: {
        width: s(80),
        height: s(80),
        borderRadius: s(40),
        backgroundColor: '#FEF2F2',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: vs(15),
        paddingLeft: s(7),
    },
    exitTitle: {
        fontSize: ms(22),
        fontWeight: '400',
        color: '#1E293B',
        marginBottom: vs(15),
        textAlign: 'center',
        alignSelf: 'stretch',
    },
    exitSub: {
        fontSize: ms(16),
        color: '#64748B',
        textAlign: 'center',
        marginBottom: vs(30),
        lineHeight: vs(24),
        alignSelf: 'stretch',
    },
    exitActionRow: {
        width: '100%',
        gap: vs(12),
    },
    stayBtn: {
        width: '100%',
        height: vs(56),
        backgroundColor: '#3B82F6',
        borderRadius: ms(16),
        justifyContent: 'center',
        alignItems: 'center',
    },
    stayBtnText: {
        fontSize: ms(16),
        fontWeight: '400',
        color: '#FFF',
    },
    confirmExitBtn: {
        width: '100%',
        height: vs(56),
        backgroundColor: '#EF4444',
        borderRadius: ms(16),
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmExitBtnText: {
        fontSize: ms(16),
        fontWeight: '400',
        color: '#FFF',
    },
});
