import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";

const CalendarBirthdays: React.FC = () => {
  const [name, setName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [birthdays, setBirthdays] = useState<{ id: string; name: string; date: string }[]>([]);

  const handleAddBirthday = () => {
    if (!name.trim() || !birthdate) return;

    setBirthdays((prev) => [
      ...prev,
      { id: String(Date.now()), name, date: birthdate },
    ]);
    setName("");
    setBirthdate("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendário de Aniversários</Text>
      <TextInput
        placeholder="Nome do Aniversariante"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <TextInput
        placeholder="Data de Aniversário (YYYY-MM-DD)"
        value={birthdate}
        onChangeText={setBirthdate}
        style={styles.input}
      />
      <Button title="Adicionar Aniversário" onPress={handleAddBirthday} />
      <FlatList
        data={birthdays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name}</Text>
            <Text>{item.date}</Text>
          </View>
        )}
        style={styles.list}
      />
    </View>
  );
};

const styles = StyleSheet.create({
    container: { padding: 16 },
    title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    input: {
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 8,
      padding: 8,
      marginBottom: 10,
    },
    list: { marginTop: 10 },
    item: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  });
  

export default CalendarBirthdays;
