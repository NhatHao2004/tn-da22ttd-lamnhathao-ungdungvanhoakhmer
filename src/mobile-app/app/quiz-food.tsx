import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFoods } from '@/hooks/use-foods';
import { useQuizzes } from '@/hooks/use-quizzes';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function QuizFoodSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { foods, loading: foodsLoading } = useFoods();
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const loading = foodsLoading || quizzesLoading;

  const isKm = language === 'km';
  const [showLoginModal, setShowLoginModal] = useState(false);

  const order = ['food_5', 'food_1', 'food_4', 'food_2', 'food_3'];

  const items = foods
    .map(food => {
      const quiz = quizzes.find(q => q.pagodaId === food.id);
      const imageSource = typeof food.imageUrl === 'string' && food.imageUrl
        ? { uri: food.imageUrl }
        : (quiz?.image || require('@/assets/images/amthuc.jpg'));

      let displayName = isKm ? (food.name_khmer || food.name) : food.name;

      const colors = {
        'food_1': '#EAB308',
        'food_2': '#84CC16',
        'food_3': '#10B981',
        'food_4': '#06B6D4',
        'food_5': '#8B5CF6'
      };

      return {
        id: food.id,
        name: displayName,
        location: isKm ? (food.location_khmer || food.location) : food.location,
        imageSource,
        imageUrl: food.imageUrl || '',
        color: colors[food.id as keyof typeof colors] || '#0179e9ff',
        questionCount: quiz?.questions?.length || 0,
      };
    });

  const handleSelect = (foodId: string, imageUrl: string, foodLocation: string) => {
    if (!user || user.isAnonymous) {
      setShowLoginModal(true);
      return;
    }
    router.push({ pathname: '/game-mcq' as any, params: { pagodaId: foodId, imageUrl, pagodaLocation: foodLocation } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
            {isKm ? 'ម្ហូបខ្ mែរ' : 'Ẩm thực Khmer'}
          </Text>
        </View>
        <View style={{ width: s(40) }} />
      </View>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF0050" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            {isKm ? 'កំពុងផ្ទុកទិន្នន័យ...' : 'Đang tải dữ liệu...'}
          </Text>
        </View>
      )}

      {!loading && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {items.map(item => (
              <View key={item.id} style={styles.card}>
                <View style={styles.imageContainer}>
                  <Image
                    source={item.imageSource}
                    style={styles.image}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.name}>{item.name}</Text>

                  <View style={styles.footer}>
                    <View style={styles.info}>
                      <Text style={styles.infoText} adjustsFontSizeToFit numberOfLines={1}>
                        {(() => {
                          const count = item.questionCount;
                          const toKhmerNum = (n: number) => {
                            const khmerDigits = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
                            return n.toString().split('').map(d => khmerDigits[parseInt(d)] || d).join('');
                          };
                          return isKm
                            ? `${toKhmerNum(count)} សំណួរ - បូក ៥ ពិន្ទុសម្រាប់រាល់ចម្លើយដែលត្រឹមត្រូវ`
                            : `${count} câu hỏi - cộng 5 điểm cho mỗi câu đúng`;
                        })()}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.startBtn}
                      activeOpacity={0.8}
                      onPress={() => handleSelect(item.id, item.imageUrl, item.location)}
                    >
                      <Text style={styles.startBtnText} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'ចាប់ផ្តើម' : 'Bắt đầu'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

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
            <Text style={styles.modalTitle} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'តម្រូវឱ្យចូល' : 'Yêu cầu đăng nhập'}</Text>
            <Text style={styles.modalSub} adjustsFontSizeToFit numberOfLines={1}>
              {isKm ? 'អ្នកត្រូវចូលដើម្បីចូលរួមក្នុងបញ្ហាប្រឈមនេះ' : 'Bạn cần đăng nhập để tham gia thử thách và tích luỵ điểm xếp hạng'}
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/login');
                }}
              >
                <Text style={styles.modalPrimaryBtnText} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'ចូល' : 'Đăng nhập'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'បោះបង់' : 'Huỷ'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: vs(45),
    paddingBottom: vs(15),
    paddingHorizontal: s(15),
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    zIndex: 100,
  },
  backBtn: { width: s(40), height: s(40), justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#000000', fontSize: ms(20), fontWeight: '400' },
  content: { flex: 1 },
  scrollContent: { paddingBottom: vs(20), flexGrow: 1 },
  list: { padding: s(15), gap: vs(15) },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: ms(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
  },
  imageContainer: { width: '100%', aspectRatio: 16 / 10 },
  image: { width: '100%', height: '100%' },
  cardContent: { padding: s(15) },
  name: { fontSize: ms(18), fontWeight: '400', color: '#1A1A1A', marginBottom: vs(4) },
  location: { fontSize: ms(13), color: '#666', marginBottom: vs(12) },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 0,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: vs(10),
  },
  info: { flexDirection: 'row', alignItems: 'center', gap: s(5), flex: 1, marginRight: s(10) },
  infoText: { fontSize: ms(15), color: '#000000ff', fontWeight: '400' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(5),
    backgroundColor: '#0179e9ff',
    paddingHorizontal: s(16),
    paddingVertical: vs(8),
    borderRadius: ms(10),
  },
  startBtnText: { color: '#FFF', fontSize: ms(12), fontWeight: '400' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
    alignSelf: 'stretch',
  },
  modalSub: {
    fontSize: ms(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: vs(22),
    marginBottom: vs(24),
    alignSelf: 'stretch',
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
