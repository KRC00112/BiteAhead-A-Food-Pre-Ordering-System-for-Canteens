// Orders.js
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useEffect, useState } from "react";
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
  const [feedbackOrder, setFeedbackOrder] = useState(null);
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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

  async function openFeedback(order) {
    setFeedbackOrder(order);
    setFeedbackLoading(true);
    try {
      const response = await fetch(
        `https://canteen-backend-xzko.onrender.com/orders/${order.order_id}/feedback`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Feedback unavailable", data.detail || "Could not load the feedback form.");
        setFeedbackOrder(null);
        return;
      }

      setFeedbackItems(
        data.items.map((item) => ({
          food_id: item.food_id,
          food: item.food,
          quantity: item.quantity,
          rating: item.rating ? String(item.rating) : "",
          description: item.description || "",
        })),
      );
    } catch (error) {
      console.error("Error loading feedback form:", error);
      Alert.alert("Feedback unavailable", "Unable to connect to the server.");
      setFeedbackOrder(null);
    } finally {
      setFeedbackLoading(false);
    }
  }

  function updateFeedbackItem(foodId, field, value) {
    setFeedbackItems((currentItems) =>
      currentItems.map((item) =>
        item.food_id === foodId ? { ...item, [field]: value } : item,
      ),
    );
  }

  async function submitFeedback() {
    const invalidItem = feedbackItems.find(
      (item) =>
        !/^[1-5]$/.test(item.rating) || !item.description.trim(),
    );
    if (invalidItem) {
      Alert.alert(
        "Complete the form",
        "Give every food item a rating from 1 to 5 and a written comment.",
      );
      return;
    }

    setFeedbackSubmitting(true);
    try {
      const response = await fetch(
        `https://canteen-backend-xzko.onrender.com/orders/${feedbackOrder.order_id}/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: feedbackItems.map((item) => ({
              food_id: item.food_id,
              rating: Number(item.rating),
              description: item.description.trim(),
            })),
          }),
        },
      );
      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Feedback failed", data.detail || "Could not submit feedback.");
        return;
      }

      setFeedbackOrder(null);
      Alert.alert("Thank you", "Your feedback was submitted.");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      Alert.alert("Feedback failed", "Unable to connect to the server.");
    } finally {
      setFeedbackSubmitting(false);
    }
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
              {item.status?.toUpperCase() === "SERVED" && (
                <Pressable
                  style={orderStyles.feedbackButton}
                  onPress={() => openFeedback(item)}
                >
                  <Text style={orderStyles.feedbackButtonText}>Give feedback</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {feedbackOrder && (
          <View style={orderStyles.feedbackOverlay}>
            <View style={orderStyles.feedbackForm}>
              <Text style={orderStyles.feedbackTitle}>Give feedback</Text>
              <Text style={orderStyles.feedbackOrder}>
                Order #{feedbackOrder.order_id}
              </Text>

              {feedbackLoading ? (
                <Text style={orderStyles.value}>Loading form...</Text>
              ) : (
                <ScrollView>
                  {feedbackItems.map((item) => (
                    <View key={item.food_id} style={orderStyles.feedbackItem}>
                      <Text style={orderStyles.feedbackFood}>
                        {item.food} x{item.quantity}
                      </Text>
                      <Text style={orderStyles.label}>Rating</Text>
                      <View style={orderStyles.ratingRow}>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Pressable
                            key={rating}
                            style={[
                              orderStyles.ratingButton,
                              item.rating === String(rating) &&
                                orderStyles.ratingButtonSelected,
                            ]}
                            onPress={() =>
                              updateFeedbackItem(
                                item.food_id,
                                "rating",
                                String(rating),
                              )
                            }
                          >
                            <Text>{rating}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <TextInput
                        value={item.description}
                        onChangeText={(text) =>
                          updateFeedbackItem(item.food_id, "description", text)
                        }
                        placeholder="What did you think?"
                        multiline
                        maxLength={1000}
                        style={orderStyles.feedbackInput}
                      />
                    </View>
                  ))}
                  <Pressable
                    style={orderStyles.submitFeedbackButton}
                    onPress={submitFeedback}
                    disabled={feedbackSubmitting}
                  >
                    <Text style={orderStyles.submitFeedbackText}>
                      {feedbackSubmitting ? "Submitting..." : "Submit feedback"}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={orderStyles.closeFeedbackButton}
                    onPress={() => setFeedbackOrder(null)}
                    disabled={feedbackSubmitting}
                  >
                    <Text>Close</Text>
                  </Pressable>
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
