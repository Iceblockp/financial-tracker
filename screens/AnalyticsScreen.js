import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Text, Card, SegmentedButtons, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useIsFocused } from "@react-navigation/native";

const AnalyticsScreen = () => {
  const isFocused = useIsFocused();
  const [expenses, setExpenses] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [chartType, setChartType] = useState("spending");
  const [comparisonMode, setComparisonMode] = useState("previous");

  useEffect(() => {
    if (isFocused) {
      loadExpenses();
    }
  }, [isFocused]);

  const loadExpenses = async () => {
    try {
      const savedExpenses = await AsyncStorage.getItem("expenses");
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    } catch (error) {
      console.error("Error loading expenses:", error);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      year: new Date(now.getFullYear(), 0, 1),
    };
    return ranges[timeRange] || ranges.month;
  };

  const filterExpensesByDate = () => {
    const startDate = getDateRange();
    return expenses.filter((expense) => new Date(expense.date) >= startDate);
  };

  const calculateDailySpending = () => {
    const filteredExpenses = filterExpensesByDate();
    const dailyTotals = {};
    const previousPeriodTotals = {};

    // Current period
    filteredExpenses.forEach((expense) => {
      const date = new Date(expense.date).toLocaleDateString();
      dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
    });

    // Previous period
    const previousStartDate = new Date(getDateRange());
    if (timeRange === "week") {
      previousStartDate.setDate(previousStartDate.getDate() - 7);
    } else if (timeRange === "month") {
      previousStartDate.setMonth(previousStartDate.getMonth() - 1);
    } else {
      previousStartDate.setFullYear(previousStartDate.getFullYear() - 1);
    }

    const previousPeriodExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= previousStartDate && expenseDate < getDateRange();
    });

    previousPeriodExpenses.forEach((expense) => {
      const date = new Date(expense.date).toLocaleDateString();
      previousPeriodTotals[date] =
        (previousPeriodTotals[date] || 0) + expense.amount;
    });

    const labels = Object.keys(dailyTotals).slice(-7);
    const currentData = labels.map((date) => {
      const value = dailyTotals[date] || 0;
      return isFinite(value) ? value : 0;
    });
    const previousData = labels.map((date) => {
      const value = previousPeriodTotals[date] || 0;
      return isFinite(value) ? value : 0;
    });

    return { labels, currentData, previousData };
  };

  const calculateCategoryDistribution = () => {
    const filteredExpenses = filterExpensesByDate();
    const categoryTotals = {};

    filteredExpenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const data = Object.entries(categoryTotals).map(([name, amount]) => ({
      name,
      amount,
      color: getRandomColor(),
      legendFontColor: "#7F7F7F",
      legendFontSize: 12,
    }));

    return data;
  };

  const getRandomColor = () => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const calculateInsights = () => {
    const filteredExpenses = filterExpensesByDate();
    const total = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const avgPerDay =
      total / (timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365);

    const categoryTotals = {};
    filteredExpenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    const topCategory = Object.entries(categoryTotals).sort(
      ([, a], [, b]) => b - a
    )[0];

    return {
      total,
      avgPerDay,
      topCategory: topCategory ? topCategory[0] : "N/A",
      topAmount: topCategory ? topCategory[1] : 0,
      transactionCount: filteredExpenses.length,
    };
  };

  const insights = calculateInsights();
  const { labels, currentData: data } = calculateDailySpending();
  const pieData = calculateCategoryDistribution();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Expense Analytics
          </Text>

          <SegmentedButtons
            value={timeRange}
            onValueChange={setTimeRange}
            buttons={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "year", label: "Year" },
            ]}
            style={styles.segmentedButtons}
          />

          <View style={styles.insightsContainer}>
            <Text variant="titleMedium" style={styles.insightTitle}>
              Financial Insights
            </Text>
            <View style={styles.insightRow}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Total Spent</Text>
                <Text style={styles.insightValue}>
                  MMK {insights.total.toLocaleString()}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Daily Average</Text>
                <Text style={styles.insightValue}>
                  MMK {Math.round(insights.avgPerDay).toLocaleString()}
                </Text>
              </View>
            </View>
            <View style={styles.insightRow}>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Top Category</Text>
                <Text style={styles.insightValue}>{insights.topCategory}</Text>
                <Text style={styles.insightSubtext}>
                  MMK {insights.topAmount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.insightItem}>
                <Text style={styles.insightLabel}>Transactions</Text>
                <Text style={styles.insightValue}>
                  {insights.transactionCount}
                </Text>
                <Text style={styles.insightSubtext}>This {timeRange}</Text>
              </View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Spending Trend
            </Text>
            <LineChart
              data={{
                labels: labels.length > 0 ? labels : ["No Data"],
                datasets: [
                  {
                    data:
                      data.length > 0
                        ? data.map((val) => (isFinite(val) ? val : 0))
                        : [0],
                  },
                ],
              }}
              width={Dimensions.get("window").width - 64}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: "6",
                  strokeWidth: "2",
                  stroke: "#ffa726",
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>

          <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Category Distribution
            </Text>
            <PieChart
              data={pieData}
              width={Dimensions.get("window").width - 64}
              height={220}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
            />
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingBottom: 80,
  },
  card: {
    margin: 16,
    elevation: 4,
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  insightsContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  insightTitle: {
    marginBottom: 16,
    textAlign: "center",
    color: "#6200ee",
  },
  insightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  insightItem: {
    flex: 1,
    alignItems: "center",
    padding: 8,
  },
  insightLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6200ee",
  },
  insightSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  chartContainer: {
    marginTop: 24,
  },
  chartTitle: {
    marginBottom: 16,
  },
  chart: {
    marginVertical: 12,
    borderRadius: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    backgroundColor: "#fff",
  },
});

export default AnalyticsScreen;
