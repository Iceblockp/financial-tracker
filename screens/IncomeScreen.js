import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  IconButton,
  Menu,
  Searchbar,
  Portal,
  Modal,
  SegmentedButtons,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

const IncomeScreen = () => {
  const isFocused = useIsFocused();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [incomes, setIncomes] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (isFocused) {
      loadIncomes();
    }
  }, [isFocused]);

  const loadIncomes = async () => {
    try {
      const savedIncomes = await AsyncStorage.getItem("incomes");
      if (savedIncomes) {
        setIncomes(JSON.parse(savedIncomes));
      }
    } catch (error) {
      console.error("Error loading incomes:", error);
    }
  };

  const saveIncomes = async (updatedIncomes) => {
    try {
      await AsyncStorage.setItem("incomes", JSON.stringify(updatedIncomes));
      await updateBalance(updatedIncomes);
    } catch (error) {
      console.error("Error saving incomes:", error);
    }
  };

  const updateBalance = async (currentIncomes) => {
    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
      
      const totalIncome = currentIncomes.reduce((sum, income) => sum + (typeof income.amount === "number" ? income.amount : 0), 0);
      const totalExpenses = expenses.reduce((sum, expense) => sum + (typeof expense.amount === "number" ? expense.amount : 0), 0);
      
      const balance = totalIncome - totalExpenses;
      await AsyncStorage.setItem("balance", JSON.stringify(balance));
    } catch (error) {
      console.error("Error updating balance:", error);
    }
  };

  const handleAddIncome = async () => {
    if (amount && description) {
      const newIncome = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        note,
        date: date.toISOString(),
      };

      const updatedIncomes = [newIncome, ...incomes];
      setIncomes(updatedIncomes);
      await saveIncomes(updatedIncomes);

      setAmount("");
      setDescription("");
      setNote("");
      setDate(new Date());
    }
  };

  const handleEditIncome = async (income) => {
    setEditingIncome(income);
    setAmount(income.amount.toString());
    setDescription(income.description);
    setNote(income.note || "");
    setDate(new Date(income.date));
  };

  const handleUpdateIncome = async () => {
    if (editingIncome && amount && description) {
      const updatedIncomes = incomes.map((income) =>
        income.id === editingIncome.id
          ? {
              ...income,
              amount: parseFloat(amount),
              description,
              note,
              date: date.toISOString(),
            }
          : income
      );

      setIncomes(updatedIncomes);
      await saveIncomes(updatedIncomes);

      setEditingIncome(null);
      setAmount("");
      setDescription("");
      setNote("");
      setDate(new Date());
    }
  };

  const handleDeleteIncome = async (incomeId) => {
    Alert.alert(
      "Delete Income",
      "Are you sure you want to delete this income?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedIncomes = incomes.filter(
              (income) => income.id !== incomeId
            );
            setIncomes(updatedIncomes);
            await saveIncomes(updatedIncomes);
          },
        },
      ]
    );
  };

  const filteredIncomes = incomes
    .filter(
      (income) =>
        income.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (income.note && income.note
          .toLowerCase()
          .includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <TextInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            style={styles.input}
          />
          <TextInput
            label="Note (Optional)"
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
          >
            {date.toLocaleDateString()}
          </Button>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}
          <Button
            mode="contained"
            onPress={editingIncome ? handleUpdateIncome : handleAddIncome}
            style={styles.button}
          >
            {editingIncome ? "Update Income" : "Add Income"}
          </Button>
          {editingIncome && (
            <Button
              mode="outlined"
              onPress={() => {
                setEditingIncome(null);
                setAmount("");
                setDescription("");
                setNote("");
                setDate(new Date());
              }}
              style={styles.button}
            >
              Cancel Edit
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Searchbar
            placeholder="Search incomes"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <View style={styles.filterContainer}>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  style={styles.filterButton}
                >
                  Sort: {sortOrder === "desc" ? "Newest" : "Oldest"}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setSortOrder("desc");
                  setMenuVisible(false);
                }}
                title="Newest First"
              />
              <Menu.Item
                onPress={() => {
                  setSortOrder("asc");
                  setMenuVisible(false);
                }}
                title="Oldest First"
              />
            </Menu>
          </View>

          {filteredIncomes.map((income) => (
            <Card key={income.id} style={styles.incomeCard}>
              <Card.Content>
                <View style={styles.incomeHeader}>
                  <Text variant="titleMedium">
                    MMK {income.amount?.toLocaleString()}
                  </Text>
                  <Text variant="bodyMedium">
                    {new Date(income.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text variant="bodyLarge">{income.description}</Text>
                {income.note && (
                  <Text variant="bodyMedium" style={styles.note}>
                    Note: {income.note}
                  </Text>
                )}
                <View style={styles.actionButtons}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => handleEditIncome(income)}
                  />
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => handleDeleteIncome(income.id)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingTop: 8,
  },
  card: {
    margin: 16,
    elevation: 4,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  button: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 8,
  },
  dateButton: {
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
  },
  searchBar: {
    marginBottom: 20,
    borderRadius: 15,
    backgroundColor: "#f8f9fa",
    elevation: 2,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
  },
  filterButton: {
    marginLeft: 8,
    borderRadius: 8,
  },
  incomeCard: {
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 15,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  incomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 4,
  },
  note: {
    marginTop: 6,
    fontStyle: "italic",
    color: "#666",
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 8,
  },
});

export default IncomeScreen;