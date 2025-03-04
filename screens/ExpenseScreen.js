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
  SegmentedButtons,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RecurringTransactions from "../components/RecurringTransactions";
import CategoryManager from "../components/CategoryManager";
import { useIsFocused } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";

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
  const [expandedSections, setExpandedSections] = useState({
    searchFilters: false,
    quickAdd: false,
    categoryManagement: false,
    recurringTransactions: false,
  });

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
    const interval = setInterval(loadExpenses, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setDateFilter({
        ...dateFilter,
        date: selectedDate.toISOString(),
        filterType: "date",
      });
    }
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

  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateFilter, setDateFilter] = useState({
    date: new Date().toISOString(),
    filterType: "all",
  });

  // const [expandedSections, setExpandedSections] = useState({
  //   searchFilters: false,
  //   quickAdd: false,
  //   categoryManagement: false,
  //   recurringTransactions: false,
  // });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const filteredAndSortedExpenses = expenses
    .filter((expense) => {
      // Text search filter
      const textMatch =
        (expense.description?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        ) ||
        (expense.category?.toLowerCase() || "").includes(
          searchQuery.toLowerCase()
        );

      // Date filter
      let dateMatch = true;
      if (dateFilter.filterType === "date" && dateFilter.date) {
        const expenseDate = new Date(expense.date);
        const filterDate = new Date(dateFilter.date);
        dateMatch =
          expenseDate.getDate() === filterDate.getDate() &&
          expenseDate.getMonth() === filterDate.getMonth() &&
          expenseDate.getFullYear() === filterDate.getFullYear();
      }

      return textMatch && dateMatch;
    })
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
        {/* Main Add Expense Section */}
        <Card style={styles.mainCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.mainTitle}>
              Add Expense
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
              style={styles.mainButton}
            >
              {editingExpense ? "Update Expense" : "Add Expense"}
            </Button>
          </Card.Content>
        </Card>

        {/* Search and Filter Section */}
        <Card style={styles.filterCard}>
          <Card.Content>
            <TouchableOpacity
              onPress={() => toggleSection("searchFilters")}
              style={styles.sectionHeader}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Search & Filters
              </Text>
              <IconButton
                icon={
                  expandedSections.searchFilters ? "chevron-up" : "chevron-down"
                }
                size={24}
              />
            </TouchableOpacity>
            {expandedSections.searchFilters && (
              <>
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
                    <Menu.Item
                      onPress={() => handleSort("date")}
                      title="Date"
                    />
                    <Menu.Item
                      onPress={() => handleSort("amount")}
                      title="Amount"
                    />
                  </Menu>
                </View>
                <View style={styles.dateFilterContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateFilterButton}
                  >
                    {dateFilter.date
                      ? new Date(dateFilter.date).toLocaleDateString()
                      : "Select Date"}
                  </Button>
                  {dateFilter.date && (
                    <Button
                      mode="text"
                      onPress={() => {
                        setDateFilter({ date: null, filterType: "all" });
                        setSelectedDate(null);
                      }}
                      style={styles.clearDateButton}
                    >
                      Clear
                    </Button>
                  )}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate || new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDateChange}
                    />
                  )}
                </View>
              </>
            )}
          </Card.Content>
        </Card>

        {/* Quick Add Shortcuts Section */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              onPress={() => toggleSection("quickAdd")}
              style={styles.sectionHeader}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Quick Add Shortcuts
              </Text>
              <IconButton
                icon={expandedSections.quickAdd ? "chevron-up" : "chevron-down"}
                size={24}
              />
            </TouchableOpacity>
            {expandedSections.quickAdd && (
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.shortcutsContainer}
                >
                  {quickAddShortcuts.map((shortcut) => (
                    <Card key={shortcut.id} style={styles.shortcutCard}>
                      <Card.Content>
                        <Text>{shortcut.description}</Text>
                        <Text>MMK {shortcut.amount}</Text>
                        <Text>{shortcut.category}</Text>
                        <View style={styles.shortcutActions}>
                          <IconButton
                            icon="plus"
                            size={20}
                            onPress={() => handleQuickAdd(shortcut)}
                          />
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
                        </View>
                      </Card.Content>
                    </Card>
                  ))}
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setEditingShortcut(null);
                      setNewShortcut({
                        amount: "",
                        description: "",
                        category: "",
                      });
                      setShortcutModalVisible(true);
                    }}
                    style={styles.addShortcutButton}
                  >
                    Add New
                  </Button>
                </ScrollView>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Category Management Section */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              onPress={() => toggleSection("categoryManagement")}
              style={styles.sectionHeader}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Category Management
              </Text>
              <IconButton
                icon={
                  expandedSections.categoryManagement
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={24}
              />
            </TouchableOpacity>
            {expandedSections.categoryManagement && (
              <CategoryManager onCategoriesChange={setAvailableCategories} />
            )}
          </Card.Content>
        </Card>

        {/* Recurring Transactions Section */}
        <Card style={styles.card}>
          <Card.Content>
            <TouchableOpacity
              onPress={() => toggleSection("recurringTransactions")}
              style={styles.sectionHeader}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Recurring Transactions
              </Text>
              <IconButton
                icon={
                  expandedSections.recurringTransactions
                    ? "chevron-up"
                    : "chevron-down"
                }
                size={24}
              />
            </TouchableOpacity>
            {expandedSections.recurringTransactions && (
              <RecurringTransactions onAddRecurring={handleAddExpense} />
            )}
          </Card.Content>
        </Card>

        {/* Expenses List */}
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

        {/* Shortcut Modal */}
        <Portal>
          <Modal
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 0,
  },
  card: {
    margin: 16,
    marginTop: 8,
    elevation: 2,
  },
  shortcutsContainer: {
    flexDirection: "row",
    marginVertical: 8,
  },
  shortcutCard: {
    marginRight: 8,
    minWidth: 150,
  },
  shortcutActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  addShortcutButton: {
    alignSelf: "center",
    marginHorizontal: 8,
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
  },
  mainCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  mainTitle: {
    textAlign: "center",
    marginBottom: 16,
    color: "#6200ee",
  },
  mainButton: {
    marginTop: 16,
  },
  filterCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 3,
  },
  secondaryCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 15,
    elevation: 2,
  },
  filterContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateFilterContainer: {
    marginTop: 8,
  },
  dateInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  dateButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  monthButton: {
    marginTop: 8,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  sortButton: {
    minWidth: 100,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  secondaryButton: {
    marginBottom: 16,
  },
  shortcutsScroll: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 8,
  },
  shortcutCard: {
    marginRight: 12,
    minWidth: 160,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    backgroundColor: "#fff",
    padding: 8,
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
  input: {
    marginBottom: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
  },
  categoryChip: {
    marginRight: 8,
  },
  expensesList: {
    padding: 16,
    marginBottom: 120,
  },
  expenseCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
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
});

export default ExpenseScreen;
