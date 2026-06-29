import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Firestore from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const TOP_GAP = vs(180);

interface Comment {
  id: string;
  user: string;
  avatar: string;
  userId: string;
  text: string;
  time: any;
  parentId?: string | null;
}

interface Post {
  id: string;
  user: string;
  userAvatar: string;
  userId: string;
  time: any;
  content: string;
  image?: string;
  imageAspectRatio?: number;
  likes: number;
  comments: number;
  likedBy: string[];
}

export default function CommunityScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { openPostId, targetCommentId } = useLocalSearchParams();

  // States
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [createPostText, setCreatePostText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [imageRatio, setImageRatio] = useState<number | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isOptionsModalVisible, setOptionsModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [optionsPositionY, setOptionsPositionY] = useState(vs(100));
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const commentInputRef = React.useRef<TextInput>(null);
  const commentsListRef = React.useRef<FlatList>(null);

  // Tự động mở bình luận từ thông báo
  useEffect(() => {
    if (openPostId && openPostId !== 'undefined' && openPostId !== '') {
      setActivePostId(openPostId as string);
      setModalVisible(true);

      // Xóa params sau khi đã mở để có thể trigger lại lần sau
      router.setParams({ openPostId: '' });

      // Nếu không có targetCommentId thì cuộn xuống cuối (như cũ)
      if (!targetCommentId) {
        setTimeout(() => {
          commentsListRef.current?.scrollToEnd({ animated: true });
        }, 1000);
      }
    }
  }, [openPostId]);

  // Tự động cuộn tới bình luận cụ thể nếu có targetCommentId
  useEffect(() => {
    if (targetCommentId && comments.length > 0 && isModalVisible) {
      const index = comments.findIndex(c => c.id === targetCommentId);
      if (index !== -1) {
        setHighlightId(targetCommentId as string);
        setTimeout(() => {
          try {
            commentsListRef.current?.scrollToIndex({
              index,
              animated: true,
              viewPosition: 0.3
            });
          } catch (e) {
            commentsListRef.current?.scrollToOffset({
              offset: index * 100,
              animated: true
            });
          }
        }, 800);

        // Tự động xóa highlight sau 3 giây
        setTimeout(() => {
          setHighlightId(null);
        }, 3800);

        // Chỉ xóa param khi đã tìm thấy và thực hiện scroll
        router.setParams({ targetCommentId: '' });
      }
    }
  }, [targetCommentId, comments, isModalVisible]);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastY = useSharedValue(-100);

  // Reply States
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [replyToUserId, setReplyToUserId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Animation for Options Menu
  const optionsX = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    if (isOptionsModalVisible) {
      optionsX.value = withTiming(0, {
        duration: 250,
      });
    } else {
      optionsX.value = withTiming(s(50), { duration: 200 });
    }
  }, [isOptionsModalVisible]);

  const optionsOffset = s(50);
  const animatedOptionsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: optionsX.value }],
    opacity: interpolate(optionsX.value, [optionsOffset, 0], [0, 1])
  }));

  // Animation for Create/Edit Post Modal
  const createPostX = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    if (isCreateModalVisible) {
      createPostX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.poly(4)),
      });
    } else {
      createPostX.value = SCREEN_WIDTH;
    }
  }, [isCreateModalVisible]);

  const animatedCreatePostStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: createPostX.value }]
  }));

  // Modal Top Gap Animation
  const modalGapHeight = useSharedValue(TOP_GAP);
  useEffect(() => {
    modalGapHeight.value = withTiming(keyboardHeight > 0 ? (insets.top + vs(10)) : TOP_GAP, {
      duration: 300,
      easing: Easing.out(Easing.poly(3))
    });
  }, [keyboardHeight]);

  const animatedGapStyle = useAnimatedStyle(() => ({
    height: modalGapHeight.value
  }));

  // Animation for Comments Modal
  const commentsX = useSharedValue(SCREEN_WIDTH);

  useEffect(() => {
    if (isModalVisible) {
      commentsX.value = withTiming(0, {
        duration: 300,
        easing: Easing.out(Easing.poly(4)),
      });
    } else {
      commentsX.value = SCREEN_WIDTH;
    }
  }, [isModalVisible]);

  const animatedCommentsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: commentsX.value }]
  }));

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type as any);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 4000);
  };

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  // Render Toast Component Helper
  const renderToast = () => {
    if (!showToast) return null;
    return (
      <Animated.View style={[
        styles.toastContainer,
        animatedToastStyle,
        {
          backgroundColor: toastType === 'error' ? '#EF4444' : '#10B981',
          shadowColor: toastType === 'error' ? '#EF4444' : '#10B981',
          top: insets.top + vs(8),
        }
      ]}>
        <View style={styles.toastIcon}>
          <Ionicons
            name={toastType === 'success' ? "checkmark" : "close"}
            size={ms(20)}
            color="#FFF"
          />
        </View>
        <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
      </Animated.View>
    );
  };

  // Manual Keyboard Control for Android stability
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Subscribe to real-time posts
  useEffect(() => {
    const q = Firestore.query(Firestore.collection(db, 'posts'), Firestore.orderBy('createdAt', 'desc'));
    const unsubscribe = Firestore.onSnapshot(q, (snapshot) => {
      try {
        const postsData = snapshot.docs.map(doc => {
          const data = doc.data();
          let timeDisplay = t('just_now');

          if (data.createdAt) {
            try {
              const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              timeDisplay = date.toLocaleDateString('vi-VN');
            } catch (e) {
              timeDisplay = 'Vừa xong';
            }
          }

          return {
            id: doc.id,
            ...data,
            time: timeDisplay
          };
        }) as Post[];
        const approvedPosts = postsData.filter(post => (post as any).approved !== false);
        setPosts(approvedPosts);
        setLoading(false);
      } catch (err) {
        console.error("Error processing posts snapshot:", err);
        setLoading(false);
      }
    }, (error) => {
      console.error("Firestore onSnapshot error (posts):", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to comments
  useEffect(() => {
    if (!activePostId) return;
    const q = Firestore.query(
      Firestore.collection(db, 'posts', activePostId, 'comments'),
      Firestore.orderBy('createdAt', 'asc')
    );
    const unsubscribe = Firestore.onSnapshot(q, (snapshot) => {
      try {
        const commentsData = snapshot.docs.map(doc => {
          const data = doc.data();
          let timeDisplay = t('just_now');

          if (data.createdAt) {
            try {
              const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
              timeDisplay = date.toLocaleDateString('vi-VN');
            } catch (e) {
              timeDisplay = t('just_now');
            }
          }

          return {
            id: doc.id,
            ...data,
            time: timeDisplay
          };
        }) as Comment[];
        setComments(commentsData);
      } catch (err) {
        console.error("Error processing comments snapshot:", err);
      }
    }, (error) => {
      console.error("Firestore onSnapshot error (comments):", error);
    });
    return () => unsubscribe();
  }, [activePostId]);

  const sendNotification = async (receiverId: string, type: 'like' | 'comment' | 'reply', postId: string, message: string, targetId?: string) => {
    if (!user || user.uid === receiverId) return; // Không tự thông báo cho chính mình

    try {
      await Firestore.addDoc(Firestore.collection(db, 'notifications'), {
        toUserId: receiverId,
        senderId: user.uid,
        fromUserName: user.name || t('user_default'),
        senderAvatar: user.avatar || 'https://i.pravatar.cc/150?u=me',
        type,
        postId,
        targetId: targetId || null,
        message,
        isRead: false,
        createdAt: Firestore.serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      triggerToast(t('photo_permission_error'), "error");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      try {
        const asset = result.assets[0];
        const manipResult = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1000 } }],
          { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const base64Str = `data:image/jpeg;base64,${manipResult.base64}`;
        if (base64Str.length > 950000) {
          triggerToast(t('image_too_heavy'), "error");
          return;
        }
        setSelectedImage(manipResult.uri);
        setBase64Image(base64Str);
        if (manipResult.width && manipResult.height) {
          setImageRatio(manipResult.width / manipResult.height);
        }
      } catch (error) {
        triggerToast(t('image_process_error'), "error");
      }
    }
  };

  const submitPost = async () => {
    if (!user || (!createPostText.trim() && !base64Image)) return;
    setIsSubmittingPost(true);
    try {
      if (isEditingPost && editingPostId) {
        await Firestore.updateDoc(Firestore.doc(db, 'posts', editingPostId), {
          content: createPostText.trim(),
          image: base64Image,
          imageAspectRatio: imageRatio || 1,
          approved: false,
        });
        triggerToast(t('post_pending_approval'));
      } else {
        await Firestore.addDoc(Firestore.collection(db, 'posts'), {
          userId: user.uid,
          user: user.name || t('user_default'),
          userAvatar: user.avatar || 'https://i.pravatar.cc/150?u=me',
          content: createPostText.trim(),
          image: base64Image,
          imageAspectRatio: imageRatio || 1,
          likes: 0,
          comments: 0,
          likedBy: [],
          approved: false,
          createdAt: Firestore.serverTimestamp()
        });
        triggerToast(t('post_pending_approval'));
      }

      setCreatePostText('');
      setSelectedImage(null);
      setBase64Image(null);
      setImageRatio(null);
      setEditingPostId(null);
      setIsEditingPost(false);
      setCreateModalVisible(false);
    } catch (error) {
      triggerToast(t('action_failed'), "error");
    } finally {
      setTimeout(() => {
        setIsSubmittingPost(false);
      }, 500);
    }
  };

  const handleLike = async (postId: string, likedBy: string[] = []) => {
    if (!user || user.isAnonymous) {
      setShowLoginModal(true);
      return;
    }
    const postRef = Firestore.doc(db, 'posts', postId);
    const isLiked = likedBy.includes(user.uid);
    try {
      await Firestore.updateDoc(postRef, {
        likes: isLiked ? Firestore.increment(-1) : Firestore.increment(1),
        likedBy: isLiked ? Firestore.arrayRemove(user.uid) : Firestore.arrayUnion(user.uid)
      });

      if (!isLiked) {
        const postSnap = await Firestore.getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          sendNotification(postData.userId, 'like', postId, t('someone_liked'));
        }
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleComment = (id: string) => {
    if (!user || user.isAnonymous) {
      setShowLoginModal(true);
      return;
    }
    setActivePostId(id);
    setModalVisible(true);
  };

  const submitComment = async () => {
    let finalComment = commentText.trim();
    if (replyToName && finalComment.startsWith(`@${replyToName}`)) {
      finalComment = finalComment.substring(`@${replyToName}`.length).trim();
    }

    if (!user || !finalComment || !activePostId) return;
    setIsAddingComment(true);
    const currentPostId = activePostId;

    // Capture reply state BEFORE clearing (for notification logic)
    const capturedReplyToId = replyToId;
    const capturedReplyToUserId = replyToUserId;

    // Reset input immediately for perceived speed
    setCommentText('');
    setReplyToId(null);
    setReplyToName(null);
    setReplyToUserId(null);
    Keyboard.dismiss();

    try {
      const commentData = {
        userId: user.uid,
        user: user.name || t('user_default'),
        avatar: user.avatar || 'https://i.pravatar.cc/150?u=me',
        text: finalComment,
        parentId: capturedReplyToId || null,
        createdAt: Firestore.serverTimestamp()
      };

      // Run Firestore updates in parallel
      const [newCommentRef] = await Promise.all([
        Firestore.addDoc(Firestore.collection(db, 'posts', currentPostId, 'comments'), commentData),
        Firestore.updateDoc(Firestore.doc(db, 'posts', currentPostId), {
          comments: Firestore.increment(1)
        })
      ]);

      triggerToast(t('comment_success'));

      // Scroll to bottom after adding comment
      setTimeout(() => {
        commentsListRef.current?.scrollToEnd({ animated: true });
      }, 500);

      // Background notification logic (uses captured values, not cleared state)
      const postSnap = await Firestore.getDoc(Firestore.doc(db, 'posts', currentPostId));
      if (postSnap.exists()) {
        const postData = postSnap.data();
        if (capturedReplyToId && capturedReplyToUserId) {
          sendNotification(capturedReplyToUserId, 'reply', currentPostId, `${t('someone_replied')}: "${finalComment.substring(0, 30)}..."`, capturedReplyToId);
        } else {
          sendNotification(postData.userId, 'comment', currentPostId, `${t('someone_commented')}: "${finalComment.substring(0, 30)}..."`, newCommentRef.id);
        }
      }
    } catch (error) {
      console.error("Submit comment error:", error);
      triggerToast(t('action_failed'), "error");
      // Re-set text if error so user doesn't lose it
      setCommentText(finalComment);
    } finally {
      setIsAddingComment(false);
    }
  };

  const handleReply = (comment: Comment) => {
    setReplyToId(comment.id);
    setReplyToName(comment.user);
    setReplyToUserId(comment.userId);
    setCommentText(`@${comment.user} `);
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 100);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!activePostId) return;
    try {
      const childDocsQuery = Firestore.query(
        Firestore.collection(db, 'posts', activePostId, 'comments'),
        Firestore.where('parentId', '==', commentId)
      );
      const childDocs = await Firestore.getDocs(childDocsQuery);
      const totalToDelete = childDocs.size + 1;

      const batch = Firestore.writeBatch(db);
      batch.delete(Firestore.doc(db, 'posts', activePostId, 'comments', commentId));
      childDocs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      await Firestore.updateDoc(Firestore.doc(db, 'posts', activePostId), {
        comments: Firestore.increment(-totalToDelete)
      });

      triggerToast(t('delete_comment_success'));
    } catch (error) {
      triggerToast(t('action_failed'), "error");
    }
  };

  const handlePostOptions = (post: Post, event: any) => {
    if (!user || user.uid !== post.userId) return;
    const y = event.nativeEvent.pageY;
    // Đảm bảo menu không bị mất ở phía dưới cùng màng hình
    const adjustedY = y > SCREEN_HEIGHT - vs(150) ? y - vs(100) : y + vs(10);
    setOptionsPositionY(adjustedY);
    setSelectedPost(post);
    setOptionsModalVisible(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setIsEditingPost(true);
    setCreatePostText(post.content);
    if (post.image) {
      setSelectedImage(post.image);
      setBase64Image(post.image);
      setImageRatio(post.imageAspectRatio || 1);
    } else {
      setSelectedImage(null);
      setBase64Image(null);
      setImageRatio(null);
    }
    setCreateModalVisible(true);
  };

  const handleDeletePost = (postId: string, postUserId: string) => {
    if (!user || user.uid !== postUserId) return;
    setPostToDelete(postId);
    setShowDeleteModal(true);
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    try {
      await Firestore.deleteDoc(Firestore.doc(db, 'posts', postToDelete));
      triggerToast(t('delete_post_success'));
    } catch (error) {
      triggerToast(t('action_failed'), "error");
    } finally {
      setShowDeleteModal(false);
      setPostToDelete(null);
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    const isLiked = user ? item.likedBy?.includes(user.uid) : false;
    const isMyPost = user?.uid === item.userId;
    const displayAvatar = (isMyPost && user?.avatar) ? user.avatar : item.userAvatar;
    const displayName = (isMyPost && user?.name) ? user.name : item.user;

    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <Image source={{ uri: displayAvatar }} style={styles.avatar} />
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.postTime}>{item.time}</Text>
          </View>
          {isMyPost && (
            <TouchableOpacity onPress={(e) => handlePostOptions(item, e)} style={{ padding: 5 }}>
              <Ionicons name="ellipsis-vertical" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        {item.image && (
          <Image
            source={{ uri: item.image }}
            style={[styles.postImage, { aspectRatio: item.imageAspectRatio || 1 }]}
          />
        )}
        <View style={styles.actionsRow}>
          <View style={styles.leftActions}>
            <TouchableOpacity style={styles.actionItem} onPress={() => handleLike(item.id, item.likedBy)}>
              <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#F43F5E" : "#1A1A1A"} />
              <Text style={styles.actionCount}>{item.likes || 0}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem} onPress={() => handleComment(item.id)}>
              <Ionicons name="chatbubble-outline" size={20} color="#1A1A1A" />
              <Text style={styles.actionCount}>{item.comments || 0}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {(!isModalVisible && !isCreateModalVisible) && renderToast()}

      <View style={styles.screenHeader}>
        <View style={{ width: 36 }} />
        <Text style={styles.screenTitle}>{t('tab_community')}</Text>
        <TouchableOpacity
          style={styles.plusBtn}
          onPress={() => {
            if (!user || user.isAnonymous) {
              setShowLoginModal(true);
              return;
            }
            setCreatePostText('');
            setSelectedImage(null);
            setBase64Image(null);
            setImageRatio(null);
            setIsEditingPost(false);
            setEditingPostId(null);
            setCreateModalVisible(true);
          }}
        >
          <Ionicons name="add" size={28} color="#000dffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, posts.length === 0 && { flex: 1 }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={48} color="#EEE" />
            <Text style={styles.emptyText}>{t('empty_posts')}</Text>
          </View>
        }
      />

      {/* Modal: Tạo/Sửa bài viết */}
      <Modal animationType="fade" transparent={true} statusBarTranslucent={true} visible={isCreateModalVisible} onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          {renderToast()}
          <Animated.View style={animatedGapStyle}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setCreateModalVisible(false);
                setIsEditingPost(false);
                setEditingPostId(null);
                setCreatePostText('');
                setSelectedImage(null);
                setImageRatio(null);
              }}
            />
          </Animated.View>
          <Animated.View style={[styles.modalContent, animatedCreatePostStyle, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleBox}>
                <Text style={styles.modalTitle}>{isEditingPost ? t('edit_post_title') : t('create_post_title')}</Text>

                <View style={{ flex: 1 }} />

                <TouchableOpacity
                  onPress={submitPost}
                  disabled={!createPostText.trim() && !base64Image || isSubmittingPost}
                  style={{ minWidth: 60, alignItems: 'center' }}
                >
                  {isSubmittingPost ? (
                    <ActivityIndicator size="small" color="#1877F2" />
                  ) : (
                    <Text style={{
                      color: (createPostText.trim() || base64Image) ? '#1877F2' : '#CCC',
                      fontSize: 16,
                      fontWeight: '700',
                    }}>
                      {isEditingPost ? t('update_post') : t('submit_post')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView
              style={styles.createPostContent}
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.userInfoRow}>
                <Image source={{ uri: user?.avatar || 'https://i.pravatar.cc/150?u=me' }} style={styles.commentAvatar} />
                <Text style={styles.userNameInModal}>{user?.name || t('user_default')}</Text>

                <TouchableOpacity onPress={pickImage} style={{ padding: 5 }}>
                  <Ionicons name="image-outline" size={28} color="#1877F2" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.createPostInput}
                placeholder={t('post_placeholder')}
                placeholderTextColor="#1877F2"
                multiline
                autoFocus
                value={createPostText}
                onChangeText={setCreatePostText}
                scrollEnabled={false}
              />
              <View style={{ height: 10 }} />

              {selectedImage && (
                <View style={[styles.previewImageContainer, keyboardHeight > 0 && { maxHeight: vs(150) }]}>
                  <Image
                    source={{ uri: selectedImage }}
                    style={[styles.previewImage, { aspectRatio: imageRatio || 1 }]}
                  />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => { setSelectedImage(null); setBase64Image(null); setImageRatio(null); }}>
                    <Ionicons name="close" size={18} color="#FFF" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: keyboardHeight > 0 ? vs(80) : vs(20) }} />
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Modal: Bình luận */}
      <Modal animationType="fade" transparent={true} statusBarTranslucent={true} visible={isModalVisible} onRequestClose={() => {
        Keyboard.dismiss();
        setModalVisible(false);
        setActivePostId(null);
        setCommentText('');
        setReplyToId(null);
        setReplyToName(null);
        setReplyToUserId(null);
      }}>
        <View style={styles.modalOverlay}>
          {renderToast()}
          <Animated.View style={animatedGapStyle}>
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={() => {
                Keyboard.dismiss();
                setModalVisible(false);
                setActivePostId(null);
                setCommentText('');
                setReplyToId(null);
                setReplyToName(null);
                setReplyToUserId(null);
              }}
            />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Animated.View style={[styles.modalContent, animatedCommentsStyle, { flex: 1 }]}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBox}>
                  <Text style={styles.modalTitle}>{t('comments_title')} ({comments.length})</Text>
                  <TouchableOpacity onPress={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                    setActivePostId(null);
                    setCommentText('');
                    setReplyToId(null);
                    setReplyToName(null);
                    setReplyToUserId(null);
                  }}><Ionicons name="close" size={28} color="#ff0000ff" /></TouchableOpacity>
                </View>
              </View>

              <FlatList
                ref={commentsListRef}
                data={comments}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                contentContainerStyle={[
                  styles.commentsList,
                  comments.length > 0 ? { paddingBottom: vs(120) } : { flexGrow: 1, justifyContent: 'center', paddingBottom: 0 }
                ]}
                renderItem={({ item }) => {
                  const isMyComment = user?.uid === item.userId;
                  const displayCommentAvatar = (isMyComment && user?.avatar) ? user.avatar : item.avatar;
                  const displayCommentName = (isMyComment && user?.name) ? user.name : item.user;
                  const isReply = !!item.parentId;

                  return (
                    <View style={[
                      styles.commentItem,
                      isReply && { marginLeft: 45 },
                      highlightId === item.id && styles.highlightedComment
                    ]}>
                      <Image source={{ uri: displayCommentAvatar }} style={[styles.commentAvatar, isReply && { width: 32, height: 32 }]} />
                      <View style={styles.commentBody}>
                        <View style={styles.commentContentArea}>
                          <View style={styles.commentUserRow}>
                            <Text style={styles.commentUser} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                              {displayCommentName}
                              {isReply && item.parentId && (
                                <Text style={{ fontWeight: 'normal' }}>
                                  {"  "}
                                  <Ionicons name="caret-forward-sharp" size={12} color="#666" />
                                  {"  "}
                                  <Text style={styles.repliedToUser}>
                                    {comments.find(c => c.id === item.parentId)?.user || t('user_default')}
                                  </Text>
                                </Text>
                              )}
                            </Text>
                          </View>
                          <Text style={styles.commentText}>{item.text}</Text>
                        </View>

                        <View style={styles.commentFooter}>
                          <Text style={styles.commentTime}>{item.time}</Text>
                          <TouchableOpacity onPress={() => handleReply(item)} style={{ marginLeft: 12 }}>
                            <Text style={styles.footerActionText}>{t('reply_action')}</Text>
                          </TouchableOpacity>
                          {isMyComment && (
                            <TouchableOpacity onPress={() => handleDeleteComment(item.id)} style={{ marginLeft: 1 }}>
                              <Text style={styles.footerActionText}>{t('delete_action')}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyCommentsContainer}>
                    <Ionicons name="chatbubble-ellipses-outline" size={ms(60)} color="#E2E8F0" />
                    <Text style={styles.emptyCommentsText} numberOfLines={1} adjustsFontSizeToFit>
                      {t('first_comment_msg')}
                    </Text>
                  </View>
                }
              />

              {replyToName && (
                <View style={styles.replyBar}>
                  <Text style={styles.replyBarText}>{t('replying_to')}: <Text style={{ fontWeight: '800' }}>{replyToName}</Text></Text>
                  <TouchableOpacity onPress={() => {
                    if (commentText.startsWith(`@${replyToName} `)) {
                      setCommentText('');
                    }
                    setReplyToId(null);
                    setReplyToName(null);
                    setReplyToUserId(null);
                  }}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={[styles.commentInputContainer, {
                paddingBottom: keyboardHeight > 0 ? (keyboardHeight + vs(10)) : (insets.bottom + vs(10)),
                borderTopWidth: 1,
                borderTopColor: '#F0F0F0',
                paddingTop: vs(12),
                backgroundColor: '#FFFFFF',
              }]}>
                <TextInput
                  ref={commentInputRef}
                  style={styles.commentInput}
                  placeholder={t('write_comment_placeholder')}
                  placeholderTextColor="#1877F2"
                  value={commentText}
                  onChangeText={(text) => {
                    setCommentText(text);
                    if (replyToName && !text.startsWith(`@${replyToName}`)) {
                      setReplyToId(null);
                      setReplyToName(null);
                      setReplyToUserId(null);
                    }
                  }}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={submitComment} disabled={!commentText.trim() || isAddingComment}>
                  {isAddingComment ? <ActivityIndicator size="small" color="#1877F2" /> : <Ionicons name="send" size={25} color={commentText.trim() ? "#1877F2" : "#CCC"} />}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>

      {/* Post Options Dropdown */}
      <Modal animationType="fade" transparent={true} statusBarTranslucent={true} visible={isOptionsModalVisible} onRequestClose={() => setOptionsModalVisible(false)}>
        <TouchableOpacity style={styles.optionsOverlay} activeOpacity={1} onPress={() => setOptionsModalVisible(false)}>
          <Animated.View style={[styles.optionsContent, animatedOptionsStyle, {
            top: optionsPositionY,
            minWidth: s(170),
            maxWidth: SCREEN_WIDTH - s(40),
            width: 'auto'
          }]}>
            <TouchableOpacity style={styles.optionRow} onPress={() => { setOptionsModalVisible(false); if (selectedPost) handleEditPost(selectedPost); }}>
              <View style={styles.optionIconContainer}><Ionicons name="create-outline" size={ms(22)} color="#3960ffff" /></View>
              <Text style={styles.optionText}>{t('edit_post_menu')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => { setOptionsModalVisible(false); if (selectedPost) handleDeletePost(selectedPost.id, selectedPost.userId); }}>
              <View style={styles.optionIconContainer}><Ionicons name="trash-outline" size={ms(22)} color="#ff0000ff" /></View>
              <Text style={styles.optionText}>{t('delete_post_menu')}</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowLoginModal(false)}
      >
        <TouchableOpacity
          style={styles.pModalOverlay}
          activeOpacity={1}
          onPress={() => setShowLoginModal(false)}
        >
          <View style={styles.pModalContent}>
            <View style={styles.pModalIconCircle}>
              <Ionicons name="person-circle-outline" size={40} color="#3B82F6" />
            </View>
            <Text style={styles.pModalTitle} numberOfLines={1} adjustsFontSizeToFit>{t('login_required')}</Text>
            <Text style={styles.pModalSub} numberOfLines={1} adjustsFontSizeToFit>{t('login_to_use')}</Text>

            <View style={styles.pModalActionRow}>
              <TouchableOpacity
                style={styles.pModalPrimaryBtn}
                onPress={() => {
                  setShowLoginModal(false);
                  router.push('/login');
                }}
              >
                <Text style={styles.pModalPrimaryBtnText}>{t('login_user')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pModalSecondaryBtn}
                onPress={() => setShowLoginModal(false)}
              >
                <Text style={styles.pModalSecondaryBtnText}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <TouchableOpacity
          style={styles.pModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDeleteModal(false)}
        >
          <View style={styles.pModalContent}>
            <View style={[styles.pModalIconCircle, { backgroundColor: '#FEF2F2', borderColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={40} color="#EF4444" />
            </View>
            <Text style={styles.pModalTitle} numberOfLines={1} adjustsFontSizeToFit>{t('delete_post_confirm')}</Text>
            <Text style={styles.pModalSub} numberOfLines={1} adjustsFontSizeToFit>{t('cannot_undo')}</Text>

            <View style={styles.pModalActionRow}>
              <TouchableOpacity
                style={[styles.pModalPrimaryBtn, { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]}
                onPress={confirmDeletePost}
              >
                <Text style={styles.pModalPrimaryBtnText}>{t('delete_post_confirm')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pModalSecondaryBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.pModalSecondaryBtnText, { color: '#FFF' }]}>{t('back')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
  toastText: { color: '#FFF', fontSize: ms(13), fontWeight: '400', marginLeft: s(10), flex: 1 },
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s(20), paddingTop: vs(5), paddingBottom: vs(15) },
  screenTitle: { fontSize: ms(22), fontWeight: '400', color: '#1A1A1A' },
  plusBtn: { width: s(36), height: s(36), borderRadius: s(18), backgroundColor: '#F7F7F7', justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingTop: vs(5), paddingBottom: vs(30) },
  postContainer: { paddingHorizontal: s(20), paddingVertical: vs(20), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(15) },
  avatar: { width: s(48), height: s(48), borderRadius: s(24), backgroundColor: '#F0F0F0' },
  headerInfo: { marginLeft: s(12), flex: 1, marginRight: s(10), minWidth: 0 },
  userName: { fontSize: ms(17), fontWeight: '700', color: '#1A1A1A', paddingVertical: vs(2), paddingRight: s(15), flexShrink: 1 },
  postTime: { fontSize: ms(14), color: '#666', marginTop: vs(2) },
  postContent: { fontSize: ms(16), color: '#1A1A1A', marginBottom: vs(15), paddingVertical: vs(2) },
  postImage: { width: '100%', borderRadius: ms(24), backgroundColor: '#F0F0F0', marginBottom: vs(15) },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: vs(5) },
  leftActions: { flexDirection: 'row', alignItems: 'center', gap: s(20) },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  actionCount: { fontSize: ms(16), fontWeight: '700', color: '#1A1A1A' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: ms(30), borderTopRightRadius: ms(30), overflow: 'hidden' },
  modalHeader: { alignItems: 'center', paddingVertical: vs(12) },
  modalHandle: { width: s(40), height: vs(5), borderRadius: s(3), backgroundColor: '#E0E0E0', marginBottom: vs(10) },
  modalHeaderTitleBox: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(20), marginBottom: vs(10) },
  modalTitle: { fontSize: ms(18), fontWeight: '400', color: '#1A1A1A' },
  commentAvatar: { width: s(36), height: s(36), borderRadius: s(18), backgroundColor: '#F0F0F0' },
  commentsList: { paddingHorizontal: s(20), paddingBottom: vs(20) },
  commentItem: { flexDirection: 'row', marginBottom: vs(15), paddingHorizontal: s(10), paddingVertical: vs(5) },
  highlightedComment: { backgroundColor: '#F0F9FF', borderRadius: ms(12), borderLeftWidth: 3, borderLeftColor: '#3B82F6' },
  commentBody: { marginLeft: s(10), flex: 1, minWidth: 0 },
  commentContentArea: { paddingVertical: vs(2) },
  commentUserRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(2) },
  repliedToUser: { fontSize: ms(14), fontWeight: '700', color: '#1A1A1A', paddingVertical: vs(1) },
  commentUser: { fontSize: ms(14), fontWeight: '700', color: '#1A1A1A', paddingVertical: vs(1), paddingRight: s(10), flexShrink: 1 },
  commentText: { fontSize: ms(14), color: '#1A1A1A', paddingVertical: vs(2) },
  commentTime: { fontSize: ms(12), color: '#999' },
  footerActionText: { fontSize: ms(12), fontWeight: '700', color: '#666', paddingVertical: vs(5), paddingRight: s(12), minWidth: s(55) },
  commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: vs(4) },
  commentInputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: s(15), paddingTop: vs(12), borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: '#FFFFFF', zIndex: 10 },
  commentInput: { flex: 1, backgroundColor: '#F0F2F5', borderRadius: ms(20), paddingHorizontal: s(15), paddingVertical: vs(8), fontSize: ms(16), maxHeight: vs(110) },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: s(20), paddingVertical: vs(8), borderTopWidth: 1, borderTopColor: '#EEE' },
  replyBarText: { fontSize: ms(14), color: '#666', flex: 1, marginRight: s(10) },
  sendBtn: { marginLeft: s(10), width: s(45), height: s(45), justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: vs(50) },
  emptyText: { marginTop: vs(16), fontSize: ms(16), color: '#94A3B8', fontWeight: '400' },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(40),
  },
  emptyCommentsText: {
    marginTop: vs(12),
    fontSize: ms(15),
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '400',
  },
  createPostContent: { flexGrow: 1 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(20), paddingHorizontal: s(20), paddingTop: vs(10) },
  userNameInModal: { fontSize: ms(17), fontWeight: '700', color: '#1A1A1A', marginLeft: s(12), paddingRight: s(15), flex: 1 },
  createPostInput: { fontSize: ms(18), color: '#1A1A1A', textAlignVertical: 'top', minHeight: 65, paddingHorizontal: s(20), marginBottom: 0 },
  previewImageContainer: { position: 'relative', marginBottom: vs(12), paddingHorizontal: s(20) },
  previewImage: { width: '100%', borderRadius: ms(20), backgroundColor: '#F0F0F0' },
  removeImageBtn: { position: 'absolute', top: 10, right: 30, backgroundColor: 'rgba(0,0,0,0.5)', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  createPostActions: { flexDirection: 'row', padding: s(15), borderTopWidth: 1, borderTopColor: '#F0F0F0', alignItems: 'center', backgroundColor: '#FFFFFF', zIndex: 10 },
  attachAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: s(20), paddingVertical: vs(10), borderRadius: ms(22), gap: s(8) },
  attachActionText: { fontSize: ms(14), fontWeight: '700', color: '#1877F2', marginRight: s(2) },
  closeModalBtn: { width: s(44), height: s(44), justifyContent: 'center', alignItems: 'center', borderRadius: s(22), backgroundColor: '#FFF0F0' },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  optionsContent: {
    position: 'absolute',
    right: s(20),
    backgroundColor: '#FFFFFF',
    borderRadius: ms(20),
    paddingTop: vs(13),
    paddingBottom: vs(6),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(5) },
    shadowOpacity: 0.15,
    shadowRadius: s(15),
    elevation: 10,
    zIndex: 1000
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: vs(3),
    paddingHorizontal: s(18),
  },
  optionIconContainer: {
    width: s(28),
    height: s(28),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(2)
  },
  optionText: { fontSize: ms(16), fontWeight: '500', color: '#1A1A1A' },

  pModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  pModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: ms(35),
    borderTopRightRadius: ms(35),
    paddingTop: vs(25),
    paddingHorizontal: s(30),
    width: '100%',
    minHeight: '40%',
    paddingBottom: vs(5),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: vs(-10) },
    shadowOpacity: 0.1,
    shadowRadius: s(20),
    elevation: 25,
  },
  pModalIconCircle: {
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
  pModalTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: vs(8),
    textAlign: 'center',
  },
  pModalSub: {
    fontSize: ms(15),
    color: '#64748B',
    textAlign: 'center',
    lineHeight: vs(22),
    marginBottom: vs(24),
  },
  pModalActionRow: {
    width: '100%',
    gap: vs(12),
  },
  pModalPrimaryBtn: {
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
  pModalPrimaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
  pModalSecondaryBtn: {
    backgroundColor: '#EF4444',
    height: vs(56),
    borderRadius: ms(18),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  pModalSecondaryBtnText: {
    color: '#FFF',
    fontSize: ms(16),
    fontWeight: '400',
  },
});