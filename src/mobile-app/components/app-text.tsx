import React from 'react';
import { ThemedText, type ThemedTextProps } from './themed-text';

/**
 * AppText Component
 * Standardized typography component for the KhmerGo application.
 * Default fontWeight is set to '400' (normal) globally.
 */
export const AppText = (props: ThemedTextProps) => {
  return (
    <ThemedText 
      {...props} 
      style={[{ fontWeight: '400' }, props.style]} 
    />
  );
};
