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

interface Event {
  id: string;
  descricao: string;
  date: string; // Formato ISO vindo do backend
}

const CalendarEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [descricao, setDescricao] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);

  // Adiciona um dia a uma data ISO
  const addOneDay = (isoDate: string): string => {
    const date = new Date(isoDate);
    date.setDate(date.getDate() + 1); // Incrementa um dia
    return date.toISOString().split("T")[0]; // Retorna no formato YYYY-MM-DD
  };

  // Função para buscar eventos do backend
  const fetchEvents = async () => {
    try {
      const response = await axios.get(
        "https://cemear-b549eb196d7c.herokuapp.com/events"
      );
      const data = response.data;

      // Marca as datas dos eventos
      const marked = data.reduce((acc: Record<string, any>, event: Event) => {
        acc[event.date] = { marked: true, dotColor: "blue" };
        return acc;
      }, {});

      setEvents(data); // Define os eventos no estado
      setMarkedDates(marked); // Define as datas marcadas
    } catch (error) {
      console.error("Erro ao buscar eventos:", error);
      Alert.alert("Erro", "Não foi possível carregar os eventos.");
    }
  };

  useEffect(() => {
    fetchEvents(); // Busca eventos ao montar o componente

    const fetchTipoUsuario = async () => {
      const tipo = await AsyncStorage.getItem("tipoUsuario");
      setTipoUsuario(tipo);
    };

    fetchTipoUsuario();
  }, []);

  // Adicionar novo evento
  const handleAddEvent = async () => {
    if (!descricao.trim()) {
      Alert.alert("Erro", "Por favor, preencha a descrição do evento.");
      return;
    }

    try {
      const formattedDate = selectedDate.toISOString().split("T")[0];
      const response = await axios.post(
        "https://cemear-b549eb196d7c.herokuapp.com/events",
        {
          descricao,
          date: formattedDate,
        }
      );

      // Atualiza eventos localmente
      const newEvent = response.data;
      const adjustedDate = addOneDay(formattedDate); // Ajusta a data para exibição
      setEvents((prev) => [...prev, { ...newEvent, date: adjustedDate }]);
      setMarkedDates((prev) => ({
        ...prev,
        [newEvent.date]: { marked: true, dotColor: "blue" },
      }));

      setDescricao(""); // Limpa o campo de descrição
      setSelectedDate(new Date()); // Reseta a data selecionada
      Alert.alert("Sucesso", "Evento adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar evento:", error);
      Alert.alert("Erro", "Não foi possível adicionar o evento.");
    }
  };

  // Clique em uma data
  const onDayPress = (day: DateData) => {
    const event = events.find((e) => e.date === day.dateString);
    if (event) {
      Alert.alert("Evento", event.descricao);
    } else {
      Alert.alert("Sem evento", "Nenhum evento para esta data.");
    }
  };

  // Filtrar eventos do mês atual, ajustar as datas e ordenar por data (mais antiga para mais recente)
  const currentMonth = new Date().toISOString().split("T")[0].slice(0, 7);
  const monthlyEvents = events
    .filter((e) => e.date.startsWith(currentMonth))
    .map((e) => ({
      ...e,
      adjustedDate: addOneDay(e.date), // Adiciona um dia para exibição na lista
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordem crescente

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendário de Eventos</Text>

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

      {/* Inputs para adicionar novos eventos (somente para admin) */}
      {tipoUsuario === "admin" && (
        <>
          <TextInput
            placeholder="Descrição do evento"
            value={descricao}
            onChangeText={setDescricao}
            style={styles.input}
          />
          <Button title="Selecionar Data" onPress={() => setShowDatePicker(true)} />
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner" // Estilo "roleta" no iOS
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
            />
          )}
          <Text style={styles.selectedDate}>
            Data selecionada: {selectedDate.toLocaleDateString("pt-BR")}
          </Text>
          <Button title="Adicionar Evento" onPress={handleAddEvent} />
        </>
      )}

      {/* Lista de eventos do mês */}
      <Text style={styles.subtitle}>Eventos do Mês</Text>
      <FlatList
        data={monthlyEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.eventItem}>
            <Text style={styles.eventDescription}>{item.descricao}</Text>
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

export default CalendarEvents;