import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAuth } from '../context/AuthContext';
import { Colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import InvoiceListScreen from '../screens/InvoiceListScreen';
import InvoiceDetailScreen from '../screens/InvoiceDetailScreen';
import CreateInvoiceScreen from '../screens/CreateInvoiceScreen';
import AdminUsersScreen from '../screens/AdminUsersScreen';
import ReportsScreen from '../screens/ReportsScreen';
import WorkflowConfigScreen from '../screens/WorkflowConfigScreen';
import AuditRegistryScreen from '../screens/AuditRegistryScreen';
import FinanceHubScreen from '../screens/FinanceHubScreen';
import CfoCommandScreen from '../screens/CfoCommandScreen';
import TenantsScreen from '../screens/TenantsScreen';
import DrawerContent from '../components/DrawerContent';

const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  const { hasModule } = useAuth();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: { backgroundColor: Colors.surface, width: 280 },
        overlayColor: 'rgba(0,0,0,0.6)',
      }}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      {hasModule('INVOICES') && (
        <Drawer.Screen name="Invoices" component={InvoiceListScreen} />
      )}
      {hasModule('CREATE_INVOICE') && (
        <Drawer.Screen
          name="CreateInvoice"
          component={CreateInvoiceScreen}
          options={{ title: 'New Invoice' }}
        />
      )}
      {hasModule('FINANCE_HUB') && (
        <Drawer.Screen
          name="FinanceHub"
          component={FinanceHubScreen}
          options={{ title: 'Finance Hub' }}
        />
      )}
      {hasModule('CFO_COMMAND') && (
        <Drawer.Screen
          name="CfoCommand"
          component={CfoCommandScreen}
          options={{ title: 'CFO Command' }}
        />
      )}
      {hasModule('AUDIT_REGISTRY') && (
        <Drawer.Screen
          name="AuditRegistry"
          component={AuditRegistryScreen}
          options={{ title: 'Audit Registry' }}
        />
      )}
      {hasModule('REPORTS') && (
        <Drawer.Screen name="Reports" component={ReportsScreen} />
      )}
      {hasModule('USER_MANAGEMENT') && (
        <Drawer.Screen
          name="AdminUsers"
          component={AdminUsersScreen}
          options={{ title: 'User Management' }}
        />
      )}
      {hasModule('WORKFLOW_CONFIG') && (
        <Drawer.Screen
          name="WorkflowConfig"
          component={WorkflowConfigScreen}
          options={{ title: 'Workflows' }}
        />
      )}
      {hasModule('TENANT_MANAGEMENT') && (
        <Drawer.Screen name="Tenants" component={TenantsScreen} />
      )}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!user ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={DrawerNavigator} />
              <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
