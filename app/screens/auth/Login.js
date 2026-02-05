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
import axios from "axios";
import { LOCAL_ENDPOINT } from "../../constant/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const images = [img2, img1];
const API_URL = `${LOCAL_ENDPOINT}/assets`;

export default function Login({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login } = useAuthStore();

  const [onboardingImages, setOnboardingImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(true);

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

  // Fetch onboarding images from API (fallback to local)
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoadingImages(true);
        const response = await axios.get(API_URL);
        const data = response.data?.data;

        if (data) {
          const images = [];
          if (data.onboardingImageOne) images.push(data.onboardingImageOne);
          if (data.onboardingImageTwo) images.push(data.onboardingImageTwo);
          setOnboardingImages(images.length > 0 ? images : []);
        }
      } catch (err) {
        console.error("Failed to load onboarding images:", err);
        setOnboardingImages([
          require("../../assets/images/bg.png"),
          require("../../assets/images/g.png"),
        ]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchAssets();
  }, []);

  // Auto-slide carousel (only if multiple images)
  useEffect(() => {
    if (onboardingImages.length <= 1) return;

    const id = setInterval(() => {
      const next = (activeIdx + 1) % onboardingImages.length;
      scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
      setActiveIdx(next);
    }, 4000);

    return () => clearInterval(id);
  }, [activeIdx, onboardingImages.length]);

  // Bottom sheet animation
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

  const handlePasswordLogin = async () => {
    try {
      if (!phoneOrEmail.trim()) {
        setIdentifierError("Email or phone number is required");
        return;
      }

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

      const res = await login(
        phoneOrEmail,
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
      console.error("Login Error:", error);
      setPasswordError(error.message || "Failed to sign in. Please try again.");
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
            <Text style={styles.logoText}>Dikshant IAS</Text>
            {/* <Text style={styles.logoSubtext}>Education Centre</Text> */}
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

      {/* Login Modal – Email + Password only */}
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

                    <Text style={styles.sheetTitle}>Sign in</Text>

                    <Text style={styles.sheetSubtitle}>
                      Enter your credentials to continue
                    </Text>

                <View style={styles.inputContainer}>
  <Text style={styles.inputLabel}>Phone Number</Text>

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
        identifierError && styles.textInputError,
      ]}
      value={phoneOrEmail}
      onChangeText={(t) => {
        // allow only numbers
        const cleaned = t.replace(/[^0-9]/g, "");
        setPhoneOrEmail(cleaned);
        setIdentifierError("");
      }}
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

  {identifierError ? (
    <Text style={styles.errorText}>{identifierError}</Text>
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
                        <Text style={styles.errorText}>{passwordError}</Text>
                      ) : null}
                    </View>

                    <TouchableOpacity
                      style={styles.forgotPassword}
                      onPress={() => {
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
                      color={"#fff"}
                      onPress={handlePasswordLogin}
                      disabled={isLoading}
                    />
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

// ────────────────────────────────────────────────
// Styles remain mostly the same — removed unused OTP-related styles
// ────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  mainContent: { flex: 1 },
  logoContainer: { paddingHorizontal: 20, paddingTop: 20 },
  logoBox: { alignSelf: "flex-start" },
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
  imageSlider: { height: SCREEN_HEIGHT * 0.35, marginTop: 40, margin: 12 },
  slide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  slideImg: { width: SCREEN_WIDTH, height: "100%" },
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
  loginButtonText: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Geist",
    color: "#E74C3C",
  },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 10 },
  signupTxt: { fontSize: 15, fontFamily: "Geist", color: "#FFFFFF" },
  signupLink: {
    fontSize: 15,
    fontFamily: "Geist",
    color: "#FFFFFF",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: SCREEN_HEIGHT * 0.85,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 16 },
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
    color: "#000",          // ← changed from #fff (was probably a copy-paste leftover)
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
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Geist",
    color: "#333",
    marginBottom: 8,
  },
  inputWrapper: { position: "relative", flexDirection: "row", alignItems: "center" },
  inputIcon: { position: "absolute", left: 16, zIndex: 1 },
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
  textInputWithIcon: { paddingLeft: 48 },
  passwordInput: { paddingRight: 48 },
  textInputError: {
    fontFamily: "Geist",
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  eyeIcon: { position: "absolute", right: 16, padding: 4 },
  errorText: {
    color: "#E74C3C",
    fontFamily: "Geist",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 20, marginTop: -8 },
  forgotPasswordText: {
    color: "#E74C3C",
    fontSize: 14,
    fontFamily: "Geist",
    fontWeight: "600",
  },
});