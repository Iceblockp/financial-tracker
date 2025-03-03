import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button, TextInput, Card, Chip, IconButton, Menu, Searchbar } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RecurringTransactions from '../components/RecurringTransactions';

const ExpenseScreen = () => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [menuVisible, setMenuVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const predefinedCategories = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
  ];

  const quickAddShortcuts = [
    { amount: 500, description: 'Tea Shop', category: 'Food' },
    { amount: 2000, description: 'Lunch', category: 'Food' },
    { amount: 1000, description: 'Bus Fare', category: 'Transport' },
    { amount: 3000, description: 'Taxi', category: 'Transport' },
  ];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const savedExpenses = await AsyncStorage.getItem('expenses');
      if (savedExpenses) {
        setExpenses(JSON.parse(savedExpenses));
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    }
  };

  const saveExpenses = async (updatedExpenses) => {
    try {
      await AsyncStorage.setItem('expenses', JSON.stringify(updatedExpenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  };

  const updateBudgetSpent = async (category, amount, isAdd = true) => {
    try {
      const savedBudgets = await AsyncStorage.getItem('budgets');
      if (savedBudgets) {
        const budgets = JSON.parse(savedBudgets);
        const updatedBudgets = budgets.map(budget => {
          if (budget.category === category) {
            const currentSpent = budget.spent || 0;
            return {
              ...budget,
              spent: isAdd ? currentSpent + amount : Math.max(0, currentSpent - amount)
            };
          }
          return budget;
        });
        await AsyncStorage.setItem('budgets', JSON.stringify(updatedBudgets));
      }
    } catch (error) {
      console.error('Error updating budget:', error);
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
      setAmount('');
      setDescription('');
      setCategory('');
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
  };

  const handleUpdateExpense = async () => {
    if (editingExpense && amount && description && category) {
      // First subtract the old amount from the old category's budget
      await updateBudgetSpent(editingExpense.category, editingExpense.amount, false);
      
      const updatedExpenses = expenses.map(exp =>
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
      setAmount('');
      setDescription('');
      setCategory('');
    }
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setCategory(expense.category);
  };

  const handleDeleteExpense = async (expenseId) => {
    const expenseToDelete = expenses.find(exp => exp.id === expenseId);
    if (!expenseToDelete) return;

    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // First update the budget by subtracting the expense amount
            await updateBudgetSpent(expenseToDelete.category, expenseToDelete.amount, false);
            
            // Then remove the expense from the list
            const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);
            setExpenses(updatedExpenses);
            await saveExpenses(updatedExpenses);
          },
        },
      ]
    );
  };

  const handleSort = (field) => {
    setSortBy(field);
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    setMenuVisible(false);
  };

  const calculateStatistics = () => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === thisMonth && expenseDate.getFullYear() === thisYear;
    });

    const totalMonthly = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryTotals = {};
    monthlyExpenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    return {
      totalMonthly,
      categoryTotals,
      count: monthlyExpenses.length
    };
  };

  const statistics = calculateStatistics();

  const filteredAndSortedExpenses = expenses
    .filter(expense =>
      (expense.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (expense.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'date') {
        return modifier * (new Date(a.date) - new Date(b.date));
      } else if (sortBy === 'amount') {
        return modifier * (a.amount - b.amount);
      }
      return 0;
    });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.quickAddContainer}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Quick Add</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shortcutsScroll}>
            {quickAddShortcuts.map((shortcut, index) => (
              <TouchableOpacity key={index} onPress={() => handleQuickAdd(shortcut)}>
                <Card style={styles.shortcutCard}>
                  <Card.Content>
                    <Text variant="titleMedium">{shortcut.description}</Text>
                    <Text variant="bodyMedium">MMK {shortcut.amount.toLocaleString()}</Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
            onPress={editingExpense ? handleUpdateExpense : handleAddExpense}
            style={styles.button}
          >
            {editingExpense ? 'Update Expense' : 'Add Expense'}
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
            <Menu.Item onPress={() => handleSort('date')} title="Date" />
            <Menu.Item onPress={() => handleSort('amount')} title="Amount" />
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
                <Text variant="bodyMedium">MMK {(expense.amount || 0).toLocaleString()}</Text>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  quickAddContainer: {
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  shortcutsScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  shortcutCard: {
    marginRight: 12,
    minWidth: 120,
  },
  inputContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    elevation: 2,
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