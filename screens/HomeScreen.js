import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import { Text, Card, Button } from "react-native-paper";
import { LineChart } from 'react-native-gifted-charts';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

const HomeScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);
  const [monthlyStats, setMonthlyStats] = useState({
    totalSpent: 0,
    budgetUsage: 0,
    topCategory: "",
    recentExpenses: [],
    spendingData: [0, 0, 0, 0, 0, 0, 0],
    avgDailySpending: 0,
    projectedSpending: 0,
    totalBudget: 0,
  });

  useEffect(() => {
    loadMonthlyStats();
    const interval = setInterval(loadMonthlyStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
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

      // Calculate average daily spending
      const avgDailySpending =
        totalSpent / new Date(thisYear, thisMonth + 1, 0).getDate();

      // Calculate projected monthly spending
      const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
      const projectedSpending = (avgDailySpending * daysInMonth).toFixed(0);

      setMonthlyStats({
        totalSpent,
        budgetUsage,
        topCategory,
        recentExpenses,
        spendingData,
        avgDailySpending,
        projectedSpending: parseFloat(projectedSpending),
        totalBudget,
      });
    } catch (error) {
      console.error("Error loading monthly stats:", error);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
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
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="bodyMedium">Projected Spending</Text>
                <Text
                  variant="titleMedium"
                  style={{
                    color:
                      monthlyStats.projectedSpending > monthlyStats.totalBudget
                        ? "#FF4444"
                        : "#4CAF50",
                  }}
                >
                  MMK {monthlyStats.projectedSpending?.toLocaleString()}
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

              return monthlyStats.spendingData.length > 0 ? (
                <View style={styles.chartWrapper}>
                  <LineChart
                    data={monthlyStats.spendingData.map((value, index) => {
                      const formattedValue = isFinite(value) ? value : 0;
                      return {
                        value: formattedValue,
                        label: new Date(last7Days[index]).toLocaleDateString('en-US', {
                          weekday: 'short',
                        }),
                        dataPointText: formattedValue > 0 ? formattedValue.toLocaleString() : '',
                      };
                    })}
                    width={Dimensions.get('window').width - 64}
                    height={200}
                    hideDataPoints={false}
                    showDataPointOnPress
                    color="#6200ee"
                    thickness={2}
                    startFillColor="rgba(98, 0, 238, 0.2)"
                    endFillColor="rgba(98, 0, 238, 0.0)"
                    initialSpacing={20}
                    endSpacing={20}
                    spacing={45}
                    backgroundColor="#fff"
                    showVerticalLines
                    verticalLinesColor="rgba(0,0,0,0.1)"
                    xAxisColor="rgba(0,0,0,0.3)"
                    yAxisColor="rgba(0,0,0,0.3)"
                    yAxisTextStyle={{ color: '#000' }}
                    xAxisLabelTextStyle={{ color: '#000', fontSize: 8, rotation: 45 }}
                    maxValue={Math.max(...monthlyStats.spendingData.filter(v => isFinite(v)).map(v => v || 0)) * 1.2 || 1000}
                    yAxisLabelPrefix="MMK "
                    yAxisLabelSuffix=""
                    formatYLabel={(label) => Number(label).toLocaleString()}
                    curved
                    pressEnabled
                    onPress={(item) => {
                      if (item && isFinite(item.value)) {
                        Alert.alert(
                          'Daily Spending',
                          `Date: ${item.label}\nAmount: MMK ${item.value.toLocaleString()}`,
                          [{ text: 'OK' }]
                        );
                      }
                    }}
                  />
                </View>
              ) : (
                <View style={styles.noDataContainer}>
                  <Text>No data available</Text>
                </View>
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
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingBottom: 80,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 24,
    alignItems: "center",
    backgroundColor: "#fff",
    marginBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
