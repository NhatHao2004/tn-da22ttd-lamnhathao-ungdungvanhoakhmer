import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

// --- Memoized Components ---

const PostItem = memo(({ item, onDelete, onShowComments, onApprove }: any) => {
  const formattedDate = useMemo(() => {
    return item.createdAt?.seconds
      ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('vi-VN')
      : 'Mới nhất';
  }, [item.createdAt]);

  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image
          source={{ uri: item.userAvatar || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.id }}
          style={styles.postAvatar}
          contentFit="cover"
          transition={300}
        />
        <View style={styles.postInfo}>
          <Text style={styles.postUserName} numberOfLines={1} adjustsFontSizeToFit>{item.user || 'Người dùng'}</Text>
          <Text style={styles.postDate} numberOfLines={1} adjustsFontSizeToFit>{formattedDate}</Text>
        </View>
        {item.approved === false && (
          <TouchableOpacity
            style={styles.approvePostBtn}
            onPress={() => onApprove(item)}
          >
            <Ionicons name="checkmark-outline" size={ms(20)} color="#10b981" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.deletePostBtn} onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={ms(20)} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postText}>{item.content}</Text>

      {item.image && (
        <View style={[styles.postImageWrapper, { aspectRatio: item.imageAspectRatio || 1.3 }]}>
          <Image
            source={{ uri: item.image }}
            style={styles.postImage}
            contentFit="cover"
            transition={300}
          />
        </View>
      )}

      <View style={styles.postStats}>
        <View style={styles.statItem}>
          <Ionicons name="heart" size={ms(16)} color="#ef4444" />
          <Text style={styles.statText}>{item.likes || 0}</Text>
        </View>
        <TouchableOpacity
          style={styles.statItem}
          onPress={() => onShowComments(item)}
        >
          <Ionicons name="chatbubble" size={ms(16)} color="#3b82f6" />
          <Text style={[styles.statText, { color: '#3b82f6', fontWeight: '400' }]}>
            {item.comments || 0} bình luận
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
PostItem.displayName = 'PostItem';

const CommentItem = memo(({ item, onDelete, isReply, parentUserName }: any) => (
  <View style={[styles.commentItem, isReply && { marginLeft: s(45), borderLeftWidth: 2, borderLeftColor: '#e2e8f0', paddingLeft: s(12) }]}>
    <Image
      source={{ uri: item.userAvatar || item.avatar || 'https://api.dicebear.com/7.x/avataaars/png?seed=' + item.id }}
      style={[styles.commentAvatar, isReply && { width: s(28), height: s(28), borderRadius: s(14) }]}
      contentFit="cover"
      transition={200}
    />
    <View style={styles.commentContent}>
      <View style={styles.commentHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          <Text style={[styles.commentUserName, isReply && { fontSize: ms(13) }]} numberOfLines={1}>{item.userName || item.user || 'Người dùng'}</Text>
          {isReply && parentUserName && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: s(6) }}>
              <Ionicons name="caret-forward" size={ms(10)} color="#94a3b8" />
              <Text style={{ fontSize: ms(13), fontWeight: '400', color: '#3b82f6', marginLeft: s(4) }}>{parentUserName}</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={[styles.commentText, isReply && { fontSize: ms(13) }]}>{item.text || item.content || ''}</Text>
    </View>
    <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteCommentBtn}>
      <Ionicons name="trash-outline" size={ms(18)} color="#ef4444" />
    </TouchableOpacity>
  </View>
));
CommentItem.displayName = 'CommentItem';

const ArticleManagement = () => {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  // Delete Confirm State
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<any>(null);

  // Comments Management State
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

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

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const handleApprovePost = useCallback(async (post: any) => {
    try {
      await updateDoc(doc(db, 'posts', post.id), {
        approved: true
      });
      triggerToast('Đã phê duyệt bài đăng thành công', 'success');
    } catch (e) {
      console.error("Error approving post: ", e);
      triggerToast('Lỗi khi duyệt bài viết', 'error');
    }
  }, [triggerToast]);

  const filteredPosts = useMemo(() => {
    if (activeTab === 'pending') {
      return posts.filter(p => p.approved === false);
    } else {
      return posts.filter(p => p.approved !== false);
    }
  }, [posts, activeTab]);

  useEffect(() => {
    setLoading(true);
    const qPosts = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubPosts = onSnapshot(qPosts, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(data);
      setLoading(false);
    });

    return () => unsubPosts();
  }, []);

  // Comments listener
  useEffect(() => {
    if (selectedPost && commentModalVisible) {
      setLoadingComments(true);
      const q = query(collection(db, `posts/${selectedPost.id}/comments`), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(data);
        setLoadingComments(false);
      }, (err) => {
        console.error("Error fetching comments: ", err);
        setLoadingComments(false);
      });
      return () => unsub();
    }
  }, [selectedPost, commentModalVisible]);

  const handleDeletePost = useCallback((post: any) => {
    setPendingDelete(post);
    setDeleteConfirmVisible(true);
  }, []);

  const [commentDeleteConfirmVisible, setCommentDeleteConfirmVisible] = useState(false);
  const [pendingCommentDelete, setPendingCommentDelete] = useState<string | null>(null);

  const handleDeleteComment = useCallback((commentId: string) => {
    setPendingCommentDelete(commentId);
    setCommentDeleteConfirmVisible(true);
  }, []);

  const confirmDeleteComment = async () => {
    if (!selectedPost || !pendingCommentDelete) return;
    try {
      // 1. Tìm các reply của comment này (nếu có)
      const childDocsQuery = query(
        collection(db, `posts/${selectedPost.id}/comments`),
        where('parentId', '==', pendingCommentDelete)
      );
      const childDocs = await getDocs(childDocsQuery);
      const totalToDelete = childDocs.size + 1;

      // 2. Thực hiện xóa hàng loạt (batch)
      const batch = writeBatch(db);
      batch.delete(doc(db, `posts/${selectedPost.id}/comments`, pendingCommentDelete));
      childDocs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();

      // 3. Cập nhật số lượng bình luận trên bài viết
      await updateDoc(doc(db, 'posts', selectedPost.id), {
        comments: increment(-totalToDelete)
      });

      setCommentDeleteConfirmVisible(false);
      setPendingCommentDelete(null);
      triggerToast('Đã xóa bình luận thành công', 'success');
    } catch (e) {
      console.error("Error deleting comment: ", e);
      triggerToast('Lỗi khi xóa bình luận', 'error');
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await setDoc(doc(db, 'system_trash', pendingDelete.id), {
        ...pendingDelete,
        originalId: pendingDelete.id,
        originalCollection: 'posts',
        deletedAt: serverTimestamp(),
        type: 'post'
      });
      await deleteDoc(doc(db, 'posts', pendingDelete.id));
      setDeleteConfirmVisible(false);
      triggerToast('Đã chuyển bài đăng vào thùng rác', 'success');
    } catch (e) {
      triggerToast('Lỗi khi xóa bài viết', 'error');
    }
  };

  const showComments = useCallback((post: any) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
  }, []);

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
              top: insets.top + vs(8),
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={ms(28)} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Quản lý bài viết</Text>
        <View style={{ width: s(44) }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'pending' && styles.tabButtonActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            Chờ duyệt ({posts.filter(p => p.approved === false).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'approved' && styles.tabButtonActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Đã duyệt ({posts.filter(p => p.approved !== false).length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filteredPosts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostItem
              item={item}
              onDelete={handleDeletePost}
              onShowComments={showComments}
              onApprove={handleApprovePost}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + vs(20) },
            filteredPosts.length === 0 && { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={ms(64)} color="#e2e8f0" />
              <Text style={styles.emptyText} numberOfLines={1} adjustsFontSizeToFit>Chưa có bài đăng nào</Text>
            </View>
          }
        />
      )}

      {/* Comment Management Modal */}
      <Modal visible={commentModalVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={styles.modalBg}>
          <View style={[styles.modalContentFull, { paddingTop: insets.top + vs(10) }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setCommentModalVisible(false); setSelectedPost(null); }} style={styles.modalBackBtn}>
                <Ionicons name="chevron-back" size={ms(32)} color="#1e293b" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={1} adjustsFontSizeToFit>Bình luận</Text>
                <Text style={styles.modalSubTitle}>
                  Bài đăng của <Text style={{ fontWeight: '400', color: '#3b82f6' }}>{selectedPost?.user}</Text>
                </Text>
              </View>
            </View>

            {loadingComments ? (
              <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: vs(50) }} />
            ) : (
              <FlatList
                style={{ flex: 1 }}
                data={(() => {
                  // Build threaded list: parent comments followed by their children
                  const parentComments = comments.filter(c => !c.parentId);
                  const childComments = comments.filter(c => !!c.parentId);
                  const threaded: any[] = [];
                  parentComments.forEach(parent => {
                    threaded.push(parent);
                    const children = childComments.filter(c => c.parentId === parent.id);
                    children.forEach(child => threaded.push(child));
                  });
                  // Add orphaned replies (parent was deleted) at the end
                  const threadedIds = new Set(threaded.map(c => c.id));
                  childComments.forEach(c => {
                    if (!threadedIds.has(c.id)) threaded.push(c);
                  });
                  return threaded;
                })()}
                keyExtractor={item => item.id}
                renderItem={({ item }) => {
                  const isReply = !!item.parentId;
                  const parentComment = isReply ? comments.find(c => c.id === item.parentId) : null;
                  const parentUserName = parentComment ? (parentComment.userName || parentComment.user || 'Người dùng') : null;
                  return (
                    <CommentItem
                      item={item}
                      onDelete={handleDeleteComment}
                      isReply={isReply}
                      parentUserName={parentUserName}
                    />
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="chatbubble-outline" size={ms(48)} color="#e2e8f0" />
                    <Text style={styles.emptyText}>Chưa có bình luận nào</Text>
                  </View>
                }
                contentContainerStyle={[
                  { paddingBottom: insets.bottom + vs(50) },
                  comments.length === 0 && { flexGrow: 1, justifyContent: 'center', alignItems: 'center' }
                ]}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Comment Delete Confirmation Modal */}
      <Modal visible={commentDeleteConfirmVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentSmall}>
            <View style={[styles.confirmIconBg, { backgroundColor: '#fff1f2' }]}>
              <Ionicons name="chatbubble-ellipses" size={ms(32)} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle} numberOfLines={1} adjustsFontSizeToFit>Xóa bình luận</Text>
            <Text style={styles.confirmSubText} numberOfLines={1} adjustsFontSizeToFit>Bạn chắc muốn xóa bình luận này</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: '#006affff' }]} onPress={() => setCommentDeleteConfirmVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtnSmall, { backgroundColor: '#ef4444' }]} onPress={confirmDeleteComment}>
                <Text style={styles.btnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Post Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade" statusBarTranslucent={true}>
        <View style={styles.modalBg}>
          <View style={styles.modalContentSmall}>
            <View style={styles.confirmIconBg}>
              <Ionicons name="trash" size={ms(32)} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle} numberOfLines={1} adjustsFontSizeToFit>Xác nhận xóa</Text>
            <Text style={styles.confirmSubText} numberOfLines={1} adjustsFontSizeToFit>Bài đăng sẽ được chuyển vào thùng rác</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: '#006affff' }]} onPress={() => setDeleteConfirmVisible(false)}>
                <Text style={styles.btnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtnSmall, { backgroundColor: '#ef4444' }]} onPress={confirmDelete}>
                <Text style={styles.btnText}>Xác nhận</Text>
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

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: s(16) },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: ms(20),
    padding: s(16),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(12) },
  postAvatar: { width: s(44), height: s(44), borderRadius: s(22), backgroundColor: '#f1f5f9' },
  postInfo: { flex: 1, marginLeft: s(12) },
  postUserName: { fontSize: ms(16), fontWeight: '400', color: '#1e293b' },
  postDate: { fontSize: ms(12), color: '#94a3b8', marginTop: vs(2) },
  deletePostBtn: { padding: s(8), borderRadius: s(10), backgroundColor: '#fff1f2' },
  postText: { fontSize: ms(15), color: '#334155', lineHeight: ms(22), marginBottom: vs(12) },
  postImageWrapper: { width: '100%', borderRadius: ms(12), overflow: 'hidden', marginBottom: vs(12), backgroundColor: '#f1f5f9' },
  postImage: { width: '100%', height: '100%' },
  postStats: { flexDirection: 'row', gap: s(16), borderTopWidth: 1, borderTopColor: '#f8fafc', paddingTop: vs(12) },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: s(6) },
  statText: { fontSize: ms(13), fontWeight: '400', color: '#64748b' },

  commentItem: {
    flexDirection: 'row',
    paddingVertical: vs(12),
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'flex-start'
  },
  commentAvatar: { width: s(36), height: s(36), borderRadius: s(18), backgroundColor: '#f1f5f9' },
  commentContent: { flex: 1, marginLeft: s(12) },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: vs(4) },
  commentUserName: { fontSize: ms(14), fontWeight: '400', color: '#1e293b' },
  commentText: { fontSize: ms(14), color: '#475569', lineHeight: ms(20) },
  deleteCommentBtn: { padding: s(8) },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.5, paddingBottom: vs(80) },
  emptyText: { marginTop: vs(16), fontSize: ms(16), color: '#94a3b8', fontWeight: '400', textAlign: 'center' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentFull: { width: '100%', height: '100%', backgroundColor: '#fff', paddingHorizontal: s(20) },
  modalContentSmall: { width: '85%', backgroundColor: '#fff', borderRadius: ms(24), padding: s(24), alignItems: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(25) },
  modalBackBtn: { marginRight: s(15) },
  modalTitle: { fontSize: ms(22), fontWeight: '400', color: '#1e293b' },
  modalSubTitle: { fontSize: ms(13), color: '#64748b', fontWeight: '400', marginTop: vs(2) },
  confirmTitle: { fontSize: ms(20), fontWeight: '400', color: '#1e293b', textAlign: 'center' },

  modalActions: { flexDirection: 'row', gap: s(12), marginTop: vs(25) },
  cancelBtn: { flex: 1, paddingVertical: vs(14), borderRadius: s(14), alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '400', fontSize: ms(15) },
  saveBtnSmall: { flex: 1, paddingVertical: vs(14), borderRadius: s(14), alignItems: 'center' },

  confirmIconBg: {
    width: s(70),
    height: s(70),
    borderRadius: s(35),
    backgroundColor: '#fff1f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(20)
  },
  confirmSubText: { fontSize: ms(14), color: '#64748b', textAlign: 'center', lineHeight: ms(22), marginTop: vs(10) },

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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: ms(12),
    padding: s(4),
    marginHorizontal: s(16),
    marginVertical: vs(12),
  },
  tabButton: {
    flex: 1,
    paddingVertical: vs(8),
    alignItems: 'center',
    borderRadius: ms(8),
  },
  tabButtonActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  tabText: {
    fontSize: ms(14),
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  approvePostBtn: {
    padding: s(8),
    borderRadius: s(10),
    backgroundColor: '#ecfdf5',
    marginRight: s(8),
  },
});

export default ArticleManagement;
