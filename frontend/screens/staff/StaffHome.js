import { View, Text, FlatList, Pressable, Modal, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import home from "../../styles/screens/home";
import styles from "../../styles";
import { createContext, useCallback, useContext, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ScrollView } from "react-native";

const Tab = createBottomTabNavigator();
const StaffOrdersContext = createContext([]);

function formatTime(timestamp) {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp) {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(timestamp) {
    if (!timestamp) return "-";
    return `${formatDate(timestamp)}, ${formatTime(timestamp)}`;
}

function paymentMethodLabel(paymentMethod) {
    return paymentMethod === "CASH_ON_PICKUP" ? "Cash on pickup" : "Online";
}

function OrdersCard({ item }) {
    const { updateOrder, recordCashPayment } = useContext(StaffOrdersContext);
    const [pickupCode, setPickupCode] = useState("");
    const [amountReceived, setAmountReceived] = useState("");
    const [showPickupCode, setShowPickupCode] = useState(false);
    const nextStatus={
        "PLACED":"PREPARING",
        "PREPARING":"READY",
        "READY":"SERVED",
    };

    async function moveOrder() {
        if (item.status === "READY") {
            setShowPickupCode(true);
            return;
        }
        await updateOrder(item.order_id, item.status);
    }

    async function serveOrder() {
        const code = pickupCode.trim();
        if (!code) {
            Alert.alert("Pickup code required", "Enter the customer's pickup code.");
            return;
        }

        if (item.payment_method === "CASH_ON_PICKUP" && item.payment_status !== "PAID") {
            const amount = Number(amountReceived);
            if (!amountReceived.trim() || !Number.isFinite(amount) || amount <= 0) {
                Alert.alert("Amount required", "Enter the cash amount received.");
                return;
            }

            const paymentRecorded = await recordCashPayment(
                item.order_id,
                code,
                amount,
            );
            if (!paymentRecorded) return;
        }

        const updated = await updateOrder(item.order_id, item.status, { pickup_code: code });
        if (updated) {
            setPickupCode("");
            setAmountReceived("");
            setShowPickupCode(false);
        }
    }

    return (
        <View style={[home.ordersCard,{display:'flex', flexDirection:'row', justifyContent:'space-between'}]}>
            <View >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontWeight: "900" }}>{item.order_id}</Text>
                
            </View>
            <Text>{item.customer} (ID {item.institute_id})</Text>
            <Text>Placed: {formatDateTime(item.created_at)}</Text>
            <Text>Payment: {paymentMethodLabel(item.payment_method)}</Text>
            <View>
                {item.items?.map((it, i) => (
                    <Text key={i}>{it.quantity} x {it.food ?? it.name}</Text>
                ))}
            </View>
            <Text style={{ fontWeight: "900" }}>Total: ₹ {item.total}</Text>
            </View>
            <View style={{display:'flex'}}>
                <Text style={{ fontWeight: "bold", alignSelf: "flex-end" }}>{item.status}</Text>
                {item.status!=="SERVED" && 
                <Pressable style={{
                        backgroundColor: '#FF8066',
                        borderWidth: 3,
                        borderColor: '#111111',
                        padding: 12,
                        marginTop: 8,
                        alignItems: 'center',
                        
                    }}
                    onPress={moveOrder}
                >
                    <Text>Move to {nextStatus[item.status]}</Text>
                </Pressable>}
            </View>
            <Modal visible={showPickupCode} transparent animationType="fade" onRequestClose={() => setShowPickupCode(false)}>
                <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.35)" }}>
                    <View style={{ backgroundColor: "#FFF8E7", borderWidth: 3, borderColor: "#111111", padding: 16, gap: 10 }}>
                        <Text style={{ fontWeight: "900", fontSize: 18 }}>
                            {item.payment_method === "CASH_ON_PICKUP" && item.payment_status !== "PAID"
                                ? "Collect cash and enter pickup code"
                                : "Enter pickup code"}
                        </Text>
                        <TextInput
                            value={pickupCode}
                            onChangeText={setPickupCode}
                            placeholder="Customer's pickup code"
                            placeholderTextColor="#666666"
                            keyboardType="number-pad"
                            style={styles.inputText}
                        />
                        {item.payment_method === "CASH_ON_PICKUP" && item.payment_status !== "PAID" && (
                            <TextInput
                                value={amountReceived}
                                onChangeText={setAmountReceived}
                                placeholder="Amount received"
                                placeholderTextColor="#666666"
                                keyboardType="decimal-pad"
                                style={styles.inputText}
                            />
                        )}
                        <View style={{ flexDirection: "row", gap: 8, display: "flex", flexDirection: "column"}}>
                            <Pressable onPress={() => setShowPickupCode(false)} style={styles.button}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={serveOrder} style={styles.button}>
                                <Text style={styles.buttonText}>Serve</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>

    );
}

