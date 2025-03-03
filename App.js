import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

import HomeScreen from './screens/HomeScreen';
import ExpenseScreen from './screens/ExpenseScreen';
import BudgetScreen from './screens/BudgetScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac6',
    error: '#b00020',
  },
  roundness: 2,
  animation: {
    scale: 1.0,
  },
};

const { LightTheme } = adaptNavigationTheme({
  reactNavigationLight: NavigationDefaultTheme,
  materialLight: theme,
});

export default function App() {
  return (
    <PaperProvider theme={theme}>
      <NavigationContainer theme={LightTheme}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: 'gray',
            headerStyle: {
              backgroundColor: theme.colors.primary,
            },
            headerTintColor: '#fff',
            tabBarStyle: {
              paddingVertical: 5,
              borderTopLeftRadius: 15,
              borderTopRightRadius: 15,
              backgroundColor: '#fff',
              position: 'absolute',
              height: 60,
            },
            tabBarLabelStyle: {
              paddingBottom: 5,
            },
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="home" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Expenses"
            component={ExpenseScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="cash" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Budget"
            component={BudgetScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="chart-pie" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Analytics"
            component={AnalyticsScreen}
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="chart-line" size={size} color={color} />
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
