{
  /* Quick Add Shortcuts Section */
}
<Card style={styles.secondaryCard}>
  <Card.Content>
    <Text variant="titleMedium" style={styles.sectionTitle}>
      Quick Add Shortcuts
    </Text>
    <Button
      mode="outlined"
      onPress={() => {
        setEditingShortcut(null);
        setNewShortcut({ amount: "", description: "", category: "" });
        setShortcutModalVisible(true);
      }}
      style={styles.secondaryButton}
    >
      Add Quick Shortcut
    </Button>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.shortcutsScroll}
    >
      {quickAddShortcuts.map((shortcut) => (
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
  </Card.Content>
</Card>;

{
  /* Category Management Section */
}
<Card style={styles.secondaryCard}>
  <Card.Content>
    <Text variant="titleMedium" style={styles.sectionTitle}>
      Category Management
    </Text>
    <CategoryManager onCategoriesChange={setAvailableCategories} />
  </Card.Content>
</Card>;

{
  /* Recurring Transactions Section */
}
<Card style={styles.secondaryCard}>
  <Card.Content>
    <Text variant="titleMedium" style={styles.sectionTitle}>
      Recurring Transactions
    </Text>
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
  </Card.Content>
</Card>;
