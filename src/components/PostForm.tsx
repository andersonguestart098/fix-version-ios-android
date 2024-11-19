import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, Alert, Dimensions, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface PostFormProps {
  onClose: () => void;
}

const PostForm: React.FC<PostFormProps> = ({ onClose }) => {
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [anexo, setAnexo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Estado para controle do loader

  const { width } = Dimensions.get('window');

  const handleImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permissão necessária", "Por favor, conceda permissão para acessar a galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled && result.assets?.length) {
      setAnexo(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!titulo || !conteudo) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true); // Inicia o loader

    setTimeout(() => {
      setLoading(false); // Para o loader após envio simulado
      Alert.alert("Sucesso", "Post enviado com sucesso!");
      onClose(); // Fecha o modal após envio
    }, 2000); // Simula o tempo de envio
  };

  return (
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback>
          <View style={[styles.container, { width: width * 0.9 }]}>
            <Text style={styles.title}>Novo Post</Text>
            <TextInput
              style={styles.input}
              placeholder="Título"
              value={titulo}
              onChangeText={setTitulo}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Conteúdo"
              value={conteudo}
              onChangeText={setConteudo}
              multiline
            />
            {anexo && <Image source={{ uri: anexo }} style={styles.imagePreview} />}
            <TouchableOpacity style={styles.button} onPress={handleImagePicker}>
              <Text style={styles.buttonText}>Anexar Imagem</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
              {loading ? (
                <ActivityIndicator size="small" color="#FFF" /> // Loader no botão
              ) : (
                <Text style={[styles.buttonText, { color: 'white' }]}>Enviar</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1, // Garante que o overlay preencha todo o espaço disponível
    width: '100%', // Assegura que cobre toda a largura da tela
    height: '100%', // Assegura que cobre toda a altura da tela
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fundo preto transparente
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#007AFF',
  },
  input: {
    width: '100%',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#E0E0E0',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 10,
  },
});


export default PostForm;
