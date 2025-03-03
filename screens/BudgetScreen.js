import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  ProgressBar,
  Chip,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

const BudgetScreen = () => {
  const isFocused = useIsFocused();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [budgets, setBudgets] = useState([]);

  const predefinedCategories = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
  ];

  useEffect(() => {
    if (isFocused) {
      loadBudgets();
      checkExpensesChanges();
    }
  }, [isFocused]);

  const checkExpensesChanges = async () => {
    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedBudgets = await AsyncStorage.getItem("budgets");

      if (savedExpenses && savedBudgets) {
        const expenses = JSON.parse(savedExpenses);
        const currentBudgets = JSON.parse(savedBudgets);

        if (!Array.isArray(currentBudgets)) {
          console.error("Invalid budget data format");
          return;
        }

        const updatedBudgets = currentBudgets.map((budget) => {
          const categoryExpenses = expenses.filter(
            (expense) => expense.category === budget.category
          );
          const totalSpent = categoryExpenses.reduce(
            (sum, expense) => sum + expense.amount,
            0
          );

          // Check if spending exceeds budget thresholds
          const spendingRatio = totalSpent / budget.amount;
          if (spendingRatio >= 0.9 && !budget.alertShown) {
            Alert.alert(
              "Budget Alert",
              `You have used ${Math.round(spendingRatio * 100)}% of your ${
                budget.category
              } budget!`,
              [{ text: "OK" }]
            );
          }

          return {
            ...budget,
            spent: totalSpent,
            alertShown: spendingRatio >= 0.9,
          };
        });

        setBudgets(updatedBudgets);
        await saveBudgets(updatedBudgets);
      }
    } catch (error) {
      console.error("Error syncing with expenses:", error);
    }
  };

  const loadBudgets = async () => {
    try {
      const savedBudgets = await AsyncStorage.getItem("budgets");
      if (savedBudgets) {
        const parsedBudgets = JSON.parse(savedBudgets);
        if (Array.isArray(parsedBudgets)) {
          setBudgets(parsedBudgets);
        } else {
          console.error("Invalid budget data format");
          setBudgets([]);
        }
      }
    } catch (error) {
      console.error("Error loading budgets:", error);
      Alert.alert("Error", "Failed to load budgets. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const saveBudgets = async (updatedBudgets) => {
    if (!Array.isArray(updatedBudgets)) {
      console.error("Invalid budget data format");
      return;
    }
    try {
      const validBudgets = updatedBudgets.filter(
        (budget) =>
          budget &&
          typeof budget === "object" &&
          typeof budget.amount === "number" &&
          typeof budget.category === "string" &&
          budget.id
      );
      await AsyncStorage.setItem("budgets", JSON.stringify(validBudgets));
      // Verify the save was successful by reading it back
      const savedData = await AsyncStorage.getItem("budgets");
      if (!savedData) {
        throw new Error("Budget data not saved properly");
      }
    } catch (error) {
      console.error("Error saving budgets:", error);
      Alert.alert("Error", "Failed to save budget changes. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleAddBudget = () => {
    if (amount && category) {
      const existingBudget = budgets.find((b) => b.category === category);
      if (existingBudget) {
        Alert.alert(
          "Budget Exists",
          "A budget for this category already exists. Do you want to update it?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Update",
              onPress: () => {
                const updatedBudgets = budgets.map((b) =>
                  b.category === category
                    ? { ...b, amount: parseFloat(amount) }
                    : b
                );
                setBudgets(updatedBudgets);
                saveBudgets(updatedBudgets);
                setAmount("");
                setCategory("");
              },
            },
          ]
        );
        return;
      }

      const newBudget = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        category,
        spent: 0,
        date: new Date().toISOString(),
      };
      const updatedBudgets = [newBudget, ...budgets];
      setBudgets(updatedBudgets);
      saveBudgets(updatedBudgets);
      setAmount("");
      setCategory("");
    }
  };

  const handleDeleteBudget = (budgetId) => {
    Alert.alert(
      "Delete Budget",
      "Are you sure you want to delete this budget?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedBudgets = budgets.filter((b) => b.id !== budgetId);
            setBudgets(updatedBudgets);
            saveBudgets(updatedBudgets);
          },
        },
      ]
    );
  };

  const getProgressColor = (spent, amount) => {
    const ratio = spent / amount;
    if (ratio >= 1) return "#FF4444";
    if (ratio >= 0.8) return "#FFA000";
    return "#4CAF50";
  };

  const calculateBudgetSummary = () => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = budgets.reduce(
      (sum, budget) => sum + (budget.spent || 0),
      0
    );
    const remainingTotal = totalBudget - totalSpent;

    return {
      totalBudget,
      totalSpent,
      remainingTotal,
      utilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    };
  };

  const summary = calculateBudgetSummary();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.summaryTitle}>
              Budget Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Total Budget:</Text>
              <Text variant="bodyLarge">
                MMK {summary.totalBudget.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Total Spent:</Text>
              <Text
                variant="bodyLarge"
                style={{
                  color:
                    summary.totalSpent > summary.totalBudget
                      ? "#FF4444"
                      : "#4CAF50",
                }}
              >
                MMK {summary.totalSpent?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="bodyLarge">Remaining:</Text>
              <Text
                variant="bodyLarge"
                style={{
                  color: summary.remainingTotal < 0 ? "#FF4444" : "#4CAF50",
                }}
              >
                MMK {summary.remainingTotal.toLocaleString()}
              </Text>
            </View>
            <ProgressBar
              progress={summary.utilizationRate / 100}
              color={
                summary.utilizationRate > 100
                  ? "#FF4444"
                  : summary.utilizationRate > 80
                  ? "#FFA000"
                  : "#4CAF50"
              }
              style={styles.summaryProgress}
            />
          </Card.Content>
        </Card>

        <View style={styles.inputContainer}>
          <TextInput
            label="Budget Amount (MMK)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {predefinedCategories.map((cat) => (
                <Chip
                  key={cat}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                  style={styles.categoryChip}
                >
                  {cat}
                </Chip>
              ))}
            </ScrollView>
          </View>
          <Button
            mode="contained"
            onPress={handleAddBudget}
            style={styles.button}
          >
            Set Budget
          </Button>
        </View>

        <View style={styles.budgetsList}>
          {budgets.map((budget) => (
            <Card key={budget.id} style={styles.budgetCard}>
              <Card.Content>
                <Text variant="titleMedium">
                  {budget.category || "Uncategorized"}
                </Text>
                <Text variant="bodyMedium">
                  Budget: MMK {(budget.amount || 0).toLocaleString()}
                </Text>
                <Text variant="bodySmall">
                  Spent: MMK {(budget.spent || 0).toLocaleString()}
                </Text>
                <Text variant="bodySmall">
                  Remaining: MMK{" "}
                  {(
                    (budget.amount || 0) - (budget.spent || 0)
                  ).toLocaleString()}
                </Text>
                <ProgressBar
                  progress={(budget.spent || 0) / (budget.amount || 1)}
                  color={getProgressColor(
                    budget.spent || 0,
                    budget.amount || 0
                  )}
                  style={styles.progressBar}
                />
                <View style={styles.budgetCardFooter}>
                  <Text variant="bodySmall">
                    {budget.date
                      ? new Date(budget.date).toLocaleDateString()
                      : "No date"}
                  </Text>
                  <Button
                    mode="text"
                    compact
                    onPress={() => handleDeleteBudget(budget.id)}
                    textColor="#FF4444"
                  >
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    elevation: 2,
  },
  summaryTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryProgress: {
    height: 8,
    borderRadius: 4,
    marginTop: 16,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    margin: 16,
    elevation: 2,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  budgetsList: {
    padding: 16,
  },
  budgetCard: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 8,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  budgetCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginVertical: 8,
  },
});

export default BudgetScreen;
