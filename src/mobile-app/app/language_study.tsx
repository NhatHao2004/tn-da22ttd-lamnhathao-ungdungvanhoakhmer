import { ThemedText } from '@/components/themed-text';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { ms } from '@/utils/responsive';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const CATEGORY_IMAGES = [
  require('@/assets/images/giadinh.jpg'),
  require('@/assets/images/monan.jpg'),
  require('@/assets/images/chaohoi.jpg'),
  require('@/assets/images/sodem.jpg'),
];

export default function LanguageStudyScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const isKm = language === 'km';
  const [activeTab, setActiveTab] = useState<'topics' | 'translator'>('topics');
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

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
      setLoadingCats(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Translator Logic ---
  const [isViToKm, setIsViToKm] = useState(true);
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourcePronunciation, setSourcePronunciation] = useState('');
  const [targetPronunciation, setTargetPronunciation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingInput, setIsPlayingInput] = useState(false);
  const [isPlayingOutput, setIsPlayingOutput] = useState(false);
  const player = useAudioPlayer('');

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (!status.playing) {
        setIsPlayingInput(false);
        setIsPlayingOutput(false);
      }
    });
    return () => subscription.remove();
  }, [player]);

  useEffect(() => {
    if (!inputText.trim()) {
      setTranslatedText('');
      setSourcePronunciation('');
      setTargetPronunciation('');
      setIsLoading(false);
      return;
    }

    const timerId = setTimeout(() => {
      handleTranslate();
    }, 600);

    return () => clearTimeout(timerId);
  }, [inputText]);

  const handleSwap = () => {
    setIsViToKm((prev) => !prev);
    const oldInput = inputText;
    const oldSourcePron = sourcePronunciation;
    setInputText(translatedText || '');
    setTranslatedText(oldInput || '');
    setSourcePronunciation(targetPronunciation || '');
    setTargetPronunciation(oldSourcePron || '');
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const encodedText = encodeURIComponent(inputText.trim());
      const sourceLang = isViToKm ? 'vi' : 'km';
      const targetLang = isViToKm ? 'km' : 'vi';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&dt=rm&q=${encodedText}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data && data[0] && Array.isArray(data[0])) {
        const resultText = data[0][0][0];
        setTranslatedText(resultText);
        let srcPhon = '';
        let tgtPhon = '';
        const lastElement = data[0][data[0].length - 1];
        if (lastElement && lastElement.length >= 3) {
          tgtPhon = lastElement[2] || '';
          srcPhon = lastElement[3] || '';
        } else {
          for (let item of data[0]) {
            if (item[2] && typeof item[2] === 'string' && item[2].length > 0) tgtPhon = item[2];
            if (item[3] && typeof item[3] === 'string' && item[3].length > 0) srcPhon = item[3];
          }
        }
        setSourcePronunciation(srcPhon);
        setTargetPronunciation(tgtPhon);
      }
    } catch (error) {
      console.error("Lỗi khi gọi API Dịch:", error);
      setTranslatedText('Đã có lỗi xảy ra.');
    } finally {
      setIsLoading(false);
    }
  };

  const playSound = async (textToPlay: string, langCode: string, type: 'input' | 'output') => {
    if (!textToPlay) return;
    try {
      if (type === 'input') setIsPlayingInput(true);
      else setIsPlayingOutput(true);

      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToPlay)}&tl=${langCode}&client=tw-ob`;
      player.replace(url);
      player.play();
    } catch (error) {
      console.error('Lỗi khi phát âm thanh:', error);
      setIsPlayingInput(false);
      setIsPlayingOutput(false);
    }
  };
  // --- End Translator Logic ---

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleCategoryPress = (categoryId: string, title: string) => {
    router.push({
      pathname: '/language-detail' as any,
      params: {
        categoryId: categoryId,
        title: title
      }
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={28} color="#000000" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
              {t('language_study').replace('\n', ' ')}
            </ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'topics' && styles.activeTabItem]}
              onPress={() => setActiveTab('topics')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'topics' && styles.activeTabText]} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.8}>
                {t('learn_by_topic').replace('\n', ' ')}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'translator' && styles.activeTabItem]}
              onPress={() => setActiveTab('translator')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'translator' && styles.activeTabText]} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.8}>
                {t('vocab_translation').replace('\n', ' ')}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === 'topics' ? (
            <View style={styles.categoryList}>
              {loadingCats ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />
              ) : (
                categories.map((category, index) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.categoryMainCard}
                    activeOpacity={0.8}
                    onPress={() => handleCategoryPress(category.id, isKm && category.titleKm ? category.titleKm : category.title)}
                  >
                    <View style={styles.categoryImageContainer}>
                      <ExpoImage
                        source={
                          category.imageUrl
                            ? { uri: category.imageUrl }
                            : (category.title === 'cat_family' || category.id === 'family') ? require('@/assets/images/giadinh.jpg') :
                            (category.title === 'cat_food' || category.id === 'food') ? require('@/assets/images/monan.jpg') :
                            (category.title === 'cat_greetings' || category.id === 'greetings') ? require('@/assets/images/chaohoi.jpg') :
                            (category.title === 'cat_numbers' || category.id === 'numbers') ? require('@/assets/images/sodem.jpg') :
                            CATEGORY_IMAGES[index % CATEGORY_IMAGES.length]
                        }
                        style={styles.categoryCardImage}
                        contentFit="contain"
                        priority="high"
                        transition={200}
                      />
                    </View>
                    <View style={styles.categoryCardBody}>
                      <View style={styles.cardInfoRow}>
                        <View style={styles.textContainer}>
                          <ThemedText style={styles.categoryCardTitle} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.3}>
                            {isKm && category.titleKm ? category.titleKm : t(category.title)}
                          </ThemedText>
                        </View>
                        <View style={styles.startStudyBtn}>
                          <ThemedText style={styles.startStudyBtnText} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.8}>{isKm ? 'ចាប់ផ្តើមរៀន' : 'Bắt đầu học'}</ThemedText>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ) : (
            <View style={styles.translatorWrapper}>
              <View style={styles.langBarRow}>
                <TouchableOpacity style={styles.langButtonContainer}>
                  <ThemedText style={styles.langButtonText}>{isViToKm ? t('vietnamese') : t('khmer')}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSwap} style={styles.swapButton}>
                  <Ionicons name="swap-horizontal" size={24} color="#1A73E8" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.langButtonContainer}>
                  <ThemedText style={styles.langButtonText}>{isViToKm ? t('khmer') : t('vietnamese')}</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.inputArea}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.outTextLabel}>{isKm ? 'បញ្ចូលអត្ថបទ' : 'Đầu vào văn bản'}</ThemedText>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    placeholder={t('enter_text')}
                    placeholderTextColor="#848789ff"
                    value={inputText}
                    onChangeText={setInputText}
                  />
                  {sourcePronunciation ? (
                    <ThemedText style={styles.phoneticText}>{sourcePronunciation}</ThemedText>
                  ) : null}
                </View>

                <View style={styles.inputFooter}>
                  <TouchableOpacity
                    onPress={() => playSound(inputText, isViToKm ? 'vi' : 'km', 'input')}
                    disabled={!inputText.trim() || isPlayingInput || isPlayingOutput}
                  >
                    <Ionicons name={isPlayingInput ? "volume-high" : "volume-medium"} size={28} color="#1A73E8" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.resultArea}>
                <ThemedText style={styles.outTextLabel}>{isKm ? 'លទ្ធផលអត្ថបទ' : 'Đầu ra văn bản'}</ThemedText>
                {translatedText ? (
                  <View style={[{ flex: 1, justifyContent: 'space-between' }, isLoading ? { opacity: 0.5 } : {}]}>
                    <View>
                      <ThemedText style={styles.resultText} selectable>{translatedText}</ThemedText>
                      {targetPronunciation ? (
                        <ThemedText style={styles.phoneticText}>{targetPronunciation}</ThemedText>
                      ) : null}
                    </View>
                    <View style={styles.resultFooter}>
                      <TouchableOpacity
                        onPress={() => playSound(translatedText, isViToKm ? 'km' : 'vi', 'output')}
                        disabled={isPlayingInput || isPlayingOutput}
                      >
                        <Ionicons name={isPlayingOutput ? "volume-high" : "volume-medium"} size={28} color="#1A73E8" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : isLoading ? (
                  <ActivityIndicator size="small" color="#1A73E8" style={{ marginTop: 30 }} />
                ) : (
                  <ThemedText style={styles.emptyResultText}></ThemedText>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
  },
  headerTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#000',
  },
  tabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsContainer: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: '#3B82F6',
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  tabText: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#94A3B8',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '400',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  categoryList: {
    padding: 15,
    gap: 15,
  },
  categoryMainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
  },
  categoryImageContainer: {
    width: '100%',
    aspectRatio: 16 / 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryCardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  categoryCardBody: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    paddingTop: 6,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    paddingRight: 5,
  },
  categoryCardTitle: {
    fontSize: ms(16),
    fontWeight: '400',
    color: '#1A1A1A',
    marginLeft: 10,
  },
  categoryCardSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  startStudyBtn: {
    backgroundColor: '#0179e9',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#0179e9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minWidth: 65,
  },
  startStudyBtnText: {
    color: '#FFFFFF',
    fontSize: ms(13),
    fontWeight: '400',
    textAlign: 'center',
  },
  translatorWrapper: {
    padding: 15,
  },
  langBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 10,
    elevation: 1,
  },
  langButtonContainer: {
    flex: 1,
    alignItems: 'center',
  },
  langButtonText: {
    color: '#1A73E8',
    fontSize: ms(16),
    fontWeight: '400',
  },
  swapButton: {
    padding: 10,
  },
  inputArea: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    minHeight: 220,
    marginBottom: 15,
    elevation: 1,
  },
  textInput: {
    fontSize: 22,
    color: '#3C4043',
    textAlignVertical: 'top',
    minHeight: 120,
  },
  phoneticText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#5F6368',
    fontStyle: 'italic',
    marginTop: 5,
    width: '100%',
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  resultArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    minHeight: 250,
    elevation: 1,
  },
  outTextLabel: {
    fontSize: ms(13),
    color: '#848789ff',
    fontWeight: '400',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultText: {
    fontSize: 25,
    color: '#1A73E8',
    fontWeight: '400',
    lineHeight: 36,
    paddingVertical: 5,
  },
  resultFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  emptyResultText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 50,
    fontStyle: 'italic',
  }
});
