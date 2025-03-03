import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Chip, Portal, Modal, IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CategoryManager = ({ onCategoriesChange }) => {
  const [visible, setVisible] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);

  const predefinedCategories = [
    'Food',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
  ];

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const savedCategories = await AsyncStorage.getItem('customCategories');
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        setCategories(parsedCategories);
        if (onCategoriesChange) {
          onCategoriesChange([...predefinedCategories, ...parsedCategories]);
        }
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const saveCategories = async (updatedCategories) => {
    try {
      await AsyncStorage.setItem('customCategories', JSON.stringify(updatedCategories));
      setCategories(updatedCategories);
      if (onCategoriesChange) {
        onCategoriesChange([...predefinedCategories, ...updatedCategories]);
      }
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      const categoryExists = [...predefinedCategories, ...categories].includes(newCategory.trim());
      if (categoryExists) {
        Alert.alert('Error', 'This category already exists');
        return;
      }

      if (editingCategory) {
        // Update existing category
        const updatedCategories = categories.map(cat =>
          cat === editingCategory ? newCategory.trim() : cat
        );
        saveCategories(updatedCategories);
        setEditingCategory(null);
      } else {
        // Add new category
        const updatedCategories = [...categories, newCategory.trim()];
        saveCategories(updatedCategories);
      }

      setNewCategory('');
      setVisible(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setNewCategory(category);
    setVisible(true);
  };

  const handleDeleteCategory = (category) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCategories = categories.filter(cat => cat !== category);
            saveCategories(updatedCategories);
          },
        },
      ]
    );
  };

  return (
    <View>
      <Button
        mode="outlined"
        onPress={() => {
          setEditingCategory(null);
          setNewCategory('');
          setVisible(true);
        }}
        style={styles.addButton}
      >
        Add Custom Category
      </Button>

      <View style={styles.categoriesContainer}>
        {categories.map((category) => (
          <View key={category} style={styles.categoryWrapper}>
            <Chip
              style={styles.categoryChip}
              onPress={() => handleEditCategory(category)}
            >
              {category}
            </Chip>
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeleteCategory(category)}
            />
          </View>
        ))}
      </View>

      <Portal>
        <Modal
          visible={visible}
          onDismiss={() => {
            setVisible(false);
            setNewCategory('');
            setEditingCategory(null);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <TextInput
            label="Category Name"
            value={newCategory}
            onChangeText={setNewCategory}
            style={styles.input}
          />
          <Button mode="contained" onPress={handleAddCategory}>
            {editingCategory ? 'Update Category' : 'Add Category'}
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  addButton: {
    marginVertical: 8,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  categoryWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 4,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  input: {
    marginBottom: 16,
  },
});

export default CategoryManager;