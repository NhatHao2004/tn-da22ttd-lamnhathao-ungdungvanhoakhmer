import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCultures } from '@/hooks/use-cultures';
import { useThemeColor } from '@/hooks/use-theme-color';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  StyleSheet as RNStyleSheet,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
const StyleSheet = RNStyleSheet;

// Placeholder for images
const CULTURE_IMAGES: { [key: string]: any } = {
  default: require('@/assets/images/lehoi.jpg'),
  'oc-om-boc': require('@/assets/images/lehoi.jpg'),
  'ghe-ngo': require('@/assets/images/festival.jpg'),
};

const getCultureImage = (id: string, name: string) => {
  if (CULTURE_IMAGES[id as keyof typeof CULTURE_IMAGES]) {
    return CULTURE_IMAGES[id as keyof typeof CULTURE_IMAGES];
  }

  const nameKey = name.toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd');

  if (CULTURE_IMAGES[nameKey as keyof typeof CULTURE_IMAGES]) {
    return CULTURE_IMAGES[nameKey as keyof typeof CULTURE_IMAGES];
  }

  return CULTURE_IMAGES.default;
};

export default function CultureScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isKm = language === 'km';
  const tintColor = useThemeColor({}, 'tint');
  const { cultures, loading, error, refresh } = useCultures();

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const normalizeText = (text: string) => {
    return text.toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd');
  };

  const sortedCultures = [...cultures];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <ThemedText style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>
            {t('culture').replace('\n', ' ')}
          </ThemedText>
        </View>

        <View style={{ width: s(40) }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        ) : sortedCultures.length === 0 && !loading ? (
          <ThemedText style={styles.emptyText}>Chưa có dữ liệu văn hóa Khmer</ThemedText>
        ) : (
          <View style={styles.cultureList}>
            {sortedCultures.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.cultureCard}
                onPress={() => router.push({
                  pathname: '/culture-detail',
                  params: { id: item.id }
                })}
              >
                <View style={styles.imageContainer}>
                  <Image
                    source={
                      item.imageUrl && item.imageUrl !== ''
                        ? { uri: item.imageUrl }
                        : getCultureImage(item.id, item.name)
                    }
                    style={styles.cultureImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.cultureContent}>
                  <ThemedText style={styles.cultureName} numberOfLines={1} adjustsFontSizeToFit>
                    {isKm ? (item.name_khmer || item.name) : item.name}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {loading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF0050" />
          <ThemedText style={{ marginTop: vs(10), color: '#888' }}>{t('loading_content')}</ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: vs(45),
    paddingBottom: vs(15),
    paddingHorizontal: s(15),
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: s(10),
    elevation: 5,
    zIndex: 100,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: '#000000', fontSize: ms(20), fontWeight: '400', textAlign: 'center', lineHeight: ms(28) },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: vs(20),
    flexGrow: 1,
  },
  cultureList: {
    padding: s(15),
    gap: vs(15),
  },
  cultureCard: {
    backgroundColor: '#ffffff',
    borderRadius: s(20),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cultureImage: {
    width: '100%',
    height: '100%',
  },
  cultureContent: {
    padding: s(18),
  },
  cultureName: {
    fontSize: ms(17),
    fontWeight: '400',
    color: '#1A1A1A',
    marginBottom: vs(4),
  },
  cultureLocation: {
    fontSize: ms(13),
    color: '#666',
    fontWeight: '400',
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  errorText: {
    textAlign: 'center',
    marginTop: vs(50),
    color: 'red',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: vs(50),
    color: '#999',
  },
});
