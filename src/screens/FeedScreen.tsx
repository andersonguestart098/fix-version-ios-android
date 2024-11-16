import React, { useState } from "react";
import { SafeAreaView, View, StyleSheet, Modal, Button } from "react-native";
import Navbar from "../components/NavBar";
import Feed from "../components/Feed";
import PostForm from "../components/PostForm"; // Formulário de post
import NavButton from "../components/botoesNav"; // Botões de navegação

const FeedScreen: React.FC = () => {
  const [showPostForm, setShowPostForm] = useState(false); // Controle do modal

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

      {/* Botões de navegação na parte inferior */}
      <View style={styles.footerButtons}>
        <NavButton
          iconName="home-outline"
          onPress={() => console.log("Home")} // Placeholder
        />
        <NavButton
          iconName="add-circle-outline"
          onPress={() => setShowPostForm(true)} // Abre o modal com o PostForm
        />
        <NavButton
          iconName="heart-outline"
          onPress={() => console.log("Likes")} // Placeholder
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
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Fundo semi-transparente
  },
});

export default FeedScreen;
