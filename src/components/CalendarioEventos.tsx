import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";

const CalendarEvents: React.FC = () => {
  const [event, setEvent] = useState("");
  const [events, setEvents] = useState<{ id: string; name: string; date: Date }[]>([]);

  const handleAddEvent = () => {
    if (!event.trim()) return;

    setEvents((prev) => [
      ...prev,
      { id: String(Date.now()), name: event, date: new Date() },
    ]);
    setEvent("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendário de Eventos</Text>
      <TextInput
        placeholder="Digite o nome do evento"
        value={event}
        onChangeText={setEvent}
        style={styles.input}
      />
      <Button title="Adicionar Evento" onPress={handleAddEvent} />
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name}</Text>
            <Text>{item.date.toLocaleDateString()}</Text>
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

export default CalendarEvents;
