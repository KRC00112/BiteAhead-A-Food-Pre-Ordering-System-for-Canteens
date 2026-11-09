import { Alert, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styles from "../styles";
import PasswordInput from "../components/PasswordInput";
import { getAuthErrorMessage } from "../components/authMessages";

const API_URL = "https://canteen-backend-xzko.onrender.com";

function showMessage(title, message) {
  if (Platform.OS === "web") {
    alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function ForgotPassword() {
  const navigation = useNavigation();
  const [instituteId, setInstituteId] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [step, setStep] = useState("request");
  const [loading, setLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = setInterval(() => {
      setResendSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  async function requestCode() {
    if (!instituteId.trim()) {
      showMessage("Institute ID required", "Enter your Institute ID.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institute_id: instituteId.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        showMessage("Unable to send code", getAuthErrorMessage(data, "Please try again."));
        return;
      }

      setMaskedEmail(data.email);
      setResendSeconds(60);
      setStep("reset");
      showMessage("Code sent", data.message);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      showMessage("Connection error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!/^[0-9]{6}$/.test(otp)) {
      showMessage("Invalid code", "Enter the 6-digit code sent to your email.");
      return;
    }
    if (newPassword.length < 6) {
      showMessage("Invalid password", "The new password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage("Passwords do not match", "Enter the same password in both fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute_id: instituteId.trim(),
          otp,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        showMessage(
          "Password reset failed",
          getAuthErrorMessage(data, "Please check the code and try again."),
        );
        return;
      }

      showMessage("Password changed", data.message || "Your password was changed.");
      navigation.navigate("Login");
    } catch (error) {
      console.error("Error resetting password:", error);
      showMessage("Connection error", "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>RESET PASSWORD</Text>
      <View style={styles.form}>
        <Text style={styles.accountAvailabilityMessage}>
          {step === "request"
            ? "Enter your Institute ID to receive a reset code."
            : `Code sent to ${maskedEmail}`}
        </Text>

        <View style={styles.formInputComponent}>
          <Text style={styles.formInputLabel}>Institute ID</Text>
          <TextInput
            style={styles.inputText}
            value={instituteId}
            editable={step === "request"}
            placeholder="Enter Institute ID..."
            placeholderTextColor="#666666"
            onChangeText={setInstituteId}
            autoCapitalize="none"
          />
        </View>

        {step === "request" ? (
          <Pressable
            style={[styles.button, styles.formInputComponent]}
            onPress={requestCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "SENDING..." : "SEND CODE"}</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.formInputComponent}>
              <Text style={styles.formInputLabel}>6-Digit Code</Text>
              <TextInput
                style={styles.inputText}
                value={otp}
                placeholder="Enter code..."
                placeholderTextColor="#666666"
                onChangeText={(value) => setOtp(value.replace(/[^0-9]/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
            <View style={styles.formInputComponent}>
              <Text style={styles.formInputLabel}>New Password</Text>
              <PasswordInput
                value={newPassword}
                placeholder="Enter new password..."
                placeholderTextColor="#666666"
                onChangeText={setNewPassword}
              />
            </View>
            <View style={styles.formInputComponent}>
              <Text style={styles.formInputLabel}>Confirm Password</Text>
              <PasswordInput
                value={confirmPassword}
                placeholder="Confirm new password..."
                placeholderTextColor="#666666"
                onChangeText={setConfirmPassword}
              />
            </View>
            <Pressable
              style={[styles.button, styles.formInputComponent]}
              onPress={resetPassword}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? "CHANGING..." : "CHANGE PASSWORD"}</Text>
            </Pressable>
            <Pressable
              style={styles.formInputComponent}
              onPress={requestCode}
              disabled={loading || resendSeconds > 0}
            >
              <Text style={[styles.accountAvailabilityMessage, resendSeconds > 0 && { color: "#777777" }]}>
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </Text>
            </Pressable>
          </>
        )}

        <Text style={styles.accountAvailabilityMessage}>
          Remembered your password?{" "}
          <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
            Back to login
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
