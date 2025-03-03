import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, TextInput, Card, IconButton, Portal, Modal } from 'react-native-paper';

const RecurringTransactions = ({ onAddRecurring }) => {
  const [visible, setVisible] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dayOfMonth, setDayOfMonth] = useState('');

  const frequencies = ['daily', 'weekly', 'monthly'];

  const handleAdd = () => {
    if (amount && description && frequency) {
      const recurringTransaction = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        description,
        frequency,
        dayOfMonth: frequency === 'monthly' ? parseInt(dayOfMonth) : null,
        nextDue: calculateNextDueDate(frequency, dayOfMonth),
      };
      onAddRecurring(recurringTransaction);
      setVisible(false);
      resetForm();
    }
  };

  const calculateNextDueDate = (freq, day) => {
    const now = new Date();
    switch (freq) {
      case 'daily':
        return new Date(now.setDate(now.getDate() + 1));
      case 'weekly':
        return new Date(now.setDate(now.getDate() + 7));
      case 'monthly':
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, day || 1);
        return nextMonth;
      default:
        return now;
    }
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setFrequency('monthly');
    setDayOfMonth('');
  };

  return (
    <>
      <Button
        mode="outlined"
        onPress={() => setVisible(true)}
        style={styles.addButton}
      >
        Add Recurring Transaction
      </Button>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => setVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            <Text variant="titleLarge" style={styles.modalTitle}>
              New Recurring Transaction
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

            <View style={styles.frequencyContainer}>
              {frequencies.map((freq) => (
                <Button
                  key={freq}
                  mode={frequency === freq ? 'contained' : 'outlined'}
                  onPress={() => setFrequency(freq)}
                  style={styles.frequencyButton}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Button>
              ))}
            </View>

            {frequency === 'monthly' && (
              <TextInput
                label="Day of Month (1-31)"
                value={dayOfMonth}
                onChangeText={setDayOfMonth}
                keyboardType="numeric"
                style={styles.input}
              />
            )}

            <Button mode="contained" onPress={handleAdd} style={styles.submitButton}>
              Add Recurring Transaction
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  addButton: {
    margin: 16,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  submitButton: {
    marginTop: 16,
  },
});

export default RecurringTransactions;