function StaffOrdersProvider({ userData, children }) {
    const token = userData?.access_token;
    const [ordersList, setOrdersList] = useState([]);

    async function recordCashPayment(orderId, pickupCode, amountReceived) {
        try {
            const response = await fetch(
                `https://canteen-backend-xzko.onrender.com/staff/orders/${orderId}/cash-payment`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        pickup_code: pickupCode,
                        amount_received: amountReceived,
                    }),
                },
            );
            const data = await response.json();
            if (!response.ok) {
                Alert.alert("Cash payment failed", data.detail || "Could not record cash payment.");
                return false;
            }

            setOrdersList(current => current.map(order => (
                order.order_id === orderId ? data : order
            )));
            if (data.change_given > 0) {
                Alert.alert("Payment recorded", `Give change: ₹${data.change_given}`);
            }
            return true;
        } catch (error) {
            Alert.alert("Cash payment failed", "Unable to connect to the server.");
            return false;
        }
    }

    async function updateOrder(orderId, currentStatus, payload) {
        const endpoints = {
            PLACED: "preparing",
            PREPARING: "ready",
            READY: "serve",
        };
        const endpoint = endpoints[currentStatus];
        if (!endpoint) return false;

        try {
            const response = await fetch(
                `https://canteen-backend-xzko.onrender.com/staff/orders/${orderId}/${endpoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    ...(payload ? { body: JSON.stringify(payload) } : {}),
                }
            );
            const data = await response.json();
            if (!response.ok) {
                Alert.alert("Status update failed", data.detail || "Could not update the order.");
                return false;
            }
            setOrdersList(current => current.map(order => (
                order.order_id === orderId ? data : order
            )));
            return true;
        } catch (error) {
            Alert.alert("Status update failed", "Unable to connect to the server.");
            return false;
        }
    }

    useFocusEffect(useCallback(() => {
        async function getOrdersList() {
            try {
                const response = await fetch("https://canteen-backend-xzko.onrender.com/staff/orders", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();

                if (!response.ok) {
                    console.log("something went wrong");
                    return;
                }

                setOrdersList(data);
            } catch (error) {
                console.log(error);
            }
        }

        getOrdersList();
        const id = setInterval(getOrdersList, 10000);
        return () => clearInterval(id);
    }, [token]));

    return (
        <StaffOrdersContext.Provider value={{ ordersList, updateOrder, recordCashPayment }}>
            {children}
        </StaffOrdersContext.Provider>
    );
}

function OrdersByStatus({ route, userData }) {
    const { ordersList } = useContext(StaffOrdersContext);
    const visibleOrders = ordersList.filter(
        item => item.status?.toUpperCase() === route.name.toUpperCase()
    );

    return (
        <SafeAreaView style={home.container} edges={["left", "right"]}>
            <View style={styles.defaultView}>
                <ScrollView>
                    {visibleOrders.map(item => (
                        <OrdersCard key={item.order_id} item={item} />
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function StatusCard({ card }) {
    const { ordersList } = useContext(StaffOrdersContext);
    const count = ordersList.filter(
        order => order.status?.toUpperCase() === card.status
    ).length;

    return (
        <View style={[home.statusCard, { width: "47%", flexGrow: 1, backgroundColor: 'white' }]}>
            <View>
                <Text style={{ textAlign: "center", color:card.color, fontWeight: "bold", fontSize: 25 }}>{count}</Text>
                <Text style={{ textAlign: "center", textTransform: "uppercase", color: '#555', }}>{card.name}</Text>
            </View>
        </View>
    );
}

export default function StaffHome({ route }) {
    const userData = route.params?.userData;
    const statusCards = [
        { name: "Placed", status: "PLACED", color: "#3B82F6" },
        { name: "Preparing", status: "PREPARING", color: "#F59E0B" },
        { name: "Ready", status: "READY", color: "#10B981" },
        { name: "Served", status: "SERVED", color: "#8B82F6" },
    ];

    return (
        <StaffOrdersProvider userData={userData}>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#FFF8E7" }} edges={["top"]}>
                <View style={styles.defaultView}>
                    <Text>Staff Id: {userData?.username}</Text>
                    <FlatList
                        data={statusCards}
                        numColumns={2} 
                        keyExtractor={(card) => card.status}
                        style={{flexGrow: 0, marginBottom: 5}}
                        contentContainerStyle={{ gap: 10, paddingBottom: 8 }} 
                        columnWrapperStyle={{gap:10}} 
                        renderItem={({ item }) => (
                            <StatusCard card={item} />
                        )}
                    />
                    
                    <Tab.Navigator
                        screenOptions={({ route: tabRoute }) => ({
                            headerShown: false,
                            tabBarPosition: "top",
                            tabBarActiveTintColor: "#111111",
                            tabBarInactiveTintColor: "#666666",
                            tabBarLabelStyle: { fontWeight: "900", fontSize: 11 },
                            tabBarIcon: ({ color, focused }) => {
                                const icons = {
                                    Placed: focused ? "receipt" : "receipt-outline",
                                    Preparing: focused ? "flame" : "flame-outline",
                                    Ready: focused ? "checkmark-circle" : "checkmark-circle-outline",
                                    Served: focused ? "bag-check" : "bag-check-outline",
                                };
                                return <Ionicons name={icons[tabRoute.name]} size={18} color={color} />;
                            },
                            tabBarShowLabel: true,
                            tabBarStyle: {
                                height: 64,
                                paddingTop: 6,
                                paddingBottom: 6,
                                backgroundColor: "#FFF8E7",
                                borderBottomWidth: 3,
                                borderBottomColor: "#111111",
                            },
                        })}
                    >
                        {["Placed", "Preparing", "Ready", "Served"].map(status => (
                            <Tab.Screen
                                key={status}
                                name={status}
                                children={props => <OrdersByStatus {...props} userData={userData} />}
                            />
                        ))}
                    </Tab.Navigator>
                </View>
            </SafeAreaView>
        </StaffOrdersProvider>
    );
}
