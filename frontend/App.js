import { StatusBar } from 'expo-status-bar';
import { Alert, Platform, Text, View } from 'react-native';
import styles from './styles'

import Login from "./screens/Login"
import Register from "./screens/Register"
import Home from './screens/Home';
import Cart from './screens/customer/Cart';

import {createStaticNavigation} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {
  SafeAreaView,
  SafeAreaProvider,
  SafeAreaInsetsContext,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import CustomerTabs from './screens/customer/CustomerTabs';
import AdminTabs from './screens/admin/AdminTabs';
import StaffTabs from './screens/staff/StaffTabs';
import Orders from './screens/customer/Orders';
import ForgotPassword from './screens/ForgotPassword';

if (Platform.OS === 'web') {
  const nativeAlert = Alert.alert;

  Alert.alert = (title, message, buttons) => {
    const alertMessage = [title, message].filter(Boolean).join('\n\n');
    const actionButton = buttons?.find(
      button => button.onPress && button.style !== 'cancel',
    );

    if (buttons?.length > 1 && actionButton) {
      if (window.confirm(alertMessage)) {
        actionButton.onPress();
      }
      return;
    }

    if (typeof window.alert === 'function') {
      window.alert(alertMessage);
      actionButton?.onPress?.();
      return;
    }

    nativeAlert(title, message, buttons);
  };
}





const RootStack = createNativeStackNavigator({
  screens: {
    Login: {
      screen: Login,
      options:{
        headerShown:false,
      }
    },
    ForgotPassword: {
      screen: ForgotPassword,
      options:{
        headerShown:false,
      }
    },
    Register: {
      screen: Register,
      options:{
        headerShown:false,
      }
    },Home: {
      screen: Home,
      options:{
        headerShown:false,
      }
    },
    CustomerTabs: {
      screen: CustomerTabs,
      options:{
        headerShown:false,
      }
    },
    AdminTabs: {
      screen: AdminTabs,
      options:{
        headerShown:false,
      }
    },
    StaffTabs: {
      screen: StaffTabs,
      options:{
        headerShown:false,
      }
    }
    ,Cart: {
      screen: Cart,
      options:{
        headerShown:false,
      }
    }
  },
});

const Navigation = createStaticNavigation(RootStack);


export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView edges={['top']} style={styles.appBrandSafeArea}>
        <View style={styles.appBrandBar}>
          <Text style={styles.appBrandText}>BiteAhead!</Text>
        </View>
      </SafeAreaView>
      <View style={{ flex: 1 }}>
        <Navigation/>
      </View>
    </SafeAreaProvider>
  );
}
