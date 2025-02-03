import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";
import { Calendar, DateData } from "react-native-calendars";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

interface Birthday {
  id: string;
  name: string;
  date: string; // Formato ISO vindo do backend
}

const CalendarBirthdays: React.FC = () => {
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [name, setName] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);

  // Adiciona um dia a uma data ISO
  const addOneDay = (isoDate: string): string => {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + 1); // Incrementa um dia
    return date.toISOString().split("T")[0]; // Retorna no formato YYYY-MM-DD
  };

  // Função para buscar aniversários do backend
  const fetchBirthdays = async () => {
    try {
      const response = await axios.get(
        "https://cemear-b549eb196d7c.herokuapp.com/aniversarios"
      );
      const data = response.data;

      // Marca as datas de aniversários
      const marked = data.reduce((acc: Record<string, any>, birthday: Birthday) => {
        acc[birthday.date] = { marked: true, dotColor: "green" };
        return acc;
      }, {});

      setBirthdays(data); // Define os aniversários no estado
      setMarkedDates(marked); // Define as datas marcadas
    } catch (error) {
      console.error("Erro ao buscar aniversários:", error);
      Alert.alert("Erro", "Não foi possível carregar os aniversários.");
    }
  };

  useEffect(() => {
    fetchBirthdays(); // Busca aniversários ao montar o componente

    const fetchTipoUsuario = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      setTipoUsuario(tipo);
    };

    fetchTipoUsuario();
  }, []);

  // Adicionar novo aniversário
  const handleAddBirthday = async () => {
    if (!name.trim()) {
      Alert.alert("Erro", "Por favor, preencha o nome do aniversariante.");
      return;
    }

    try {
      // Formata a data antes de salvar no backend
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const response = await axios.post(
        "https://cemear-b549eb196d7c.herokuapp.com/birthdays",
        {
          name,
          date: formattedDate,
        }
      );

      // Atualiza aniversários localmente
      const newBirthday = response.data;
      const adjustedDate = addOneDay(formattedDate); // Ajusta a data para exibição
      setBirthdays((prev) => [...prev, { ...newBirthday, date: adjustedDate }]);
      setMarkedDates((prev) => ({
        ...prev,
        [newBirthday.date]: { marked: true, dotColor: "green" },
      }));

      setName(""); // Limpa o campo de nome
      setSelectedDate(new Date()); // Reseta a data selecionada
      Alert.alert("Sucesso", "Aniversário adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar aniversário:", error);
      Alert.alert("Erro", "Não foi possível adicionar o aniversário.");
    }
  };

  // Clique em uma data
  const onDayPress = (day: DateData) => {
    const birthday = birthdays.find((b) => b.date === day.dateString);
    if (birthday) {
      Alert.alert("Aniversário", `${birthday.name} faz aniversário!`);
    } else {
      Alert.alert("Sem aniversários", "Nenhum aniversário nesta data.");
    }
  };

  // Filtrar aniversários do mês atual e ajustar as datas para a listagem
  const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);
  const monthlyBirthdays = birthdays
    .filter((b) => b.date.startsWith(currentMonth))
    .map((b) => ({
      ...b,
      adjustedDate: addOneDay(b.date), // Adiciona um dia para exibição na lista
    }));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendário de Aniversários</Text>

      {/* Calendário */}
      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: "#007AFF",
          todayTextColor: "#007AFF",
          arrowColor: "#007AFF",
        }}
      />

      {/* Inputs para adicionar novos aniversários (apenas admin) */}
      {tipoUsuario === "admin" && (
        <>
          <TextInput
            placeholder="Nome do Aniversariante"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <Button title="Selecionar Data" onPress={() => setShowDatePicker(true)} />
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
          <Text style={styles.selectedDate}>
            Data selecionada: {selectedDate.toLocaleDateString("pt-BR")}
          </Text>
          <Button title="Adicionar Aniversário" onPress={handleAddBirthday} />
        </>
      )}

      {/* Lista de aniversários do mês */}
      <Text style={styles.subtitle}>Aniversários do Mês</Text>
      <FlatList
        data={monthlyBirthdays}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <Text style={styles.eventDescription}>{item.name}</Text>
            <Text style={styles.eventDate}>
              Data: {new Date(item.adjustedDate).toLocaleDateString("pt-BR")}
            </Text>
          </View>
        )}
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "white",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  selectedDate: {
    marginVertical: 10,
    fontSize: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 20,
  },
  eventItem: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 5,
  },
  eventDescription: {
    fontSize: 16,
    fontWeight: "bold",
  },
  eventDate: {
    fontSize: 14,
    color: "#555",
  },
});

export default CalendarBirthdays;
