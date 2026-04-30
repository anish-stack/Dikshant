import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";

axios.defaults.baseURL = API_URL_LOCAL_ENDPOINT;
axios.defaults.headers.common["Content-Type"] = "application/json";

export const useAuthStore = create((set, get) => ({
  phone: "",
  token: null,
  refreshtoken: null,
  loggedIn: false,
  otpSent: false,
  user: null,
  userId: null,

  // 🔹 Set phone number
  setPhone: (phone) => set({ phone }),

  // 🔹 Step 1: Signup - Register new user
  signup: async (formData) => {
    try {
      const {
        name,
        email,
        mobile: phone,
        password,
        device_id,
        fcm_token,
        platform,
        appVersion,
      } = formData;
      // Validation
      if (!name || !email || !phone || !password) {
        throw new Error("All fields are required");
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error("Invalid email format");
      }

      // Check phone format
      if (!/^[0-9]{10}$/.test(phone)) {
        throw new Error("Invalid phone number (must be 10 digits)");
      }

      // Call signup API
      const response = await axios.post("/auth/signup", {
        name,
        email,
        mobile: phone,
        password,
        device_id,
        fcm_token,
        platform,
        appVersion,
      });
      const { id } = response.data.user;

      // Save userId to AsyncStorage
      await AsyncStorage.setItem("userId", id.toString());

      set({ otpSent: true, phone, userId: id });

      return {
        success: true,
        message: "Signup successful! OTP sent to your phone.",
      };
    } catch (error) {
      console.error("Signup Error:", error.response?.data.error);
      const errorMessage =
        error.response?.data.error || error.message || "Signup failed";
      throw new Error(errorMessage);
    }
  },
  requestLoginOtp: async (mobile) => {
  try {
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) {
      throw new Error("Invalid mobile number");
    }

    const response = await axios.post("/auth/request-otp", {
      mobile,
    });

    const { user_id } = response.data;

    await AsyncStorage.setItem("userId", user_id.toString());

    set({
      phone: mobile,
      userId: user_id,
      otpSent: true,
    });

    return {
      success: true,
      userId: user_id,
      message: "OTP sent successfully",
    };
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.message ||
      "Failed to send OTP";
    throw new Error(msg);
  }
},
loginWithOtp: async (userId, otp) => {
  try {
    if (!userId) throw new Error("User ID missing");

    if (!/^\d{6}$/.test(otp)) {
      throw new Error("Invalid OTP");
    }

    const response = await axios.post("/auth/verify-otp", {
      user_id: userId,
      otp,
    });

    const { token, refresh_token, user } = response.data;

    await AsyncStorage.multiSet([
      ["authToken", token],
      ["refresh_token", refresh_token],
    ]);

    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    set({
      loggedIn: true,
      token,
      refreshtoken: refresh_token,
      user,
      userId: user.id,
      otpSent: false,
    });

    return {
      success: true,
      user,
      message: "Login successful",
    };
  } catch (error) {
    const msg =
      error.response?.data?.error ||
      error.message ||
      "OTP verification failed";
    throw new Error(msg);
  }
},

  // 🔹 Step 2: Request OTP (for login or signup verification)
  requestOtp: async (phone) => {
    try {
      if (!phone || !/^[0-9]{10}$/.test(phone)) {
        throw new Error("Invalid phone number");
      }

      const response = await axios.post("/auth/request-otp", {
        mobile: phone,
      });

      const { user_id } = response.data;

      // Save userId to AsyncStorage
      await AsyncStorage.setItem("userId", user_id.toString());

      set({ otpSent: true, phone, userId: user_id });

      return {
        success: true,
        message: `OTP sent successfully to ${phone}`,
        userId: user_id,
      };
    } catch (error) {
      console.error("Request OTP Error:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Failed to send OTP";
      throw new Error(errorMessage);
    }
  },

  // 🔹 Step 3: Verify OTP (completes signup or enables login)
  verifyOtp: async (otp) => {
    try {
      const { userId, phone } = get();

      if (!userId) {
        throw new Error("Please request OTP first");
      }

      if (!otp || otp.length !== 6) {
        throw new Error("Invalid OTP format");
      }

      const response = await axios.post("/auth/verify-otp", {
        user_id: userId,
        otp: otp,
      });

      const { token, user } = response.data;
      console.log("response.data", response.data);
      // Save all data to AsyncStorage
      await AsyncStorage.multiSet([["authToken", token]]);

      // Configure axios with token for future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      set({
        loggedIn: true,
        token: token,
        user: user,
        phone: phone,
        userId: user.id,
        otpSent: false,
      });

      return {
        success: true,
        message: "Login successful!",
        token: token,
        user: user,
      };
    } catch (error) {
      console.error("Verify OTP Error:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "OTP verification failed";
      throw new Error(errorMessage);
    }
  },

  // 🔹 Step 4: Direct Login with Password
  login: async (
    phone,
    password,
    device_id,
    fcm_token,
    platform,
    appVersion
  ) => {
    try {
      if (!phone) {
        throw new Error("Phone number is required");
      }
      console.log("password",password)

      // if (!/^[0-9]{10}$/.test(phone)) {
      //   throw new Error("Invalid phone number");
      // }

      const response = await axios.post("/auth/login", {
        mobile: phone,
        password: password ? password : "",
        device_id,
        fcm_token,
        platform,
        appVersion,
      });

      console.log("response.data", response.data);

      // If OTP was sent (NO TOKEN)
      if (
        response.data.success &&
        response.data.message ===
          "OTP sent successfully! Please check your messages."
      ) {
        return {
          success: true,
          otpSent: true,
          userId: response.data.user_id,
          message: "OTP sent successfully",
        };
      }

      // Password login - save token
      const { token, user, refresh_token } = response.data;

      if (!token) {
        throw new Error("Token missing in response");
      }

      await AsyncStorage.setItem("authToken", token);
      await AsyncStorage.setItem("refresh_token", refresh_token);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      set({
        loggedIn: true,
        token: token,
        refreshtoken: refresh_token,
        user: user,
        phone: phone,
        userId: user.id,
      });

      return {
        success: true,
        otpSent: false,
        message: "Login successful!",
        token: token,
        user: user,
      };
    } catch (error) {
      console.error(
        "Login Error Olod:",
        error.response
      );
      const errorMessage =
        error.response?.data?.error || error.message || "Login failed";
      throw new Error(errorMessage);
    }
  },

  getProfileApi: async () => {
    try {
      // Fetch token
      const authToken = await AsyncStorage.getItem("authToken");

      if (!authToken) {
        console.log("⚠️ [getProfile] No token found → returning false");
        return false;
      }

      // Apply token to axios
      axios.defaults.headers.common["Authorization"] = `Bearer ${authToken}`;

      // API Call
      console.log("🌍 [getProfile] Calling API: /auth/profile-details");
      const response = await axios.get("/auth/profile-details");

      const user = response.data.data;
      // console.log("👤 [getProfile] Extracted User:", user);

      // Store in Zustand
      set({
        loggedIn: true,
        token: authToken,
        user: user,
        userId: user.id,
        phone: user.mobile,
      });

      console.log("✅ [getProfile] User saved in store:", {
        id: user.id,
        name: user.name,
        phone: user.mobile,
      });

      return user;
    } catch (error) {
      console.error(
        "❌ [getProfile] Error:",
        error.response?.data || error.message
      );
      return false;
    }
  },

  // 🔹 Check login state on app start
  checkLogin: async () => {
    try {
      const tokenValue = await AsyncStorage.getItem("authToken");

      if (!tokenValue) {
        return false;
      }

      // Set token in axios
      axios.defaults.headers.common["Authorization"] = `Bearer ${tokenValue}`;

      // Try to fetch profile
      const user = await get().getProfileApi();

      return !!user;
    } catch (error) {
      console.error("checkLogin error:", error);
      return false;
    }
  },

  // 🔹 Logout
  logout: async (navigation) => {
    try {
      // 1️⃣ Call backend logout API
      await axios.get(`${API_URL_LOCAL_ENDPOINT}/auth/logout`);

      // 2️⃣ Clear all auth data from AsyncStorage
      await AsyncStorage.multiRemove(["authToken"]);

      // 3️⃣ Remove token from axios headers
      delete axios.defaults.headers.common["Authorization"];

      // 4️⃣ Reset navigation stack to Login
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }

      // 5️⃣ Reset Zustand store
      set({
        loggedIn: false,
        token: null,
        user: null,
        phone: "",
        otpSent: false,
        userId: null,
      });

      return { success: true, message: "Logged out successfully" };
    } catch (error) {
      console.error("Logout Error:", error.response.data);
      return {
        success: false,
        message: "Failed to logout",
        error: error.message,
      };
    }
  },

  // 🔹 Get current user profile
  getProfile: () => {
    const { user, phone, userId } = get();
    return {
      ...user,
      phone,
      userId,
    };
  },

  // 🔹 Resend OTP
  resendOtp: async () => {
    try {
      const { phone } = get();

      if (!phone) {
        throw new Error("No phone number found");
      }

      return await get().requestOtp(phone);
    } catch (error) {
      console.error("Resend OTP Error:", error);
      throw error;
    }
  },

  // 🔹 Clear OTP state
  clearOtpState: () => {
    set({ otpSent: false, userId: null });
  },

  // 🔹 Update axios token manually (if needed)
  setAxiosToken: (token) => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  },
}));
