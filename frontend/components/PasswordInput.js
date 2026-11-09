import { Ionicons } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";
import { useState } from "react";
import styles from "../styles";

export default function PasswordInput({ style, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.passwordInputContainer}>
      <TextInput
        {...props}
        style={[styles.inputText, styles.passwordInput, style]}
        secureTextEntry={!visible}
      />
      <Pressable
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => setVisible((current) => !current)}
        style={styles.passwordVisibilityButton}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color="#111111"
        />
      </Pressable>
    </View>
  );
}
