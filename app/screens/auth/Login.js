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
  ActivityIndicator,
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
import axios from "axios";
import { LOCAL_ENDPOINT } from "../../constant/api";

// ─── CONFIG ──────────────────────────────────────────────────────────
// "both"     → user can switch between OTP and password login
// "otp"      → only OTP login
// "password" → only password login
const LOGIN_TYPE = "both"; // ← change this or derive from backend/env
// ─────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const LOCAL_IMAGES = [img2, img1];
const API_URL = `${LOCAL_ENDPOINT}/assets`;
const OTP_LENGTH = 6;
const OTP_RESEND_SECONDS = 30;

export default function Login({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loginWithOtp, requestLoginOtp } = useAuthStore();

  // ── Onboarding images ────────────────────────────────────────────
  const [onboardingImages, setOnboardingImages] = useState(LOCAL_IMAGES);
  const scrollRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);

  // ── Modal ────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Login mode ───────────────────────────────────────────────────
  // "password" | "otp"
  const [loginMode, setLoginMode] = useState(
    "otp"
  );

  // ── Shared ───────────────────────────────────────────────────────
  const [mobile, setMobile] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ── Password mode ────────────────────────────────────────────────
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // ── OTP mode ─────────────────────────────────────────────────────
  const [otpStep, setOtpStep] = useState("phone"); // "phone" | "otp"
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpError, setOtpError] = useState("");
  const [userId, setUserId] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef([]);
  const timerRef = useRef(null);

  // ─── Fetch onboarding images ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(API_URL);
        const d = res.data?.data;
        if (d) {
          const imgs = [d.onboardingImageOne, d.onboardingImageTwo].filter(Boolean);
          if (imgs.length) setOnboardingImages(imgs);
        }
      } catch (_) { }
    })();
  }, []);

  // ─── Auto-slide ───────────────────────────────────────────────────
  useEffect(() => {
    if (onboardingImages.length <= 1) return;
    const id = setInterval(() => {
      const next = (activeIdx + 1) % onboardingImages.length;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setActiveIdx(next);
    }, 4000);
    return () => clearInterval(id);
  }, [activeIdx, onboardingImages.length]);

  // ─── Modal animation ──────────────────────────────────────────────
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

  // ─── OTP resend timer ─────────────────────────────────────────────
  const startResendTimer = () => {
    setResendTimer(OTP_RESEND_SECONDS);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  // ─── Reset modal state on close ───────────────────────────────────
  const closeModal = () => {
    setShowModal(false);
    setMobile("");
    setPassword("");
    setOtp(["", "", "", "", "", ""]);
    setMobileError("");
    setPasswordError("");
    setOtpError("");
    setOtpStep("phone");
    setUserId(null);
    setLoginMode(LOGIN_TYPE === "otp" ? "otp" : "password");
    clearInterval(timerRef.current);
    setResendTimer(0);
  };

  // ─── Helpers ──────────────────────────────────────────────────────
  const validateMobile = () => {
    if (!mobile.trim()) { setMobileError("Phone number is required"); return false; }
    if (!/^\d{10}$/.test(mobile)) { setMobileError("Enter valid 10-digit number"); return false; }
    setMobileError("");
    return true;
  };

  const getDevicePayload = async () => {
    const deviceInfo = await getDeviceInfo();
    const fcm = await getFCMToken();
    return {
      device_id: deviceInfo?.device_id,
      fcm_token: fcm,
      platform: deviceInfo?.platform,
      appVersion: Application.nativeApplicationVersion,
    };
  };

  // ─── PASSWORD LOGIN ───────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!validateMobile()) return;
    if (!password.trim()) { setPasswordError("Password is required"); return; }
    if (password.length < 6) { setPasswordError("Min 6 characters"); return; }
    setPasswordError("");
    setIsLoading(true);
    try {
      const d = await getDevicePayload();
      const res = await login(mobile, password, d.device_id, d.fcm_token, d.platform, d.appVersion);
      if (!res.success) { setPasswordError(res.message || "Invalid credentials"); return; }
      closeModal();
      navigation.replace("Home");
    } catch (err) {
      setPasswordError(err?.response?.data?.error || "Sign in failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── REQUEST OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!validateMobile()) return;
    setIsLoading(true);
    try {
      const res = await requestLoginOtp(mobile); // POST /auth/request-otp { mobile }
      if (!res.success) { setMobileError(res.message || "Failed to send OTP"); return; }
      console.log(res)
      setUserId(res.userId);
      setOtpStep("otp");
      startResendTimer();
    } catch (err) {
      setMobileError(err?.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── VERIFY OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpVal = otp.join("");
    if (otpVal.length < OTP_LENGTH) { setOtpError("Enter complete OTP"); return; }
    setOtpError("");
    setIsLoading(true);
    try {
      const res = await loginWithOtp(userId, otpVal); // POST /auth/verify-otp { user_id, otp }
      if (!res.success) { setOtpError(res.message || "Invalid OTP"); return; }
      closeModal();
      navigation.replace("Home");
    } catch (err) {
      console.log(err)
      setOtpError(err?.response?.data?.error || "Invalid or expired OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // ─── OTP box handlers ─────────────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    if (!cleaned && val) return; // non-numeric ignore
    const next = [...otp];
    next[idx] = cleaned.slice(-1);
    setOtp(next);
    setOtpError("");
    if (cleaned && idx < OTP_LENGTH - 1) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyPress = (e, idx) => {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      const next = [...otp];
      next[idx - 1] = "";
      setOtp(next);
      otpRefs.current[idx - 1]?.focus();
    }
  };

  // ─── Mode switch ──────────────────────────────────────────────────
  const switchMode = (mode) => {
    setLoginMode(mode);
    setPassword("");
    setOtp(["", "", "", "", "", ""]);
    setPasswordError("");
    setOtpError("");
    setOtpStep("phone");
    setUserId(null);
    clearInterval(timerRef.current);
    setResendTimer(0);
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const renderModeToggle = () => {
    if (LOGIN_TYPE !== "both") return null;
    return (
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, loginMode === "password" && styles.modeBtnActive]}
          onPress={() => switchMode("password")}
          disabled={isLoading}
        >
          <Text style={[styles.modeBtnText, loginMode === "password" && styles.modeBtnTextActive]}>
            Password
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, loginMode === "otp" && styles.modeBtnActive]}
          onPress={() => switchMode("otp")}
          disabled={isLoading}
        >
          <Text style={[styles.modeBtnText, loginMode === "otp" && styles.modeBtnTextActive]}>
            OTP
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderMobileField = () => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>Phone Number</Text>
      <View style={styles.inputWrapper}>
        <Feather name="phone" size={20} color="#999" style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, styles.textInputWithIcon, mobileError && styles.textInputError]}
          value={mobile}
          onChangeText={(t) => { setMobile(t.replace(/[^0-9]/g, "")); setMobileError(""); }}
          placeholder="Enter phone number"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          maxLength={10}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          returnKeyType="next"
          editable={!isLoading}
        />
      </View>
      {mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}
    </View>
  );

  const renderPasswordForm = () => (
    <>
      {renderMobileField()}

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <Feather name="lock" size={20} color="#999" style={styles.inputIcon} />
          <TextInput
            style={[styles.textInput, styles.textInputWithIcon, styles.passwordInput, passwordError && styles.textInputError]}
            value={password}
            onChangeText={(t) => { setPassword(t); setPasswordError(""); }}
            placeholder="Enter your password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handlePasswordLogin}
            editable={!isLoading}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)} disabled={isLoading}>
            <Feather name={showPassword ? "eye" : "eye-off"} size={20} color="#999" />
          </TouchableOpacity>
        </View>
        {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      </View>

      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => { closeModal(); navigation.navigate("ForgotPassword"); }}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>

      <Button
        title={isLoading ? "Signing in..." : "Sign in"}
        color="#fff"
        onPress={handlePasswordLogin}
        disabled={isLoading}
      />
    </>
  );

  const renderOtpPhoneStep = () => (
    <>
      {renderMobileField()}

      <Button
        title={isLoading ? "Sending OTP..." : "Send OTP"}
        color="#fff"
        onPress={handleRequestOtp}
        disabled={isLoading}
      />
    </>
  );

  const renderOtpVerifyStep = () => (
    <>
      {/* Back + phone display */}
      <View style={styles.otpHeaderRow}>
        <TouchableOpacity onPress={() => setOtpStep("phone")} disabled={isLoading}>
          <Feather name="arrow-left" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={styles.otpPhoneDisplay}>OTP sent to +91 {mobile}</Text>
      </View>

      {/* OTP boxes */}
      <View style={styles.otpBoxRow}>
        {otp.map((digit, idx) => (
          <TextInput
            key={idx}
            ref={(r) => (otpRefs.current[idx] = r)}
            style={[styles.otpBox, digit && styles.otpBoxFilled, otpError && styles.otpBoxError]}
            value={digit}
            onChangeText={(v) => handleOtpChange(v, idx)}
            onKeyPress={(e) => handleOtpKeyPress(e, idx)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            editable={!isLoading}
            autoFocus={idx === 0}
          />
        ))}
      </View>
      {otpError ? <Text style={[styles.errorText, { textAlign: "center", marginBottom: 12 }]}>{otpError}</Text> : null}

      {/* Resend */}
      <View style={styles.resendRow}>
        {resendTimer > 0 ? (
          <Text style={styles.resendTimer}>Resend in {resendTimer}s</Text>
        ) : (
          <TouchableOpacity onPress={handleRequestOtp} disabled={isLoading}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <Button
        title={isLoading ? "Verifying..." : "Verify & Login"}
        color="#fff"
        onPress={handleVerifyOtp}
        disabled={isLoading}
      />
    </>
  );

  const renderOtpForm = () =>
    otpStep === "phone" ? renderOtpPhoneStep() : renderOtpVerifyStep();

  // ═══════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <SafeAreaView style={styles.mainContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>Dikshant IAS</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            if (idx !== activeIdx) setActiveIdx(idx);
          }}
          scrollEventThrottle={16}
          style={styles.imageSlider}
        >
          {onboardingImages.map((src, i) => (
            <View key={i} style={styles.slide}>
              <Image
                source={typeof src === "string" ? { uri: src } : src}
                style={styles.slideImg}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Dots */}
        {onboardingImages.length > 1 && (
          <View style={styles.dotsRow}>
            {onboardingImages.map((_, i) => (
              <View key={i} style={[styles.dot, i === activeIdx && styles.dotActive]} />
            ))}
          </View>
        )}

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.loginButton} onPress={() => setShowModal(true)}>
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

      {/* ── LOGIN MODAL ── */}
      <Modal
        visible={showModal}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={0}
        >
          <TouchableWithoutFeedback onPress={closeModal}>
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

                    <Text style={styles.sheetTitle}>Sign in</Text>
                    <Text style={styles.sheetSubtitle}>
                      {loginMode === "otp"
                        ? "We'll send a one-time password to your phone"
                        : "Enter your credentials to continue"}
                    </Text>

                    {/* Mode toggle (only when LOGIN_TYPE === "both") */}
                    {/* {renderModeToggle()} */}

                    {/* Form */}
                    {loginMode === "password" ? renderPasswordForm() : renderOtpForm()}
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

// ─── STYLES ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  mainContent: { flex: 1 },
  logoContainer: { paddingHorizontal: 20, paddingTop: 20 },
  logoText: {
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#E74C3C",
    letterSpacing: 0.5,
  },
  imageSlider: { height: SCREEN_HEIGHT * 0.35, marginTop: 40, margin: 12 },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  slideImg: { width: SCREEN_WIDTH, height: "100%" },
  dotsRow: { flexDirection: "row", justifyContent: "center", marginTop: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#D0D0D0" },
  dotActive: { backgroundColor: "#E74C3C", width: 18 },
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
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 4 },
    }),
  },
  loginButtonText: { fontSize: 18, fontWeight: "700", fontFamily: "Geist", color: "#E74C3C" },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  signupTxt: { fontSize: 15, fontFamily: "Geist", color: "#FFFFFF" },
  signupLink: { fontSize: 15, fontFamily: "Geist", color: "#FFFFFF", fontWeight: "700", textDecorationLine: "underline" },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.90,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 16 },
    }),
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: "#D0D0D0", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  sheetTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Geist", textAlign: "center", color: "#000", marginBottom: 8 },
  sheetSubtitle: { fontSize: 14, color: "#666666", fontFamily: "Geist", textAlign: "center", marginBottom: 24, lineHeight: 20 },

  // Mode toggle
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeBtnActive: { backgroundColor: "#E74C3C" },
  modeBtnText: { fontSize: 14, fontWeight: "600", fontFamily: "Geist", color: "#888" },
  modeBtnTextActive: { color: "#FFFFFF" },

  // Inputs
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Geist", color: "#333", marginBottom: 8 },
  inputWrapper: { position: "relative", flexDirection: "row", alignItems: "center" },
  inputIcon: { position: "absolute", left: 16, zIndex: 1 },
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
    flex: 1,
  },
  textInputWithIcon: { paddingLeft: 48 },
  passwordInput: { paddingRight: 48 },
  textInputError: { borderColor: "#E74C3C", backgroundColor: "#FFF5F5" },
  eyeIcon: { position: "absolute", right: 16, padding: 4 },
  errorText: { color: "#E74C3C", fontFamily: "Geist", fontSize: 12, marginTop: 6, marginLeft: 4 },

  // Forgot password
  forgotPassword: { alignSelf: "flex-end", marginBottom: 20, marginTop: -8 },
  forgotPasswordText: { color: "#E74C3C", fontSize: 14, fontFamily: "Geist", fontWeight: "600" },

  // OTP
  otpHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24 },
  otpPhoneDisplay: { fontSize: 14, fontFamily: "Geist", color: "#555", flex: 1 },
  otpBoxRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 8 },
  otpBox: {
    width: 36,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#F5F5F5",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#000",
  },
  otpBoxFilled: { borderColor: "#E74C3C", backgroundColor: "#FFF5F5" },
  otpBoxError: { borderColor: "#E74C3C" },
  resendRow: { alignItems: "center", marginBottom: 20 },
  resendTimer: { fontSize: 13, fontFamily: "Geist", color: "#999" },
  resendLink: { fontSize: 13, fontFamily: "Geist", color: "#E74C3C", fontWeight: "600", textDecorationLine: "underline" },
});