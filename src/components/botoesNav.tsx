import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NavButtonProps = {
  iconName: keyof typeof Ionicons.glyphMap; // Corrige o tipo para aceitar apenas ícones válidos
  onPress: () => void;
};

const NavButton: React.FC<NavButtonProps> = ({ iconName, onPress }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Ionicons name={iconName} size={24} color="black" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default NavButton;
