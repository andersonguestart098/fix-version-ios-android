import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

const Navbar: React.FC = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const userNameStored = await AsyncStorage.getItem('userName'); // Assumindo que o nome do usuário está salvo no AsyncStorage
        
        if (!userId) {
          console.error('Usuário não encontrado no AsyncStorage.');
          return;
        }

        if (userNameStored) {
          setUserName(userNameStored);
        }

        const response = await fetch(`https://cemear-b549eb196d7c.herokuapp.com/user/${userId}/avatar`);
        if (!response.ok) {
          throw new Error('Erro ao buscar avatar do usuário.');
        }

        const data = await response.json();
        setAvatar(data.avatar);
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'userId', 'tipoUsuario', 'avatar', 'userName']);
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
      {/* Logo no lado esquerdo */}
      <Image source={require('../../assets/logo.png')} style={styles.logo} />

      {/* Saudação e Avatar do lado direito */}
      <TouchableOpacity style={styles.rightSection} onPress={handleLogout}>
        <Text style={styles.greetingText}>Olá, {userName || 'Usuário'}</Text>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <Icon name="account-circle" size={28} color="black" />
        )}
      </TouchableOpacity>
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
    height: 100, // Ajustado para mais espaço vertical
    paddingTop: 10,
  },
  logo: {
    width: 150, // Aumentado para maior visibilidade
    height: 50,  
    resizeMode: 'contain',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18, // Texto maior para combinar com o avatar maior
    marginRight: 10,
    color: '#333',
  },
  avatar: {
    width: 50, // Avatar maior
    height: 50, 
    borderRadius: 25, // Proporcional ao novo tamanho para manter a forma circular
    borderWidth: 2, // Borda mais visível
    borderColor: '#0094FD', // Azul claro para destacar
  },
});



export default Navbar;
