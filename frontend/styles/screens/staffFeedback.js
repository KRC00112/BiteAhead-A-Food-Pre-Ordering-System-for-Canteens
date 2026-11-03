import { StyleSheet } from "react-native";

const feedback = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  heading: {
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 12,
  },
  message: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  daySection: {
    backgroundColor: "white",
    borderWidth: 3,
    borderColor: "#111111",
    marginBottom: 14,
    boxShadow: "4px 4px rgba(0, 0, 0, 1)",
  },
  dayHeader: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFD966",
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  dayCount: {
    marginTop: 2,
    color: "#555555",
  },
  orderSection: {
    borderTopWidth: 2,
    borderTopColor: "#111111",
  },
  orderHeader: {
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F3F3F3",
  },
  orderTitle: {
    fontWeight: "900",
  },
  chevron: {
    fontWeight: "900",
  },
  feedbackEntry: {
    borderTopWidth: 1,
    borderTopColor: "#AAAAAA",
    padding: 12,
    gap: 4,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "900",
    flex: 1,
  },
  feedbackTime: {
    color: "#555555",
  },
  customer: {
    color: "#555555",
  },
  rating: {
    fontWeight: "900",
  },
  description: {
    fontSize: 15,
  },
});

export default feedback;
