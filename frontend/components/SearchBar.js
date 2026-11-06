import { Ionicons } from "@expo/vector-icons";
import { TextInput, View } from "react-native";

export default function SearchBar({ value, onChangeText, placeholder = "Search..." }) {
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#111111",
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 10,
      marginBottom: 10,
    }}>
      <Ionicons name="search" size={20} color="#555555" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#666666"
        autoCapitalize="none"
        style={{ flex: 1, padding: 10, color: "#111111" }}
      />
    </View>
  );
}
