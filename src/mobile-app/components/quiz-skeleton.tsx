import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

export const QuizSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <Animated.View entering={FadeIn.duration(600)} style={styles.innerContainer}>
        {/* Header */}
        <View style={styles.header}>
          <ShimmerElement style={styles.headerTitle} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.cardHeader}>
              <ShimmerElement style={styles.avatar} />
              <View style={styles.nameContainer}>
                <ShimmerElement style={styles.barLong} />
                <ShimmerElement style={styles.barSmall} />
              </View>
            </View>
            <View style={styles.cardStats}>
              <ShimmerElement style={styles.statBox} />
              <View style={styles.statDivider} />
              <ShimmerElement style={styles.statBox} />
            </View>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <ShimmerElement style={styles.sectionTitle} />
            <ShimmerElement style={styles.sectionSubtitle} />
          </View>

          {/* Bento Grid */}
          <View style={styles.bentoContainer}>
            <View style={styles.bentoRow}>
              {/* Left Large Card */}
              <View style={{ flex: 1.2 }}>
                <View style={[styles.bentoCard, { height: 220 }]}>
                    <ShimmerElement style={styles.bentoTitle} />
                    <ShimmerElement style={styles.bentoImageLarge} />
                </View>
              </View>

              {/* Right Column */}
              <View style={{ flex: 1, gap: 15 }}>
                <View style={[styles.bentoCard, { height: 102.5 }]}>
                    <ShimmerElement style={styles.bentoTitleSmall} />
                    <ShimmerElement style={styles.bentoImageSmall} />
                </View>
                <View style={[styles.bentoCard, { height: 102.5 }]}>
                    <ShimmerElement style={styles.bentoTitleSmall} />
                    <ShimmerElement style={styles.bentoImageSmall} />
                </View>
              </View>
            </View>

            {/* Bottom Full Card */}
            <View style={[styles.bentoCardFull, { marginTop: 15 }]}>
                <View style={styles.bentoFullContent}>
                    <View style={{ flex: 1, gap: 8 }}>
                        <ShimmerElement style={styles.bentoTitle} />
                        <ShimmerElement style={styles.bentoSubtitleSmall} />
                    </View>
                    <ShimmerElement style={styles.bentoImageFull} />
                </View>
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  innerContainer: {
    flex: 1,
  },
  shimmer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  header: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    width: 120,
    height: 24,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 25,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  nameContainer: {
    flex: 1,
    gap: 8,
  },
  barLong: {
    width: '80%',
    height: 20,
  },
  barSmall: {
    width: '50%',
    height: 14,
  },
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 5,
  },
  statBox: {
    width: 60,
    height: 40,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#F1F5F9',
  },
  sectionHeader: {
    marginBottom: 20,
    gap: 8,
  },
  sectionTitle: {
    width: 100,
    height: 24,
  },
  sectionSubtitle: {
    width: 160,
    height: 14,
  },
  bentoContainer: {
    width: '100%',
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 15,
  },
  bentoCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  bentoTitle: {
    width: '80%',
    height: 18,
  },
  bentoTitleSmall: {
    width: '70%',
    height: 14,
  },
  bentoImageLarge: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  bentoImageSmall: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  bentoCardFull: {
    width: '100%',
    height: 180,
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'center',
  },
  bentoFullContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bentoSubtitleSmall: {
    width: '60%',
    height: 12,
  },
  bentoImageFull: {
    width: 110,
    height: 110,
    borderRadius: 20,
  },
});
