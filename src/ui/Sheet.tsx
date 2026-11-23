import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { UI } from '../game/palette';

/** Alttan açılan basit pencere. */
export default function Sheet({ visible, onClose, children }: { visible: boolean; onClose(): void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>{children}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,10,20,0.6)' },
  sheet: { backgroundColor: UI.panel, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, alignItems: 'center', gap: 4 },
});
