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
  Chip,
  IconButton,
  Menu,
  Searchbar,
  Portal,
  Modal,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RecurringTransactions from "../components/RecurringTransactions";
import CategoryManager from "../components/CategoryManager";
import { useIsFocused } from "@react-navigation/native";

const ExpenseScreen = () => {
  const isFocused = useIsFocused();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const [availableCategories, setAvailableCategories] = useState([
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
  ]);

  const [quickAddShortcuts, setQuickAddShortcuts] = useState([]);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [shortcutModalVisible, setShortcutModalVisible] = useState(false);
  const [newShortcut, setNewShortcut] = useState({
    amount: "",
    description: "",
    category: "",
  });

  useEffect(() => {
    loadQuickAddShortcuts();
  }, []);

  const loadQuickAddShortcuts = async () => {
    try {
      const savedShortcuts = await AsyncStorage.getItem("quickAddShortcuts");
      if (savedShortcuts) {
        setQuickAddShortcuts(JSON.parse(savedShortcuts));
      }
    } catch (error) {
      console.error("Error loading shortcuts:", error);
    }
  };

  const saveQuickAddShortcuts = async (shortcuts) => {
    try {
      await AsyncStorage.setItem(
        "quickAddShortcuts",
        JSON.stringify(shortcuts)
      );
    } catch (error) {
      console.error("Error saving shortcuts:", error);
    }
  };

  useEffect(() => {
    const loadCustomCategories = async () => {
      try {
        const savedCategories = await AsyncStorage.getItem("customCategories");
        if (savedCategories) {
          const customCategories = JSON.parse(savedCategories);
          setAvailableCategories((prevCategories) => [
            "Food",
            "Transport",
            "Shopping",
            "Bills",
            "Entertainment",
            "Health",
            ...customCategories,
          ]);
        }
      } catch (error) {
        console.error("Error loading custom categories:", error);
      }
    };
    loadCustomCategories();
    loadExpenses();
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

  const saveExpenses = async (updatedExpenses) => {
    try {
      await AsyncStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error("Error saving expenses:", error);
    }
  };

  const updateBudgetSpent = async (category, amount, isAdd = true) => {
    try {
      const savedBudgets = await AsyncStorage.getItem("budgets");
      if (savedBudgets) {
        const budgets = JSON.parse(savedBudgets);
        const updatedBudgets = budgets.map((budget) => {
          if (budget.category === category) {
            const currentSpent = budget.spent || 0;
            return {
              ...budget,
              spent: isAdd
                ? currentSpent + amount
                : Math.max(0, currentSpent - amount),
            };
          }
          return budget;
        });
        await AsyncStorage.setItem("budgets", JSON.stringify(updatedBudgets));
      }
    } catch (error) {
      console.error("Error updating budget:", error);
    }
  };

  const handleAddExpense = async () => {
    if (amount && description && category) {
      const newExpense = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        category,
        date: new Date().toISOString(),
      };
      const updatedExpenses = [newExpense, ...expenses];
      setExpenses(updatedExpenses);
      await saveExpenses(updatedExpenses);
      await updateBudgetSpent(category, parseFloat(amount));
      setAmount("");
      setDescription("");
      setCategory("");
    }
  };

  const handleDeleteShortcut = (shortcutId) => {
    Alert.alert(
      "Delete Shortcut",
      "Are you sure you want to delete this shortcut?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedShortcuts = quickAddShortcuts.filter(
              (s) => s.id !== shortcutId
            );
            setQuickAddShortcuts(updatedShortcuts);
            await saveQuickAddShortcuts(updatedShortcuts);
          },
        },
      ]
    );
  };

  const handleSaveShortcut = async () => {
    if (newShortcut.amount && newShortcut.description && newShortcut.category) {
      const shortcutData = {
        amount: parseFloat(newShortcut.amount),
        description: newShortcut.description,
        category: newShortcut.category,
        usageCount: 0,
      };

      let updatedShortcuts;
      if (editingShortcut) {
        updatedShortcuts = quickAddShortcuts.map((s) =>
          s.id === editingShortcut.id ? { ...s, ...shortcutData } : s
        );
      } else {
        shortcutData.id = Date.now().toString();
        updatedShortcuts = [...quickAddShortcuts, shortcutData];
      }

      setQuickAddShortcuts(updatedShortcuts);
      await saveQuickAddShortcuts(updatedShortcuts);
      setShortcutModalVisible(false);
      setNewShortcut({ amount: "", description: "", category: "" });
      setEditingShortcut(null);
    }
  };

  const handleQuickAdd = async (shortcut) => {
    const newExpense = {
      id: Date.now().toString(),
      amount: shortcut.amount,
      description: shortcut.description,
      category: shortcut.category,
      date: new Date().toISOString(),
    };
    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    await saveExpenses(updatedExpenses);
    await updateBudgetSpent(shortcut.category, shortcut.amount);

    // Update shortcut usage count
    const updatedShortcuts = quickAddShortcuts.map((s) => {
      if (s.id === shortcut.id) {
        return { ...s, usageCount: (s.usageCount || 0) + 1 };
      }
      return s;
    });
    setQuickAddShortcuts(updatedShortcuts);
    await saveQuickAddShortcuts(updatedShortcuts);
  };

  const handleUpdateExpense = async () => {
    if (editingExpense && amount && description && category) {
      // First subtract the old amount from the old category's budget
      await updateBudgetSpent(
        editingExpense.category,
        editingExpense.amount,
        false
      );

      const updatedExpenses = expenses.map((exp) =>
        exp.id === editingExpense.id
          ? {
              ...exp,
              amount: parseFloat(amount),
              description,
              category,
            }
          : exp
      );
      setExpenses(updatedExpenses);
      await saveExpenses(updatedExpenses);

      // Then add the new amount to the new category's budget
      await updateBudgetSpent(category, parseFloat(amount));

      setEditingExpense(null);
      setAmount("");
      setDescription("");
      setCategory("");
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setCategory(expense.category);
  };

  const handleDeleteExpense = async (expenseId) => {
    const expenseToDelete = expenses.find((exp) => exp.id === expenseId);
    if (!expenseToDelete) return;

    Alert.alert(
      "Delete Expense",
      "Are you sure you want to delete this expense?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            // First update the budget by subtracting the expense amount
            await updateBudgetSpent(
              expenseToDelete.category,
              expenseToDelete.amount,
              false
            );

            // Then remove the expense from the list
            const updatedExpenses = expenses.filter(
              (exp) => exp.id !== expenseId
            );
            setExpenses(updatedExpenses);
            await saveExpenses(updatedExpenses);
          },
        },
      ]
    );
  };

  const handleSort = (field) => {
    setSortBy(field);
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    setMenuVisible(false);
  };

  const calculateStatistics = () => {
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

    const totalMonthly = monthlyExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const categoryTotals = {};
    monthlyExpenses.forEach((expense) => {
      categoryTotals[expense.category] =
        (categoryTotals[expense.category] || 0) + expense.amount;
    });

    return {
      totalMonthly,
      categoryTotals,
      count: monthlyExpenses.length,
    };
  };

  const statistics = calculateStatistics();

  const filteredAndSortedExpenses = expenses
    .filter(
      (expense) =>
        (expense.description?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (expense.category?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        )
    )
    .sort((a, b) => {
      const modifier = sortOrder === "asc" ? 1 : -1;
      if (sortBy === "date") {
        return modifier * (new Date(a.date) - new Date(b.date));
      } else if (sortBy === "amount") {
        return modifier * (a.amount - b.amount);
      }
      return 0;
    });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.quickAddContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Quick Add
          </Text>
          <View>
            <Button
              mode="outlined"
              onPress={() => {
                setEditingShortcut(null);
                setNewShortcut({ amount: "", description: "", category: "" });
                setShortcutModalVisible(true);
              }}
              style={styles.addShortcutButton}
            >
              Add Quick Shortcut
            </Button>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.shortcutsScroll}
            >
              {quickAddShortcuts.map((shortcut, index) => (
                <Card key={shortcut.id} style={styles.shortcutCard}>
                  <Card.Content>
                    <Text variant="titleMedium">{shortcut.description}</Text>
                    <Text variant="bodyMedium">
                      MMK {shortcut.amount.toLocaleString()}
                    </Text>
                    <Text variant="bodySmall">{shortcut.category}</Text>
                    <View style={styles.usageIndicator}>
                      <Text variant="bodySmall" style={styles.usageCount}>
                        Used: {shortcut.usageCount || 0} times
                      </Text>
                    </View>
                  </Card.Content>
                  <Card.Actions>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => {
                        setEditingShortcut(shortcut);
                        setNewShortcut({
                          amount: shortcut.amount.toString(),
                          description: shortcut.description,
                          category: shortcut.category,
                        });
                        setShortcutModalVisible(true);
                      }}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteShortcut(shortcut.id)}
                    />
                    <IconButton
                      icon="plus"
                      size={20}
                      onPress={() => handleQuickAdd(shortcut)}
                    />
                  </Card.Actions>
                </Card>
              ))}
            </ScrollView>
          </View>
        </View>

        <View style={styles.inputContainer}>
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
          <CategoryManager onCategoriesChange={setAvailableCategories} />
          <View style={styles.categoriesContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {availableCategories.map((cat, index) => (
                <Chip
                  key={`${cat}-${index}`}
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
            onPress={editingExpense ? handleUpdateExpense : handleAddExpense}
            style={styles.button}
          >
            {editingExpense ? "Update Expense" : "Add Expense"}
          </Button>
        </View>

        <View style={styles.filterContainer}>
          <Searchbar
            placeholder="Search expenses"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMenuVisible(true)}
                style={styles.sortButton}
              >
                Sort By
              </Button>
            }
          >
            <Menu.Item onPress={() => handleSort("date")} title="Date" />
            <Menu.Item onPress={() => handleSort("amount")} title="Amount" />
          </Menu>
        </View>

        <RecurringTransactions
          onAddRecurring={(recurringTransaction) => {
            const newExpense = {
              ...recurringTransaction,
              date: new Date().toISOString(),
            };
            const updatedExpenses = [newExpense, ...expenses];
            setExpenses(updatedExpenses);
            saveExpenses(updatedExpenses);
          }}
        />

        <View style={styles.expensesList}>
          {filteredAndSortedExpenses.map((expense) => (
            <Card key={expense.id} style={styles.expenseCard}>
              <Card.Content>
                <Text variant="titleMedium">{expense.description}</Text>
                <Text variant="bodyMedium">
                  MMK {(expense.amount || 0).toLocaleString()}
                </Text>
                <Text variant="bodySmall">{expense.category}</Text>
                <Text variant="bodySmall">
                  {new Date(expense.date).toLocaleDateString()}
                </Text>
              </Card.Content>
              <Card.Actions>
                <IconButton
                  icon="pencil"
                  onPress={() => handleEditExpense(expense)}
                />
                <IconButton
                  icon="delete"
                  onPress={() => handleDeleteExpense(expense.id)}
                />
              </Card.Actions>
            </Card>
          ))}
        </View>

        <Portal>
          <Modal
            animationType="slide"
            visible={shortcutModalVisible}
            onDismiss={() => {
              setShortcutModalVisible(false);
              setNewShortcut({ amount: "", description: "", category: "" });
              setEditingShortcut(null);
            }}
            contentContainerStyle={styles.modalContainer}
          >
            <ScrollView>
              <Text variant="titleLarge" style={styles.modalTitle}>
                {editingShortcut ? "Edit Shortcut" : "New Quick Shortcut"}
              </Text>

              <TextInput
                label="Amount (MMK)"
                value={newShortcut.amount.toString()}
                onChangeText={(text) =>
                  setNewShortcut({ ...newShortcut, amount: text })
                }
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Description"
                value={newShortcut.description}
                onChangeText={(text) =>
                  setNewShortcut({ ...newShortcut, description: text })
                }
                style={styles.input}
              />

              <View style={styles.categoriesContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableCategories.map((cat) => (
                    <Chip
                      key={cat}
                      selected={newShortcut.category === cat}
                      onPress={() =>
                        setNewShortcut({ ...newShortcut, category: cat })
                      }
                      style={styles.categoryChip}
                    >
                      {cat}
                    </Chip>
                  ))}
                </ScrollView>
              </View>

              <Button
                mode="contained"
                onPress={handleSaveShortcut}
                style={styles.submitButton}
              >
                {editingShortcut ? "Update Shortcut" : "Add Shortcut"}
              </Button>
            </ScrollView>
          </Modal>
        </Portal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  addShortcutButton: {
    marginBottom: 16,
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
  submitButton: {
    marginTop: 16,
  },
  filterContainer: {
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
  },
  sortButton: {
    minWidth: 100,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  quickAddContainer: {
    marginBottom: 16,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  shortcutsScroll: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 8,
  },
  shortcutCard: {
    marginRight: 12,
    minWidth: 160,
    position: "relative",
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    backgroundColor: "#fff",
  },
  usageIndicator: {
    marginTop: 8,
    backgroundColor: "#f0f0f0",
    padding: 4,
    borderRadius: 4,
  },
  usageCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  inputContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 15,
    margin: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  input: {
    marginBottom: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  button: {
    marginTop: 8,
  },
  expensesList: {
    padding: 16,
  },
  expenseCard: {
    marginBottom: 12,
  },
});

export default ExpenseScreen;
