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
import { LineChart } from "react-native-gifted-charts";
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
    balance: 0,
    totalIncome: 0,
  });

  useEffect(() => {
    loadMonthlyStats();
    const interval = setInterval(loadMonthlyStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [isFocused]);

  const loadMonthlyStats = async () => {
    try {
      // Load expenses and incomes
      const savedExpenses = await AsyncStorage.getItem("expenses");
      const savedIncomes = await AsyncStorage.getItem("incomes");
      const expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
      const incomes = savedIncomes ? JSON.parse(savedIncomes) : [];

      // Load budgets
      const savedBudgets = await AsyncStorage.getItem("budgets");
      const budgets = savedBudgets ? JSON.parse(savedBudgets) : [];

      // Validate data types
      if (!Array.isArray(expenses) || !Array.isArray(budgets)) {
        throw new Error("Invalid data format");
      }

      // Calculate total budget with type checking
      const totalBudget = budgets.reduce(
        (sum, budget) =>
          sum + (typeof budget.amount === "number" ? budget.amount : 0),
        0
      );

      // Filter this month's expenses with date validation
      const today = new Date();
      const thisMonth = today.getMonth();
      const thisYear = today.getFullYear();

      const monthlyExpenses = expenses.filter((expense) => {
        try {
          const expenseDate = new Date(expense.date);
          if (isNaN(expenseDate.getTime())) return false;
          return (
            expenseDate.getMonth() === thisMonth &&
            expenseDate.getFullYear() === thisYear
          );
        } catch (e) {
          return false;
        }
      });

      // Calculate statistics with type checking
      const totalSpent = monthlyExpenses.reduce(
        (sum, exp) => sum + (typeof exp.amount === "number" ? exp.amount : 0),
        0
      );
      
      // Calculate total income
      const totalIncome = incomes.reduce(
        (sum, income) => sum + (typeof income.amount === "number" ? income.amount : 0),
        0
      );
      
      // Calculate balance
      const balance = totalIncome - expenses.reduce(
        (sum, expense) => sum + (typeof expense.amount === "number" ? expense.amount : 0),
        0
      );
      
      const budgetUsage =
        totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

      // Get top category with type validation
      const categoryTotals = {};
      monthlyExpenses.forEach((expense) => {
        if (
          typeof expense.category === "string" &&
          typeof expense.amount === "number"
        ) {
          categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
        }
      });
      const topCategory =
        Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "No expenses";

      // Get recent expenses with validation
      const recentExpenses = monthlyExpenses
        .filter(
          (exp) =>
            typeof exp.amount === "number" && typeof exp.date === "string"
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);

      // Get last 7 days spending with enhanced validation
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split("T")[0];
      }).reverse();

      const spendingData = last7Days.map((date) => {
        try {
          return expenses
            .filter((exp) => {
              if (!exp.date || typeof exp.amount !== "number") return false;
              try {
                const expDate = new Date(exp.date);
                const targetDate = new Date(date);
                return (
                  expDate.getFullYear() === targetDate.getFullYear() &&
                  expDate.getMonth() === targetDate.getMonth() &&
                  expDate.getDate() === targetDate.getDate()
                );
              } catch (e) {
                return false;
              }
            })
            .reduce(
              (sum, exp) => sum + (isFinite(exp.amount) ? exp.amount : 0),
              0
            );
        } catch (e) {
          return 0;
        }
      });

      // Calculate average daily spending with validation
      const daysInMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
      const avgDailySpending = totalSpent / daysInMonth;
      const projectedSpending = Number(
        (avgDailySpending * daysInMonth).toFixed(0)
      );

      setMonthlyStats({
        totalSpent: isFinite(totalSpent) ? totalSpent : 0,
        budgetUsage: isFinite(budgetUsage) ? budgetUsage : 0,
        topCategory,
        recentExpenses,
        spendingData: spendingData.map((value) =>
          isFinite(value) ? value : 0
        ),
        avgDailySpending: isFinite(avgDailySpending) ? avgDailySpending : 0,
        projectedSpending: isFinite(projectedSpending) ? projectedSpending : 0,
        totalBudget: isFinite(totalBudget) ? totalBudget : 0,
        balance: isFinite(balance) ? balance : 0,
        totalIncome: isFinite(totalIncome) ? totalIncome : 0
      });
    } catch (error) {
      console.error("Error loading monthly stats:", error);
      // Set safe default values in case of error
      setMonthlyStats({
        totalSpent: 0,
        budgetUsage: 0,
        topCategory: "No data",
        recentExpenses: [],
        spendingData: [0, 0, 0, 0, 0, 0, 0],
        avgDailySpending: 0,
        projectedSpending: 0,
        totalBudget: 0,
      });
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.balanceContainer}>
            <Text variant="titleLarge" style={styles.balanceTitle}>Current Balance</Text>
            <Text variant="headlineLarge" style={styles.balanceAmount}>
              MMK {monthlyStats.balance.toLocaleString()}
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text variant="titleMedium">Total Income</Text>
              <Text variant="bodyLarge">MMK {monthlyStats.totalIncome.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleMedium">Total Expenses</Text>
              <Text variant="bodyLarge">MMK {monthlyStats.totalSpent.toLocaleString()}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text variant="headlineMedium">Finance Tracker</Text>
          <Text variant="bodyLarge">
            Welcome to your personal finance manager
          </Text>
        </View>

        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.divider} />
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
                <View>
                  <LineChart
                    data={monthlyStats.spendingData.map((value, index) => {
                      const formattedValue = isFinite(value) ? value : 0;
                      return {
                        value: formattedValue,
                        label: new Date(last7Days[index]).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                          }
                        ),
                        dataPointText:
                          formattedValue > 0
                            ? formattedValue.toLocaleString()
                            : "",
                      };
                    })}
                    width={Dimensions.get("window").width - 64}
                    height={200}
                    hideDataPoints={false}
                    showDataPointOnPress
                    color="#6200ee"
                    areaChart={true}
                    startOpacity={0.8}
                    endOpacity={0.1}
                    thickness={1}
                    startFillColor="rgba(98, 0, 238, 0.2)"
                    endFillColor="rgba(98, 0, 238, 0.0)"
                    initialSpacing={20}
                    endSpacing={20}
                    spacing={45}
                    noOfSections={5}
                    backgroundColor="#fff"
                    showVerticalLines
                    verticalLinesColor="rgba(0,0,0,0.1)"
                    xAxisColor="rgba(0,0,0,0.3)"
                    yAxisColor="rgba(0,0,0,0.3)"
                    yAxisTextStyle={{ color: "#000", fontSize: 7 }}
                    xAxisLabelTextStyle={{
                      color: "#000",
                      fontSize: 8,
                    }}
                    maxValue={
                      Math.max(
                        ...monthlyStats.spendingData
                          .filter((v) => isFinite(v))
                          .map((v) => v || 0)
                      ) * 1.2 || 1000
                    }
                    yAxisLabelSuffix=""
                    formatYLabel={(label) => Number(label).toLocaleString()}
                    curved
                    pressEnabled
                    onPress={(item) => {
                      if (item && isFinite(item.value)) {
                        Alert.alert(
                          "Daily Spending",
                          `Date: ${
                            item.label
                          }\nAmount: MMK ${item.value.toLocaleString()}`,
                          [{ text: "OK" }]
                        );
                      }
                    }}
                  />
                </View>
              ) : (
                <View>
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
              <Button
                style={{ width: 100 }}
                onPress={() => navigation.navigate("Expenses")}
              >
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
    backgroundColor: "#f0f2f5",
    paddingTop: 8,
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceTitle: {
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  summaryCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderLeftWidth: 4,
    borderLeftColor: "#6200ee",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    marginBottom: 12,
    color: '#2c3e50',
  },
  amount: {
    color: "#6200ee",
    marginVertical: 8,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
  },
  statItem: {
    alignItems: "center",
  },
  chartCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    borderRadius: 20,
    backgroundColor: "#fff",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    marginBottom: 16,
    color: '#2c3e50',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  recentCard: {
    margin: 16,
    marginTop: 0,
    elevation: 4,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderLeftWidth: 4,
    borderLeftColor: "#FF5252",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingHorizontal: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  }
});

export default HomeScreen;
