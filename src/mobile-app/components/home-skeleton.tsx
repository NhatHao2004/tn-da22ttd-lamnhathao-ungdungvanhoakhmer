import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  withSequence,
  FadeIn
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const ShimmerElement = ({ style }: { style?: any }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.shimmer, style, animatedStyle]} />;
};

export const HomeSkeleton = () => {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={styles.container}>
      {/* Real-style Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <ShimmerElement style={styles.avatar} />
          <View style={styles.welcomeText}>
            <ShimmerElement style={styles.barSmall} />
            <ShimmerElement style={styles.barMedium} />
          </View>
        </View>
        <ShimmerElement style={styles.notificationBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Real-style Promo Banner */}
        <ShimmerElement style={styles.promoBanner} />

        {/* Categories Section */}
        <View style={styles.sectionHeader}>
          <ShimmerElement style={styles.sectionTitle} />
        </View>
        
        <View style={styles.gridContainer}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.gridItem}>
              <View style={styles.categoryCard}>
                <ShimmerElement style={styles.categoryIcon} />
                <ShimmerElement style={styles.categoryLabel} />
              </View>
            </View>
          ))}
        </View>

        {/* Suggestions Section */}
        <View style={styles.sectionHeader}>
          <ShimmerElement style={[styles.sectionTitle, { width: '60%' }]} />
          <ShimmerElement style={styles.viewAll} />
        </View>

        {/* Featured Card Placeholders */}
        {[1, 2].map((i) => (
          <View key={i} style={styles.featuredCard}>
            <ShimmerElement style={styles.cardImage} />
            <View style={styles.cardContent}>
              <ShimmerElement style={styles.cardTitle} />
              <ShimmerElement style={styles.cardFooter} />
            </View>
          </View>
        ))}
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  welcomeText: {
    gap: 6,
  },
  barSmall: {
    width: 80,
    height: 12,
  },
  barMedium: {
    width: 140,
    height: 18,
  },
  notificationBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  shimmer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  promoBanner: {
    marginHorizontal: 24,
    height: 170,
    borderRadius: 28,
    marginBottom: 7,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 5,
    marginBottom: 10,
  },
  sectionTitle: {
    width: '50%',
    height: 24,
  },
  viewAll: {
    width: 50,
    height: 14,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  gridItem: {
    width: '25%',
    padding: 5,
  },
  categoryCard: {
    height: 115,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginBottom: 8,
  },
  categoryLabel: {
    width: '80%',
    height: 10,
  },
  featuredCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 0,
  },
  cardContent: {
    padding: 18,
    gap: 12,
  },
  cardTitle: {
    width: '70%',
    height: 20,
  },
  cardFooter: {
    width: '40%',
    height: 14,
  },
});
