import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc } from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// --- Memoized Components ---

const DestItem = memo(({ item, onEdit, onDelete, onPreview }: any) => (
  <View style={styles.card}>
    <Image
      source={item.imageUrl}
      style={styles.cardImage}
      contentFit="cover"
      transition={300}
    />
    <View style={styles.cardContent}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {item.name}
          </Text>
        </View>
      </View>
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.viewBtn} onPress={() => onPreview(item)}>
          <Ionicons name="eye-outline" size={ms(18)} color="#3b82f6" />
          <Text style={styles.viewBtnText} numberOfLines={1} adjustsFontSizeToFit>Xem chi tiết</Text>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
            <Ionicons name="pencil" size={ms(18)} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id, item.name)}>
            <Ionicons name="trash-outline" size={ms(18)} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </View>
));
DestItem.displayName = 'DestItem';

const VocabItem = memo(({ item, onManage, onEdit, onDelete, getImageSource }: any) => {
  const fallback = useMemo(() => {
    if (item.title === 'cat_family' || item.id === 'family') return require('@/assets/images/giadinh.jpg');
    if (item.title === 'cat_food' || item.id === 'food') return require('@/assets/images/monan.jpg');
    if (item.title === 'cat_greetings' || item.id === 'greetings') return require('@/assets/images/chaohoi.jpg');
    if (item.title === 'cat_numbers' || item.id === 'numbers') return require('@/assets/images/sodem.jpg');
    return require('@/assets/images/giadinh.jpg');
  }, [item.title, item.id]);

  return (
    <View style={styles.vocabPremiumCard}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onManage(item.id)} style={styles.vocabPreviewTab}>
        <View style={styles.vocabLargeImageContainer}>
          <Image
            source={getImageSource(item.imageUrl, fallback)}
            style={styles.vocabLargeImage}
            contentFit="contain"
            transition={300}
          />
        </View>

        <View style={styles.vocabCardFooter}>
          <View style={{ flex: 1 }}>
            <Text style={styles.vocabLargeTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>
              {item.title === 'cat_family' ? 'Gia đình thân yêu' :
                item.title === 'cat_food' ? 'Ẩm thực đặc sắc' :
                  item.title === 'cat_greetings' ? 'Chào hỏi thông dụng' :
                    item.title === 'cat_numbers' ? 'Số đếm cơ bản' :
                      item.title}
            </Text>
          </View>
          <View style={styles.footerActionGroup}>
            <TouchableOpacity style={styles.footerActionBtn} onPress={() => onEdit(item)}>
              <Ionicons name="pencil" size={ms(18)} color="#3b82f6" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.footerActionBtn, { borderColor: '#fee2e2' }]} onPress={() => onDelete(item)}>
              <Ionicons name="trash-outline" size={ms(18)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});
VocabItem.displayName = 'VocabItem';

const WordItem = memo(({ word, onEdit, onDelete }: any) => (
  <View style={styles.premiumWordItem}>
    <View style={styles.wordMainContent}>
      <Text style={styles.wordKhmText} numberOfLines={1} adjustsFontSizeToFit>{word.khm}</Text>
      <Text style={[styles.pronText, { marginTop: vs(4) }]} numberOfLines={1} adjustsFontSizeToFit>{word.pronunciation}</Text>
      <Text style={[styles.wordVieText, { color: '#3b82f6', marginTop: vs(4) }]} numberOfLines={1} adjustsFontSizeToFit>{word.life || word.vie}</Text>
    </View>

    <View style={styles.wordActionGroup}>
      <TouchableOpacity onPress={() => onEdit(word)} style={styles.miniActionBtn}>
        <Ionicons name="pencil" size={ms(14)} color="#3b82f6" />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => onDelete(word)} style={[styles.miniActionBtn, { borderColor: '#fee2e2' }]}>
        <Ionicons name="trash-outline" size={ms(14)} color="#ef4444" />
      </TouchableOpacity>
    </View>
  </View>
));
WordItem.displayName = 'WordItem';

