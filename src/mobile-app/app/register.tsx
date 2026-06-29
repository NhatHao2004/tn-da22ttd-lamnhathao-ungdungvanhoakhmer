import { useLanguage } from '@/contexts/LanguageContext';
import { auth, db } from '@/utils/firebaseConfig';
import { ms, s, vs } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import Animated, {
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function RegisterScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const toastY = useSharedValue(-120);

  const triggerToast = React.useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setShowToast(true);
    toastY.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      toastY.value = withTiming(-120, { duration: 400 });
      setTimeout(() => setShowToast(false), 400);
    }, 3000);
  }, [toastY]);

  const animatedToastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastY.value }],
    opacity: interpolate(toastY.value, [-100, 0], [0, 1], 'clamp'),
  }));

  const toggleInterest = React.useCallback((interest: string) => {
    setSelectedInterests(prev => prev.includes(interest) ? [] : [interest]);
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setAvatarUri(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleRegister = React.useCallback(async () => {
    if (!name || !email || !password || !repeatPassword) {
      triggerToast(t('error_required'), 'error');
      return;
    }

    if (password !== repeatPassword) {
      triggerToast(t('pass_mismatch'), 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      triggerToast(t('pass_fields_required'), 'error');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      const avatarUrl = avatarUri
        ? avatarUri
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00CFA3&color=fff&size=128`;

      const userRef = doc(db, 'users', user.uid);
      const userData = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        avatar: avatarUrl,
        points: 0,
        interests: selectedInterests,
        createdAt: new Date().toISOString(),
      };

      await setDoc(userRef, userData);

      try {
        await setDoc(doc(db, 'logs', `reg_${user.uid}`), {
          title: 'Người dùng mới đăng ký',
          desc: `Người dùng ${name.trim()} (${email.trim().toLowerCase()}) vừa tạo tài khoản thành công.`,
          type: 'users',
          timestamp: new Date()
        });
      } catch (logError) {
        console.error("Lỗi khi ghi log đăng ký:", logError);
      }

      triggerToast(t('register_success'), 'success');
      setTimeout(() => router.replace('/(tabs)'), 2000);
    } catch (error: any) {
      let msg = t('update_failed');
      if (error.code === 'auth/email-already-in-use') {
        msg = t('email_in_use');
      }
      triggerToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, repeatPassword, avatarUri, selectedInterests, t, triggerToast, router]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.fixedHeader}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.titleText}>{t('register_title')}</Text>
          <TouchableOpacity onPress={() => router.replace('/login')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.loginLinkText}>{t('login_title')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (isKeyboardVisible ? (SCREEN_HEIGHT > 800 ? vs(400) : vs(25)) : vs(25)) }]}
      >
        <View style={styles.card}>
          {/* Avatar Picker */}
          <View style={styles.avatarWrapper}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
              <View style={styles.avatarInner}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} contentFit="cover" transition={300} />
                ) : (
                  <LinearGradient
                    colors={['#F1F5F9', '#E2E8F0']}
                    style={styles.avatarPlaceholder}
                  >
                    <Ionicons name="camera" size={ms(32)} color="#94A3B8" />
                  </LinearGradient>
                )}
              </View>
              <View style={styles.addBtnSmall}>
                <Ionicons name="add" size={ms(16)} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{t('avatar_label')}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('fullname_label') || 'Họ và tên'}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={ms(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('fullname_placeholder')}
                  placeholderTextColor="#CBD5E1"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={ms(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="#CBD5E1"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('password_label')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={ms(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#CBD5E1"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={ms(20)} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{t('confirm_password_label')}</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={ms(20)} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#CBD5E1"
                  value={repeatPassword}
                  onChangeText={setRepeatPassword}
                  secureTextEntry={!showRepeatPassword}
                />
                <TouchableOpacity onPress={() => setShowRepeatPassword(!showRepeatPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name={showRepeatPassword ? "eye-off-outline" : "eye-outline"} size={ms(20)} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Interest Selection - Asymmetric Layout */}
          <View style={styles.interestsBox}>
            <Text style={styles.interestsHeader}>{t('select_interests_title') || 'Bạn quan tâm đến gì nào'}</Text>
            <View style={styles.interestsAsymmetricGrid}>
              {/* Left Column: Big Card */}
              <View style={styles.leftCol}>
                {[
                  { id: 'Chùa', label: t('temple'), img: require('@/assets/images/pagoda.jpg'), color: '#F59E0B', bg: '#FFFFFF' }
                ].map((item) => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.interestCardBig,
                        { backgroundColor: item.bg, borderColor: isSelected ? '#3B82F6' : '#F1F5F9' }
                      ]}
                      onPress={() => toggleInterest(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.interestCardTextBig, { color: isSelected ? '#1E293B' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit>
                        {item.label.replace('\n', ' ')}
                      </Text>
                      <Image
                        source={item.img}
                        style={styles.interestImgBig}
                        contentFit="contain"
                        transition={300}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Right Column: Two Small Cards */}
              <View style={styles.rightCol}>
                {[
                  { id: 'Văn hóa', label: t('culture'), img: require('@/assets/images/festival.jpg'), color: '#8B5CF6', bg: '#FFFFFF' },
                  { id: 'Ẩm thực', label: t('food'), img: require('@/assets/images/amthuc.jpg'), color: '#EF4444', bg: '#FFFFFF' }
                ].map((item) => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.interestCardSmall,
                        { backgroundColor: item.bg, borderColor: isSelected ? '#3B82F6' : '#F1F5F9' }
                      ]}
                      onPress={() => toggleInterest(item.id)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.smallCardContent}>
                        <Image
                          source={item.img}
                          style={styles.interestImgSmall}
                          contentFit="contain"
                          transition={300}
                        />
                        <Text style={[styles.interestCardTextSmall, { color: isSelected ? '#1E293B' : '#64748B' }]} numberOfLines={1} adjustsFontSizeToFit>
                          {item.label.replace('\n', ' ')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.mainBtn}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>
                  {t('register_account').toUpperCase()}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </ScrollView>



      {/* Premium Toast System */}
      {showToast && (
        <Animated.View
          style={[
            styles.toastContainer,
            animatedToastStyle,
            {
              backgroundColor: toastType === 'success' ? '#10B981' : '#EF4444',
              shadowColor: toastType === 'success' ? '#10B981' : '#EF4444',
              top: insets.top + vs(8),
            }
          ]}
        >
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  fixedHeader: { paddingHorizontal: s(20), paddingTop: vs(20), paddingBottom: vs(10), backgroundColor: '#FFF' },
  scrollContent: { paddingHorizontal: s(20), paddingTop: vs(10), backgroundColor: '#FFF' },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', minHeight: vs(50) },
  titleText: { fontSize: ms(32), fontWeight: '400', color: '#1e293b', letterSpacing: -1 },
  loginLinkText: { fontSize: ms(16), color: '#64748B', fontWeight: '400', marginBottom: vs(4) },

  card: { backgroundColor: 'transparent', padding: s(10) },

  avatarWrapper: { alignItems: 'center', marginBottom: vs(25) },
  avatarContainer: { width: s(100), height: s(100), padding: s(4), borderRadius: s(50), backgroundColor: '#FFF', borderWidth: 2, borderColor: '#F1F5F9', position: 'relative' },
  avatarInner: { flex: 1, borderRadius: s(46), overflow: 'hidden' },
  avatarImg: { width: '100%', height: '100%', borderRadius: s(46) },
  avatarPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtnSmall: { position: 'absolute', bottom: 0, right: 0, width: s(28), height: s(28), borderRadius: s(14), backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFF' },
  avatarHint: { marginTop: vs(10), fontSize: ms(13), color: '#94A3B8', fontWeight: '400' },

  form: { gap: vs(18), marginBottom: vs(12) },
  inputGroup: { gap: vs(8) },
  inputLabel: { fontSize: ms(14), fontWeight: '400', color: '#475569', marginLeft: s(4) },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: s(16), paddingHorizontal: s(16), height: vs(56), borderWidth: 1, borderColor: '#F1F5F9' },
  inputIcon: { marginRight: s(12) },
  input: { flex: 1, fontSize: ms(16), color: '#1e293b', fontWeight: '400', paddingVertical: vs(10) },

  interestsBox: { marginBottom: vs(30) },
  interestsHeader: { fontSize: ms(15), fontWeight: '400', color: '#475569', marginBottom: vs(15), marginLeft: s(4) },
  interestsAsymmetricGrid: {
    flexDirection: 'row',
    gap: s(12),
    height: vs(200),
  },
  leftCol: {
    flex: 1.2,
  },
  rightCol: {
    flex: 1,
    gap: vs(12),
  },
  interestCardBig: {
    flex: 1,
    borderRadius: s(24),
    borderWidth: 2,
    padding: s(16),
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  interestCardSmall: {
    flex: 1,
    borderRadius: s(20),
    borderWidth: 2,
    padding: s(10),
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  smallCardContent: {
    alignItems: 'center',
    gap: vs(6),
  },
  interestImgBig: {
    width: '100%',
    height: vs(110),
    alignSelf: 'center',
  },
  interestImgSmall: {
    width: s(44),
    height: s(44),
    alignSelf: 'center',
  },
  interestCardTextBig: {
    fontSize: ms(18),
    fontWeight: '400',
    textAlign: 'center',
  },
  interestCardTextSmall: {
    fontSize: ms(13),
    fontWeight: '400',
    textAlign: 'center',
  },

  mainBtn: { borderRadius: s(18), overflow: 'hidden', elevation: 4, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  btnGradient: { height: vs(60), justifyContent: 'center', alignItems: 'center' },
  btnText: { fontSize: ms(16), fontWeight: '400', color: '#FFF', letterSpacing: 1 },

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
