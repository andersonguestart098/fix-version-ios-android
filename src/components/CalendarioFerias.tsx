import React, { useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet } from "react-native";

const CalendarHolidays: React.FC = () => {
  const [employee, setEmployee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [holidays, setHolidays] = useState<{ id: string; name: string; start: string; end: string }[]>([]);

  const handleAddHoliday = () => {
    if (!employee.trim() || !startDate || !endDate) return;

    setHolidays((prev) => [
      ...prev,
      { id: String(Date.now()), name: employee, start: startDate, end: endDate },
    ]);
    setEmployee("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendário de Férias</Text>
      <TextInput
        placeholder="Nome do Colaborador"
        value={employee}
        onChangeText={setEmployee}
        style={styles.input}
      />
      <TextInput
        placeholder="Data de Início (YYYY-MM-DD)"
        value={startDate}
        onChangeText={setStartDate}
        style={styles.input}
      />
      <TextInput
        placeholder="Data de Término (YYYY-MM-DD)"
        value={endDate}
        onChangeText={setEndDate}
        style={styles.input}
      />
      <Button title="Adicionar Férias" onPress={handleAddHoliday} />
      <FlatList
        data={holidays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name}</Text>
            <Text>
              {item.start} - {item.end}
            </Text>
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
  

export default CalendarHolidays;
