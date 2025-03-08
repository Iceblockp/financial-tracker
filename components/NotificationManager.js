import React, { useState, useEffect } from "react";
import { View, StyleSheet, Platform, Alert } from "react-native";
import { Text, Switch, Button, Portal } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

const NotificationManager = () => {
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("20:00");
  const [visible, setVisible] = useState(false);
  const [lastRecordedDate, setLastRecordedDate] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [recurringAlerts, setRecurringAlerts] = useState(true);

  useEffect(() => {
    loadSettings();
    checkLastRecordedExpense();
    const interval = setInterval(checkAndNotify, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem("notificationSettings");
      if (settings) {
        const { 
          enabled: savedEnabled, 
          reminderTime: savedTime,
          budgetAlerts: savedBudgetAlerts,
          recurringAlerts: savedRecurringAlerts 
        } = JSON.parse(settings);
        setEnabled(savedEnabled);
        setReminderTime(savedTime);
        setBudgetAlerts(savedBudgetAlerts ?? true);
        setRecurringAlerts(savedRecurringAlerts ?? true);
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem(
        "notificationSettings",
        JSON.stringify({
          enabled,
          reminderTime,
          budgetAlerts,
          recurringAlerts,
        })
      );
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  };

  const checkLastRecordedExpense = async () => {
    try {
      const expenses = await AsyncStorage.getItem("expenses");
      if (expenses) {
        const parsedExpenses = JSON.parse(expenses);
        if (parsedExpenses.length > 0) {
          const lastExpense = parsedExpenses[0];
          setLastRecordedDate(new Date(lastExpense.date));
        }
      }
    } catch (error) {
      console.error("Error checking last recorded expense:", error);
    }
  };

  const checkAndNotify = async () => {
    if (!enabled) return;

    const now = new Date();
    const [hours, minutes] = reminderTime.split(":");
    const reminderDateTime = new Date();
    reminderDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Check daily expense reminder
    if (
      now.getHours() === parseInt(hours) &&
      now.getMinutes() === parseInt(minutes)
    ) {
      if (!lastRecordedDate || !isSameDay(lastRecordedDate, now)) {
        showReminderAlert();
      }
    }

    // Check budget thresholds
    if (budgetAlerts) {
      await checkBudgetThresholds();
    }

    // Check recurring transactions
    if (recurringAlerts) {
      await checkRecurringTransactions();
    }
  };

  const isSameDay = (date1, date2) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const showReminderAlert = () => {
    Alert.alert(
      "Daily Expense Reminder",
      "Don't forget to record your expenses for today!",
      [{ text: "OK", onPress: () => console.log("Reminder acknowledged") }]
    );
  };

  const onToggleSwitch = (value) => {
    setEnabled(value);
    saveSettings();
  };

  const onConfirm = (event, selectedTime) => {
    setVisible(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, "0");
      const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
      setReminderTime(`${hours}:${minutes}`);
      saveSettings();
    }
  };

  const showTimePicker = () => {
    const [hours, minutes] = reminderTime.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
  };

  const checkBudgetThresholds = async () => {
    try {
      const savedBudgets = await AsyncStorage.getItem("budgets");
      const savedExpenses = await AsyncStorage.getItem("expenses");
      
      if (savedBudgets && savedExpenses) {
        const budgets = JSON.parse(savedBudgets);
        const expenses = JSON.parse(savedExpenses);
        
        budgets.forEach(budget => {
          const categoryExpenses = expenses.filter(exp => exp.category === budget.category);
          const totalSpent = categoryExpenses.reduce((sum, exp) => sum + exp.amount, 0);
          const usagePercentage = (totalSpent / budget.amount) * 100;
          
          if (usagePercentage >= 90 && !budget.alertShown) {
            Alert.alert(
              "Budget Alert",
              `You've used ${Math.round(usagePercentage)}% of your ${budget.category} budget!`,
              [{ text: "OK" }]
            );
          }
        });
      }
    } catch (error) {
      console.error("Error checking budget thresholds:", error);
    }
  };

  const checkRecurringTransactions = async () => {
    try {
      const savedRecurring = await AsyncStorage.getItem("recurringTransactions");
      
      if (savedRecurring) {
        const recurring = JSON.parse(savedRecurring);
        const now = new Date();
        
        recurring.forEach(transaction => {
          const dueDate = new Date(transaction.nextDue);
          const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
          
          if (daysDiff <= 1 && !transaction.notified) {
            Alert.alert(
              "Recurring Transaction Due",
              `${transaction.description} (MMK ${transaction.amount}) is due ${daysDiff === 0 ? 'today' : 'tomorrow'}!`,
              [{ text: "OK" }]
            );
          }
        });
      }
    } catch (error) {
      console.error("Error checking recurring transactions:", error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.settingRow}>
        <Text>Enable Daily Reminders</Text>
        <Switch value={enabled} onValueChange={onToggleSwitch} />
      </View>

      <View style={styles.settingRow}>
        <Text>Reminder Time</Text>
        <Button
          mode="outlined"
          onPress={() => setVisible(true)}
          disabled={!enabled}
        >
          {reminderTime}
        </Button>
      </View>

      <View style={styles.settingRow}>
        <Text>Budget Threshold Alerts</Text>
        <Switch 
          value={budgetAlerts} 
          onValueChange={(value) => {
            setBudgetAlerts(value);
            saveSettings();
          }} 
        />
      </View>

      <View style={styles.settingRow}>
        <Text>Recurring Transaction Alerts</Text>
        <Switch 
          value={recurringAlerts} 
          onValueChange={(value) => {
            setRecurringAlerts(value);
            saveSettings();
          }} 
        />
      </View>

      {visible && (
        <DateTimePicker
          value={showTimePicker()}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? "spinner" : "default"}
          onChange={onConfirm}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
});

export default NotificationManager;
