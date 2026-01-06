import React, { useState } from "react";
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

const ForgotPassword = () => {
  const [mobile, setMobile] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigation = useNavigation();

  const handleUpdatePassword = async () => {
    if (!mobile || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!/^\d{10}$/.test(mobile)) {
      Alert.alert("Error", "Please enter a valid 10-digit mobile number");
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        "https://www.dikapi.olyox.in/api/auth/update-password",
        {
          mobile,
          newPassword,
        }
      );

      if (response.data.status === "success") {
        Alert.alert("Success", response.data.message || "Password updated successfully!", [
          {
            text: "OK",
            onPress: () => navigation.replace("Splash"), // Redirect to Splash screen
          },
        ]);
        setMobile("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Error", response.data.error || "Failed to update password");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{flex:1}}>
      {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Password Change</Text>
          <View style={{ width: 24 }} /> {/* Placeholder for spacing */}
        </View>

          <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
  
        <View style={styles.card}>
          <Text style={styles.subtitle}>
            Enter your registered mobile number and new password
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Mobile Number"
            keyboardType="numeric"
            value={mobile}
            onChangeText={setMobile}
            maxLength={10}
            autoCapitalize="none"
          />

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="New Password"
              secureTextEntry={!showNewPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Ionicons
                name={showNewPassword ? "eye-off" : "eye"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm New Password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off" : "eye"}
                size={24}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

    </SafeAreaView>
  
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f0f4f8",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E74C3C",
    paddingVertical: 15,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    marginHorizontal: 20,
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#fafafa",
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#fafafa",
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
  },
  button: {
    height: 52,
    backgroundColor: "#E74C3C",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#80bfff",
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});

export default ForgotPassword;
