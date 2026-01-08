import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
  Animated,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Button from "../../components/Button";
import { useAuthStore } from "../../stores/auth.store";
import * as Application from "expo-application";
import img1 from "../../assets/images/bg.png";
import img2 from "../../assets/images/g.png";
import { getDeviceInfo, getFCMToken } from "../../utils/permissions";
import { colors } from "../../constant/color";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const images = [img2, img1];

export default function Login({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loginWithPassword } = useAuthStore();

  // Login Method Selection
  const [loginMethod, setLoginMethod] = useState("otp"); // "otp" or "password"

  // OTP Flow
  const [step, setStep] = useState(1); // 1 = phone, 2 = verify OTP
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");

  // Password Flow
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [identifierError, setIdentifierError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    const id = setInterval(() => {
      const next = (activeIdx + 1) % images.length;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setActiveIdx(next);
    }, 4000);
    return () => clearInterval(id);
  }, [activeIdx]);

  useEffect(() => {
    if (showModal) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showModal]);

  const onScroll = (e) => {
    const { contentOffset } = e.nativeEvent;
    const idx = Math.round(contentOffset.x / SCREEN_WIDTH);
    if (idx !== activeIdx) setActiveIdx(idx);
  };

  // Reset all errors and fields when switching login methods
  const switchLoginMethod = (method) => {
    setLoginMethod(method);
    setPhoneError("");
    setOtpError("");
    setPasswordError("");
    setIdentifierError("");
    setPhone("");
    setOtp("");
    setPhoneOrEmail("");
    setPassword("");
    setStep(1);
  };

  // OTP Flow Handlers
  const handleSendOtp = async () => {
    try {
      // Validate phone number
      if (!/^[0-9]{10}$/.test(phone)) {
        setPhoneError("Enter a valid 10-digit phone number");
        return;
      }

      setPhoneError("");
      setIsLoading(true);
      const deviceInfo = await getDeviceInfo();
      const tokenFcm = await getFCMToken();

      // Call OTP API
      const res = await login(
        phone,
        "",
        "",
        deviceInfo?.device_id,
        tokenFcm,
        deviceInfo?.platform,
        Application.nativeApplicationVersion
      );
      if (res.message || res.success) {
        setStep(2);
      }
    } catch (error) {
      console.error("OTP Send Error:", error);
      setPhoneError(error.message || "Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      if (!/^[0-9]{6}$/.test(otp)) {
        setOtpError("Enter a valid 6-digit OTP");
        return;
      }

      setOtpError("");
      setIsLoading(true);

      const res = await login(phone, otp);
      if (!res.success) {
        setOtpError(res.message || "Invalid OTP");
        return;
      }

      setOtpError("");
      setShowModal(false);
      navigation.replace("Home");
    } catch (error) {
      console.error("OTP Verify Error:", error);
      setOtpError(error.message || "Failed to verify OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Password Flow Handler
  const handlePasswordLogin = async () => {
    try {
      // Validate identifier (phone or email)
      if (!phoneOrEmail.trim()) {
        setIdentifierError("Phone number or email is required");
        return;
      }

      // Validate password
      if (!password.trim()) {
        setPasswordError("Password is required");
        return;
      }

      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters");
        return;
      }

      setIdentifierError("");
      setPasswordError("");
      setIsLoading(true);

      const deviceInfo = await getDeviceInfo();
      const tokenFcm = await getFCMToken();
      // Call Password Login API
      const res = await login(
        phoneOrEmail,
        "",
        password,
        deviceInfo?.device_id,
        tokenFcm,
        deviceInfo?.platform,
        Application.nativeApplicationVersion
      );

      if (!res.success) {
        setPasswordError(res.message || "Invalid credentials");
        return;
      }

      setShowModal(false);
      navigation.replace("Home");
    } catch (error) {
      console.error("Password Login Error:", error);
      setPasswordError(error.message || "Failed to login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.mainContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>Dikshant Ias</Text>
            <Text style={styles.logoSubtext}>Education centre</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          style={styles.imageSlider}
        >
          {images.map((src, i) => (
            <View key={i} style={styles.slide}>
              <Image
                source={src}
                style={styles.slideImg}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => setShowModal(true)}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>

          <View style={styles.signupRow}>
            <Text style={styles.signupTxt}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Login Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <Animated.View
                  style={[
                    styles.bottomSheet,
                    {
                      paddingBottom: Math.max(40, insets.bottom + 20),
                      transform: [{ translateY: slideAnim }],
                    },
                  ]}
                >
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    <View style={styles.sheetHandle} />

                    {/* Title */}
                    <Text style={styles.sheetTitle}>
                      {loginMethod === "otp"
                        ? step === 1
                          ? "Sign in with OTP"
                          : "Verify OTP"
                        : "Sign in with Password"}
                    </Text>

                    {/* Subtitle */}
                    <Text style={styles.sheetSubtitle}>
                      {loginMethod === "otp"
                        ? step === 1
                          ? "Enter your phone number to receive OTP"
                          : `We sent a 6-digit code to ${phone}`
                        : "Enter your credentials to continue"}
                    </Text>

                    {/* Login Method Toggle */}
                    {step === 1 && (
                      <View style={styles.toggleContainer}>
                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            loginMethod === "otp" && styles.toggleButtonActive,
                          ]}
                          onPress={() => switchLoginMethod("otp")}
                        >
                          <Feather
                            name="smartphone"
                            size={18}
                            color={loginMethod === "otp" ? "#FFFFFF" : "#666"}
                          />
                          <Text
                            style={[
                              styles.toggleButtonText,
                              loginMethod === "otp" &&
                                styles.toggleButtonTextActive,
                            ]}
                          >
                            Login with OTP
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.toggleButton,
                            loginMethod === "password" &&
                              styles.toggleButtonActive,
                          ]}
                          onPress={() => switchLoginMethod("password")}
                        >
                          <Feather
                            name="lock"
                            size={18}
                            color={
                              loginMethod === "password" ? "#FFFFFF" : "#666"
                            }
                          />
                          <Text
                            style={[
                              styles.toggleButtonText,
                              loginMethod === "password" &&
                                styles.toggleButtonTextActive,
                            ]}
                          >
                            Login with Password
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* OTP Login Flow */}
                    {loginMethod === "otp" && (
                      <>
                        {step === 1 && (
                          <>
                            <View style={styles.inputContainer}>
                              <Text style={styles.inputLabel}>
                                Phone Number
                              </Text>
                              <View style={styles.inputWrapper}>
                                <Feather
                                  name="phone"
                                  size={20}
                                  color="#999"
                                  style={styles.inputIcon}
                                />
                                <TextInput
                                  style={[
                                    styles.textInput,
                                    styles.textInputWithIcon,
                                    phoneError ? styles.textInputError : null,
                                  ]}
                                  value={phone}
                                  onChangeText={(t) => {
                                    setPhone(t);
                                    setPhoneError("");
                                  }}
                                  placeholder="Enter 10-digit phone number"
                                  placeholderTextColor="#999"
                                  keyboardType="number-pad"
                                  maxLength={10}
                                  autoFocus
                                  returnKeyType="done"
                                  onSubmitEditing={handleSendOtp}
                                  editable={!isLoading}
                                />
                              </View>
                              {phoneError ? (
                                <Text style={styles.errorText}>
                                  {phoneError}
                                </Text>
                              ) : null}
                            </View>
                            <Button
                              color={colors.card}
                              title={isLoading ? "Sending..." : "Send OTP"}
                              onPress={handleSendOtp}
                              disabled={isLoading}
                            />
                          </>
                        )}

                        {step === 2 && (
                          <>
                            <View style={styles.inputContainer}>
                              <Text style={styles.inputLabel}>
                                Enter 6-digit OTP
                              </Text>
                              <TextInput
                                style={[
                                  styles.textInput,
                                  styles.otpInput,
                                  otpError ? styles.textInputError : null,
                                ]}
                                value={otp}
                                onChangeText={(t) => {
                                  setOtp(t);
                                  setOtpError("");
                                }}
                                placeholder="------"
                                placeholderTextColor="#999"
                                keyboardType="number-pad"
                                maxLength={6}
                                autoFocus
                                returnKeyType="done"
                                onSubmitEditing={handleVerifyOtp}
                                editable={!isLoading}
                              />
                              {otpError ? (
                                <Text style={styles.errorText}>{otpError}</Text>
                              ) : null}
                            </View>
                            <Button
                            color={"#fff"}
                              title={
                                isLoading ? "Verifying..." : "Verify & Sign in"
                              }
                              onPress={handleVerifyOtp}
                              disabled={isLoading}
                            />

                            <View style={styles.otpActions}>
                              <TouchableOpacity
                                onPress={() => {
                                  setStep(1);
                                  setOtp("");
                                  setOtpError("");
                                }}
                                style={styles.changeBtn}
                                disabled={isLoading}
                              >
                                <Feather
                                  name="edit-2"
                                  size={16}
                                  color="#E74C3C"
                                />
                                <Text style={styles.changeTxt}>
                                  Change Phone Number
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={handleSendOtp}
                                style={styles.resendBtn}
                                disabled={isLoading}
                              >
                                <Feather
                                  name="refresh-cw"
                                  size={16}
                                  color="#E74C3C"
                                />
                                <Text style={styles.changeTxt}>Resend OTP</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </>
                    )}

                    {/* Password Login Flow */}
                    {loginMethod === "password" && (
                      <>
                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>
                            Phone Number or Email
                          </Text>
                          <View style={styles.inputWrapper}>
                            <Feather
                              name="user"
                              size={20}
                              color="#999"
                              style={styles.inputIcon}
                            />
                            <TextInput
                              style={[
                                styles.textInput,
                                styles.textInputWithIcon,
                                identifierError ? styles.textInputError : null,
                              ]}
                              value={phoneOrEmail}
                              onChangeText={(t) => {
                                setPhoneOrEmail(t);
                                setIdentifierError("");
                              }}
                              placeholder="Phone or email"
                              placeholderTextColor="#999"
                              keyboardType="default"
                              autoCapitalize="none"
                              autoCorrect={false}
                              autoFocus
                              returnKeyType="next"
                              editable={!isLoading}
                            />
                          </View>
                          {identifierError ? (
                            <Text style={styles.errorText}>
                              {identifierError}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.inputContainer}>
                          <Text style={styles.inputLabel}>Password</Text>
                          <View style={styles.inputWrapper}>
                            <Feather
                              name="lock"
                              size={20}
                              color="#999"
                              style={styles.inputIcon}
                            />
                            <TextInput
                              style={[
                                styles.textInput,
                                styles.textInputWithIcon,
                                styles.passwordInput,
                                passwordError ? styles.textInputError : null,
                              ]}
                              value={password}
                              onChangeText={(t) => {
                                setPassword(t);
                                setPasswordError("");
                              }}
                              placeholder="Enter your password"
                              placeholderTextColor="#999"
                              secureTextEntry={!showPassword}
                              autoCapitalize="none"
                              autoCorrect={false}
                              returnKeyType="done"
                              onSubmitEditing={handlePasswordLogin}
                              editable={!isLoading}
                            />
                            <TouchableOpacity
                              style={styles.eyeIcon}
                              onPress={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              <Feather
                                name={showPassword ? "eye" : "eye-off"}
                                size={20}
                                color="#999"
                              />
                            </TouchableOpacity>
                          </View>
                          {passwordError ? (
                            <Text style={styles.errorText}>
                              {passwordError}
                            </Text>
                          ) : null}
                        </View>

                        <TouchableOpacity
                          style={styles.forgotPassword}
                          onPress={() => {
                            // Handle forgot password
                            setShowModal(false);
                            navigation.navigate("ForgotPassword");
                          }}
                        >
                          <Text style={styles.forgotPasswordText}>
                            Forgot Password?
                          </Text>
                        </TouchableOpacity>

                        <Button
                          title={isLoading ? "Signing in..." : "Sign in"}
                          onPress={handlePasswordLogin}
                          disabled={isLoading}
                        />
                      </>
                    )}
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mainContent: {
    flex: 1,
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  logoBox: {
    alignSelf: "flex-start",
  },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#E74C3C",
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 14,
    color: "#E74C3C",
    fontFamily: "Geist",
    marginTop: -4,
  },
  imageSlider: {
    height: SCREEN_HEIGHT * 0.35,
    marginTop: 40,
    margin: 12,
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  slideImg: {
    width: SCREEN_WIDTH,
    height: "100%",
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    backgroundColor: "#E74C3C",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 30,
  },
  loginButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#E74C3C",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  signupTxt: {
    fontSize: 15,
    fontFamily: "Geist",
    color: "#FFFFFF",
  },
  signupLink: {
    fontSize: 15,
    fontFamily: "Geist",
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D0D0D0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 26,
    fontWeight: "700",
    fontFamily: "Geist",
    textAlign: "center",
    color: "#fff",
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: "#666666",
    fontFamily: "Geist",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "transparent",
  },
  toggleButtonActive: {
    backgroundColor: "#E74C3C",
    ...Platform.select({
      ios: {
        shadowColor: "#E74C3C",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  toggleButtonText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: "Geist",
    color: "#666",
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
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
  inputWrapper: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  textInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Geist",
    paddingVertical: 14,
    fontSize: 16,
    color: "#000",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    flex: 1,
  },
  textInputWithIcon: {
    paddingLeft: 48,
  },
  passwordInput: {
    paddingRight: 48,
  },
  textInputError: {
    fontFamily: "Geist",
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  otpInput: {
    letterSpacing: 8,
    fontFamily: "Geist",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
  },
  eyeIcon: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  errorText: {
    color: "#E74C3C",
    fontFamily: "Geist",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  otpActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  changeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  resendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  changeTxt: {
    color: "#E74C3C",
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: "600",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: "#E74C3C",
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: "600",
  },
});
