import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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

export default function TranslatorScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  // Trạng thái ngôn ngữ: true = Việt -> Khmer, false = Khmer -> Việt
  const [isViToKm, setIsViToKm] = useState(true);

  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourcePronunciation, setSourcePronunciation] = useState('');
  const [targetPronunciation, setTargetPronunciation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer('');

  useEffect(() => {
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      setIsPlaying(status.playing);
    });
    return () => subscription.remove();
  }, [player]);

  // Auto-translate with debounce
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

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/language_study' as any);
    }
  };

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

        // Google Translate thường nhét array phiên âm ở cuối
        const lastElement = data[0][data[0].length - 1];
        if (lastElement && lastElement.length >= 3) {
          tgtPhon = lastElement[2] || '';
          srcPhon = lastElement[3] || '';
        } else {
          // Backup search
          for (let item of data[0]) {
            if (item[2] && typeof item[2] === 'string' && item[2].length > 0) {
              tgtPhon = item[2];
            }
            if (item[3] && typeof item[3] === 'string' && item[3].length > 0) {
              srcPhon = item[3];
            }
          }
        }

        setSourcePronunciation(srcPhon);
        setTargetPronunciation(tgtPhon);
      }
    } catch (error) {
      console.error("Lỗi khi gọi API Dịch:", error);
      setTranslatedText(t('translation_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const playSound = async (textToPlay: string, langCode: string) => {
    if (!textToPlay) return;

    try {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textToPlay)}&tl=${langCode}&client=tw-ob`;
      
      player.replace(url);
      player.play();
    } catch (error) {
      console.error('Lỗi khi phát âm thanh:', error);
      setIsPlaying(false);
    }
  };

  const clearInput = () => {
    setInputText('');
    setTranslatedText('');
    setSourcePronunciation('');
    setTargetPronunciation('');
  };

  const sourceLabel = isViToKm ? t('vietnamese') : t('khmer');
  const targetLabel = isViToKm ? t('khmer') : t('vietnamese');

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>

        {/* Header Navigation */}
        <View style={styles.navHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={28} color="#000000ff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
              {t('vocab_translation')}
            </ThemedText>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Thanh Chọn Ngôn Ngữ */}
        <View style={styles.langBarRow}>
          <TouchableOpacity style={styles.langButtonContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={styles.langButtonText}>{sourceLabel}</ThemedText>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSwap} style={styles.swapButton}>
            <Ionicons name="swap-horizontal" size={24} color="#000000ff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.langButtonContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText style={styles.langButtonText}>{targetLabel}</ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Đường gạch ngang phân cách mỏng */}
        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollArea}>

          {/* Ô Nhập Văn Bản */}
          <View style={styles.inputArea}>
            <View style={styles.inputRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.textInput}
                  multiline
                  placeholder={t('enter_text')}
                  placeholderTextColor="#9AA0A6"
                  value={inputText}
                  onChangeText={setInputText}
                  autoFocus={true}
                />
                {sourcePronunciation ? (
                  <ThemedText style={styles.phoneticText}>{sourcePronunciation}</ThemedText>
                ) : null}
              </View>
            </View>

            <View style={styles.inputFooter}>
              <TouchableOpacity
                onPress={() => playSound(inputText, isViToKm ? 'vi' : 'km')}
                disabled={!inputText.trim() || isPlaying}
              >
                <Ionicons
                  name={isPlaying ? "volume-high" : "volume-medium"}
                  size={24}
                  color="#1A73E8"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Đường gạch ranh giới mỏng */}
          <View style={styles.divider} />

          {/* Ô Kết Quả Dịch */}
          <View style={styles.resultArea}>
            {translatedText ? (
              <View style={isLoading ? { opacity: 0.5 } : {}}>
                <ThemedText style={styles.resultText} selectable={true}>
                  {translatedText}
                </ThemedText>

                {targetPronunciation ? (
                  <ThemedText style={styles.phoneticText}>{targetPronunciation}</ThemedText>
                ) : null}

                <View style={styles.resultFooter}>
                  <TouchableOpacity onPress={() => playSound(translatedText, isViToKm ? 'km' : 'vi')} disabled={isPlaying}>
                    <Ionicons
                      name={isPlaying ? "volume-high" : "volume-medium"}
                      size={24}
                      color="#1A73E8"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ) : isLoading ? (
              <ActivityIndicator size="small" color="#1A73E8" style={{ marginTop: 20 }} />
            ) : null}
          </View>

        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Toàn bộ nền trắng chuẩn Google
  },
  navHeader: {
    paddingTop: 45,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
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
    color: '#3C4043',
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 32,
    paddingTop: 5,
  },
  langBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
  },
  langButtonContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  langButtonText: {
    color: '#1A73E8', // Màu xanh dương đặc trưng Google
    fontSize: 16,
    fontWeight: '400',
  },
  caret: {
    marginLeft: 6,
    marginTop: 2,
  },
  swapButton: {
    padding: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8EAED',
    width: '100%',
  },
  scrollArea: {
    flexGrow: 1,
  },
  inputArea: {
    minHeight: 200,
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textInput: {
    fontSize: 26, // Chữ to giống ảnh
    color: '#3C4043', // Xám đen mềm
    textAlignVertical: 'top',
    minHeight: 200, // Đủ cao để gõ được vài dòng
  },
  clearBtn: {
    padding: 5,
    marginLeft: 10,
    alignSelf: 'flex-start', // Nằm dính trên cùng
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end', // Nút loa góc phải dưới
    alignItems: 'flex-end',
    flex: 1,
    marginTop: 10,
  },
  resultArea: {
    minHeight: 150,
    padding: 20,
    backgroundColor: '#F8F9FA', // Một chút màu xám rất nhạt cho kết quả
    borderBottomWidth: 1,
    borderColor: '#E8EAED',
  },
  resultText: {
    fontSize: 26,
    color: '#3C4043',
    lineHeight: 36,
  },
  phoneticText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: '#5F6368',
    fontStyle: 'italic',
    paddingHorizontal: 20,
    width: '100%',
  },
  resultFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flex: 1,
    marginTop: 20,
  },
  footerIcon: {
    marginLeft: 20,
  }
});
