import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View, Text } from 'react-native';

import { useLanguage } from '@/contexts/LanguageContext';
import { s, vs, ms } from '@/utils/responsive';

const { width } = Dimensions.get('window');

export function LoadingScreen({ onFinish, onReady }: { onFinish?: () => void, onReady?: () => void }) {
  const { t } = useLanguage();
  // Sử dụng Animated chuẩn của React Native
  const progress = useRef(new Animated.Value(0)).current;

  // Signal that we are ready and start progress
  useEffect(() => {
    if (onReady) onReady();

    // Chỉ giữ lại Animation cho thanh tiến trình
    Animated.timing(progress, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start(() => {
      // Khi thanh chạy đầy (4000ms), gọi hàm onFinish để chuyển trang ngay
      if (onFinish) onFinish();
    });
  }, []); // Remove onFinish from dependencies to only run once on mount

  const barWidth = s(width * 0.8 / (width / 393)); // Adjusted logic or just use s(330)
  // Actually, barWidth in original was width * 0.85. 
  // Let's use a fixed logic based on responsive width.
  const responsiveBarWidth = s(320); 

  return (
    <View style={styles.container}>
      <View style={styles.centerContent}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.title}>
          KhmerGo
        </Text>
        <Text 
          style={styles.subtitle}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {t('loading_preparing')}
        </Text>
      </View>

      <View style={styles.bottomContent}>
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, responsiveBarWidth]
                })
              }
            ]}
          />
        </View>
        <Text style={styles.loadingText}>
          {t('loading_text')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: vs(80),
    flex: 1,
    backgroundColor: '#FFFFFF', // Đổi sang màu trắng cố định
    justifyContent: 'space-between',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
  },
  logoContainer: {
    marginBottom: vs(20), // Tăng khoảng cách một chút khi không có nền
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: s(180),
    height: s(180),
  },
  title: {
    fontSize: ms(42),
    fontWeight: '700',
    color: '#000000', // Chuyển sang màu đen
    marginBottom: vs(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: ms(16),
    color: '#000000', // Chuyển sang màu đen
    fontWeight: '400',
    textAlign: 'center',
  },
  bottomContent: {
    alignItems: 'center',
    paddingHorizontal: s(40),
  },
  progressBarContainer: {
    width: s(320),
    height: vs(6),
    backgroundColor: 'rgba(0, 0, 0, 0.1)', // Đổi sang màu nền xám nhẹ
    borderRadius: vs(3),
    overflow: 'hidden',
    marginBottom: vs(15),
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFCC00', // Đảm bảo màu vàng
  },
  loadingText: {
    fontSize: ms(14),
    color: '#000000', // Chuyển sang màu đen
    fontWeight: '400',
  },
});
