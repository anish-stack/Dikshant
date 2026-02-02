import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Button from "../../components/Button";
import { useAuthStore } from "../../stores/auth.store";
import { getDeviceInfo, getFCMToken } from "../../utils/permissions";
import * as Application from "expo-application";

export default function Signup({ navigation }) {
  const { signup, verifyOtp, resendOtp } = useAuthStore();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (formData.name.trim().length > 50) {
      newErrors.name = "Name must not exceed 50 characters";
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name.trim())) {
      newErrors.name = "Name can only contain letters and spaces";
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address";
    } else if (formData.email.length > 100) {
      newErrors.email = "Email is too long";
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[6-9][0-9]{9}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit Indian phone number";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else if (formData.password.length > 50) {
      newErrors.password = "Password must not exceed 50 characters";
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one lowercase letter";
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      newErrors.password =
        "Password must contain at least one uppercase letter";
    } else if (!/(?=.*\d)/.test(formData.password)) {
      newErrors.password = "Password must contain at least one number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    const deviceInfo = await getDeviceInfo();
    const tokenFcm = await getFCMToken();

    try {
      const res = await signup({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        mobile: formData.phone,
        password: formData.password,
        device_id: deviceInfo?.device_id,
        fcm_token: tokenFcm,
        platform: deviceInfo?.platform,
        appVersion: Application.nativeApplicationVersion,
      });

      if (res.success) {
        setStep(2);
      }
    } catch (error) {
      console.error("Signup Error:", error);
      setErrors({
        submit: error.message || "Failed to create account. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setErrors({ otp: "Please enter a valid 6-digit OTP" });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const res = await verifyOtp(otp);
      if (res.success) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        });
      }
    } catch (error) {
      console.error("OTP Verification Error:", error);
      setErrors({
        otp: error.message || "Invalid OTP. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setErrors({});

    try {
      const res = await resendOtp();
      if (res.success) {
        setErrors({ otp: "✓ OTP resent successfully!" });
        setTimeout(() => setErrors({}), 3000);
      }
    } catch (error) {
      console.error("Resend OTP Error:", error);
      setErrors({
        otp: error.message || "Failed to resend OTP",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "", submit: "" }));
  };

  const handleBackPress = () => {
    if (step === 2) {
      setStep(1);
      setOtp("");
      setErrors({});
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            disabled={loading}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
          <View style={styles.backButton} />
        </View>

        {/* Keyboard Aware Scroll View */}
        <KeyboardAwareScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          enableOnAndroid={true}
          extraScrollHeight={Platform.OS === "android" ? 150 : 100}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          enableAutomaticScroll={true}
          enableResetScrollToCoords={false}
        >
          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressDot,
                step >= 1 && styles.progressDotActive,
              ]}
            />
            <View
              style={[
                styles.progressLine,
                step >= 2 && styles.progressLineActive,
              ]}
            />
            <View
              style={[
                styles.progressDot,
                step >= 2 && styles.progressDotActive,
              ]}
            />
          </View>

          {step === 1 ? (
            // Step 1: Registration Form
            <View style={styles.formContainer}>
              <Text style={styles.stepTitle}>Student Registration</Text>
              <Text style={styles.stepSubtitle}>
                Fill in your details to get started
              </Text>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.name ? styles.textInputError : null,
                  ]}
                  value={formData.name}
                  onChangeText={(text) => updateField("name", text)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
                {errors.name ? (
                  <Text style={styles.errorText}>{errors.name}</Text>
                ) : null}
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.email ? styles.textInputError : null,
                  ]}
                  value={formData.email}
                  onChangeText={(text) => updateField("email", text)}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  returnKeyType="next"
                />
                {errors.email ? (
                  <Text style={styles.errorText}>{errors.email}</Text>
                ) : null}
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.phone ? styles.textInputError : null,
                  ]}
                  value={formData.phone}
                  onChangeText={(text) =>
                    updateField("phone", text.replace(/[^0-9]/g, ""))
                  }
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={10}
                  editable={!loading}
                  returnKeyType="next"
                />
                {errors.phone ? (
                  <Text style={styles.errorText}>{errors.phone}</Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.password ? styles.textInputError : null,
                  ]}
                  value={formData.password}
                  onChangeText={(text) => updateField("password", text)}
                  placeholder="Min 8 chars with upper, lower & number"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  returnKeyType="done"
                  onSubmitEditing={handleSignup}
                />
                {errors.password ? (
                  <Text style={styles.errorText}>{errors.password}</Text>
                ) : null}
              </View>

              {errors.submit ? (
                <Text style={styles.submitError}>{errors.submit}</Text>
              ) : null}

              {/* Submit Button */}
              <Button
                title={loading ? "Creating Account..." : "Continue"}
                onPress={handleSignup}
                color={"#fff"}
                disabled={loading}
              />

              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#E74C3C"
                  style={styles.loader}
                />
              )}

              {/* Login Link */}
              <View style={styles.loginRow}>
                <Text style={styles.loginTxt}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Login")}
                  disabled={loading}
                >
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Step 2: OTP Verification
            <View style={styles.formContainer}>
              <Text style={styles.stepTitle}>Verify OTP</Text>
              <Text style={styles.stepSubtitle}>
                We sent a 6-digit code to {formData.email}
              </Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Enter 6-digit OTP</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.otpInput,
                    errors.otp && !errors.otp.startsWith("✓")
                      ? styles.textInputError
                      : null,
                  ]}
                  value={otp}
                  onChangeText={(text) => {
                    setOtp(text.replace(/[^0-9]/g, ""));
                    setErrors((prev) => ({ ...prev, otp: "" }));
                  }}
                  placeholder="------"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp}
                  editable={!loading}
                />
                {errors.otp ? (
                  <Text
                    style={[
                      styles.errorText,
                      errors.otp.startsWith("✓") && styles.successText,
                    ]}
                  >
                    {errors.otp}
                  </Text>
                ) : null}
              </View>

              <Button
                title={loading ? "Verifying..." : "Verify & Create Account"}
                onPress={handleVerifyOtp}
                color={"#fff"}
                disabled={loading || otp.length !== 6}
              />

              {loading && (
                <ActivityIndicator
                  size="small"
                  color="#E74C3C"
                  style={styles.loader}
                />
              )}

              <TouchableOpacity
                onPress={() => {
                  setStep(1);
                  setOtp("");
                  setErrors({});
                }}
                style={styles.changeBtn}
                disabled={loading}
              >
                <Text style={styles.changeTxt}>Change Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResendOtp}
                disabled={loading}
              >
                <Text style={styles.resendTxt}>
                  Didn't receive code? Resend
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    fontSize: 24,
    fontFamily: "Geist",
    color: "#E74C3C",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#000000",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  progressDotActive: {
    backgroundColor: "#E74C3C",
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#E74C3C",
  },
  formContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  stepSubtitle: {
    fontSize: 14,
    color: "#666666",
    fontFamily: "Geist",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Geist",
    color: "#333",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Geist",
    color: "#000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textInputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  otpInput: {
    letterSpacing: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  errorText: {
    color: "#E74C3C",
    fontFamily: "Geist",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  successText: {
    color: "#27AE60",
  },
  submitError: {
    color: "#E74C3C",
    fontFamily: "Geist",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  loader: {
    marginTop: 12,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  loginTxt: {
    fontSize: 15,
    fontFamily: "Geist",
    color: "#666666",
  },
  loginLink: {
    fontSize: 15,
    fontFamily: "Geist",
    color: "#E74C3C",
    fontWeight: "700",
  },
  changeBtn: {
    marginTop: 16,
    alignSelf: "center",
  },
  changeTxt: {
    color: "#E74C3C",
    fontSize: 15,
    fontFamily: "Geist",
    fontWeight: "600",
  },
  resendBtn: {
    marginTop: 12,
    alignSelf: "center",
  },
  resendTxt: {
    color: "#666666",
    fontFamily: "Geist",
    fontSize: 14,
  },
});
