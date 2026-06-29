import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image, Linking, Modal, ScrollView,
  Share,
  StatusBar,
  StyleSheet as RNStyleSheet, Text, TouchableOpacity, View
} from 'react-native';
import { s, vs, ms, SCREEN_WIDTH, SCREEN_HEIGHT } from '@/utils/responsive';
const StyleSheet = RNStyleSheet;
import { WebView } from 'react-native-webview';

const HERO_HEIGHT = SCREEN_HEIGHT * 0.40;

export default function PagodaDetailScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isKm = language === 'km';
  const params = useLocalSearchParams();

  const id = params.id as string;
  const initialName = (params.name as string) || '';
  const initialLocation = (params.location as string) || '';
  const initialDescription = (params.description as string) || '';
  const initialImageUrl = (params.imageUrl1 as string) || (params.imageUrl as string);

  const [templeData, setTempleData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<'map' | 'quiz'>('map');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [prefetchedQuiz, setPrefetchedQuiz] = useState<any>(null);

  // Fetch destination data
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    const docRef = doc(db, 'destinations', id);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTempleData({ id, ...data });

        // Prefetch main image asynchronously (not blocking)
        const targetImg = data.imageUrl1 || data.imageUrl || initialImageUrl;
        if (targetImg) {
          Image.prefetch(targetImg).catch(() => {});
        }
      }
      setTimeout(() => setLoading(false), 500);
    }, (error) => {
      console.error('Error fetching temple detail:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Check unique favorite status for current user
  useEffect(() => {
    if (!id || !user?.uid) {
      setIsFavorite(false);
      return;
    }
    const favRef = doc(db, 'users', user.uid, 'favorites', id);
    const unsubFav = onSnapshot(favRef, (snap) => {
      setIsFavorite(snap.exists());
    });
    return () => unsubFav();
  }, [id, user?.uid]);
  
  // Prefetch quiz data when tab is switched to quiz
  useEffect(() => {
    if (activeTab === 'quiz' && id && !prefetchedQuiz) {
      const fetchQuiz = async () => {
        try {
          const { getQuizData } = require('@/services/firebase-service');
          const data = await getQuizData(id);
          if (data) setPrefetchedQuiz(data);
        } catch (e) {
          console.log("Prefetch quiz error:", e);
        }
      };
      fetchQuiz();
    }
  }, [activeTab, id, prefetchedQuiz]);

  const name = isKm ? (templeData?.name_khmer || templeData?.name || initialName) : (templeData?.name || initialName);
  const location = isKm ? (templeData?.location_khmer || templeData?.location || initialLocation) : (templeData?.location || initialLocation);
  const description = isKm ? (templeData?.description_khmer || templeData?.description || templeData?.detailedDescription || initialDescription) : (templeData?.description || templeData?.detailedDescription || initialDescription);
  const contentBlocks = templeData?.contentBlocks || [];
  const imageUrl = templeData?.imageUrl1 || templeData?.imageUrl || initialImageUrl;

  const imageSource = React.useMemo(() => {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    
    if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) {
      return { uri: imageUrl };
    }
    
    // Nếu là mã ảnh nội bộ (ví dụ: pagoda_1)
    const pagodaImages: { [key: string]: any } = {
      'pagoda_1': require('@/assets/images/chuaang.jpg'),
      'pagoda_2': require('@/assets/images/chuahang.jpg'),
      'pagoda_3': require('@/assets/images/kampong.jpg'),
      'pagoda_4': require('@/assets/images/salengcu.jpg'),
      'pagoda_5': require('@/assets/images/veluvana.jpg'),
    };
    
    return pagodaImages[imageUrl] || pagodaImages['pagoda_1']; // Fallback về chùa đầu tiên nếu không khớp
  }, [imageUrl]);

  const handleShare = async () => {
    try { await Share.share({ message: `${name}\n${location}` }); } catch (e) { }
  };

  const handleToggleFavorite = async () => {
    if (!user || user.isAnonymous) {
      setShowLoginModal(true);
      return;
    }
    try {
      const { toggleFavorite } = require('@/services/firebase-service');
      // Pass the whole temple object to be saved in favorites for easy listing
      const templeToFav = {
        id,
        name: templeData?.name || name,
        name_khmer: templeData?.name_khmer || '',
        location: templeData?.location || location,
        location_khmer: templeData?.location_khmer || '',
        imageUrl: templeData?.imageUrl || imageUrl,
        category: templeData?.category || 'Chùa'
      };
      await toggleFavorite(user.uid, templeToFav, !isFavorite);
    } catch (e) {
      console.error("Favorite Error:", e);
    }
  };

  const lat = (templeData?.latitude || params.latitude || '9.9231') as string;
  const lng = (templeData?.longitude || params.longitude || '106.3406') as string;

  const handleOpenDirections = () => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const webViewRef = useRef<any>(null);

  const reCenterMap = () => {
    webViewRef.current?.injectJavaScript(`
      map.setView([${lat}, ${lng}], 16);
      true;
    `);
  };

  const leafletHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background-color: #000; }
    .leaflet-container { image-rendering: -webkit-optimize-contrast; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false, maxZoom: 18 }).setView([${lat}, ${lng}], 16);
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, detectRetina: true }).addTo(map);
    var icon = L.divIcon({
      html: '<div style="width:28px;height:28px;background:#FF4B4B;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>',
      iconSize: [28, 28], iconAnchor: [14, 28], className: ''
    });
    L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
  </script>
