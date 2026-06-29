import { ThemedText } from '@/components/themed-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function LanguageDetailScreen() {
  const router = useRouter();
  const { categoryId, title } = useLocalSearchParams();
  const { t } = useLanguage();

  const [category, setCategory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    const unsubscribe = onSnapshot(doc(db, 'vocab_categories', categoryId as string), (doc) => {
      if (doc.exists()) {
        setCategory({ id: doc.id, ...doc.data() });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [categoryId]);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const player = useAudioPlayer('');

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing) {
        setPlayingId(null);
      }
    });
    return () => subscription.remove();
  }, [player]);

  const playSound = async (text: string, langCode: string, id: string) => {
    if (!text) return;

    try {
      setPlayingId(id);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`;

      player.replace(url);
      player.play();
    } catch (error) {
      console.error('Lỗi khi phát âm thanh:', error);
      setPlayingId(null);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/language_study' as any);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={28} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!category) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={28} color="#000000" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{t('no_vocab_data')}</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
            {title ? t(title as string) : t(category.title)}
          </ThemedText>
        </View>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {(category.words || []).map((word: any, index: number) => (
            <View key={word.id} style={styles.flashcard}>
              <View style={styles.cardHeader}>
                <View style={[styles.indexBadge, { backgroundColor: (category.color || '#3B82F6') + '20' }]}>
                  <ThemedText style={[styles.indexText, { color: category.color || '#3B82F6' }]}>{index + 1}</ThemedText>
                </View>
                <TouchableOpacity onPress={() => playSound(word.khm, 'km', word.id)}>
                  <Ionicons
                    name={playingId === word.id ? "volume-high" : "volume-medium-outline"}
                    size={28}
                    color={playingId === word.id ? (category.color || '#3B82F6') : "#0060d6ff"}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.wordContent}>
                <ThemedText style={styles.khmerText} selectable={true}>{word.khm}</ThemedText>
                <ThemedText style={styles.pronunciationText}>&quot;{word.pronunciation}&quot; </ThemedText>

                <View style={styles.divider} />

                <ThemedText style={styles.vieText}>{word.life || word.vie}</ThemedText>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Slate 50
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 32, // Padding lines
    paddingTop: 5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  flashcard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  indexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexText: {
    fontSize: 14,
    fontWeight: '400',
  },
  wordContent: {
    alignItems: 'center',
  },
  khmerText: {
    fontSize: 36,
    lineHeight: 56, // Tăng lineHeight để tránh cắt nét dưới của chữ Khmer
    paddingBottom: 10, // Có thêm khoảng trống cho các nét đuôi (subscripts)
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: 2,
    textAlign: 'center',
  },
  pronunciationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3B82F6',
    fontWeight: '400',
    fontStyle: 'italic',
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
    width: '100%',
  },
  divider: {
    width: '50%',
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  vieText: {
    fontSize: 18,
    fontWeight: '400',
    color: '#475569',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
  }
});
