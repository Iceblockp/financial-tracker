import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Dimensions } from "react-native";
import { Text, Card, SegmentedButtons, Button } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { LineChart, PieChart } from "react-native-gifted-charts";

const AnalyticsScreen = () => {
  const isFocused = useIsFocused();
  const [expenses, setExpenses] = useState([]);
  const [timeRange, setTimeRange] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartType, setChartType] = useState("spending");
  const [comparisonMode, setComparisonMode] = useState("previous");

  useEffect(() => {
    if (isFocused) {
      loadExpenses();
      const interval = setInterval(loadExpenses, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
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
      week: (() => {
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return startOfWeek;
      })(),
      month: new Date(selectedYear, selectedMonth, 1),
      year: new Date(selectedYear, 0, 1),
    };
    return ranges[timeRange] || ranges.month;
  };

  const filterExpensesByDate = () => {
    const startDate = getDateRange();
    const endDate = new Date(startDate);

    if (timeRange === "month") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (timeRange === "week") {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    return expenses.filter((expense) => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= startDate && expenseDate < endDate;
    });
  };

  const calculateDailySpending = () => {
    const filteredExpenses = filterExpensesByDate();
    const dailyTotals = {};
    const previousPeriodTotals = {};

    // Calculate the number of days to show based on timeRange
    const daysToShow =
      timeRange === "week"
        ? 7
        : timeRange === "month"
        ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
        : 12;

    // Get days for current period with validation
    const days = Array.from({ length: daysToShow }, (_, i) => {
      let date;
      try {
        if (timeRange === "week") {
          date = new Date();
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - date.getDay() + i);
        } else if (timeRange === "month") {
          date = new Date(Date.UTC(selectedYear, selectedMonth, i + 1));
          if (
            date.getUTCMonth() !== selectedMonth ||
            date.getUTCFullYear() !== selectedYear
          ) {
            return null;
          }
        } else {
          date = new Date(selectedYear, i, 1);
        }
        return date.toISOString().split("T")[0];
      } catch (e) {
        console.error("Error creating date:", e);
        return null;
      }
    }).filter(Boolean);

    // Initialize dailyTotals with 0 for all days
    days.forEach((date) => {
      if (date) dailyTotals[date] = 0;
    });

    // Current period with type checking
    filteredExpenses.forEach((expense) => {
      try {
        if (!expense.date || typeof expense.amount !== "number") return;
        const expenseDate = new Date(expense.date);
        if (isNaN(expenseDate.getTime())) return;

        if (timeRange === "year") {
          const monthKey = new Date(selectedYear, expenseDate.getMonth(), 1)
            .toISOString()
            .split("T")[0];
          if (expenseDate.getFullYear() === selectedYear) {
            dailyTotals[monthKey] =
              (dailyTotals[monthKey] || 0) + expense.amount;
          }
        } else {
          const date = expenseDate.toISOString().split("T")[0];
          if (days.includes(date)) {
            dailyTotals[date] = (dailyTotals[date] || 0) + expense.amount;
          }
        }
      } catch (e) {
        console.error("Error processing expense:", e);
      }
    });

    const currentData = days.map((date) => {
      const value = dailyTotals[date] || 0;
      return isFinite(value) ? value : 0;
    });

    const previousData = days.map((date) => {
      const value = previousPeriodTotals[date] || 0;
      return isFinite(value) ? value : 0;
    });

    const labels = days.map((date) => {
      try {
        return new Date(date).toLocaleDateString("en-US", {
          weekday: timeRange === "week" ? "short" : undefined,
          month: "short",
          day: "numeric",
          year: timeRange === "year" ? "numeric" : undefined,
        });
      } catch (e) {
        console.error("Error formatting date:", e);
        return "";
      }
    });

    return { labels, currentData, previousData };
  };

  const calculateCategoryDistribution = () => {
    const filteredExpenses = filterExpensesByDate();
    const categoryTotals = {};

    // Calculate category totals with type checking
    filteredExpenses.forEach((expense) => {
      try {
        if (
          typeof expense.category === "string" &&
          typeof expense.amount === "number" &&
          isFinite(expense.amount)
        ) {
          categoryTotals[expense.category] =
            (categoryTotals[expense.category] || 0) + expense.amount;
        }
      } catch (e) {
        console.error("Error processing category data:", e);
      }
    });

    // Transform to pie chart data with validation
    const data = Object.entries(categoryTotals)
      .filter(([name, amount]) => name && isFinite(amount) && amount > 0)
      .map(([name, amount]) => ({
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
      total /
      (timeRange === "week"
        ? 7
        : timeRange === "month"
        ? new Date(selectedYear, selectedMonth + 1, 0).getDate()
        : 365);

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
  const { labels = [], currentData: data = [] } =
    calculateDailySpending() || {};
  const pieData = calculateCategoryDistribution();

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            Expense Analytics
          </Text>

          <View>
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
            {timeRange === "month" && (
              <View style={styles.dateSelector}>
                <Button
                  onPress={() => {
                    const newMonth = selectedMonth - 1;
                    if (newMonth < 0) {
                      setSelectedMonth(11);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(newMonth);
                    }
                  }}
                >
                  Previous
                </Button>
                <Text style={styles.dateText}>
                  {new Date(selectedYear, selectedMonth).toLocaleString(
                    "default",
                    { month: "long", year: "numeric" }
                  )}
                </Text>
                <Button
                  onPress={() => {
                    const newMonth = selectedMonth + 1;
                    if (newMonth > 11) {
                      setSelectedMonth(0);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(newMonth);
                    }
                  }}
                >
                  Next
                </Button>
              </View>
            )}
            {timeRange === "year" && (
              <View style={styles.dateSelector}>
                <Button
                  onPress={() => setSelectedYear(selectedYear - 1)}
                  disabled={selectedYear <= new Date().getFullYear() - 2}
                >
                  Previous
                </Button>
                <Text style={styles.dateText}>{selectedYear}</Text>
                <Button
                  onPress={() => setSelectedYear(selectedYear + 1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                >
                  Next
                </Button>
              </View>
            )}
          </View>

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
            {data.length > 0 ? (
              <View>
                <LineChart
                  key={timeRange} // Add key prop to force re-render on timeRange change
                  data={data.map((value, index) => ({
                    value: isFinite(value) ? value : 0,
                    label: labels[index] || "",
                    dataPointText: isFinite(value)
                      ? value.toLocaleString()
                      : "0",
                  }))}
                  width={Dimensions.get("window").width - 64}
                  height={220}
                  hideDataPoints={false}
                  color="#36A2EB"
                  thickness={2}
                  startFillColor="rgba(54, 162, 235, 0.2)"
                  endFillColor="rgba(54, 162, 235, 0.0)"
                  initialSpacing={20}
                  endSpacing={20}
                  spacing={
                    timeRange === "week" ? 50 : timeRange === "month" ? 30 : 15
                  }
                  backgroundColor="#fff"
                  showVerticalLines
                  verticalLinesColor="rgba(0,0,0,0.1)"
                  xAxisColor="rgba(0,0,0,0.3)"
                  yAxisColor="rgba(0,0,0,0.3)"
                  yAxisTextStyle={{ color: "#000", fontSize: 7 }}
                  xAxisLabelTextStyle={{
                    color: "#000",
                    fontSize: 8,
                    rotation: 45,
                  }}
                  curved
                  maxValue={
                    Math.max(...data.map((v) => (isFinite(v) ? v : 0))) * 1.2
                  }
                  noDataText="No data available"
                  yAxisLabelSuffix=""
                  formatYLabel={(label) =>
                    Math.round(Number(label)).toLocaleString()
                  }
                  numberOfYAxisGuideLine={5}
                />
              </View>
            ) : (
              <View>
                <Text>No data available</Text>
              </View>
            )}
          </View>

          {/* <View style={styles.chartContainer}>
            <Text variant="titleMedium" style={styles.chartTitle}>
              Category Distribution
            </Text>
            {pieData && pieData.length > 0 ? (
              <>
                <PieChart
                  data={pieData.map((item) => {
                    const totalAmount = pieData.reduce(
                      (sum, d) => sum + (isFinite(d.amount) ? d.amount : 0),
                      0
                    );
                    const percentage =
                      totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0;
                    return {
                      value: isFinite(item.amount) ? item.amount : 0,
                      text:
                        percentage >= 5
                          ? `${item.name}\n${percentage.toFixed(1)}%`
                          : "",
                      color: item.color,
                      textColor: "#000",
                      textSize: 12,
                      shiftTextX: 0,
                      shiftTextY: 0,
                      focused: false,
                    };
                  })}
                  donut
                  showText
                  textColor="black"
                  radius={120}
                  textSize={12}
                  focusOnPress
                  showTextBackground
                  textBackgroundColor="#fff"
                  textBackgroundRadius={22}
                  showValuesAsLabels
                  centerLabelComponent={() => {
                    const total = pieData.reduce(
                      (sum, item) =>
                        sum + (isFinite(item.amount) ? item.amount : 0),
                      0
                    );
                    return (
                      <View style={{ alignItems: "center" }}>
                        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                          Total
                        </Text>
                        <Text style={{ fontSize: 14 }}>
                          MMK {total.toLocaleString()}
                        </Text>
                      </View>
                    );
                  }}
                  labelsPosition="onBorder"
                  labelType="vertical"
                  innerCircleColor="#fff"
                  innerRadius={70}
                  valueThreshold={5}
                />
              </>
            ) : (
              <View>
                <Text>No expense data available for this period</Text>
              </View>
            )}
          </View> */}
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#6200ee",
    marginVertical: 4,
    textAlign: "center",
  },
  insightSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  chartContainer: {
    marginTop: 24,
    marginBottom: 80,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  dateSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default AnalyticsScreen;
