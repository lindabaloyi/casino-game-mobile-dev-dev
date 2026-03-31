/**
 * ModalSurface - Unified modal container with theme support
 * 
 * Provides consistent layout, backdrop, animations, and theming.
 * Each theme changes the accent colors, title colors, and action button styles.
 * 
 * Usage:
 *   <ModalSurface visible={visible} theme="red" title="Capture or Steal" onClose={onClose}>
 *     {children}
 *   </ModalSurface>
 */

import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MODAL_COLORS, MODAL_DIMENSIONS, MODAL_Z_INDEX } from './ModalDesignSystem';

// Theme configuration
type ThemeType = 'green' | 'red' | 'gold' | 'purple';

interface ThemeConfig {
  background: string;
  border: string;
  titleColor: string;
  buttonPrimary: string;
  buttonPrimaryBorder: string;
  buttonSecondary: string;
  buttonSecondaryBorder: string;
  accentBar: string;
}

const THEMES: Record<ThemeType, ThemeConfig> = {
  green: {
    background: MODAL_COLORS.background,
    border: MODAL_COLORS.border,
    titleColor: MODAL_COLORS.titleGold,
    buttonPrimary: '#28a745',
    buttonPrimaryBorder: '#34d058',
    buttonSecondary: '#7c3aed',
    buttonSecondaryBorder: '#a78bfa',
    accentBar: '#28a745',
  },
  red: {
    background: '#4a1a1a',
    border: '#dc2626',
    titleColor: '#fbbf24',
    buttonPrimary: '#dc2626',
    buttonPrimaryBorder: '#f87171',
    buttonSecondary: '#059669',
    buttonSecondaryBorder: '#34d058',
    accentBar: '#dc2626',
  },
  gold: {
    background: '#1a472a',
    border: '#f59e0b',
    titleColor: '#fbbf24',
    buttonPrimary: '#f59e0b',
    buttonPrimaryBorder: '#fbbf24',
    buttonSecondary: '#7c3aed',
    buttonSecondaryBorder: '#a78bfa',
    accentBar: '#f59e0b',
  },
  purple: {
    background: '#2d1b4e',
    border: '#7c3aed',
    titleColor: '#fbbf24',
    buttonPrimary: '#7c3aed',
    buttonPrimaryBorder: '#a78bfa',
    buttonSecondary: '#059669',
    buttonSecondaryBorder: '#34d058',
    accentBar: '#7c3aed',
  },
};

interface ModalSurfaceProps {
  visible: boolean;
  theme?: ThemeType;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
  showCloseButton?: boolean;
  closeOnOverlay?: boolean;
}

export function ModalSurface({
  visible,
  theme = 'green',
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  closeOnOverlay = true,
}: ModalSurfaceProps) {
  if (!visible) return null;

  const themeConfig = THEMES[theme];
  
  const widthMap = {
    sm: 260,
    md: 320,
    lg: 380,
  };
  const maxW = widthMap[maxWidth];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Click outside to close */}
        {closeOnOverlay && onClose && (
          <TouchableOpacity
            style={styles.clickOutside}
            activeOpacity={1}
            onPress={onClose}
          />
        )}
        
        {/* Modal content */}
        <View 
          style={[
            styles.modalContent,
            { 
              backgroundColor: themeConfig.background,
              borderColor: themeConfig.border,
              maxWidth: maxW,
            }
          ]}
        >
          {/* Accent bar */}
          <View 
            style={[
              styles.accentBar,
              { backgroundColor: themeConfig.accentBar }
            ]} 
          />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: themeConfig.titleColor }]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle}>{subtitle}</Text>
            )}
            {showCloseButton && onClose && (
              <TouchableOpacity 
                onPress={onClose}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Body */}
          <View style={styles.body}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action Buttons (optional helper components)
// ─────────────────────────────────────────────────────────────────────────────

interface ModalActionButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'cancel';
}

export function ModalActionButton({
  onPress,
  children,
  variant = 'primary',
}: ModalActionButtonProps) {
  const baseStyle = styles.actionButton;
  const textStyle = styles.actionButtonText;
  
  // Variants handled by the parent theme - this is a placeholder
  // In practice, pass theme to ModalSurface and use its button styles
  
  return (
    <TouchableOpacity style={baseStyle} onPress={onPress}>
      <Text style={textStyle}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: MODAL_COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: MODAL_Z_INDEX.overlay,
  },
  clickOutside: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: MODAL_DIMENSIONS.width,
    minWidth: MODAL_DIMENSIONS.minWidth,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    zIndex: MODAL_Z_INDEX.content,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    color: MODAL_COLORS.textSecondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  body: {
    padding: 16,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default ModalSurface;