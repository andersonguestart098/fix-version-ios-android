import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from "react-native";
import Navbar from "../components/NavBar";
import Feed from "../components/Feed";
import PostForm from "../components/PostForm";
import NavButton from "../components/botoesNav";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types";
import io from "socket.io-client";

const SOCKET_URL = "https://cemear-b549eb196d7c.herokuapp.com";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FeedScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const [showPostForm, setShowPostForm] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<number>(0);
  const socket = useRef<SocketIOClient.Socket | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    const fetchTipoUsuario = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      setTipoUsuario(tipo);
    };
    fetchTipoUsuario();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <Feed />
      <View style={styles.footerButtons}>
        <NavButton iconName="home-outline" onPress={() => navigation.navigate("Feed")} />
        <NavButton iconName="download-outline" onPress={() => navigation.navigate("FileManager")} />
        {tipoUsuario === "admin" && (
          <NavButton iconName="add-circle-outline" onPress={() => setShowPostForm(true)} />
        )}
        <NavButton iconName="calendar-outline" onPress={() => setShowCalendarModal(true)} />
        <NavButton iconName="chatbubble-outline" onPress={() => navigation.navigate("DirectMessages")} badgeCount={unreadMessages} />
      </View>

      {/* Modal para criar postagem */}
      <Modal visible={showPostForm} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowPostForm(false)}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
              style={styles.modalContainer}
            >
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.modalContent}>
                  <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <PostForm onClose={() => setShowPostForm(false)} />
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de calendário */}
      <Modal visible={showCalendarModal} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={() => setShowCalendarModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Escolha o Calendário</Text>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarEvents")}>
                <Text style={styles.optionText}>Calendário de Eventos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarHolidays")}>
                <Text style={styles.optionText}>Calendário de Férias</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("CalendarBirthdays")}>
                <Text style={styles.optionText}>Calendário de Aniversários</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Text style={styles.closeButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  footerButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 10,
    width: "90%",
    maxHeight: "80%",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  optionText: {
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
    marginVertical: 10,
  },
  closeButton: {
    color: "#007AFF",
    marginTop: 10,
    textAlign: "center",
  },
});

export default FeedScreen;
