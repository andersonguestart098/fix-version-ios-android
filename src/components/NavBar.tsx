import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    const loadAvatarFromDB = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          console.error('Usuário não encontrado no AsyncStorage.');
          return;
        }

        // Fazer requisição ao backend para obter o avatar do usuário
        const response = await fetch(`https://cemear-b549eb196d7c.herokuapp.com/user/${userId}/avatar`);
        if (!response.ok) {
          throw new Error('Erro ao buscar avatar do usuário.');
        }

        const data = await response.json();
        setAvatar(data.avatar); // Atualiza o estado com a URL do avatar
      } catch (error) {
        console.error('Erro ao carregar avatar do banco:', error);
      }
    };

    loadAvatarFromDB();
  }, []);

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'userId', 'tipoUsuario', 'avatar']);
      Alert.alert('Logout', 'Você saiu com sucesso.');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível realizar o logout.');
      console.error('Erro no logout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggleMenu}>
        <Icon name="menu" size={28} color="black" />
      </TouchableOpacity>

      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      <TouchableOpacity>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <Icon name="account-circle" size={28} color="black" />
        )}
      </TouchableOpacity>

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
              <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
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
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    top: 90,
    left: 20,
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
