import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LOCAL_ENDPOINT } from "../../constant/api";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = mobile + send OTP, 2 = OTP + new password

  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigation = useNavigation();

  // Refs for auto-focus
  const otpRef = useRef(null);
  const newPassRef = useRef(null);
  const confirmPassRef = useRef(null);

  const validateMobile = () => /^\d{10}$/.test(mobile.trim());

  // Step 1: Send OTP
  const handleSendOtp = async () => {
    if (!validateMobile()) {
      Alert.alert("Invalid Input", "Please enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${LOCAL_ENDPOINT}/auth/update-password`, {
        mobile: mobile.trim(),
      });

      if (response.data?.success) {
        Alert.alert("OTP Sent", response.data.message || "OTP sent to your mobile");
        setStep(2);
        // Auto-focus OTP field after small delay
        setTimeout(() => otpRef.current?.focus(), 600);
      } else {
        Alert.alert("Error", response.data?.error || "Failed to send OTP");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Something went wrong. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Update Password
  const handleVerifyAndUpdate = async () => {
    if (!validateMobile()) {
      Alert.alert("Invalid Input", "Please enter a valid 10-digit mobile number");
      return;
    }

    if (!otp || otp.length < 4) {
      Alert.alert("Invalid OTP", "Please enter a valid OTP (usually 4-6 digits)");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${LOCAL_ENDPOINT}/auth/verify-otp-and-change-password`,
        {
          mobile: mobile.trim(),
          otp: otp.trim(),
          newPassword,
        }
      );

      // Success case
      if (response.data?.success) {
        Alert.alert(
          "Success",
          response.data.message || "Password updated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // Reset fields
                setMobile("");
                setOtp("");
                setNewPassword("");
                setConfirmPassword("");
                setStep(1);

                // Navigate away
                navigation.replace("Splash"); // or "Login" if you prefer
              },
            },
          ]
        );
      } else {
        Alert.alert("Failed", response.data?.error || "Unable to update password");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        err.message ||
        "Failed to verify OTP or update password";
      Alert.alert("Error", errorMsg);
      console.log("[Forgot Password Error]", err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f0f4f8" }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.subtitle}>
              {step === 1
                ? "Enter your registered mobile number to receive an OTP"
                : "Enter the OTP sent to your mobile and set a new password"}
            </Text>

            {/* Mobile Number */}
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
              value={mobile}
              onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
              maxLength={10}
              placeholderTextColor="#aaa"
              returnKeyType="next"
              onSubmitEditing={() => step === 1 && handleSendOtp()}
            />

            {step === 2 && (
              <>
                {/* OTP */}
                <TextInput
                  ref={otpRef}
                  style={styles.input}
                  placeholder="Enter OTP"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  placeholderTextColor="#aaa"
                  returnKeyType="next"
                  onSubmitEditing={() => newPassRef.current?.focus()}
                />

                {/* New Password */}
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={newPassRef}
                    style={styles.passwordInput}
                    placeholder="New Password"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPassRef.current?.focus()}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={confirmPassRef}
                    style={styles.passwordInput}
                    placeholder="Confirm New Password"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholderTextColor="#aaa"
                    autoCapitalize="none"
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>

                {/* Resend OTP */}
                <TouchableOpacity
                  onPress={handleSendOtp}
                  disabled={loading}
                  style={styles.resendContainer}
                >
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Action Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={step === 1 ? handleSendOtp : handleVerifyAndUpdate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {step === 1 ? "Send OTP" : "Update Password"}
                </Text>
              )}
            </TouchableOpacity>

            {step === 2 && (
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={styles.backLink}
              >
                <Text style={styles.backText}>← Change Mobile Number</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C",
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    marginHorizontal: 24,
    padding: 28,
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },
  input: {
    height: 54,
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 18,
    marginBottom: 16,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "#ddd",
    borderRadius: 14,
    paddingHorizontal: 18,
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: 54,
    fontSize: 16,
  },
  resendContainer: {
    alignSelf: "flex-end",
    marginBottom: 12,
  },
  resendText: {
    fontSize: 14,
    color: "#E74C3C",
    fontWeight: "600",
  },
  button: {
    height: 54,
    backgroundColor: "#E74C3C",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  buttonDisabled: {
    backgroundColor: "#d1d5db",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  backLink: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
});

export default ForgotPassword;