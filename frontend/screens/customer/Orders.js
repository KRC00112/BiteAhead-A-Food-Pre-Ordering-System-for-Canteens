// Orders.js
import { Alert, Text, View, ScrollView, Pressable } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import orderStyles from "../../styles/screens/orders";
import styles from "../../styles";

const STATUS_COLORS = {
  pending: "#FFD966",
  preparing: "#9FC5E8",
  ready: "#B6D7A8",
  completed: "#D9D9D9",
  cancelled: "#EA9999",
};

function paymentMethodLabel(paymentMethod) {
  return paymentMethod === "CASH_ON_PICKUP" ? "Cash on pickup" : "Online";
}

export default function Orders({ route }) {
  const token = route?.params?.userData?.access_token;
  const [orders, setOrders] = useState([]);

  async function cancelOrder(orderId) {
    try {
      const response = await fetch(
        `https://canteen-backend-xzko.onrender.com/orders/${orderId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: "Cancelled by customer" }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Cancellation failed", data.detail || "Could not cancel the order.");
        return;
      }

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.order_id === orderId
            ? { ...order, ...data, pickup_code: data.pickup_code }
            : order,
        ),
      );
    } catch (error) {
      console.error("Error cancelling order:", error);
      Alert.alert("Cancellation failed", "Unable to connect to the server.");
    }
  }

  function confirmCancellation(orderId) {
    Alert.alert(
      "Cancel order?",
      "This order will be cancelled and cannot be prepared.",
      [
        { text: "Keep order", style: "cancel" },
        {
          text: "Cancel order",
          style: "destructive",
          onPress: () => cancelOrder(orderId),
        },
      ],
    );
  }

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch("https://canteen-backend-xzko.onrender.com/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          console.error("Failed to fetch orders:", response.status);
          return;
        }

        const orderSummaries = await response.json();
        const ordersWithPickupCodes = await Promise.all(
          orderSummaries.map(async (order) => {
            try {
              const detailResponse = await fetch(
                `https://canteen-backend-xzko.onrender.com/orders/${order.order_id}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                },
              );

              if (!detailResponse.ok) {
                console.error(
                  `Failed to fetch pickup code for order ${order.order_id}:`,
                  detailResponse.status,
                );
                return order;
              }

              const details = await detailResponse.json();
              return { ...order, pickup_code: details.pickup_code };
            } catch (error) {
              console.error(
                `Error fetching pickup code for order ${order.order_id}:`,
                error,
              );
              return order;
            }
          }),
        );

        setOrders(ordersWithPickupCodes);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    }

    fetchOrders();
  }, [token]);

  return (
    <SafeAreaView style={orderStyles.container} edges={["top", "left", "right"]}>
      <View style={styles.defaultView}>
        <Text style={orderStyles.heading}>My Orders</Text>
        <ScrollView>
          {orders.length === 0 && (
            <Text style={orderStyles.empty}>No orders yet</Text>
          )}

          {orders.map((item) => (
            <View key={item.order_id} style={orderStyles.card}>
              <View style={orderStyles.cardHeader}>
                <Text style={orderStyles.orderId}>#{item.order_id}</Text>
                <View
                  style={[
                    orderStyles.statusBadge,
                    {
                      backgroundColor:
                        STATUS_COLORS[item.status?.toLowerCase()] ?? "white",
                    },
                  ]}
                >
                  <Text style={orderStyles.statusText}>{item.status}</Text>
                </View>
              </View>

              <View style={orderStyles.cardBody}>
                <Text style={orderStyles.label}>Placed on</Text>
                <Text style={orderStyles.value}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
                <Text style={orderStyles.label}>Payment method</Text>
                <Text style={orderStyles.value}>
                  {paymentMethodLabel(item.payment_method)}
                </Text>
                <Text style={orderStyles.label}>Pickup code</Text>
                <Text style={orderStyles.value}>
                  {item.pickup_code ?? "Unavailable"}
                </Text>
              </View>

              <View style={orderStyles.totalRow}>
                <Text style={orderStyles.label}>Total</Text>
                <Text style={orderStyles.totalText}>₹{item.total_amount}</Text>
              </View>
              {item.status?.toUpperCase() === "PLACED" && (
                <Pressable
                  style={orderStyles.cancelButton}
                  onPress={() => confirmCancellation(item.order_id)}
                >
                  <Text style={orderStyles.cancelButtonText}>Cancel order</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
