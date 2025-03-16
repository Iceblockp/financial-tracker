import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import {
  Text,
  Button,
  TextInput,
  Card,
  ProgressBar,
  Chip,
  IconButton,
} from "react-native-paper";
import CategoryManager from "../components/CategoryManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

const BudgetScreen = () => {
  const isFocused = useIsFocused();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [budgets, setBudgets] = useState([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [availableCategories, setAvailableCategories] = useState([
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
  ]);

  useEffect(() => {
    if (isFocused) {
      loadBudgets();
      checkExpensesChanges();
      loadRecommendations();
    }
  }, [isFocused, selectedMonth, selectedYear]);

  const loadRecommendations = async () => {
    const recommendations = await calculateBudgetRecommendations();
    setRecommendations(recommendations);
  };

  const calculateBudgetRecommendations = async () => {
    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];

      // Get last 3 months of expenses
      const today = new Date();
      const threeMonthsAgo = new Date(
        today.getFullYear(),
        today.getMonth() - 3,
        1
      );

      const recentExpenses = expenses.filter(
        (expense) => new Date(expense.date) >= threeMonthsAgo
      );

      // Calculate average monthly spending by category
      const categoryTotals = {};
      const categoryCounts = {};

      recentExpenses.forEach((expense) => {
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0;
          categoryCounts[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
        categoryCounts[expense.category]++;
      });

      // Calculate recommendations
      const recommendations = Object.entries(categoryTotals).map(
        ([category, total]) => ({
          category,
          recommendedBudget: Math.ceil((total / 3) * 1.1), // 10% buffer
          frequency: categoryCounts[category],
          currentSpending: total / 3,
        })
      );

      return recommendations.sort(
        (a, b) => b.currentSpending - a.currentSpending
      );
    } catch (error) {
      console.error("Error calculating budget recommendations:", error);
      return [];
    }
  };

  const showBudgetAlert = (budget, spent) => {
    const ratio = spent / budget;
    const remaining = budget - spent;

    if (ratio >= 0.9) {
      Alert.alert(
        "Budget Alert",
        `You've used ${Math.round(
          ratio * 100
        )}% of your ${category} budget!\n\nRemaining: MMK ${remaining.toLocaleString()}`,
        [{ text: "View Budget", onPress: () => {} }, { text: "OK" }]
      );
    } else if (ratio >= 0.75) {
      Alert.alert(
        "Budget Warning",
        `You've used ${Math.round(
          ratio * 100
        )}% of your ${category} budget.\n\nRemaining: MMK ${remaining.toLocaleString()}`,
        [{ text: "OK" }]
      );
    }
  };

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
          // Calculate current month's spending first
          const categoryExpenses = expenses.filter((expense) => {
            const expenseDate = new Date(expense.date);
            return (
              expense.category === budget.category &&
              expenseDate.getMonth() === selectedMonth &&
              expenseDate.getFullYear() === selectedYear
            );
          });

          const totalSpent = categoryExpenses.reduce(
            (sum, expense) => sum + expense.amount,
            0
          );

          // Check if we need to reset the monthly budget
          if (budget.month !== selectedMonth || budget.year !== selectedYear) {
            // Store the previous month's data in history
            const historyEntry = {
              month: budget.month,
              year: budget.year,
              amount: budget.amount,
              spent: budget.spent,
            };

            // Reset the budget for the new month but keep the calculated spending
            return {
              ...budget,
              month: selectedMonth,
              year: selectedYear,
              spent: totalSpent,
              alertShown: false,
              history: [...(budget.history || []), historyEntry],
            };
          }

          // Check if spending exceeds budget thresholds
          const spendingRatio = totalSpent / budget.amount;
          if (spendingRatio >= 0.9 && !budget.alertShown) {
            showBudgetAlert(budget.amount, totalSpent);
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
          // Filter budgets for selected month/year or get from history
          const filteredBudgets = parsedBudgets.map((budget) => {
            // Check if the budget is for the selected month/year
            if (
              budget.month === selectedMonth &&
              budget.year === selectedYear
            ) {
              return budget;
            }

            // Look for historical data
            const historicalEntry = budget.history?.find(
              (entry) =>
                entry.month === selectedMonth && entry.year === selectedYear
            );

            if (historicalEntry) {
              return {
                ...budget,
                amount: historicalEntry.amount,
                spent: historicalEntry.spent,
                month: historicalEntry.month,
                year: historicalEntry.year,
              };
            }

            // If no historical data, return budget with zero spent
            return {
              ...budget,
              month: selectedMonth,
              year: selectedYear,
              spent: 0,
            };
          });

          setBudgets(filteredBudgets);
        }
      }
    } catch (error) {
      console.error("Error loading budgets:", error);
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

      const now = new Date();
      const newBudget = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        category,
        spent: 0,
        month: now.getMonth(),
        year: now.getFullYear(),
        history: [],
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

  const handleMonthChange = (increment) => {
    let newMonth = selectedMonth + increment;
    let newYear = selectedYear;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    loadBudgets();
  };

  const getMonthName = (month) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month];
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.monthSelectorCard}>
          <Card.Content>
            <View style={styles.monthSelector}>
              <IconButton
                icon="chevron-left"
                onPress={() => handleMonthChange(-1)}
              />
              <Text variant="titleLarge">
                {getMonthName(selectedMonth)} {selectedYear}
              </Text>
              <IconButton
                icon="chevron-right"
                onPress={() => handleMonthChange(1)}
              />
            </View>
          </Card.Content>
        </Card>
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
              {availableCategories.map((cat) => (
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
          <CategoryManager onCategoriesChange={setAvailableCategories} />
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
                  progress={Math.min((budget.spent || 0) / (budget.amount || 1), 1)}
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

        <Card style={styles.recommendationsCard}>
          <Card.Content>
            <View style={styles.recommendationsHeader}>
              <Text variant="titleMedium">Smart Budget Recommendations</Text>
              <Button
                onPress={() => setShowRecommendations(!showRecommendations)}
              >
                {showRecommendations ? "Hide" : "Show"}
              </Button>
            </View>
            {showRecommendations && (
              <View style={styles.recommendationsList}>
                {recommendations.map((rec) => (
                  <View key={rec.category} style={styles.recommendationItem}>
                    <View style={styles.recommendationContent}>
                      <View style={styles.recommendationInfo}>
                        <Text
                          variant="bodyLarge"
                          numberOfLines={1}
                          style={styles.categoryText}
                        >
                          {rec.category}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1}>
                          Current: MMK {rec.currentSpending.toLocaleString()}
                          /month
                        </Text>
                      </View>
                      <View style={styles.recommendationDetails}>
                        <Text
                          variant="bodyMedium"
                          style={styles.recommendedAmount}
                          numberOfLines={1}
                        >
                          MMK {rec.recommendedBudget.toLocaleString()}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1}>
                          {rec.frequency} transactions/month
                        </Text>
                      </View>
                    </View>
                    <Button
                      mode="contained-tonal"
                      onPress={() => {
                        setAmount(rec.recommendedBudget.toString());
                        setCategory(rec.category);
                      }}
                      style={styles.applyButton}
                    >
                      Apply
                    </Button>
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

export default BudgetScreen;

const renderBudgetCard = (budget) => {
  const progress = budget.amount > 0 ? budget.spent / budget.amount : 0;
  const remaining = budget.amount - budget.spent;
  const isOverBudget = remaining < 0;

  // Get historical performance
  const historicalPerformance =
    budget.history
      ?.map((entry) => ({
        month: getMonthName(entry.month),
        year: entry.year,
        spent: entry.spent,
        amount: entry.amount,
        percentage: ((entry.spent / entry.amount) * 100).toFixed(1),
      }))
      .slice(-3) || [];

  return (
    <Card key={budget.category} style={styles.budgetCard}>
      <Card.Content>
        <View style={styles.budgetHeader}>
          <Text variant="titleMedium">{budget.category}</Text>
          <Text variant="titleMedium">
            MMK {budget.amount.toLocaleString()}
          </Text>
        </View>

        <ProgressBar
          progress={Math.min(progress, 1)}
          color={isOverBudget ? "#B00020" : "#6200ee"}
          style={styles.progressBar}
        />

        <View style={styles.budgetDetails}>
          <Text variant="bodyMedium">
            Spent: MMK {budget.spent.toLocaleString()}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: isOverBudget ? "#B00020" : "#6200ee" }}
          >
            {isOverBudget ? "Over by" : "Remaining"}: MMK{" "}
            {Math.abs(remaining).toLocaleString()}
          </Text>
        </View>

        {historicalPerformance.length > 0 && (
          <View style={styles.historySection}>
            <Text variant="bodySmall" style={styles.historyTitle}>
              Recent History:
            </Text>
            {historicalPerformance.map((entry, index) => (
              <Text key={index} variant="bodySmall" style={styles.historyItem}>
                {entry.month} {entry.year}: {entry.percentage}% used (MMK{" "}
                {entry.spent.toLocaleString()} / {entry.amount.toLocaleString()}
                )
              </Text>
            ))}
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
    paddingTop: 8,
  },
  monthSelectorCard: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: "#ffffff",
    elevation: 2,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
  },
  budgetCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#ffffff",
    borderRadius: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: "#6200ee",
  },
  budgetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingVertical: 4,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginVertical: 12,
  },
  budgetDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
  },
  historySection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  historyTitle: {
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1a1a1a",
  },
  historyItem: {
    marginVertical: 4,
    color: "#4a4a4a",
    paddingHorizontal: 4,
  },
  recommendationsCard: {
    margin: 16,
    marginBottom: 80,
    marginTop: 8,
    elevation: 2,
  },
  recommendationsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  recommendationsList: {
    gap: 8,
  },
  recommendationItem: {
    flexDirection: "column",
    gap: 8,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  recommendedAmount: {
    color: "#6200ee",
    fontWeight: "bold",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 80,
  },
  summaryCard: {
    margin: 16,
    elevation: 4,
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryTitle: {
    marginBottom: 16,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryProgress: {
    marginTop: 16,
    height: 8,
    borderRadius: 4,
  },
  inputContainer: {
    padding: 16,
  },
  input: {
    marginBottom: 16,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  budgetsList: {
    padding: 16,
    paddingTop: 0,
  },
  budgetCard: {
    marginBottom: 16,
    elevation: 3,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    padding: 8,
  },
  progressBar: {
    marginVertical: 12,
    height: 8,
    borderRadius: 4,
  },
  budgetCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  recommendationContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  recommendationInfo: {
    flex: 1,
    marginRight: 12,
  },
  recommendationDetails: {
    alignItems: "flex-end",
  },
  categoryText: {
    fontWeight: "600",
    marginBottom: 2,
  },
  applyButton: {
    marginTop: 8,
    borderRadius: 4,
  },
});
