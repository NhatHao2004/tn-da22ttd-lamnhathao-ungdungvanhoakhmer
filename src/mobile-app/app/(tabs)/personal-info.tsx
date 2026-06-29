import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { auth, db } from '@/utils/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { ms, s, vs } from '@/utils/responsive';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PersonalInfoScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(user?.name || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null);

  // Change password states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const toastY = useSharedValue(-100);

  const triggerToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type as any);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 3000);
  };

  const handleBack = () => {
    // Reset state before leaving (optional but ensures "xóa sạch" feel)
    if (user) {
      setName(user.name || '');
      setAvatarUri(user.avatar || null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
    router.replace('/(tabs)/profile');
  };

  // Reset state to user data whenever the screen is focused
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        setName(user.name || '');
        setAvatarUri(user.avatar || null);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    }, [user])
  );

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setAvatarUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  // ─── Unified Save ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim()) {
      triggerToast(t('name_required'), 'error');
      return;
    }

    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error(t('not_logged_in'));

      // 1. Update Profile (Name/Avatar)
      const newAvatar = avatarUri || user?.avatar || '';
      const newName = name.trim();

      await updateDoc(doc(db, 'users', uid), {
        name: newName,
        avatar: newAvatar,
      });

      // 1b. Sync with Posts & Comments (Cập nhật tên và ảnh đại diện trên toàn bộ dữ liệu cũ)
      try {
        const batch = writeBatch(db);

        // Cập nhật Posts
        const postsQuery = query(collection(db, 'posts'), where('userId', '==', uid));
        const postSnapshots = await getDocs(postsQuery);
        postSnapshots.forEach((postDoc) => {
          batch.update(postDoc.ref, { user: newName, userAvatar: newAvatar });
        });

        // Cập nhật Comments (Sử dụng collectionGroup để quét tất cả sub-collections)
        const { collectionGroup } = await import('firebase/firestore');
        const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', uid));
        const commentSnapshots = await getDocs(commentsQuery);
        commentSnapshots.forEach((commentDoc) => {
          batch.update(commentDoc.ref, { user: newName, avatar: newAvatar });
        });

        if (!postSnapshots.empty || !commentSnapshots.empty) {
          await batch.commit();
        }
      } catch (syncError) {
        console.error("Error syncing profile with posts/comments:", syncError);
      }

      // 2. Optional Password Update
      const isTryingToChangePass = oldPassword || newPassword || confirmPassword;
      if (isTryingToChangePass) {
        if (!oldPassword || !newPassword || !confirmPassword) {
          throw new Error(t('pass_fields_required'));
        }
        if (newPassword !== confirmPassword) {
          throw new Error(t('pass_mismatch'));
        }
        if (newPassword.length < 6) {
          throw new Error(t('pass_too_short'));
        }

        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) throw new Error(t('user_not_found'));

        const credential = EmailAuthProvider.credential(currentUser.email, oldPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, newPassword);

        // Clear password fields on success
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      await refreshUser();
      triggerToast(t('update_success'), 'success');

      // Delay navigation to let toast be seen longer
      setTimeout(() => {
        router.push('/(tabs)/profile');
      }, 2200);
    } catch (e: any) {
      let msg = e.message || t('update_failed');
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        msg = t('wrong_old_pass');
      }
      triggerToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatarUri
    ? { uri: avatarUri }
    : (user?.avatar ? { uri: user.avatar } : null);

  const hasChanges =
    name.trim() !== (user?.name || '') ||
    avatarUri !== (user?.avatar || null) ||
    oldPassword.length > 0 ||
    newPassword.length > 0 ||
    confirmPassword.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={26} color="#000000ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{t('edit_profile')}</Text>
        <View style={{ width: 25 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
              <View style={styles.avatarRing}>
                {avatarSrc ? (
                  <Image source={avatarSrc} style={styles.avatar} />
                ) : (
                  <Ionicons name="person" size={80} color="#DDD" />
                )}
              </View>
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Profile Info Form */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>{t('personal_info')}</Text>

            {/* Họ và tên */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Ionicons name="person-outline" size={22} color="#555" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{t('full_name')}</Text>
                <TextInput
                  style={styles.menuInput}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('full_name')}
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            {/* Email */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Ionicons name="mail-outline" size={22} color="#555" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{t('email')}</Text>
                <Text style={styles.menuStatic}>{user?.email || '—'}</Text>
              </View>
            </View>

            {/* Đổi mật khẩu Section */}
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>{t('change_password')}</Text>

            {/* Mật khẩu hiện tại */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Ionicons name="lock-closed-outline" size={22} color="#555" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{t('current_password')}</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    style={[styles.menuInput, { flex: 1 }]}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    secureTextEntry={!showOld}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                    <Ionicons name={showOld ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Mật khẩu mới */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Ionicons name="shield-outline" size={22} color="#555" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{t('new_password')}</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    style={[styles.menuInput, { flex: 1 }]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNew}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                    <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Xác nhận mật khẩu mới */}
            <View style={[styles.menuItem, styles.menuItemBorder]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#555" style={styles.menuIcon} />
              <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{t('confirm_new_password')}</Text>
                <View style={styles.pwRow}>
                  <TextInput
                    style={[styles.menuInput, { flex: 1 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirm}
                    placeholder="••••••••"
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                    <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={20} color="#999" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>


          {/* Nút lưu duy nhất */}
          <View style={{ marginBottom: 25 }}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: hasChanges ? '#00CFA3' : '#E0E0E0' }]}
              onPress={handleSubmit}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <ActivityIndicator color="#ffffffff" />
              ) : (
                <Text style={styles.saveBtnText} numberOfLines={1} adjustsFontSizeToFit>{t('save_changes')}</Text>
              )}
            </TouchableOpacity>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>

      {showToast && (
        <Animated.View style={[
          styles.toastContainer,
          animatedToastStyle,
          {
            backgroundColor: toastType === 'error' ? '#EF4444' : (toastType === 'success' ? '#10B981' : '#3B82F6'),
            shadowColor: toastType === 'error' ? '#EF4444' : (toastType === 'success' ? '#10B981' : '#3B82F6'),
            top: vs(insets.top + vs(8)),
          }
        ]}>
          <View style={styles.toastIcon}>
            <Ionicons name={toastType === 'success' ? "checkmark" : (toastType === 'error' ? "close" : "information")} size={ms(20)} color="#FFF" />
          </View>
          <Text style={styles.toastText} numberOfLines={1} adjustsFontSizeToFit>{toastMsg}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#ffffffff',
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
    paddingTop: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarRing: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#000000ff',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
  },
  formContainer: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#1A1A1A',
    marginBottom: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60, // Fixed height for stability
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuIcon: {
    marginRight: 15,
    width: 24,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
    lineHeight: 18,
  },
  menuInput: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000ff',
    paddingVertical: 0,
    paddingLeft: 0,
    lineHeight: 20,
  },
  menuStatic: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000000ff',
    paddingVertical: 0,
    paddingLeft: 0,
    lineHeight: 20,
  },
  pwRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffffffff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
    flexShrink: 0,
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26, // Optimized for VN
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
