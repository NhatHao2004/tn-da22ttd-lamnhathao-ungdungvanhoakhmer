import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

// --- Memoized Components ---

const TrashItem = memo(({ item, onRestore, onDelete, getImageSource }: any) => {
  const fallback = useMemo(() => {
    if (item.originalId?.includes('family') || item.title === 'cat_family') return require('@/assets/images/giadinh.jpg');
    if (item.originalId?.includes('food') || item.title === 'cat_food') return require('@/assets/images/monan.jpg');
    if (item.originalId?.includes('greeting') || item.title === 'cat_greetings') return require('@/assets/images/chaohoi.jpg');
    if (item.originalId?.includes('number') || item.title === 'cat_numbers') return require('@/assets/images/sodem.jpg');
    return null;
  }, [item.originalId, item.title]);

  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {(item.imageUrl || item.image || fallback) ? (
          <Image
            source={item.imageUrl ? { uri: item.imageUrl } : (item.image ? { uri: item.image } : fallback)}
            style={styles.cardImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={ms(48)} color="#cbd5e1" />
          </View>
        )}
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1} adjustsFontSizeToFit>{item.name || item.title || item.content || 'Không có tên'}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.restoreBtnLarge}
            onPress={() => onRestore(item)}
          >
            <Ionicons name="refresh-outline" size={ms(20)} color="#3b82f6" />
            <Text style={styles.restoreBtnText} numberOfLines={1} adjustsFontSizeToFit>Khôi phục</Text>
          </TouchableOpacity>

          <View style={styles.footerRight}>
            <TouchableOpacity
              style={styles.deleteIconBtn}
              onPress={() => onDelete(item.id, item.name || item.title)}
            >
              <Ionicons name="trash-outline" size={ms(22)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const TrashManagement = () => {
  const insets = useSafeAreaInsets();
  const [trashedItems, setTrashedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Delete Confirm Modal State
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);

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

  useEffect(() => {
    const q = query(collection(db, 'system_trash'), orderBy('deletedAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrashedItems(items);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleRestore = async (item: any) => {
    try {
      const { originalCollection, originalId, deletedAt, id: _, ...rest } = item;
      // 1. Chuyển lại vào collection gốc
      await setDoc(doc(db, originalCollection, originalId), rest);
      // 2. Xóa khỏi thùng rác
      await deleteDoc(doc(db, 'system_trash', item.id));
      triggerToast('Đã phục hồi nội dung thành công', 'success');
    } catch (e) {
      console.error(e);
      triggerToast('Lỗi khi phục hồi nội dung', 'error');
    }
  };

  const handlePermanentDelete = useCallback((id: string, name: string) => {
    setPendingDelete({ id, name });
    setDeleteConfirmVisible(true);
  }, []);

  const confirmPermanentDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteDoc(doc(db, 'system_trash', pendingDelete.id));
      setDeleteConfirmVisible(false);
      setPendingDelete(null);
      triggerToast('Đã xóa vĩnh viễn nội dung', 'success');
    } catch (e) {
      console.error(e);
      triggerToast('Lỗi khi xóa vĩnh viễn', 'error');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, vs(10)) }]}>
      {/* Premium Toast System */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedToastStyle,
            {
              backgroundColor: toastType === 'error' ? '#EF4444' : '#10B981',
              shadowColor: toastType === 'error' ? '#EF4444' : '#10B981',
              top: toastTop,
            }
          ]}
        >
          <View style={styles.toastIcon}>
            <Ionicons
              name={toastType === 'success' ? "checkmark" : "close"}
              size={ms(20)}
              color="#FFF"
            />
          </View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Thùng rác hệ thống</Text>
        <View style={{ width: s(44) }} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={trashedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrashItem
              item={item}
              onRestore={handleRestore}
              onDelete={handlePermanentDelete}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + vs(20) }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="trash-bin-outline" size={ms(80)} color="#e2e8f0" />
              <Text style={styles.emptyText} numberOfLines={1} adjustsFontSizeToFit>Thùng rác trống</Text>
            </View>
          }
        />
      )}

      {/* --- Custom Delete Confirmation Modal --- */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentSmall}>
            <View style={styles.confirmIconBg}>
              <Ionicons name="trash" size={ms(34)} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>Xóa vĩnh viễn</Text>
            <Text style={styles.confirmSubText} numberOfLines={2} adjustsFontSizeToFit>
              Bạn có chắc chắn muốn xóa vĩnh viễn{"\n"}
              Thao tác này <Text style={{ color: '#ef4444', fontWeight: '400' }}>không thể hoàn tác</Text>
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#3b82f6' }]} onPress={() => setDeleteConfirmVisible(false)}>
                <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#ef4444' }]} onPress={confirmPermanentDelete}>
                <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingBottom: vs(15),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  backBtn: { width: s(44), height: s(44), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: ms(20), fontWeight: '400', color: '#1e293b', textAlign: 'center' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: s(16) },
  card: {
    backgroundColor: '#fff',
    borderRadius: ms(24),
    marginBottom: vs(20),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#f8fafc',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardContent: {
    padding: s(20),
  },
  cardTitle: {
    fontSize: ms(22),
    fontWeight: '400',
    color: '#1e293b',
    marginBottom: vs(16),
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: vs(16),
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restoreBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    paddingVertical: vs(12),
    paddingHorizontal: s(20),
    borderRadius: s(14),
    gap: s(8),
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  restoreBtnText: {
    fontSize: ms(15),
    fontWeight: '400',
    color: '#3b82f6',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(12),
  },
  deleteIconBtn: {
    width: s(48),
    height: s(48),
    borderRadius: s(14),
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffe4e6',
  },
  emptyContainer: { alignItems: 'center', marginTop: vs(280), opacity: 0.5 },
  emptyText: { marginTop: vs(14), fontSize: ms(16), color: '#94a3b8', fontWeight: '400' },

  // Modal Styles
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentSmall: { width: '85%', backgroundColor: '#fff', borderRadius: ms(24), padding: s(24) },
  modalTitle: { fontSize: ms(22), fontWeight: '400', color: '#1e293b', textAlign: 'center', marginBottom: vs(10) },
  modalActions: { flexDirection: 'row', justifyContent: 'center', gap: s(12), marginTop: vs(25) },
  btnAction: { flex: 1, paddingVertical: vs(14), borderRadius: s(14), alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '400', fontSize: ms(15) },
  confirmIconBg: {
    width: s(70),
    height: s(70),
    borderRadius: s(35),
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: vs(20),
  },
  confirmSubText: {
    fontSize: ms(14),
    color: '#64748b',
    textAlign: 'center',
    lineHeight: ms(22),
  },

  // Toast Styles
  toastContainer: {
    position: 'absolute',
    left: s(16),
    right: s(16),
    height: vs(46),
    borderRadius: ms(10),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(14),
    zIndex: 9999,
    elevation: 10,
  },
  toastIcon: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastText: {
    color: '#FFF',
    fontSize: ms(13),
    fontWeight: '400',
    marginLeft: s(10),
    flex: 1,
  },
});

export default TrashManagement;
