import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Base design dimensions (Standard Screen: iPhone 14/15 or high-end Android)
const BASE_WIDTH = 393;
const BASE_HEIGHT = 852;

/**
 * Horizontal scale - based on screen width
 */
export const s = (size: number): number => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

/**
 * Vertical scale - based on screen height
 */
export const vs = (size: number): number => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

/**
 * Moderate scale - softer scaling
 * Use for: fontSize, lineHeight, icons
 */
export const ms = (size: number, factor: number = 0.5): number => {
  return size + (s(size) - size) * factor;
};

/**
 * Moderate Vertical scale
 */
export const mvs = (size: number, factor: number = 0.5): number => {
  return size + (vs(size) - size) * factor;
};

// Export dimensions for use in components
export { SCREEN_WIDTH, SCREEN_HEIGHT };

// Tool for pixel density adjustment
export const normalize = (size: number) => {
  const newSize = size * (SCREEN_WIDTH / BASE_WIDTH);
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.getFontScale() * newSize);
  } else {
    return Math.round(PixelRatio.getFontScale() * newSize) - 2;
  }
};
