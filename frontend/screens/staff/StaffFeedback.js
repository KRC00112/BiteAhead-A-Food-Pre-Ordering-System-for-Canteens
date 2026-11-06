import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../../styles";
import feedbackStyles from "../../styles/screens/staffFeedback";
import SearchBar from "../../components/SearchBar";

const API_URL = "https://canteen-backend-xzko.onrender.com";

function dayKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDay(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FeedbackEntry({ feedback }) {
  return (
    <View style={feedbackStyles.feedbackEntry}>
      <View style={feedbackStyles.entryHeader}>
        <Text style={feedbackStyles.foodName}>{feedback.food}</Text>
        <Text style={feedbackStyles.feedbackTime}>{formatTime(feedback.created_at)}</Text>
      </View>
      <Text style={feedbackStyles.customer}>
        {feedback.customer} (ID {feedback.institute_id})
      </Text>
      {feedback.rating != null && (
        <Text style={feedbackStyles.rating}>Rating: {feedback.rating}/5</Text>
      )}
      {feedback.description && (
        <Text style={feedbackStyles.description}>{feedback.description}</Text>
      )}
    </View>
  );
}

function OrderFeedback({ orderId, feedbacks, expanded, onPress }) {
  return (
    <View style={feedbackStyles.orderSection}>
      <Pressable style={feedbackStyles.orderHeader} onPress={onPress}>
        <Text style={feedbackStyles.orderTitle}>{orderId}</Text>
        <Text style={feedbackStyles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>
      {expanded &&
        feedbacks.map((feedback) => (
          <FeedbackEntry key={feedback.id} feedback={feedback} />
        ))}
    </View>
  );
}

function DaySection({ day, orders, expanded, onPress, expandedOrders, toggleOrder }) {
  return (
    <View style={feedbackStyles.daySection}>
      <Pressable style={feedbackStyles.dayHeader} onPress={onPress}>
        <View>
          <Text style={feedbackStyles.dayTitle}>{formatDay(day)}</Text>
          <Text style={feedbackStyles.dayCount}>
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </Text>
        </View>
        <Text style={feedbackStyles.chevron}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>
      {expanded &&
        orders.map(([orderId, feedbacks]) => (
          <OrderFeedback
            key={orderId}
            orderId={orderId}
            feedbacks={feedbacks}
            expanded={expandedOrders.has(orderId)}
            onPress={() => toggleOrder(orderId)}
          />
        ))}
    </View>
  );
}

export default function StaffFeedback({ route }) {
  const token = route?.params?.userData?.access_token;
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedDays, setExpandedDays] = useState(new Set());
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [search, setSearch] = useState("");

  const groupedFeedback = useMemo(() => {
    const byDay = new Map();
    feedback.forEach((entry) => {
      const key = dayKey(entry.created_at);
      if (!byDay.has(key)) byDay.set(key, new Map());
      const byOrder = byDay.get(key);
      if (!byOrder.has(entry.order_id)) byOrder.set(entry.order_id, []);
      byOrder.get(entry.order_id).push(entry);
    });
    return [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [feedback]);

  const filteredFeedback = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groupedFeedback;
    return groupedFeedback.map(([day, orders]) => [
      day,
      new Map([...orders.entries()].filter(([orderId, entries]) =>
        `${orderId} ${entries.map(entry => `${entry.food} ${entry.customer} ${entry.institute_id} ${entry.description || ""}`).join(" ")}`
          .toLowerCase()
          .includes(query)
      )),
    ]).filter(([, orders]) => orders.size > 0);
  }, [groupedFeedback, search]);

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/staff/feedback`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || "Could not load feedback.");
        return;
      }
      setFeedback(data);
    } catch (requestError) {
      console.error("Error loading staff feedback:", requestError);
      setError("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadFeedback();
    }, [loadFeedback]),
  );

  function toggleDay(day) {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function toggleOrder(orderId) {
    setExpandedOrders((current) => {
      const next = new Set(current);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }

  return (
    <SafeAreaView style={feedbackStyles.container} edges={["top", "left", "right"]}>
      <View style={styles.defaultView}>
        <Text style={feedbackStyles.heading}>User Feedback</Text>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search feedback, food, or customer..." />
        {loading ? (
          <ActivityIndicator size="large" color="#111111" />
        ) : error ? (
          <Text style={feedbackStyles.message}>{error}</Text>
        ) : filteredFeedback.length === 0 ? (
          <Text style={feedbackStyles.message}>No feedback yet.</Text>
        ) : (
          <ScrollView>
            {filteredFeedback.map(([day, orders]) => (
              <DaySection
                key={day}
                day={day}
                orders={[...orders.entries()]}
                expanded={expandedDays.has(day)}
                onPress={() => toggleDay(day)}
                expandedOrders={expandedOrders}
                toggleOrder={toggleOrder}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
