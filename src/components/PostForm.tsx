import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Alert, Image } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

const PostForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [anexo, setAnexo] = useState<{ uri: string; name: string; type: string } | null>(null);

  const handlePostSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Erro", "Usuário não autenticado.");
        return;
      }
  
      const formData = new FormData();
      formData.append('titulo', titulo);
      formData.append('conteudo', conteudo);
      if (anexo) {
        formData.append('image', {
          uri: anexo.uri,
          type: anexo.type || 'image/jpeg',
          name: anexo.name || 'upload.jpg',
        } as any);
      }
  
      await axios.post(`${BASE_URL}/posts`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
  
      Alert.alert("Sucesso", "Post criado com sucesso!");
      
      onClose();
    } catch (error) {
      console.error("Erro ao criar post:", error);
      Alert.alert("Erro", "Não foi possível criar o post.");
    }
  };
  

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (result.type === 'success') {
        // Faz o cast de result para DocumentPickerSuccessResult
        const { uri, mimeType, name } = result as DocumentPicker.DocumentResult & { mimeType?: string };
        setAnexo({
          uri,
          name: name || 'anexo.jpg',
          type: mimeType || 'application/octet-stream',
        });
      } else {
        Alert.alert('Seleção de arquivo cancelada.');
      }
    } catch (error) {
      console.error('Erro ao selecionar anexo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o anexo.');
    }
  };

  const handleCameraCapture = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permissão necessária", "Permissão para acessar a câmera é necessária.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets?.length) {
        setAnexo({
          uri: result.assets[0].uri,
          name: 'photo.jpg',
          type: 'image/jpeg',
        });
      }
    } catch (error) {
      console.error("Erro ao capturar imagem:", error);
      Alert.alert("Erro", "Não foi possível capturar a imagem.");
    }
  };

  return (
    <View style={styles.modalContent}>
      <Text style={styles.title}>Adicionar Post</Text>
      <TextInput
        style={[styles.input, { width: '100%' }]}
        placeholder="Título *"
        value={titulo}
        onChangeText={setTitulo}
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Digite sua postagem... *"
        value={conteudo}
        onChangeText={setConteudo}
        multiline
      />
      {anexo && (
        <Image source={{ uri: anexo.uri }} style={styles.previewImage} />
      )}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.attachmentButton} onPress={handleFileSelect}>
          <Ionicons name="attach" size={24} color="#007BFF" />
          <Text style={styles.attachmentText}>{anexo ? anexo.name : 'Anexo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachmentButton} onPress={handleCameraCapture}>
          <Ionicons name="camera" size={24} color="#007BFF" />
          <Text style={styles.attachmentText}>Câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.submitButton} onPress={handlePostSubmit}>
          <Ionicons name="send" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007BFF',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    textAlignVertical: 'top',
    height: 150,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  attachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
  },
  attachmentText: {
    marginLeft: 5,
    color: '#007BFF',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007BFF',
    borderRadius: 50,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 8,
  },
  cancelButton: {
    marginTop: 20,
  },
  cancelText: {
    color: 'red',
    fontSize: 16,
  },
});

export default PostForm;
