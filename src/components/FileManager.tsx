import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import * as IntentLauncher from "expo-intent-launcher";
import AsyncStorage from "@react-native-async-storage/async-storage"; // 🔥 Importa AsyncStorage

const BASE_URL = "https://cemear-b549eb196d7c.herokuapp.com";

interface FileType {
  id: string;
  originalname: string;
  mimetype: string;
  folder: string;
}

const FileManager: React.FC = () => {
  const [files, setFiles] = useState<Record<string, FileType[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>("");
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null); // 🔥 Estado para tipo de usuário

  useEffect(() => {
    fetchFiles();
    checkUserType();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${BASE_URL}/files`);

      if (response.data && typeof response.data === "object") {
        setFiles(response.data);
      } else {
        throw new Error("Resposta inesperada do servidor.");
      }
    } catch (error) {
      console.error("Erro ao buscar arquivos:", error);
      Alert.alert("Erro", "Não foi possível carregar os arquivos.");
    } finally {
      setLoading(false);
    }
  };

  const checkUserType = async () => {
    const tipo = await AsyncStorage.getItem("tipoUsuario");
    setTipoUsuario(tipo);
  };

  const handleUpload = async () => {
    const targetFolder = selectedFolder || folderName.trim();

    if (!targetFolder) {
      Alert.alert("Erro", "Informe um nome para a pasta.");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/jpg", "image/png"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const file = result.assets[0];
        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);
        formData.append("folder", targetFolder);

        setUploading(true);
        await axios.post(`${BASE_URL}/files/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
        setFolderName(""); // Limpa o nome da pasta após o upload
        fetchFiles(); // Atualiza a lista de arquivos
      }
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      Alert.alert("Erro", "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileType) => {
    if (!file || !file.id) {
      Alert.alert("Erro", "Arquivo não encontrado. Verifique o ID.");
      return;
    }

    try {
      const downloadUrl = `${BASE_URL}/files/download/${file.id}`;
      const fileUri = `${FileSystem.documentDirectory}${file.originalname}`;

      const response = await axios.get(downloadUrl, { responseType: "arraybuffer" });
      const base64Data = Buffer.from(response.data, "binary").toString("base64");

      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      Alert.alert("Sucesso", `Arquivo salvo em: ${fileUri}`);

      if (file.mimetype.includes("pdf")) {
        if (Platform.OS === "android") {
          const uri = await FileSystem.getContentUriAsync(fileUri);
          IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
            data: uri,
            flags: 1,
          });
        } else {
          Linking.openURL(fileUri);
        }
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: file.mimetype,
          dialogTitle: `Compartilhar ${file.originalname}`,
        });
      } else {
        Alert.alert("Sucesso", `Arquivo baixado e salvo em: ${fileUri}`);
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo:", error);
      Alert.alert("Erro", "Não foi possível baixar o arquivo.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {selectedFolder ? selectedFolder : "Gerenciador de Arquivos"}
      </Text>

      {/* ✅ Criar pastas (visível apenas para admin) */}
      {!selectedFolder && tipoUsuario === "admin" && (
        <View style={styles.uploadContainer}>
          <TextInput
            style={styles.input}
            placeholder="Nome da Pasta"
            value={folderName}
            onChangeText={setFolderName}
          />
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.uploadButtonText}>Criar Pasta</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* ✅ Upload dentro de uma pasta específica (visível apenas para admin) */}
      {selectedFolder && tipoUsuario === "admin" && (
        <View style={styles.uploadContainer}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.uploadButtonText}>Adicionar Arquivo</Text>}
          </TouchableOpacity>
        </View>
      )}

      {selectedFolder ? (
        <>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedFolder(null)}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          <FlatList
            data={files[selectedFolder]}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.fileItem} onPress={() => handleDownload(item)}>
                <Ionicons name="document-text" size={24} color="#00AEEF" />
                <Text style={styles.fileName}>{item.originalname}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id.toString()}
          />
        </>
      ) : (
        <FlatList
          data={Object.keys(files)}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.folderItem} onPress={() => setSelectedFolder(item)}>
              <Ionicons name="folder" size={24} color="#FFA500" />
              <Text style={styles.folderText}>{item}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#F5F5F5",
  },
  title: { 
    fontSize: 28, 
    fontWeight: "700", 
    padding: 16, 
    color: "#000",
  },
  uploadContainer: { 
    flexDirection: "row", 
    padding: 16, 
    justifyContent: "center", 
    alignItems: "center",
  },
  input: { 
    flex: 1, 
    borderBottomWidth: 1, 
    borderColor: "#ccc", 
    marginRight: 10, 
    padding: 5, 
    fontSize: 16,
  },
  uploadButton: { 
    backgroundColor: "#00AEEF", 
    paddingVertical: 10, 
    paddingHorizontal: 20, 
    borderRadius: 5, 
    alignItems: "center", 
    justifyContent: "center",
  },
  uploadButtonDisabled: { 
    backgroundColor: "#A0C4FF", 
  },
  uploadButtonText: { 
    color: "#FFF", 
    fontSize: 16, 
    fontWeight: "bold",
  },
  backButton: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: 10, 
    marginLeft: 10, 
  },
  backButtonText: { 
    fontSize: 18, 
    marginLeft: 10, 
    color: "#007AFF", 
    fontWeight: "bold",
  },
  fileItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FFF", 
    padding: 12, 
    marginHorizontal: 16, 
    marginVertical: 4, 
    borderRadius: 10, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2,
  },
  fileName: { 
    flex: 1, 
    fontSize: 16, 
    color: "#000", 
    marginLeft: 10, 
    fontWeight: "500",
  },
  folderItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#FFF", 
    padding: 14, 
    marginHorizontal: 16, 
    marginVertical: 6, 
    borderRadius: 10, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
    elevation: 2,
  },
  folderText: { 
    fontSize: 18, 
    marginLeft: 10, 
    fontWeight: "500", 
    color: "#333",
  },
});


export default FileManager;
