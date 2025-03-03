import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { LineChart } from "react-native-chart-kit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

const HomeScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [monthlyStats, setMonthlyStats] = useState({
    totalSpent: 0,
    budgetUsage: 0,
    topCategory: "",
    recentExpenses: [],
    spendingData: [0, 0, 0, 0, 0, 0, 0],
  });

  useEffect(() => {
    loadMonthlyStats();
  }, [isFocused]);

  const loadMonthlyStats = async () => {
    try {
      // Load expenses
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];

      // Load budgets
      const savedBudgets = await AsyncStorage.getItem("budgets");
      const budgets = savedBudgets ? JSON.parse(savedBudgets) : [];

      // Calculate total budget
      const totalBudget = budgets.reduce(
        (sum, budget) => sum + budget.amount,
        0
      );

      // Filter this month's expenses
      const today = new Date();
      const thisMonth = today.getMonth();
      const thisYear = today.getFullYear();

      const monthlyExpenses = expenses.filter((expense) => {
        const expenseDate = new Date(expense.date);
        return (
          expenseDate.getMonth() === thisMonth &&
          expenseDate.getFullYear() === thisYear
        );
      });

      // Calculate statistics
      const totalSpent = monthlyExpenses.reduce(
        (sum, exp) => sum + exp.amount,
        0
      );
      const budgetUsage =
        totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      // Get top category
      const categoryTotals = {};
      monthlyExpenses.forEach((expense) => {
        categoryTotals[expense.category] =
          (categoryTotals[expense.category] || 0) + expense.amount;
      });
      const topCategory =
        Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "No expenses";

      // Get recent expenses
      const recentExpenses = monthlyExpenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      // Get last 7 days spending
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).reverse();

      const spendingData = last7Days.map((date) => {
        return expenses
          .filter((exp) => {
            const expDate = new Date(exp.date);
            const targetDate = new Date(date);
            return (
              expDate.getFullYear() === targetDate.getFullYear() &&
              expDate.getMonth() === targetDate.getMonth() &&
              expDate.getDate() === targetDate.getDate()
            );
          })
          .reduce((sum, exp) => sum + exp.amount, 0);
      });

      setMonthlyStats({
        totalSpent,
        budgetUsage,
        topCategory,
        recentExpenses,
        spendingData,
      });
    } catch (error) {
      console.error("Error loading monthly stats:", error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium">Finance Tracker</Text>
        <Text variant="bodyLarge">
          Welcome to your personal finance manager
        </Text>
      </View>

      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.cardTitle}>
            Monthly Summary
          </Text>
          <Text variant="headlineMedium" style={styles.amount}>
            MMK {(monthlyStats.totalSpent || 0).toLocaleString()}
          </Text>
          <Text variant="bodyMedium">Total Spent This Month</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="bodyMedium">Budget Usage</Text>
              <Text
                variant="titleMedium"
                style={{
                  color:
                    monthlyStats.budgetUsage > 90
                      ? "#FF4444"
                      : monthlyStats.budgetUsage > 70
                      ? "#FFA000"
                      : "#4CAF50",
                }}
              >
                {Math.round(monthlyStats.budgetUsage)}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="bodyMedium">Top Category</Text>
              <Text variant="titleMedium">{monthlyStats.topCategory}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.chartTitle}>
            Last 7 Days Spending
          </Text>
          {(() => {
            const last7Days = Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - i);
              return date.toISOString().split("T")[0];
            }).reverse();

            return (
              <LineChart
                data={{
                  labels: last7Days.map((date) =>
                    new Date(date).toLocaleDateString("en-US", {
                      weekday: "short",
                    })
                  ),
                  datasets: [
                    {
                      data: monthlyStats.spendingData,
                      color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                      strokeWidth: 2,
                    },
                  ],
                }}
                width={Dimensions.get("window").width - 64}
                height={200}
                yAxisLabel="MMK "
                yAxisSuffix=""
                withDots={true}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                fromZero={true}
                chartConfig={{
                  backgroundColor: "#ffffff",
                  backgroundGradientFrom: "#ffffff",
                  backgroundGradientTo: "#ffffff",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(98, 0, 238, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#6200ee",
                  },
                  propsForLabels: {
                    fontSize: 10,
                  },
                }}
                bezier
                style={styles.chart}
              />
            );
          })()}
        </Card.Content>
      </Card>

      <Card style={styles.recentCard}>
        <Card.Content>
          <View style={styles.recentHeader}>
            <Text variant="titleMedium">Recent Expenses</Text>
            <Button onPress={() => navigation.navigate("Expenses")}>
              View All
            </Button>
          </View>
          {monthlyStats.recentExpenses.map((expense, index) => (
            <View key={expense.id} style={styles.expenseItem}>
              <View>
                <Text variant="bodyLarge">{expense.description}</Text>
                <Text variant="bodySmall">{expense.category}</Text>
              </View>
              <Text variant="titleMedium">
                MMK {expense.amount?.toLocaleString()}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 16,
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  cardTitle: {
    marginBottom: 8,
  },
  amount: {
    color: "#6200ee",
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  recentCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
});

export default HomeScreen;
