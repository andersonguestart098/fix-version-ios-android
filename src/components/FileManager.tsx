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
  TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import axios from "axios";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FileType {
  id: string;
  originalname: string;
  mimetype: string;
  folder?: string;
}

const FileManager: React.FC = () => {
  const [folders, setFolders] = useState<string[]>([]); // Lista de pastas
  const [filesInFolder, setFilesInFolder] = useState<FileType[]>([]); // Arquivos da pasta selecionada
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [folderName, setFolderName] = useState<string>("");
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);

  useEffect(() => {
    fetchFolders();
    checkUserType();
  }, []);

  // Função para sanitizar nomes de arquivos
  const sanitizeFilename = (filename: string): string => {
    return filename
      .normalize("NFD") // Decompõe caracteres acentuados (ex: "á" -> "a" + "´")
      .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
      .replace(/[^a-zA-Z0-9. -]/g, "_"); // Substitui caracteres inválidos por "_"
  };

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`https://cemear-b549eb196d7c.herokuapp.com/folders`);

      if (Array.isArray(response.data)) {
        // Filtra pastas indesejadas como "message" e "data"
        const filteredFolders = response.data.filter(
          (folder: string) => folder !== "message" && folder !== "data"
        );
        setFolders(filteredFolders);
      } else {
        console.warn("Resposta inesperada do servidor, inicializando com array vazio.");
        setFolders([]);
      }
    } catch (error) {
      console.error("Erro ao buscar pastas:", error);
      Alert.alert("Erro", "Não foi possível carregar as pastas.");
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilesInFolder = async (folderName: string) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `https://cemear-b549eb196d7c.herokuapp.com/folders/${folderName}`
      );

      if (Array.isArray(response.data)) {
        setFilesInFolder(response.data);
      } else {
        console.warn("Resposta inesperada do servidor, inicializando com array vazio.");
        setFilesInFolder([]);
      }
    } catch (error) {
      console.error(`Erro ao buscar arquivos da pasta ${folderName}:`, error);
      Alert.alert("Erro", `Não foi possível carregar os arquivos da pasta ${folderName}.`);
      setFilesInFolder([]);
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
        // Sanitizar o nome do arquivo antes de enviar
        const sanitizedName = sanitizeFilename(file.name);

        const formData = new FormData();
        formData.append("file", {
          uri: file.uri,
          name: sanitizedName, // Usa o nome sanitizado
          type: file.mimeType || "application/octet-stream",
        } as any);
        formData.append("folder", targetFolder);

        setUploading(true);
        const response = await axios.post(
          "https://cemear-b549eb196d7c.herokuapp.com/files/upload",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              Authorization: `Bearer ${await AsyncStorage.getItem("token")}`,
            },
          }
        );

        console.log("✅ Upload bem-sucedido:", response.data);
        Alert.alert("Sucesso", "Arquivo enviado com sucesso!");
        setFolderName(""); // Limpa o nome da pasta após o upload

        // Atualiza a lista de pastas e arquivos
        await fetchFolders();
        if (selectedFolder) {
          await fetchFilesInFolder(selectedFolder);
        }
      }
    } catch (error) {
      console.error("❌ Erro ao fazer upload:", error);
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
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Erro", "Token de autenticação não encontrado.");
        return;
      }

      const downloadUrl = `https://cemear-b549eb196d7c.herokuapp.com/files/download/${file.id}?token=${encodeURIComponent(token)}`;
      console.log("📥 Tentando baixar arquivo:", downloadUrl);

      // Tenta abrir o URL diretamente no navegador
      const canOpen = await Linking.canOpenURL(downloadUrl);
      if (canOpen) {
        await Linking.openURL(downloadUrl);
        console.log("✅ Arquivo aberto no navegador com sucesso.");
      } else {
        // Fallback: Baixa o arquivo usando FileSystem e compartilha
        const sanitizedName = sanitizeFilename(file.originalname);
        const fileUri = `${FileSystem.cacheDirectory}${sanitizedName}`;
        const downloadResumable = FileSystem.createDownloadResumable(
          downloadUrl,
          fileUri,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const downloadedFile = await downloadResumable.downloadAsync();
        if (downloadedFile) {
          console.log("✅ Arquivo baixado com sucesso:", downloadedFile.uri);
          await Sharing.shareAsync(downloadedFile.uri);
        } else {
          throw new Error("Falha ao baixar o arquivo.");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao baixar arquivo:", error);
      Alert.alert("Erro", "Não foi possível baixar o arquivo.");
    }
  };

  const handleRefresh = () => {
    setFolders([]);
    setFilesInFolder([]);
    setSelectedFolder(null);
    fetchFolders();
  };

  const handleFolderSelect = (folder: string) => {
    setSelectedFolder(folder);
    fetchFilesInFolder(folder);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {selectedFolder ? selectedFolder : "Gerenciador de Arquivos"}
        </Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Criar pastas (visível apenas para admin) */}
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
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.uploadButtonText}>Criar Pasta</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Upload dentro de uma pasta específica (visível apenas para admin) */}
      {selectedFolder && tipoUsuario === "admin" && (
        <View style={styles.uploadContainer}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.uploadButtonText}>Adicionar Arquivo</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00AEEF" />
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      ) : selectedFolder ? (
        <>
          <TouchableOpacity style={styles.backButton} onPress={() => setSelectedFolder(null)}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
            <Text style={styles.backButtonText}>Voltar</Text>
          </TouchableOpacity>
          {filesInFolder.length > 0 ? (
            <FlatList
              data={filesInFolder}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.fileItem} onPress={() => handleDownload(item)}>
                  <Ionicons name="document-text" size={24} color="#00AEEF" />
                  <Text style={styles.fileName}>{item.originalname}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id || Math.random().toString()}
            />
          ) : (
            <Text style={styles.emptyText}>Nenhum arquivo nesta pasta.</Text>
          )}
        </>
      ) : (
        <>
          {folders.length > 0 ? (
            <FlatList
              data={folders}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.folderItem}
                  onPress={() => handleFolderSelect(item)}
                >
                  <Ionicons name="folder" size={24} color="#FFA500" />
                  <Text style={styles.folderText}>{item}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item}
            />
          ) : (
            <Text style={styles.emptyText}>Nenhuma pasta disponível. Crie uma nova pasta para começar.</Text>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#333",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});

export default FileManager;