</body>
</html>
  `;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loaderContent}>
          <ActivityIndicator size="large" color="#FF0050" />
          <Text style={[styles.loaderText, isKm && { letterSpacing: 0 }]}>{t('loading_content') || 'Đang tải nội dung...'}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={[styles.imageBlock, { backgroundColor: '#fff' }]}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={[styles.fullImg, { backgroundColor: '#fff' }]}
              fadeDuration={0}
            />
          ) : (
            <View style={styles.noImg}>
              <Ionicons name="image" size={60} color="#E2E8F0" />
            </View>
          )}

          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: s(12) }}>
              <TouchableOpacity onPress={handleToggleFavorite} style={styles.iconBtn}>
                <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={ms(22)} color={isFavorite ? "#FF4B4B" : "#000"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.contentArea}>
          <View style={styles.titleBox}>
            <Text style={styles.mainTitle} adjustsFontSizeToFit numberOfLines={1}>{name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={ms(18)} color="#FF6B6B" />
              <Text style={styles.locationLabel}>{location}</Text>
            </View>
          </View>

          {description ? (
            <View style={{ marginBottom: 0 }}>
              <Text style={styles.piecePara}>{description}</Text>
            </View>
          ) : null}

          {contentBlocks.map((block: any, index: number) => (
            <View key={index} style={styles.contentPiece}>
              {block.images && (
                <Image source={{ uri: block.images }} style={styles.blockPic} />
              )}
              <View style={styles.blockTextWrap}>
                {block.type === 'title' ? (
                  <Text style={styles.pieceTitle}>{isKm ? (block.value_khmer || block.value) : block.value}</Text>
                ) : (
                  <Text style={styles.piecePara}>{isKm ? (block.value_khmer || block.value) : block.value}</Text>
                )}
              </View>
            </View>
          ))}

          <View style={styles.mapWrap}>
            <View style={styles.sectionTabRow}>
              <TouchableOpacity
                onPress={() => setActiveTab('map')}
                style={[
                  styles.tabBtn,
                  activeTab === 'map' && { backgroundColor: '#3B82F6', borderColor: '#3B82F6' }
                ]}
              >
                <Text style={[styles.tabBtnText, activeTab === 'map' && styles.tabBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>{t('map_location')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('quiz')}
                style={[
                  styles.tabBtn,
                  activeTab === 'quiz' && { backgroundColor: '#FF6B2C', borderColor: '#FF6B2C' }
                ]}
              >
                <Text style={[styles.tabBtnText, activeTab === 'quiz' && styles.tabBtnTextActive]} numberOfLines={1} adjustsFontSizeToFit>{isKm ? 'ការប្រកួត' : 'THỬ THÁCH'}</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'map' ? (
              <View
                style={styles.mapBox}
                onTouchStart={() => setScrollEnabled(false)}
                onTouchEnd={() => setScrollEnabled(true)}
                onTouchCancel={() => setScrollEnabled(true)}
              >
                <WebView
                  ref={webViewRef}
                  style={styles.mapWebView}
                  source={{ html: leafletHtml }}
                  scrollEnabled={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  androidLayerType="hardware"
                  originWhitelist={['*']}
                />

                <View style={styles.mapControls}>
                  <TouchableOpacity style={styles.mapControlBtn} onPress={reCenterMap}>
                    <Ionicons name="locate" size={20} color="#0F172A" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.mapOpenBtn} onPress={handleOpenDirections}>
                  <Text style={styles.mapOpenText}>{t('view_directions')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.quizCard}>
                <Text style={styles.quizTitle} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'សាកល្បងចំណេះដឹង' : 'Kiểm tra kiến thức'}</Text>
                <Text style={styles.quizDesc} adjustsFontSizeToFit numberOfLines={2}>
                  {isKm ? (
                    <>តើអ្នកយល់ពី <Text style={{ fontWeight: '400', color: '#1E293B' }}>{name}</Text> យ៉ាងណា?{'\n'}ប្រកួតប្រជែងឥឡូវនេះដើម្បីទទួលបានពិន្ទុ</>
                  ) : (
                    <>Hiểu <Text style={{ fontWeight: '400', color: '#1E293B' }}>{name}</Text> như thế nào?{'\n'}Thử thách ngay để nhận điểm thưởng</>
                  )}
                </Text>
                <TouchableOpacity
                  style={styles.quizStartBtn}
                  onPress={() => {
                    const isAdmin = user?.role === 'Quản trị viên';
                    if (!isAdmin && (!user || user.isAnonymous)) {
                      setShowLoginModal(true);
                      return;
                    }

                    router.push({
                      pathname: '/game-mcq',
                      params: {
                        pagodaId: id,
                        imageUrl: imageUrl,
                        pagodaLocation: location,
                        preFetchedData: prefetchedQuiz ? JSON.stringify(prefetchedQuiz) : undefined
                      }
                    });
                  }}
                >
                  <Text style={styles.quizStartBtnText} adjustsFontSizeToFit numberOfLines={1}>{isKm ? 'ចាប់ផ្តើមការប្រកួត' : 'Bắt đầu thử thách'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ height: vs(20) }} />
        </View>
      </ScrollView>

      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={RNStyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowLoginModal(false)}
          />
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="person-circle-outline" size={ms(40)} color="#3B82F6" />
            </View>
            <Text style={styles.modalTitle} adjustsFontSizeToFit numberOfLines={1}>{t('login_required') || 'Yêu cầu đăng nhập'}</Text>
            <Text style={styles.modalSub} adjustsFontSizeToFit numberOfLines={1}>
              {t('login_to_use') || 'Bạn cần đăng nhập để sử dụng tính năng này'}
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push({
                    pathname: '/login',
                    params: { returnTo: '/pagoda-detail', returnId: id }
                  });
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>{isKm ? 'ចូល' : 'Đăng nhập'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.modalSecondaryBtnText}>{isKm ? 'បោះបង់' : 'Quay lại'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topNav: {
    position: 'absolute',
    top: vs(50),
    left: s(20),
    right: s(20),
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 100,
  },
  iconBtn: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.1,
    shadowRadius: s(5),
    elevation: 4,
  },
  imageBlock: { width: SCREEN_WIDTH, height: HERO_HEIGHT, backgroundColor: '#fff' },
  fullImg: { width: '100%', height: '100%' },
  noImg: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  contentArea: {
    paddingHorizontal: s(25),
    paddingTop: vs(30),
    backgroundColor: '#fff',
    borderTopLeftRadius: s(36),
    borderTopRightRadius: s(36),
    marginTop: -vs(30),
    minHeight: SCREEN_HEIGHT - HERO_HEIGHT + vs(30),
  },
  titleBox: { marginBottom: vs(20) },
  mainTitle: { fontSize: s(28), fontWeight: '400', color: '#0F172A', lineHeight: s(36) },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: vs(8), gap: s(6) },
  locationLabel: { fontSize: s(14), color: '#64748B', fontWeight: '400' },
  contentPiece: { marginTop: vs(20) },
  blockPic: { width: '100%', height: vs(220), borderRadius: s(24), marginBottom: vs(15) },
  blockTextWrap: {},
  pieceTitle: { fontSize: s(20), fontWeight: '400', color: '#0F172A', marginBottom: vs(8) },
  piecePara: { fontSize: s(15.5), lineHeight: vs(26), color: '#475569', textAlign: 'left' },
  mapWrap: { marginTop: vs(15) },
  mapBox: {
    height: vs(350),
    borderRadius: s(28),
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  mapWebView: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  mapOpenBtn: {
    position: 'absolute',
    bottom: vs(15),
    right: s(15),
    backgroundColor: '#3B82F6',
    paddingHorizontal: s(15),
    paddingVertical: vs(10),
    borderRadius: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  mapOpenText: { color: '#fff', fontSize: s(12), fontWeight: '400' },
  mapControls: { position: 'absolute', top: vs(15), right: s(15), gap: vs(10) },
  mapControlBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(2) },
    shadowOpacity: 0.15,
    shadowRadius: s(4),
    elevation: 3,
  },
  loaderContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  loaderContent: { alignItems: 'center', gap: vs(15) },
  loaderText: { fontSize: s(14), color: '#64748B', fontWeight: '400', letterSpacing: 0.5 },
  sectionTabRow: { flexDirection: 'row', gap: s(12), marginBottom: vs(20) },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    paddingVertical: vs(12),
    backgroundColor: '#F8FAFC',
    borderRadius: s(16),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnText: { fontSize: s(13), fontWeight: '400', color: '#64748b', textTransform: 'uppercase', lineHeight: vs(20) },
  tabBtnTextActive: { color: '#FFF' },
  quizCard: {
    minHeight: vs(280),
    backgroundColor: '#FFF7ED',
    borderRadius: s(28),
    borderWidth: 1,
    borderColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(30),
  },
  quizTitle: { fontSize: s(20), fontWeight: '400', color: '#1E293B', marginBottom: vs(8) },
  quizDesc: { fontSize: s(14), color: '#64748B', textAlign: 'center', lineHeight: vs(22), marginBottom: vs(16), alignSelf: 'stretch' },
  quizStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
    backgroundColor: '#FF6B2C',
    paddingHorizontal: s(24),
    paddingVertical: vs(14),
    borderRadius: s(16),
    shadowColor: '#FF6B2C', shadowOffset: { width: 0, height: vs(4) }, shadowOpacity: 0.2, shadowRadius: s(8), elevation: 4,
  },
  quizStartBtnText: { color: '#FFF', fontSize: s(16), fontWeight: '400' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: s(32),
    borderTopRightRadius: s(32),
    paddingHorizontal: s(30),
    paddingTop: vs(25),
    paddingBottom: vs(5),
    width: '100%',
    minHeight: '40%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(-4) },
    shadowOpacity: 0.1,
    shadowRadius: s(10),
    elevation: 20,
  },
  modalHandle: {
    width: s(40),
    height: vs(4),
    borderRadius: vs(2),
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: vs(20),
  },
  modalIconCircle: {
    width: s(80), height: s(80), borderRadius: s(40), backgroundColor: '#EFF6FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: vs(20),
    borderWidth: 1, borderColor: '#DBEAFE',
  },
  modalTitle: { fontSize: s(20), fontWeight: '400', color: '#1E293B', marginBottom: vs(8), textAlign: 'center' },
  modalSub: { fontSize: s(15), color: '#64748B', textAlign: 'center', lineHeight: vs(22), marginBottom: vs(24) },
  modalActionRow: { width: '100%', gap: vs(12) },
  modalPrimaryBtn: {
    backgroundColor: '#3B82F6', height: vs(56), borderRadius: s(18),
    justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  modalPrimaryBtnText: { color: '#FFF', fontSize: s(16), fontWeight: '400' },
  modalSecondaryBtn: {
    backgroundColor: '#EF4444', height: vs(56), borderRadius: s(18),
    justifyContent: 'center', alignItems: 'center', width: '100%',
  },
  modalSecondaryBtnText: { color: '#FFF', fontSize: s(16), fontWeight: '400' },
});
