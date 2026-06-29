import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { db } from '@/utils/firebaseConfig';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeInDown, interpolate, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SupportScreen() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userFeedbacks, setUserFeedbacks] = useState<any[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load user feedbacks
  useEffect(() => {
    if (!user) {
      setUserFeedbacks([]);
      setLoadingFeedbacks(false);
      return;
    }

    const q = query(
      collection(db, 'feedback'),
      where('userId', '==', user.uid)
      // Tạm thời bỏ orderBy để tránh lỗi Missing Index, sẽ sort thủ công ở dưới
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const item = doc.data();
          return {
            id: doc.id,
            ...item,
            // Ưu tiên adminReply, fallback sang message nếu cần (tùy cấu trúc cũ)
            adminReply: item.adminReply || item.reply || null
          };
        });

        // Sắp xếp thủ công tại client để tránh lỗi Index
        data.sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setUserFeedbacks(data);
        setLoadingFeedbacks(false);
      },
      (error) => {
        console.error("Firebase onSnapshot error:", error);
        setLoadingFeedbacks(false); // Quan trọng: tắt loading dù có lỗi
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Toast States
  const [showToastState, setShowToastState] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastY = useSharedValue(-100);
  const insets = useSafeAreaInsets();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToastState(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToastState(false), 400);
    }, 3000);
  };

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const handleSendFeedback = async () => {
    if (!user) {
      showToast(t('login_to_send'), 'error');
      return;
    }


    if (!content.trim()) {
      showToast(t('content_required'), 'error');
      return;
    }

    Keyboard.dismiss();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSending(true);
    try {
      const newFeedbackData = {
        userId: user.uid,
        userName: user.name || t('user_default'),
        avatar: user.avatar || null,
        'e-mail': user.email,
        subject: 'Phản hồi đóng góp',
        content: content.trim(),
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'feedback'), newFeedbackData);

      showToast(t('feedback_success'), 'success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setContent('');
    } catch (error) {
      console.error('Error sending feedback:', error);
      showToast(t('feedback_failed'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    setUserFeedbacks(prev => prev.filter(item => item.id !== id));
    try {
      await deleteDoc(doc(db, 'feedback', id));
      showToast(t('delete_feedback_success'), 'success');
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      showToast(t('delete_feedback_failed'), 'error');
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

      return new Intl.DateTimeFormat(language === 'km' ? 'km-KH' : 'vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      }).format(date);
    } catch (e) {
      return '';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{t('support_feedback')}</Text>
        <View style={{ width: 25 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Feedback Section */}
          <View style={styles.section}>
            <View style={styles.formContainer}>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('feedback_placeholder')}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
                onPress={handleSendFeedback}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator color="#3B82F6" size="small" />
                ) : (
                  <>
                    <Text style={styles.sendBtnText}>{t('send_feedback')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Feedback History Section */}
          <View style={styles.historySection}>
            <Text style={styles.historySectionTitle}>{t('feedback_history')}</Text>

            {loadingFeedbacks ? (
              <View style={styles.loadingHistory}>
                <ActivityIndicator size="small" color="#3B82F6" />
              </View>
            ) : userFeedbacks.length > 0 ? (
              userFeedbacks.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={index < 5 ? FadeInDown.delay(index * 80).duration(400) : undefined}
                  layout={LinearTransition}
                  style={styles.historyCardWrapper}
                >
                  <TouchableOpacity
                    style={[styles.historyCard, (item.adminReply || item.reply) && styles.repliedCard]}
                    onLongPress={() => setDeletingId(item.id)}
                    onPress={() => deletingId && setDeletingId(null)}
                    activeOpacity={0.9}
                  >
                    {/* Status Bar */}
                    <View style={styles.cardHeaderRow}>
                      <View style={[styles.statusBadge, (item.adminReply || item.reply) ? styles.statusReplied : styles.statusPending]}>
                        <Ionicons
                          name={(item.adminReply || item.reply) ? "checkmark-circle" : "time"}
                          size={ms(12)}
                          color="#FFFFFF"
                        />
                        <Text style={styles.statusText}>
                          {t((item.adminReply || item.reply) ? 'replied_status' : 'pending_status')}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
                    </View>

                    {/* User Message */}
                    <View style={styles.userMessageArea}>
                      <View style={styles.userIconCircle}>
                        {item.avatar ? (
                          <Image
                            source={{ uri: item.avatar }}
                            style={styles.userAvatarImg}
                            contentFit="cover"
                            transition={200}
                          />
                        ) : (
                          <Ionicons name="person" size={ms(14)} color="#64748B" />
                        )}
                      </View>
                      <Text style={styles.userMsgText}>
                        {item.content || item.message || t('no_content')}
                      </Text>
                    </View>

                    {/* Admin Response */}
                    {(item.adminReply || item.reply) && (
                      <View style={styles.adminResponseArea}>
                        <View style={styles.adminHeader}>
                          <View style={styles.adminIconCircle}>
                            <Ionicons name="person-circle" size={ms(16)} color="#3B82F6" />
                          </View>
                          <Text style={styles.adminName}>{t('admin_reply')}</Text>
                        </View>
                        <View style={styles.adminTextBubble}>
                          <View style={styles.bubbleArrow} />
                          <Text style={styles.adminMsgText}>
                            {item.adminReply || item.reply}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Delete Overlay */}
                    {deletingId === item.id && (
                      <TouchableOpacity
                        onPress={() => handleDeleteFeedback(item.id)}
                        style={styles.deleteOverlay}
                      >
                        <View style={styles.deleteBtnContent}>
                          <Ionicons name="trash" size={24} color="#FFF" />
                          <Text style={styles.deleteBtnText}>{t('delete_action')}</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))
            ) : (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyText}>{t('no_feedback_history') || 'Chưa có lịch sử phản hồi'}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Premium Toast System */}
      {showToastState && (
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    width: 25,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 25,
    paddingTop: 10,
  },
  section: {
    marginBottom: vs(10),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#1A1A1A',
    marginBottom: 0,
    lineHeight: 26,
  },
  sectionSub: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
    lineHeight: 20,
    fontWeight: '400',
    textAlign: 'justify',
  },
  formContainer: {
    marginTop: vs(10),
    backgroundColor: '#FFFFFF',
    padding: s(24),
    borderRadius: s(32),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: s(16),
    paddingHorizontal: s(18),
    paddingVertical: vs(14),
    fontSize: ms(15),
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontWeight: '400',
  },
  textArea: {
    height: vs(140),
    paddingTop: vs(14),
  },
  sendBtn: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: vs(56), // Fixed height to prevent jerking
    borderRadius: s(18),
    marginTop: vs(10),
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  sendBtnText: {
    color: '#FFFFFF',
    fontSize: ms(16),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Feedback History Styles Re-designed
  historySection: {
    paddingBottom: vs(20),
    marginTop: 7,
  },
  historySectionTitle: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#1E293B',
    marginBottom: vs(12),
  },
  historyCardWrapper: {
    marginBottom: vs(12),
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(24),
    paddingHorizontal: s(20),
    paddingVertical: vs(18),
    borderWidth: 1.5,
    borderColor: '#1A1A1A', // Sharp black/dark border
    overflow: 'hidden',
  },
  repliedCard: {
    borderWidth: 1.5,
    borderColor: '#3B82F6', // Blue border for replied ones
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: vs(14),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: s(10),
    paddingVertical: vs(4),
    borderRadius: s(20),
    gap: s(5),
  },
  statusReplied: {
    backgroundColor: '#10B981', // Solid background for better contrast
  },
  statusPending: {
    backgroundColor: '#F59E0B', // Solid background for better contrast
  },
  statusText: {
    fontSize: ms(11),
    fontWeight: '600', // Making it bolder
    color: '#FFFFFF', // White text on solid background
    letterSpacing: 0.3,
  },
  historyDate: {
    fontSize: ms(12),
    color: '#94A3B8',
    fontWeight: '400',
  },
  userMessageArea: {
    flexDirection: 'row',
    alignItems: 'center', // Added for alignment
    gap: s(12),
    marginBottom: vs(6),
  },
  userIconCircle: {
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userAvatarImg: {
    width: '100%',
    height: '100%',
  },
  userMsgText: {
    flex: 1,
    fontSize: ms(14),
    color: '#1E293B',
    lineHeight: ms(20),
    fontWeight: '400',
  },
  adminResponseArea: {
    marginTop: vs(12),
    paddingTop: vs(12),
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginLeft: s(20), // Thụt đầu dòng (indent)
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: vs(10),
  },
  adminIconCircle: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  adminName: {
    fontSize: ms(13),
    fontWeight: '400',
    color: '#3B82F6',
  },
  adminTextBubble: {
    backgroundColor: '#F0F9FF', // Very light blue for response
    padding: s(15),
    borderRadius: s(16),
    borderTopLeftRadius: s(2),
  },
  adminMsgText: {
    fontSize: ms(14),
    color: '#334155',
    lineHeight: ms(20),
    fontWeight: '400',
  },
  bubbleArrow: {
    position: 'absolute',
    top: -vs(6),
    left: s(12),
    width: 0,
    height: 0,
    borderLeftWidth: s(5),
    borderRightWidth: s(5),
    borderBottomWidth: vs(6),
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F0F9FF', // Light blue to match child theme
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  deleteBtnContent: {
    alignItems: 'center',
    gap: vs(8),
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: ms(14),
    fontWeight: '400',
  },
  loadingHistory: {
    paddingVertical: vs(40),
    alignItems: 'center',
  },
  emptyHistory: {
    paddingVertical: vs(150),
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: s(24),
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    marginTop: vs(10),
  },
  emptyText: {
    fontSize: ms(14),
    color: '#94A3B8',
    fontWeight: '400',
  },
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
});
