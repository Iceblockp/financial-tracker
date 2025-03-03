import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  IconButton,
  Portal,
  Modal,
  DataTable,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RecurringTransactions = ({ onAddRecurring }) => {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [nextDueDate, setNextDueDate] = useState(null);
  const [recurringTransactions, setRecurringTransactions] = useState([]);

  useEffect(() => {
    loadRecurringTransactions();
    checkDueTransactions();
  }, []);

  const loadRecurringTransactions = async () => {
    try {
      const saved = await AsyncStorage.getItem("recurringTransactions");
      if (saved) {
        setRecurringTransactions(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading recurring transactions:", error);
    }
  };

  const saveRecurringTransactions = async (transactions) => {
    try {
      await AsyncStorage.setItem(
        "recurringTransactions",
        JSON.stringify(transactions)
      );
    } catch (error) {
      console.error("Error saving recurring transactions:", error);
    }
  };

  const checkDueTransactions = async () => {
    const now = new Date();
    const dueTransactions = recurringTransactions.filter((transaction) => {
      const nextDue = new Date(transaction.nextDue);
      return nextDue <= now;
    });

    if (dueTransactions.length > 0) {
      Alert.alert(
        "Due Transactions",
        `You have ${dueTransactions.length} recurring transactions due.`,
        [{ text: "View", onPress: () => setVisible(true) }, { text: "Later" }]
      );
    }
  };

  const frequencies = ["daily", "weekly", "monthly"];

  const handleAdd = async () => {
    if (amount && description && frequency) {
      const nextDue = calculateNextDueDate(frequency, dayOfMonth);
      const recurringTransaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        frequency,
        dayOfMonth: frequency === "monthly" ? parseInt(dayOfMonth) : null,
        nextDue: nextDue.toISOString(),
        createdAt: new Date().toISOString(),
      };

      const updatedTransactions = [
        ...recurringTransactions,
        recurringTransaction,
      ];
      setRecurringTransactions(updatedTransactions);
      await saveRecurringTransactions(updatedTransactions);

      onAddRecurring(recurringTransaction);
      setVisible(false);
      resetForm();

      Alert.alert(
        "Transaction Scheduled",
        `Next due date: ${nextDue.toLocaleDateString()}`,
        [{ text: "OK" }]
      );
    }
  };

  const calculateNextDueDate = (freq, day) => {
    const now = new Date();
    switch (freq) {
      case "daily":
        return new Date(now.setDate(now.getDate() + 1));
      case "weekly":
        return new Date(now.setDate(now.getDate() + 7));
      case "monthly":
        const nextMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          day || 1
        );
        return nextMonth;
      default:
        return now;
    }
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setFrequency("monthly");
    setDayOfMonth("");
  };

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => setVisible(true)}
        style={styles.addButton}
      >
        Add Recurring Transaction
      </Button>

      <Card style={styles.transactionsCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Upcoming Transactions
          </Text>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Description</DataTable.Title>
              <DataTable.Title numeric>Amount</DataTable.Title>
              <DataTable.Title>Due Date</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {recurringTransactions.map((transaction) => (
              <DataTable.Row key={`transaction-${transaction.id}`}>
                <DataTable.Cell>{transaction.description}</DataTable.Cell>
                <DataTable.Cell numeric>
                  {transaction.amount.toLocaleString()}
                  {"MMK "}
                </DataTable.Cell>
                <DataTable.Cell>
                  {new Date(transaction.nextDue).toLocaleDateString()}
                </DataTable.Cell>
                <DataTable.Cell style={styles.actionsCell}>
                  <View style={styles.actionButtonsContainer}>
                    <IconButton
                      icon="check-circle"
                      mode="contained-tonal"
                      size={16}
                      onPress={() => {
                        Alert.alert(
                          "Complete Transaction",
                          `Are you sure you want to complete this transaction?\n\nDescription: ${
                            transaction.description
                          }\nAmount: MMK ${transaction.amount.toLocaleString()}\nFrequency: ${
                            transaction.frequency
                          }\nNext due date: ${new Date(
                            transaction.nextDue
                          ).toLocaleDateString()}`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Complete",
                              onPress: () => {
                                const completedTransaction = {
                                  ...transaction,
                                  id: `completed-${Date.now()}`,
                                };
                                onAddRecurring(completedTransaction);
                                const nextDue = calculateNextDueDate(
                                  transaction.frequency,
                                  transaction.dayOfMonth
                                );
                                const updatedTransactions =
                                  recurringTransactions.map((t) =>
                                    t.id === transaction.id
                                      ? { ...t, nextDue: nextDue.toISOString() }
                                      : t
                                  );
                                setRecurringTransactions(updatedTransactions);
                                saveRecurringTransactions(updatedTransactions);
                                Alert.alert(
                                  "✓ Success",
                                  `Transaction completed and scheduled for ${nextDue.toLocaleDateString()}.`,
                                  [{ text: "OK" }]
                                );
                              },
                            },
                          ]
                        );
                      }}
                      containerColor="#E8F5E9"
                      style={styles.actionButton}
                    />
                    <IconButton
                      icon="delete"
                      mode="contained-tonal"
                      size={16}
                      onPress={() => {
                        Alert.alert(
                          "Delete Transaction",
                          `Are you sure you want to delete this recurring transaction?\n\nDescription: ${
                            transaction.description
                          }\nAmount: MMK ${transaction.amount.toLocaleString()}\nFrequency: ${
                            transaction.frequency
                          }`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Delete",
                              style: "destructive",
                              onPress: () => {
                                const updatedTransactions =
                                  recurringTransactions.filter(
                                    (t) => t.id !== transaction.id
                                  );
                                setRecurringTransactions(updatedTransactions);
                                saveRecurringTransactions(updatedTransactions);
                                Alert.alert(
                                  "Deleted",
                                  "Recurring transaction has been deleted."
                                );
                              },
                            },
                          ]
                        );
                      }}
                      containerColor="#FFEBEE"
                      iconColor="#FF4444"
                      style={styles.actionButton}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>
              New Recurring Transaction
            </Text>

            <TextInput
              label="Amount (MMK)"
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

            <View style={styles.frequencyContainer}>
              {frequencies.map((freq) => (
                <Button
                  key={freq}
                  mode={frequency === freq ? "contained" : "outlined"}
                  onPress={() => setFrequency(freq)}
                  style={styles.frequencyButton}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Button>
              ))}
            </View>

            {frequency === "monthly" && (
              <TextInput
                label="Day of Month (1-31)"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            <Button
              mode="contained"
              onPress={handleAdd}
              style={styles.submitButton}
            >
              Add Recurring Transaction
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsCell: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingRight: 4,
    minWidth: 80,
    paddingLeft: 0,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionButton: {
    margin: 0,
    padding: 4,
    borderRadius: 12,
    marginVertical: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  actionButtonLabel: {
    fontSize: 12,
    fontWeight: "bold",
  },
  completeButton: {
    backgroundColor: "#E8F5E9",
  },
  deleteButton: {
    backgroundColor: "#FFEBEE",
  },
  transactionsCard: {
    margin: 16,
    marginTop: 0,
  },
  cardTitle: {
    marginBottom: 16,
  },
  addButton: {
    margin: 16,
  },
  modalContainer: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: "80%",
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    marginBottom: 12,
  },
  frequencyContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default RecurringTransactions;
