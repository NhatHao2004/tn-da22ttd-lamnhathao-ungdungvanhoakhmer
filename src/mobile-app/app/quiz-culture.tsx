import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCultures } from '@/hooks/use-culture';
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

export default function QuizCultureSelectScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { cultures, loading: culturesLoading } = useCultures();
  const { quizzes, loading: quizzesLoading } = useQuizzes();
  const loading = culturesLoading || quizzesLoading;

  const isKm = language === 'km';
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Sắp xếp theo thứ tự yêu cầu: culture_2, culture_3, culture_4, culture_1, culture_5
  const order = ['culture_2', 'culture_3', 'culture_4', 'culture_1', 'culture_5'];

  const items = cultures
    .filter(c => quizzes.some(q => q.pagodaId === c.id))
    .map(culture => {
      const quiz = quizzes.find(q => q.pagodaId === culture.id)!;
      const imageSource = typeof culture.imageUrl === 'string' && culture.imageUrl
        ? { uri: culture.imageUrl }
        : quiz.image;

      // Đổi tên culture_1 nếu cần theo yêu cầu
      let displayName = isKm ? (culture.name_khmer || quiz.pagodaNameKm) : (culture.name || quiz.pagodaName);
      if (culture.id === 'culture_1') {
        displayName = isKm ? 'សាសនា និងជីវិត' : 'Tôn giáo và đời sống';
      }
      if (culture.id === 'culture_2') {
        displayName = isKm ? 'ពិធីបុណ្យប្រពៃណី' : 'Lễ hội truyền thống';
      }
      if (culture.id === 'culture_3') {
        displayName = isKm ? 'សិល្បៈ ចម្រៀង និងរបាំ' : 'Nghệ thuật ca và múa';
      }
      if (culture.id === 'culture_4') {
        displayName = isKm ? 'ភាសា និងអក្សរសាស្ត្រ' : 'Ngôn ngữ và chữ viết';
      }
      if (culture.id === 'culture_5') {
        displayName = isKm ? 'សម្លៀកបំពាក់ប្រពៃណី' : 'Trang phục truyền thống';
      }

      return {
        id: culture.id,
        name: displayName,
        location: isKm ? (culture.location_khmer || culture.location || quiz.location) : (culture.location || quiz.location),
        imageSource,
        imageUrl: culture.imageUrl || '',
        color: quiz.color,
        questionCount: quiz.questions?.length || 0,
      };
    });

  const handleSelect = (pagodaId: string, imageUrl: string, pagodaLocation: string) => {
    if (!user || user.isAnonymous) {
      setShowLoginModal(true);
      return;
    }
    router.push({ pathname: '/game-mcq' as any, params: { pagodaId, imageUrl, pagodaLocation } });
  };

  return (
    <View style={styles.container}>
      {/* Header – giống pagoda.tsx */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
            {isKm ? 'វប្បធម៌ខ្មែរ' : 'Văn hóa Khmer'}
          </Text>
        </View>
        <View style={{ width: s(40) }} />
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF0050" />
          <Text style={{ marginTop: 10, color: '#888' }}>
            {isKm ? 'កំពុងផ្ទុកទិន្នន័យ...' : 'Đang tải dữ liệu...'}
          </Text>
        </View>
      )}

      {/* Danh sách – giống pagoda.tsx */}
      {!loading && (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.list}>
            {items.map(item => (
              <View key={item.id} style={styles.card}>
                {/* Ảnh */}
                <View style={styles.imageContainer}>
                  <Image
                    source={item.imageSource}
                    style={styles.image}
                    resizeMode="cover"
                    fadeDuration={0}
                  />
                </View>

                {/* Nội dung */}
                <View style={styles.cardContent}>
                  <Text style={styles.name}>{item.name}</Text>

                  {/* Quiz footer thêm */}
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
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: s(24) }}>
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
        </View>
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
  scrollContent: { paddingBottom: vs(10), flexGrow: 1 },
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
  location: { fontSize: ms(13), color: '#666', marginBottom: vs(0) },
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
    borderRadius: ms(32),
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
