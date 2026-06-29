import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import Animated, { FadeInDown, FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../contexts/AuthContext';
import { auth, db } from '../../utils/firebaseConfig';
import { ms, s, vs } from '../../utils/responsive';

const AdminProfile = () => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState('');
  const [email, setEmail] = useState('');

  // Change Password States
  const [changePassModalVisible, setChangePassModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

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

  const scale = useSharedValue(1);

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const fetchUserData = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setName(data.name || data['tên'] || '');
        setPhone(data.phone || data['số điện thoại'] || '');
        setAvatar(data.avatar || '');
        setEmail(user.email || '');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user?.uid) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      
      // Update Auth Email if changed
      const currentUser = auth.currentUser;
      if (currentUser && email !== currentUser.email) {
        try {
          await verifyBeforeUpdateEmail(currentUser, email);
          triggerToast('Vui lòng kiểm tra email mới để xác nhận thay đổi', 'info');
        } catch (authError: any) {
          if (authError.code === 'auth/requires-recent-login') {
            triggerToast('Vui lòng đăng nhập lại để thay đổi email bảo mật', 'error');
            setLoading(false);
            return;
          }
          throw authError;
        }
      }

      await updateDoc(docRef, {
        name: name,
        phone: phone,
        avatar: avatar,
        email: email,
        updatedAt: new Date(),
      });
      setIsEditing(false);
      triggerToast('Đã cập nhật hồ sơ cá nhân', 'success');
    } catch (error) {
      console.error(error);
      triggerToast('Không thể cập nhật hồ sơ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace('/login');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      triggerToast('Vui lòng nhập đầy đủ thông tin', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }
    if (newPassword.length < 6) {
      triggerToast('Mật khẩu mới phải từ 6 ký tự trở lên', 'error');
      return;
    }

    try {
      setLoading(true);
      const userObj = auth.currentUser;
      if (!userObj || !userObj.email) return;

      const credential = EmailAuthProvider.credential(userObj.email, currentPassword);
      await reauthenticateWithCredential(userObj, credential);
      await updatePassword(userObj, newPassword);

      setChangePassModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerToast('Đã thay đổi mật khẩu', 'success');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        triggerToast('Mật khẩu hiện tại không chính xác', 'error');
      } else {
        triggerToast('Có lỗi xảy ra, vui lòng thử lại sau', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      triggerToast('Cần quyền truy cập thư viện ảnh để thay đổi avatar', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setAvatar(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressAvatar = () => {
    scale.value = withSpring(0.9, {}, () => {
      scale.value = withSpring(1);
    });
    if (isEditing) pickImage();
  };

  if (loading && !userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Premium Toast System */}
      {showToast && (
        <Animated.View style={[styles.toastContainer, animatedToastStyle, {
          backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
          shadowColor: toastType === 'success' ? '#10B981' : '#EF4444',
          top: toastTop,
        }]}>
          <View style={styles.toastIcon}>
            <Ionicons
              name={toastType === 'success' ? "checkmark" : toastType === 'error' ? "close" : "information-circle"}
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
          <Ionicons name="arrow-back" size={ms(26)} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Hồ sơ cá nhân</Text>
        <TouchableOpacity
          onPress={() => isEditing ? handleUpdateProfile() : setIsEditing(true)}
          style={styles.editBtn}
        >
          <Text style={styles.editBtnText}>{isEditing ? 'Lưu' : 'Sửa'}</Text>

        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: vs(40) }}>

          {/* Profile Header Card */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.profileCard}>
            <TouchableOpacity onPress={handlePressAvatar} activeOpacity={0.9}>
              <Animated.View style={[styles.avatarWrapper, animatedStyle]}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {(name || user?.email || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isEditing && (
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={ms(16)} color="#fff" />
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              {isEditing ? (
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  placeholder="Nhập họ tên..."
                  autoFocus
                />
              ) : (
                <Text style={styles.profileName} numberOfLines={1} adjustsFontSizeToFit>{name || 'Chưa đặt tên'}</Text>
              )}
            </View>
          </Animated.View>

          {/* Stats Section */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>Quản trị viên</Text>
            </View>
          </View>

          {/* Detail List */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.detailsList}>

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="mail-outline" size={ms(20)} color="#1e293b" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Nhập email..."
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.detailValue}>{email}</Text>
                )}
              </View>
            </View>

            <View style={styles.detailItem}>
              <View style={[styles.detailIcon, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="call-outline" size={ms(20)} color="#1e293b" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Số điện thoại</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Chưa có SĐT"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.detailValue}>{phone || 'Chưa cập nhật'}</Text>
                )}
              </View>
            </View>
          </Animated.View>

          {/* Actions Section */}
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Hành động</Text>
          </View>

          <View style={styles.actionList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setChangePassModalVisible(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="lock-closed-outline" size={ms(20)} color="#1e293b" />
              </View>
              <Text style={styles.actionText}>Đổi mật khẩu</Text>
              <Ionicons name="chevron-forward" size={ms(18)} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/(admin)/trash' as any)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f1f5f9' }]}>
                <Ionicons name="trash-outline" size={ms(20)} color="#1e293b" />
              </View>
              <Text style={styles.actionText}>Thùng rác hệ thống</Text>
              <Ionicons name="chevron-forward" size={ms(18)} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionItem, { marginTop: vs(20) }]}
              onPress={() => setLogoutModalVisible(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="power-outline" size={ms(20)} color="#ef4444" />
              </View>
              <Text style={[styles.actionText, { color: '#ef4444' }]}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Premium Logout Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.logoutOverlay}
          activeOpacity={1}
          onPress={() => setLogoutModalVisible(false)}
        >
          <View style={styles.logoutBox} onStartShouldSetResponder={() => true}>
            {/* Avatar / Icon */}
            <View style={styles.logoutAvatarCircle}>
              <Text style={styles.logoutAvatarInitial}>
                {(name || user?.email || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <Text style={styles.logoutTitle}>Tài khoản Quản trị viên</Text>
            <Text style={styles.logoutEmail} numberOfLines={1}>{user?.email || ''}</Text>

            <View style={styles.logoutDivider} />

            {/* Actions */}
            <TouchableOpacity
              style={styles.logoutConfirmBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutConfirmText}>Đăng xuất</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutCancelBtn}
              onPress={() => setLogoutModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.logoutCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={changePassModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setChangePassModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.passwordBox}>
            <Text style={styles.modalTitle}>Đổi mật khẩu</Text>

            <Text style={styles.modalInputLabel}>Mật khẩu hiện tại</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Nhập mật khẩu hiện tại..."
            />

            <Text style={styles.modalInputLabel}>Mật khẩu mới</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới..."
            />

            <Text style={styles.modalInputLabel}>Xác nhận mật khẩu mới</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Xác nhận lại mật khẩu..."
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ef4444' }]}
                onPress={() => setChangePassModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#3b82f6' }]}
                onPress={handleChangePassword}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Cập nhật</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: s(16),
    height: vs(50),
    backgroundColor: '#fff',
  },
  backBtn: { width: s(36), height: s(36), justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: ms(19), fontWeight: '400', color: '#1e293b' },
  editBtn: {
    paddingHorizontal: s(12),
    paddingVertical: vs(6),
    borderRadius: s(10),
  },
  editBtnText: { color: '#3b82f6', fontWeight: '400', fontSize: ms(15) },
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: vs(20),
    borderBottomLeftRadius: s(28),
    borderBottomRightRadius: s(28),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  avatarWrapper: {
    width: s(85),
    height: s(85),
    borderRadius: s(42.5),
    padding: s(4),
    backgroundColor: '#fff',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: s(42.5) },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: s(42.5),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: ms(40), fontWeight: '400', color: '#fff' },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3b82f6',
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: { marginTop: vs(12), alignItems: 'center', marginBottom: vs(10) },
  profileName: { fontSize: ms(18), fontWeight: '400', color: '#1e293b' },
  nameInput: {
    fontSize: ms(18),
    fontWeight: '400',
    color: '#1e293b',
    borderBottomWidth: 1,
    borderColor: '#3b82f6',
    paddingHorizontal: s(20),
    textAlign: 'center',
  },
  profileRole: { fontSize: ms(13), color: '#64748b', fontWeight: '400', marginTop: vs(4) },
  statsContainer: {
    flexDirection: 'row',
    marginTop: vs(-20),
    marginHorizontal: s(50),
    backgroundColor: '#fff',
    borderRadius: s(16),
    paddingVertical: vs(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 10,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: ms(14), fontWeight: '400', color: '#1e293b' },
  statLabel: { fontSize: ms(10), color: '#94a3b8', fontWeight: '400', marginTop: vs(1) },
  statDivider: { width: 1, height: '60%', backgroundColor: '#f1f5f9', alignSelf: 'center' },
  detailsList: { marginTop: vs(30), paddingHorizontal: s(20), gap: vs(10) },
  detailItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: s(14),
    borderRadius: s(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailIcon: {
    width: s(38),
    height: s(38),
    borderRadius: s(12),
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(16),
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: ms(12), color: '#94a3b8', fontWeight: '400' },
  detailValue: { fontSize: ms(15), color: '#1e293b', fontWeight: '400', marginTop: vs(2) },
  valueInput: { fontSize: ms(15), color: '#3b82f6', fontWeight: '400', marginTop: vs(2), height: vs(22), padding: 0 },
  sectionTitleContainer: { marginTop: vs(20), paddingHorizontal: s(24), marginBottom: vs(8) },
  sectionTitle: { fontSize: ms(15), fontWeight: '400', color: '#1e293b' },
  actionList: { paddingHorizontal: s(20), gap: vs(8) },
  actionItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: s(12),
    borderRadius: s(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actionIcon: {
    width: s(36),
    height: s(36),
    borderRadius: s(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: s(14),
  },
  actionText: { flex: 1, fontSize: ms(15), fontWeight: '400', color: '#475569' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: s(20),
  },
  passwordBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: s(24),
    padding: s(24),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: ms(20),
    fontWeight: '400',
    color: '#1e293b',
    marginBottom: vs(20),
    textAlign: 'center',
  },
  modalInputLabel: {
    fontSize: ms(13),
    fontWeight: '400',
    color: '#64748b',
    marginBottom: vs(6),
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: s(12),
    paddingHorizontal: s(16),
    paddingVertical: vs(12),
    fontSize: ms(14),
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: vs(16),
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: s(12),
    marginTop: vs(10),
  },
  modalBtn: {
    flex: 1,
    height: vs(48),
    borderRadius: s(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: ms(15),
    fontWeight: '400',
  },
  // Toast
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
  // Premium Logout Modal
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  logoutBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: ms(32),
    borderTopRightRadius: ms(32),
    paddingTop: vs(30),
    paddingBottom: vs(40),
    paddingHorizontal: s(28),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  logoutAvatarCircle: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: vs(14),
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  logoutAvatarInitial: {
    fontSize: ms(28),
    fontWeight: '400',
    color: '#fff',
  },
  logoutTitle: {
    fontSize: ms(12),
    fontWeight: '400',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: vs(4),
  },
  logoutEmail: {
    fontSize: ms(13),
    color: '#64748b',
    fontWeight: '400',
    marginBottom: vs(24),
  },
  logoutDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: vs(24),
  },
  logoutConfirmBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(10),
    backgroundColor: '#ef4444',
    paddingVertical: vs(16),
    borderRadius: s(18),
    marginBottom: vs(12),
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutConfirmText: {
    color: '#fff',
    fontSize: ms(16),
    fontWeight: '400',
  },
  logoutCancelBtn: {
    width: '100%',
    paddingVertical: vs(14),
    borderRadius: s(18),
    backgroundColor: '#0080ffff',
    alignItems: 'center',
  },
  logoutCancelText: {
    color: '#ffffffff',
    fontSize: ms(15),
    fontWeight: '400',
  },
});

export default AdminProfile;