const ContentManagement = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'destinations' | 'vocabulary'>('destinations');
  const [destinations, setDestinations] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const toastY = useSharedValue(-120);

  const triggerToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 3000);
  }, []);

  const toastTop = insets.top + vs(8);

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const getImageSource = useCallback((uri: string, fallback: any = { uri: 'https://via.placeholder.com/150' }) => {
    if (uri && (uri.startsWith('http') || uri.startsWith('data:'))) {
      return { uri };
    }
    const pagodaImages: any = {
      'pagoda_1': require('@/assets/images/chuaang.jpg'),
      'pagoda_2': require('@/assets/images/chuahang.jpg'),
      'pagoda_3': require('@/assets/images/kampong.jpg'),
      'pagoda_4': require('@/assets/images/salengcu.jpg'),
      'pagoda_5': require('@/assets/images/veluvana.jpg'),
    };
    return pagodaImages[uri] || fallback;
  }, []);

  const pickImage = async (onSelected: (val: string) => void) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        triggerToast('Vui lòng cho phép truy cập thư viện ảnh', 'error');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        onSelected(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      triggerToast('Không thể chọn ảnh', 'error');
    }
  };

  const ImageSelector = ({ value, onChange, label, style }: { value: string, onChange: (val: string) => void, label: string, style?: any }) => (
    <View style={[{ marginBottom: vs(15) }, style]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        style={styles.imagePickerBtn}
        onPress={() => pickImage(onChange)}
      >
        {value ? (
          <View style={{ width: '100%', height: '100%' }}>
            <Image source={getImageSource(value)} style={styles.pickedImagePreview} contentFit="cover" />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={(e) => {
                e.stopPropagation();
                onChange('');
              }}
            >
              <Ionicons name="close-circle" size={ms(24)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePickerPlaceholder}>
            <Ionicons name="image-outline" size={ms(32)} color="#94a3b8" />
            <Text style={styles.imagePickerText} numberOfLines={1} adjustsFontSizeToFit> Nhấn để chọn ảnh </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  // Destination Form State
  const [destModalVisible, setDestModalVisible] = useState(false);
  const [editingDest, setEditingDest] = useState<any>(null);
  const [dName, setDName] = useState('');
  const [dNameKm, setDNameKm] = useState('');
  const [dLoc, setDLoc] = useState('');
  const [dLocKm, setDLocKm] = useState('');
  const [dDesc, setDDesc] = useState('');
  const [dDescKm, setDDescKm] = useState('');
  const [dSubDesc, setDSubDesc] = useState('');
  const [dSubDescKm, setDSubDescKm] = useState('');
  const [dImg, setDImg] = useState('');
  const [dImg1, setDImg1] = useState('');
  const [dImg2, setDImg2] = useState('');
  const [dImg3, setDImg3] = useState('');
  const [dImg4, setDImg4] = useState('');
  const [dImg5, setDImg5] = useState('');
  const [dImg6, setDImg6] = useState('');
  const [dLat, setDLat] = useState('');
  const [dLng, setDLng] = useState('');
  const [dBlocks, setDBlocks] = useState<any[]>([]);
  const [dCat, setDCat] = useState<'pagoda' | 'culture' | 'food'>('pagoda');

  // Delete Confirm Modal State
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleteType, setDeleteType] = useState<'topic' | 'word' | 'destination'>('topic');

  // Vocabulary Form State
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [topicTitle, setTopicTitle] = useState('');
  const [topicTitleKm, setTopicTitleKm] = useState('');
  const [topicImg, setTopicImg] = useState('');

  const [wordModalVisible, setWordModalVisible] = useState(false);
  const [managingTopicId, setManagingTopicId] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [editingWord, setEditingWord] = useState<any>(null);
  const [wordKhm, setWordKhm] = useState('');
  const [wordVie, setWordVie] = useState('');
  const [wordPron, setWordPron] = useState('');
  const [wordImg, setWordImg] = useState('');
  const [vocabSearchQuery, setVocabSearchQuery] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const managingTopic = useMemo(() => categories.find(c => c.id === managingTopicId), [categories, managingTopicId]);

  useEffect(() => {
    setLoading(true);
    const unsubDest = onSnapshot(query(collection(db, 'destinations')), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a: any, b: any) => {
        const getPrio = (item: any) => {
          const cat = item.category || '';
          if (cat === 'Chùa') return 1;
          if (cat === 'Văn hóa') return 2;
          if (cat === 'Ẩm thực') return 3;
          return 4;
        };
        const orderA = getPrio(a);
        const orderB = getPrio(b);
        if (orderA !== orderB) return orderA - orderB;
        const dateA = a.createdAt?.seconds ? a.createdAt.seconds : (a.createdAt instanceof Date ? a.createdAt.getTime() / 1000 : 0);
        const dateB = b.createdAt?.seconds ? b.createdAt.seconds : (b.createdAt instanceof Date ? b.createdAt.getTime() / 1000 : 0);
        return dateB - dateA;
      });
      setDestinations(sortedData);
    });

    const unsubVocab = onSnapshot(query(collection(db, 'vocab_categories')), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const sortedData = data.sort((a: any, b: any) => {
        if ((a.order || 99) !== (b.order || 99)) return (a.order || 99) - (b.order || 99);
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setCategories(sortedData);
    });

    setLoading(false);
    return () => {
      unsubDest();
      unsubVocab();
    };
  }, []);

  const openDestEdit = useCallback((dest: any) => {
    setEditingDest(dest);
    setDName(dest.name || '');
    setDNameKm(dest.name_khmer || '');
    setDDesc(dest.description || '');
    setDDescKm(dest.description_khmer || '');

    const lowerCat = (dest.category || '').toLowerCase();
    const lowerId = (dest.id || '').toLowerCase();
    const isSpecialCat = lowerCat.includes('ẩm thực') || lowerCat.includes('food') || lowerId.includes('food') || lowerCat.includes('văn hóa') || lowerCat.includes('culture') || lowerId.includes('culture');

    if (isSpecialCat) {
      // Map 'location' to Vietnamese sub-desc and 'location_khmer' to Khmer sub-desc for food/culture
      setDSubDesc(dest.location || '');
      setDSubDescKm(dest.location_khmer || '');
      // Clear address fields for food/culture as they use sub-desc instead
      setDLoc('');
      setDLocKm('');
    } else {
      // Normal pagoda logic
      setDLoc(dest.location || '');
      setDLocKm(dest.location_khmer || '');
      setDSubDesc(dest.subDescription || '');
      setDSubDescKm(dest.subDescription_khmer || '');
    }

    setDImg(dest.imageUrl || '');
    setDImg1(dest.imageUrl1 || '');
    setDImg2(dest.imageUrl2 || '');
    setDImg3(dest.imageUrl3 || '');
    setDImg4(dest.imageUrl4 || '');
    setDImg5(dest.imageUrl5 || '');
    setDImg6(dest.imageUrl6 || '');
    setDLat(String(dest.latitude || ''));
    setDLng(String(dest.longitude || ''));
    setDBlocks(dest.contentBlocks || []);

    const currentCat = (lowerCat.includes('ẩm thực') || lowerCat.includes('food') || lowerId.includes('food')) ? 'food' : (lowerCat.includes('văn hóa') || lowerCat.includes('culture') || lowerId.includes('culture')) ? 'culture' : 'pagoda';
    setDCat(currentCat);
    setDestModalVisible(true);
  }, []);

  const handleSaveDest = async () => {
    if (!dName.trim() || !dImg.trim()) {
      triggerToast('Vui lòng nhập tên và link ảnh', 'error');
      return;
    }
    try {
      const finalId = editingDest ? editingDest.id : `${dCat}_${Date.now()}`;
      const destData: any = {
        name: dName,
        name_khmer: dNameKm,
        description: dDesc,
        description_khmer: dDescKm,
        imageUrl: dImg,
        imageUrl1: dImg1,
        imageUrl2: dImg2,
        imageUrl3: dImg3,
        imageUrl4: dImg4,
        imageUrl5: dImg5,
        imageUrl6: dImg6,
        latitude: dLat,
        longitude: dLng,
        category: dCat === 'pagoda' ? 'Chùa' : dCat === 'food' ? 'Ẩm thực' : 'Văn hóa',
        contentBlocks: dBlocks.filter(b => b.value.trim() !== '' || b.images.trim() !== ''),
        createdAt: editingDest ? (editingDest.createdAt || new Date()) : new Date()
      };

      if (dCat === 'food' || dCat === 'culture') {
        // Map sub-desc inputs back to location/location_khmer and DON'T save rental
        destData.location = dSubDesc;
        destData.location_khmer = dSubDescKm;
      } else {
        // Pagoda logic
        destData.location = dLoc;
        destData.location_khmer = dLocKm;
        destData.subDescription = dSubDesc;
        destData.subDescription_khmer = dSubDescKm;
      }

      await setDoc(doc(db, 'destinations', finalId), destData);
      setDestModalVisible(false);
      triggerToast('Đã lưu nội dung thành công', 'success');
    } catch (e) {
      triggerToast('Không thể lưu nội dung', 'error');
    }
  };

  const handleDeleteDest = useCallback((id: string, name: string) => {
    setPendingDelete({ id, name });
    setDeleteType('destination');
    setDeleteConfirmVisible(true);
  }, []);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (deleteType === 'destination') {
        const docRef = doc(db, 'destinations', pendingDelete.id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          await setDoc(doc(db, 'system_trash', pendingDelete.id), {
            ...docSnap.data(),
            originalId: pendingDelete.id,
            originalCollection: 'destinations',
            deletedAt: new Date()
          });
          await deleteDoc(docRef);
          triggerToast('Đã chuyển nội dung vào thùng rác', 'success');
        }
      } else if (deleteType === 'topic') {
        const topic = pendingDelete;
        await setDoc(doc(db, 'system_trash', topic.id), {
          ...topic,
          originalId: topic.id,
          originalCollection: 'vocab_categories',
          deletedAt: new Date()
        });
        await deleteDoc(doc(db, 'vocab_categories', topic.id));
        triggerToast('Đã chuyển chủ đề vào thùng rác', 'success');
      } else if (deleteType === 'word') {
        const { topicId, word } = pendingDelete;
        await updateDoc(doc(db, 'vocab_categories', topicId), {
          words: arrayRemove(word)
        });
        triggerToast('Đã xóa từ vựng thành công', 'success');
      }
    } catch (e) {
      triggerToast('Lỗi khi thực hiện xóa', 'error');
    } finally {
      setDeleteConfirmVisible(false);
      setPendingDelete(null);
    }
  };

  const handleSaveTopic = async () => {
    if (!topicTitle.trim()) return;
    try {
      const topicData: any = {
        title: topicTitle,
        title_khmer: topicTitleKm,
        imageUrl: topicImg,
        order: editingTopic ? (editingTopic.order || 99) : 0,
        words: editingTopic ? editingTopic.words : []
      };

      if (editingTopic) {
        await updateDoc(doc(db, 'vocab_categories', editingTopic.id), topicData);
      } else {
        topicData.createdAt = new Date();
        const slugId = topicTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const finalId = slugId || `topic_${Date.now()}`;
        await setDoc(doc(db, 'vocab_categories', finalId), topicData);
      }
      setTopicModalVisible(false);
      triggerToast('Cập nhật chủ đề thành công', 'success');
    } catch (e) {
      triggerToast('Lỗi khi lưu chủ đề', 'error');
    }
  };

  const handleSaveWord = async () => {
    if (!wordKhm.trim() || !wordVie.trim() || !selectedTopic) return;
    try {
      const topicRef = doc(db, 'vocab_categories', selectedTopic.id);
      const topicSnap = await getDoc(topicRef);
      if (!topicSnap.exists()) return;
      const currentWords = topicSnap.data().words || [];
      if (editingWord) {
        const updatedWords = currentWords.map((w: any) => {
          const isMatch = (editingWord.id && w.id === editingWord.id) || (w.khm === editingWord.khm);
          if (isMatch) return { ...w, id: w.id || 'w_' + Date.now(), khm: wordKhm, vie: wordVie, life: wordVie, pronunciation: wordPron, imageUrl: wordImg };
          return w;
        });
        await updateDoc(topicRef, { words: updatedWords });
      } else {
        await updateDoc(topicRef, {
          words: arrayUnion({
            id: 'w_' + Date.now(),
            khm: wordKhm,
            vie: wordVie,
            life: wordVie,
            pronunciation: wordPron,
            imageUrl: wordImg
          })
        });
      }
      setWordModalVisible(false);
      triggerToast('Đã cập nhật từ vựng', 'success');
    } catch (e) {
      triggerToast('Không thể lưu từ vựng', 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, vs(10)) }]}>
      {showToast && (
        <Animated.View style={[styles.toastContainer, animatedToastStyle, { backgroundColor: toastType === 'error' ? '#EF4444' : '#10B981', shadowColor: toastType === 'error' ? '#EF4444' : '#10B981', top: toastTop }]}>
          <View style={styles.toastIcon}><Ionicons name={toastType === 'success' ? "checkmark" : "close"} size={ms(18)} color="#FFF" /></View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Quản lý nội dung</Text>
        <TouchableOpacity
          onPress={() => {
            if (activeTab === 'vocabulary') {
              setEditingTopic(null); setTopicTitle(''); setTopicTitleKm(''); setTopicImg(''); setTopicModalVisible(true);
            } else {
              setEditingDest(null); setDName(''); setDNameKm(''); setDLoc(''); setDLocKm(''); setDDesc(''); setDDescKm(''); setDSubDesc(''); setDSubDescKm(''); setDImg(''); setDImg1(''); setDImg2(''); setDImg3(''); setDImg4(''); setDImg5(''); setDImg6(''); setDLat(''); setDLng(''); setDBlocks([{ value: '', value_khmer: '', images: '' }]); setDCat('pagoda'); setDestModalVisible(true);
            }
          }}
          style={styles.addBtnHeader}
        >
          <Ionicons name="add" size={ms(30)} color="#0062ffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'destinations' && styles.activeTab]} onPress={() => setActiveTab('destinations')}>
          <Text style={[styles.tabText, activeTab === 'destinations' && styles.activeTabText]} numberOfLines={1} adjustsFontSizeToFit>Nội dung</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'vocabulary' && styles.activeTab]} onPress={() => setActiveTab('vocabulary')}>
          <Text style={[styles.tabText, activeTab === 'vocabulary' && styles.activeTabText]} numberOfLines={1} adjustsFontSizeToFit>Học tập</Text>
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: vs(50) }} /> : (
        <FlatList
          data={activeTab === 'destinations' ? destinations : categories.filter(c => c.title.toLowerCase().includes(vocabSearchQuery.toLowerCase()))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => activeTab === 'destinations' ? (
            <DestItem
              item={item}
              onPreview={(dest: any) => {
                const pathname = dest.id.includes('pagoda') ? '/pagoda-detail' : dest.id.includes('culture') ? '/culture-detail' : '/food-detail';
                router.push({ pathname: pathname as any, params: { id: dest.id } });
              }}
              onEdit={openDestEdit}
              onDelete={handleDeleteDest}
            />
          ) : (
            <VocabItem
              item={item}
              getImageSource={getImageSource}
              onManage={(id: string) => setManagingTopicId(id)}
              onEdit={(topic: any) => { setEditingTopic(topic); setTopicTitle(topic.title); setTopicTitleKm(topic.title_khmer || ''); setTopicImg(topic.imageUrl || ''); setTopicModalVisible(true); }}
              onDelete={(topic: any) => { setPendingDelete(topic); setDeleteType('topic'); setDeleteConfirmVisible(true); }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {/* --- Word Management Modal --- */}
      <Modal visible={!!managingTopicId} animationType="slide" statusBarTranslucent={true}>
        <View style={[styles.container, { paddingTop: Math.max(insets.top, vs(10)) }]}>
          <View style={[styles.header, { marginTop: 0, paddingHorizontal: s(12) }]}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setManagingTopicId(null)}><Ionicons name="arrow-back" size={ms(28)} color="#1e293b" /></TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{managingTopic?.title === 'cat_family' ? 'Gia đình thân yêu' : managingTopic?.title === 'cat_food' ? 'Ẩm thực đặc sắc' : managingTopic?.title === 'cat_greetings' ? 'Chào hỏi thông dụng' : managingTopic?.title === 'cat_numbers' ? 'Số đếm cơ bản' : managingTopic?.title}</Text>
            <TouchableOpacity style={styles.addBtnHeader} onPress={() => { setSelectedTopic(managingTopic); setEditingWord(null); setWordKhm(''); setWordVie(''); setWordPron(''); setWordImg(''); setWordModalVisible(true); }}><Ionicons name="add" size={ms(26)} color="#3b82f6" /></TouchableOpacity>
          </View>
          <FlatList
            data={managingTopic?.words || []}
            keyExtractor={(item, index) => item.id || index.toString()}
            contentContainerStyle={{ padding: s(16), flexGrow: 1 }}
            renderItem={({ item }: { item: any }) => (
              <WordItem
                word={item}
                onEdit={(w: any) => {
                  setSelectedTopic(managingTopic);
                  setEditingWord(w);
                  setWordKhm(w.khm);
                  setWordVie(w.life || w.vie);
                  setWordPron(w.pronunciation);
                  setWordImg(w.imageUrl || '');
                  setWordModalVisible(true);
                }}
                onDelete={(w: any) => {
                  setPendingDelete({ topicId: managingTopic.id, word: w });
                  setDeleteType('word');
                  setDeleteConfirmVisible(true);
                }}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="book-outline" size={ms(80)} color="#e2e8f0" />
                <Text style={styles.emptyWords}>Chưa có từ vựng nào trong chủ đề này</Text>
              </View>
            }
          />
        </View>
      </Modal>

      <Modal visible={destModalVisible} animationType="slide" transparent={false} statusBarTranslucent={true}>
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Header */}
          <View style={[styles.modalHeader, { paddingTop: insets.top + vs(5), paddingBottom: vs(12), borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 0 }]}>
            <TouchableOpacity onPress={() => setDestModalVisible(false)} style={{ paddingLeft: s(15), width: s(70), height: s(44), justifyContent: 'center' }}>
              <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
            </TouchableOpacity>

            <Text style={[styles.modalTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit>
              {editingDest ? 'Sửa nội dung' : 'Thêm nội dung'}
            </Text>

            <TouchableOpacity onPress={handleSaveDest} style={{ paddingRight: s(16), width: s(70), height: s(44), justifyContent: 'center', alignItems: 'flex-end' }}>
              <Text style={{ fontSize: ms(16), fontWeight: '400', color: '#3b82f6' }}>Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: s(20),
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + vs(20) : Math.max(insets.bottom, vs(20))
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!editingDest && (
              <View style={styles.catRow}>
                {['pagoda', 'culture', 'food'].map(cat => (
                  <TouchableOpacity key={cat} style={[styles.catBtn, dCat === cat && styles.activeCatBtn]} onPress={() => setDCat(cat as any)}>
                    <Text style={[styles.catBtnText, dCat === cat && styles.activeCatBtnText]} numberOfLines={1} adjustsFontSizeToFit>
                      {cat === 'pagoda' ? 'Chùa Khmer' : cat === 'culture' ? 'Văn hóa' : 'Ẩm thực'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.inputLabel, { marginTop: editingDest ? 0 : 12 }]}>{dCat === 'pagoda' ? 'Tên ngôi chùa (Việt)' : dCat === 'food' ? 'Tên món ăn (Việt)' : 'Tên văn hóa (Việt)'}</Text>
            <TextInput style={styles.input} value={dName} onChangeText={setDName} placeholder="Nhập tên tiếng Việt..." />

            <Text style={styles.inputLabel}>{dCat === 'pagoda' ? 'Tên ngôi chùa (Khmer)' : dCat === 'food' ? 'Tên món ăn (Khmer)' : 'Tên văn hóa (Khmer)'}</Text>
            <TextInput style={styles.input} value={dNameKm} onChangeText={setDNameKm} placeholder="Nhập tên tiếng Khmer..." />

            {dCat === 'pagoda' && (
              <>
                <Text style={styles.inputLabel}>Địa chỉ ngôi chùa (Việt)</Text>
                <TextInput style={styles.input} value={dLoc} onChangeText={setDLoc} placeholder="Nhập địa chỉ..." />
                <Text style={styles.inputLabel}>Địa chỉ ngôi chùa (Khmer)</Text>
                <TextInput style={styles.input} value={dLocKm} onChangeText={setDLocKm} placeholder="Nhập địa chỉ tiếng Khmer..." />
              </>
            )}

            {(dCat === 'culture' || dCat === 'food') && (
              <>
                <Text style={styles.inputLabel}>Mô tả phụ ngắn (Việt)</Text>
                <TextInput
                  style={styles.input}
                  value={dSubDesc}
                  onChangeText={setDSubDesc}
                  placeholder="Lấy từ trường 'location'..."
                />

                <Text style={styles.inputLabel}>Mô tả phụ ngắn (Khmer)</Text>
                <TextInput
                  style={styles.input}
                  value={dSubDescKm}
                  onChangeText={setDSubDescKm}
                  placeholder="Lấy từ trường 'location_khmer'..."
                />
              </>
            )}

            <Text style={styles.inputLabel}>Mô tả chính (Việt)</Text>
            <TextInput style={[styles.input, { height: vs(110) }]} value={dDesc} onChangeText={setDDesc} multiline numberOfLines={4} placeholder="Mô tả tóm tắt..." />
            <Text style={styles.inputLabel}>Mô tả chính (Khmer)</Text>
            <TextInput style={[styles.input, { height: vs(110) }]} value={dDescKm} onChangeText={setDDescKm} multiline numberOfLines={4} placeholder="Mô tả tiếng Khmer..." />

            <ImageSelector label="Ảnh đại diện chính" value={dImg} onChange={setDImg} />

            {dCat === 'pagoda' ? (
              <ImageSelector label="Ảnh bìa phụ" value={dImg1} onChange={setDImg1} />
            ) : (
              <View style={{ marginBottom: vs(15) }}>
                <Text style={styles.inputLabel}>Bộ sưu tập ảnh</Text>
                <View style={{ flexDirection: 'row', gap: s(10), flexWrap: 'wrap' }}>
                  <ImageSelector label="Ảnh 1" value={dImg1} onChange={setDImg1} style={{ flex: 1, minWidth: '45%' }} />
                  <ImageSelector label="Ảnh 2" value={dImg2} onChange={setDImg2} style={{ flex: 1, minWidth: '45%' }} />
                  <ImageSelector label="Ảnh 3" value={dImg3} onChange={setDImg3} style={{ flex: 1, minWidth: '45%' }} />
                  <ImageSelector label="Ảnh 4" value={dImg4} onChange={setDImg4} style={{ flex: 1, minWidth: '45%' }} />
                  <ImageSelector label="Ảnh 5" value={dImg5} onChange={setDImg5} style={{ flex: 1, minWidth: '45%' }} />
                  <ImageSelector label="Ảnh 6" value={dImg6} onChange={setDImg6} style={{ flex: 1, minWidth: '45%' }} />
                </View>
              </View>
            )}

            {dCat === 'pagoda' && (
              <View style={{ flexDirection: 'row', gap: s(15) }}>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>Vĩ độ</Text><TextInput style={styles.input} value={dLat} onChangeText={setDLat} placeholder="Nhập vĩ độ..." keyboardType="numeric" /></View>
                <View style={{ flex: 1 }}><Text style={styles.inputLabel}>Kinh độ</Text><TextInput style={styles.input} value={dLng} onChangeText={setDLng} placeholder="Nhập kinh độ..." keyboardType="numeric" /></View>
              </View>
            )}

            {/* --- Content Blocks Section --- */}
            <View style={{ marginTop: vs(20), borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: vs(20) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(15) }}>
                <Text style={[styles.inputLabel, { marginTop: 0 }]}>Nội dung chi tiết</Text>
                <TouchableOpacity
                  onPress={() => setDBlocks([...dBlocks, { value: '', value_khmer: '', images: '' }])}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: s(8), gap: s(4) }}
                >
                  <Ionicons name="add-circle-outline" size={ms(18)} color="#3b82f6" />
                  <Text style={{ fontSize: ms(13), fontWeight: '400', color: '#3b82f6' }}>Thêm khối</Text>
                </TouchableOpacity>
              </View>

              {dBlocks.map((block, index) => (
                <View key={index} style={{ backgroundColor: '#f8fafc', padding: s(15), borderRadius: ms(16), marginBottom: vs(15), borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(10) }}>
                    <Text style={{ fontSize: ms(14), fontWeight: '400', color: '#64748b' }}>Khối {index + 1}</Text>
                    <TouchableOpacity onPress={() => setDBlocks(dBlocks.filter((_, i) => i !== index))}>
                      <Ionicons name="trash-outline" size={ms(18)} color="#ef4444" />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 0 }]}>Đoạn văn bản (Việt)</Text>
                  <TextInput
                    style={[styles.input, { height: vs(80), backgroundColor: '#fff' }]}
                    value={block.value}
                    onChangeText={(txt) => {
                      const newBlocks = [...dBlocks];
                      newBlocks[index].value = txt;
                      setDBlocks(newBlocks);
                    }}
                    multiline
                    placeholder="Nhập nội dung (Việt)..."
                  />

                  <Text style={styles.inputLabel}>Đoạn văn bản (Khmer)</Text>
                  <TextInput
                    style={[styles.input, { height: vs(80), backgroundColor: '#fff' }]}
                    value={block.value_khmer}
                    onChangeText={(txt) => {
                      const newBlocks = [...dBlocks];
                      newBlocks[index].value_khmer = txt;
                      setDBlocks(newBlocks);
                    }}
                    multiline
                    placeholder="Nhập nội dung (Khmer)..."
                  />

                  <ImageSelector
                    label="Ảnh minh họa khối"
                    value={block.images}
                    onChange={(uri) => {
                      const newBlocks = [...dBlocks];
                      newBlocks[index].images = uri;
                      setDBlocks(newBlocks);
                    }}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={topicModalVisible} animationType="fade" transparent statusBarTranslucent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>{editingTopic ? 'Sửa chủ đề' : 'Thêm chủ đề mới'}</Text>
            <ScrollView style={{ maxHeight: vs(400) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Tên chủ đề (Việt)</Text>
              <TextInput style={styles.input} value={topicTitle} onChangeText={setTopicTitle} placeholder="Nhập tên chủ đề..." />
              <Text style={styles.inputLabel}>Tên chủ đề (Khmer)</Text>
              <TextInput style={styles.input} value={topicTitleKm} onChangeText={setTopicTitleKm} placeholder="Nhập tên tiếng Khmer..." />
              <ImageSelector label="Ảnh đại diện" value={topicImg} onChange={setTopicImg} />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTopicModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTopic}>
                <Text style={styles.saveBtnText}>Lưu chủ đề</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={wordModalVisible} animationType="fade" transparent statusBarTranslucent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalBg}>
          <View style={styles.modalContentSmall}>
            <Text style={styles.modalTitle}>{editingWord ? 'Sửa từ vựng' : 'Thêm từ vựng mới'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: vs(400) }} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Từ tiếng Khmer</Text>
              <TextInput style={styles.input} value={wordKhm} onChangeText={setWordKhm} placeholder="Nhập từ Khmer..." />
              <Text style={styles.inputLabel}>Nghĩa tiếng Việt</Text>
              <TextInput style={styles.input} value={wordVie} onChangeText={setWordVie} placeholder="Nhập nghĩa Việt..." />
              <Text style={styles.inputLabel}>Phiên âm</Text>
              <TextInput style={styles.input} value={wordPron} onChangeText={setWordPron} placeholder="Nhập phiên âm..." />
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWordModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveWord}>
                <Text style={styles.saveBtnText}>Lưu từ vựng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" statusBarTranslucent><View style={styles.modalBg}><View style={styles.confirmBox}><View style={styles.confirmIconBg}><Ionicons name="trash" size={ms(32)} color="#ef4444" /></View><Text style={styles.confirmTitle}>Xác nhận xóa</Text><Text style={styles.confirmText}>{deleteType === 'destination' ? `"${pendingDelete?.name}" sẽ được chuyển vào thùng rác` : deleteType === 'topic' ? `Chủ đề này sẽ được chuyển vào thùng rác` : 'Từ vựng này sẽ bị xóa vĩnh viễn'}</Text><View style={styles.modalActions}><TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirmVisible(false)}><Text style={styles.cancelBtnText}>Hủy</Text></TouchableOpacity><TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#ff0000ff' }]} onPress={confirmDelete}><Text style={styles.saveBtnText}>Xác nhận xóa</Text></TouchableOpacity></View></View></View></Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(16), paddingBottom: vs(15) },
  backBtn: { width: s(44), height: s(44), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: ms(20), fontWeight: '400', color: '#1e293b', textAlign: 'center' },
  addBtnHeader: { width: s(42), height: s(42), backgroundColor: '#eff6ff', borderRadius: s(12), justifyContent: 'center', alignItems: 'center' },
  tabBar: { flexDirection: 'row', marginHorizontal: s(16), backgroundColor: '#f1f5f9', borderRadius: s(12), padding: s(4), marginBottom: vs(15) },
  tab: { flex: 1, paddingVertical: vs(10), alignItems: 'center', borderRadius: s(10) },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowOpacity: 0.1, shadowRadius: 5 },
  tabText: { fontSize: ms(14), fontWeight: '400', color: '#64748b' },
  activeTabText: { color: '#3b82f6' },
  listContent: { padding: s(16), paddingBottom: vs(50) },
  card: { backgroundColor: '#fff', borderRadius: ms(20), marginBottom: vs(16), elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  cardImage: { width: '100%', height: vs(180) },
  cardContent: { padding: s(16) },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(12) },
  cardTitle: { fontSize: ms(18), fontWeight: '400', color: '#1e293b' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: s(12), paddingVertical: vs(6), borderRadius: s(8), gap: s(6) },
  viewBtnText: { fontSize: ms(13), fontWeight: '400', color: '#3b82f6' },
  rightActions: { flexDirection: 'row', gap: s(8) },
  editBtn: { width: s(36), height: s(36), borderRadius: s(10), backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: s(36), height: s(36), borderRadius: s(10), backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  vocabPremiumCard: { marginBottom: vs(16), borderRadius: ms(24), backgroundColor: '#fff', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  vocabPreviewTab: { padding: s(12) },
  vocabLargeImageContainer: { height: vs(160), backgroundColor: '#f8fafc', borderRadius: ms(18), justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  vocabLargeImage: { width: '80%', height: '80%' },
  vocabCardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: vs(12), paddingHorizontal: s(4) },
  vocabLargeTitle: { fontSize: ms(17), fontWeight: '400', color: '#1e293b' },
  footerActionGroup: { flexDirection: 'row', gap: s(8) },
  footerActionBtn: { width: s(36), height: s(36), borderRadius: s(10), borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  premiumWordItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: ms(16), padding: s(16), marginBottom: vs(12), borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
  wordMainContent: { flex: 1 },
  wordKhmText: { fontSize: ms(18), fontWeight: '400', color: '#1e293b' },
  pronText: { fontSize: ms(14), color: '#64748b', fontWeight: '400' },
  wordVieText: { fontSize: ms(15), fontWeight: '400' },
  wordActionGroup: { flexDirection: 'row', gap: s(8) },
  miniActionBtn: { width: s(32), height: s(32), borderRadius: s(8), borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentFull: { flex: 1, backgroundColor: '#fff', width: '100%' },
  modalContentSmall: { backgroundColor: '#fff', width: '90%', borderRadius: ms(24), padding: s(24) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(20) },
  modalTitle: { fontSize: ms(20), fontWeight: '400', color: '#1e293b', textAlign: 'center' },
  modalForm: { padding: s(20) },
  inputLabel: { fontSize: ms(14), fontWeight: '400', color: '#64748b', marginBottom: vs(8), marginTop: vs(12) },
  input: { backgroundColor: '#f8fafc', borderRadius: ms(12), padding: s(14), fontSize: ms(15), color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', marginBottom: vs(4) },
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: s(30),
    right: s(30),
    height: vs(46),
    borderRadius: s(10),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(15),
    zIndex: 9999,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastIcon: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(10),
  },
  toastText: {
    color: '#FFF',
    fontSize: ms(13),
    fontWeight: '400',
  },
  imagePickerBtn: { height: vs(120), backgroundColor: '#f8fafc', borderRadius: ms(16), borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#cbd5e1', overflow: 'hidden' },
  imagePickerPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: vs(8) },
  imagePickerText: { fontSize: ms(13), color: '#94a3b8', fontWeight: '400' },
  pickedImagePreview: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: '#fff', borderRadius: 15 },
  headerCloseBtn: {
    width: s(40),
    height: s(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    paddingTop: vs(20),
    gap: s(12),
  },
  cancelBtn: { flex: 1, paddingVertical: vs(14), borderRadius: s(12), backgroundColor: '#3b82f6', alignItems: 'center' },
  cancelBtnText: { fontSize: ms(15), fontWeight: '400', color: '#fff' },
  saveBtn: { flex: 2, paddingVertical: vs(14), borderRadius: s(12), backgroundColor: '#ff0000ff', alignItems: 'center' },
  saveBtnText: { fontSize: ms(15), fontWeight: '400', color: '#fff' },
  catRow: { flexDirection: 'row', gap: s(8), marginBottom: vs(15) },
  catBtn: { flex: 1, paddingVertical: vs(10), borderRadius: s(10), backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  activeCatBtn: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  catBtnText: { fontSize: ms(13), fontWeight: '400', color: '#64748b' },
  activeCatBtnText: { color: '#fff' },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', opacity: 0.5, paddingBottom: vs(100) },
  emptyWords: { fontSize: ms(16), color: '#94a3b8', textAlign: 'center', marginTop: vs(15), fontWeight: '400' },
  confirmBox: { backgroundColor: '#fff', width: '85%', borderRadius: ms(24), padding: s(24), alignItems: 'center' },
  confirmIconBg: { width: s(64), height: s(64), borderRadius: s(32), backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', marginBottom: vs(16) },
  confirmTitle: { fontSize: ms(20), fontWeight: '400', color: '#1e293b', marginBottom: vs(8) },
  confirmText: { fontSize: ms(14), color: '#64748b', textAlign: 'center', lineHeight: vs(22), marginBottom: vs(24) },
});

export default ContentManagement;