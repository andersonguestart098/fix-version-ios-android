import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TouchableWithoutFeedback,
} from "react-native";
import Navbar from "../components/NavBar";
import Feed from "../components/Feed";
import PostForm from "../components/PostForm";
import NavButton from "../components/botoesNav"; // Botões de navegação
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";


const FeedScreen: React.FC = () => {
  const [showPostForm, setShowPostForm] = useState(false); // Controle do modal de post
  const [showCalendarModal, setShowCalendarModal] = useState(false); // Controle do modal de calendário
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null); // Tipo de usuário
  const navigation = useNavigation();

  useEffect(() => {
    const fetchTipoUsuario = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      setTipoUsuario(tipo);
    };
    fetchTipoUsuario();
  }, []);

  const openCalendar = (screen: string) => {
    console.log(`Abrindo calendário: ${screen}`);
    setShowCalendarModal(false);
    navigation.navigate(screen as never); // Navega para a tela correspondente
  };

  return (
    <SafeAreaView style={styles.container}>
      <Navbar />
      <Feed />

      {/* Modal para o PostForm */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPostForm}
        onRequestClose={() => setShowPostForm(false)} // Fecha ao pressionar o botão de voltar
      >
        <View style={styles.modalContainer}>
          <PostForm onClose={() => setShowPostForm(false)} />
        </View>
      </Modal>

      {/* Modal para o Calendário */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCalendarModal}
        onRequestClose={() => setShowCalendarModal(false)} // Fecha ao pressionar o botão de voltar
      >
        <TouchableWithoutFeedback onPress={() => setShowCalendarModal(false)}>
          <View style={styles.calendarModalOverlay}>
            <View style={styles.calendarModal}>
              <Text style={styles.modalTitle}>Escolha o Calendário</Text>

              <TouchableOpacity
                style={styles.calendarOption}
                onPress={() => openCalendar("CalendarEvents")}
              >
                <Ionicons name="calendar-outline" size={24} color="black" />
                <Text style={styles.optionText}>Calendário de Eventos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarOption}
                onPress={() => openCalendar("CalendarHolidays")}
              >
                <Ionicons name="calendar-outline" size={24} color="black" />
                <Text style={styles.optionText}>Calendário de Férias</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarOption}
                onPress={() => openCalendar("CalendarBirthdays")}
              >
                <Ionicons name="calendar-outline" size={24} color="black" />
                <Text style={styles.optionText}>Calendário de Aniversários</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCalendarModal(false)}
              >
                <Text style={styles.closeButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Botões de navegação na parte inferior */}
      <View style={styles.footerButtons}>
        {/* Botão Home (para todos os usuários) */}
        <NavButton
          iconName="home-outline"
          onPress={() => console.log("Home")} // Placeholder para navegação Home
        />

        {/* Botão Adicionar Post (apenas para admin) */}
        {tipoUsuario === "admin" && (
          <NavButton
            iconName="add-circle-outline"
            onPress={() => setShowPostForm(true)} // Abre o modal com o PostForm
          />
        )}

        {/* Botão Calendário (para todos os usuários) */}
        <NavButton
          iconName="calendar-outline"
          onPress={() => setShowCalendarModal(true)} // Abre o modal do calendário
        />
      </View>
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
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  calendarModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  calendarModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  calendarOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    width: "100%",
  },
  optionText: {
    fontSize: 16,
    color: "#007AFF",
    marginLeft: 10,
  },
  closeButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
});

export default FeedScreen;
