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
  const [imageError, setImageError] = useState(false); // Indica erro no carregamento da imagem
  const navigation = useNavigation<NavigationProps>();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
          console.error('Usuário não encontrado no AsyncStorage.');
          return;
        }

        const url = `https://cemear-b549eb196d7c.herokuapp.com/auth/user/${userId}`;
        console.log('Fetching user data from:', url);

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erro ao buscar dados do usuário: ${response.status}`);
        }

        const data = await response.json();
        console.log('Dados do usuário recebidos:', data);

        // Validação da URL do avatar
        const isValidUrl = await validateImageUrl(data.avatar);
        if (isValidUrl) {
          setAvatar(data.avatar || null);
        } else {
          console.error('A URL do avatar não é válida:', data.avatar);
          setImageError(true);
        }

        setUserName(data.usuario || 'Usuário');
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };

    loadUserData();
  }, []);

  const validateImageUrl = async (url: string): Promise<boolean> => {
    try {
      const response = await fetch(url, { method: 'HEAD' }); // Verifica se a URL é acessível
      return response.ok;
    } catch (error) {
      console.error('Erro ao validar a URL da imagem:', error);
      return false;
    }
  };

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
      <Image source={require('../../assets/logo.png')} style={styles.logo} />
      <TouchableOpacity style={styles.rightSection} onPress={handleLogout}>
        <Text style={styles.greetingText}>Olá, {userName}.</Text>
        {avatar && !imageError ? (
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
            onError={() => {
              console.error('Erro ao carregar imagem do avatar');
              setImageError(true); // Define o estado de erro
            }}
          />
        ) : (
          <Icon name="account-circle" size={50} color="black" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#0094FD',
    height: 67,
    paddingBottom: 10,
  },
  logo: {
    width: 150,
    height: 50,
    resizeMode: 'contain',
    position: 'absolute', // Fixa a posição da logo
    left: 5,
    bottom: 15
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto', // Empurra o conteúdo para a direita
  },
  greetingText: {
    fontSize: 15,
    marginRight: 10,
    color: '#333',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#0094FD',
  },
});


export default Navbar;
