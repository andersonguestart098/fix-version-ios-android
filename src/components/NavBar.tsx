import React, { useState } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Modal, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const Navbar: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  return (
    <View style={styles.container}>
      {/* Ícone de menu à esquerda */}
      <TouchableOpacity onPress={toggleMenu}>
        <Icon name="menu" size={28} color="black" />
      </TouchableOpacity>

      {/* Logo centralizada */}
      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      {/* Ícone de notificações à direita */}
      <TouchableOpacity>
        <Icon name="bell-outline" size={28} color="black" />
      </TouchableOpacity>

      {/* Menu Dropdown Modal */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Opção 1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Opção 2</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem}>
                <Text style={styles.menuText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    height: 80,
    paddingTop: 10,
  },
  logo: {
    width: 135,
    height: 40,
    resizeMode: 'contain',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
  },
  dropdownMenu: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    width: 150,
    position: 'absolute',
    top: 90, // Abaixo do Navbar
    left: 20, // Alinha com o botão de menu
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});

export default Navbar;
