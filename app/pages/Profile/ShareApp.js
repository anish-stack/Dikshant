// screens/ShareApp/index.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  Platform,
  Alert,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Layout from "../../components/layout";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

const colors = {
  primary: "#DC2626",
  secondary: "#1F2937",
  background: "#FFFFFF",
  surface: "#FAFAFA",
  text: "#111827",
  textSecondary: "#6B7280",
  textLight: "#9CA3AF",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  border: "#E5E7EB",
  lightBlue: "#EFF6FF",
  white: "#FFFFFF",
};

const ShareAppScreen = () => {
  const { settings, loading, error, refetch } = useSettings();
  const appLinks = {
    android: settings?.playStoreUrl || "",
    ios: settings?.appStoreUrl || "",
    website: settings?.webSiteUrl || "",
  };

  const handleShareApp = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const message =
        Platform.OS === "android"
          ? `📱 Download the app from Play Store:\n${appLinks.android}\n\n🎓 Start learning today!`
          : `📱 Download the app from App Store:\n${appLinks.ios}\n\n🎓 Start learning today!`;

      const shareOptions = {
        message,
        url: Platform.OS === "ios" ? appLinks.ios : undefined,
        title: "Share App",
      };

      const result = await Share.share(shareOptions);

      if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "App shared successfully!");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share the app");
    }
  };

  const handleCopyLink = (link) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Implement clipboard copy - you may need to use react-native-clipboard or similar
      Alert.alert("Success", `Link copied to clipboard!\n${link}`);
    } catch (error) {
      Alert.alert("Error", "Failed to copy link");
    }
  };
  useEffect(() => {
    refetch();
  }, [error]);

  if (loading) return <ActivityIndicator size="large" color="#667eea" />;
  if (error) return <Text>Error loading settings</Text>;
  return (
    <Layout isHeaderShow={true}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Feather name="share-2" size={40} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Share App</Text>
          <Text style={styles.headerSubtitle}>
            Help others discover this amazing learning platform
          </Text>
        </View>

        {/* Quick Share Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Share</Text>

          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareApp}
            activeOpacity={0.7}
          >
            <Feather name="send" size={16} color={colors.white} />
            <Text style={styles.shareButtonText}>Share via Social Media</Text>
            <Feather name="arrow-right" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* App Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Download Links</Text>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleCopyLink(appLinks.android)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#3DDC84" }]}>
              <Feather name="download" size={16} color={colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Google Play Store</Text>
              <Text style={styles.linkSubtitle} numberOfLines={1}>
                {appLinks.android}
              </Text>
            </View>
            <Feather name="copy" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleCopyLink(appLinks.ios)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#000" }]}>
              <Feather name="download" size={16} color={colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Apple App Store</Text>
              <Text style={styles.linkSubtitle} numberOfLines={1}>
                {appLinks.ios}
              </Text>
            </View>
            <Feather name="copy" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => handleCopyLink(appLinks.website)}
            activeOpacity={0.7}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#3B82F6" }]}>
              <Feather name="globe" size={16} color={colors.white} />
            </View>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Website</Text>
              <Text style={styles.linkSubtitle} numberOfLines={1}>
                {appLinks.website}
              </Text>
            </View>
            <Feather name="copy" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Benefits Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why Share?</Text>

          {[
            {
              icon: "gift",
              title: "Help Friends Learn",
              desc: "Share quality education with your friends",
            },
            {
              icon: "award",
              title: "Earn Rewards",
              desc: "Get bonuses when friends enroll",
            },
            {
              icon: "heart",
              title: "Build Community",
              desc: "Be part of a growing learning community",
            },
          ].map((item, index) => (
            <View key={index} style={styles.benefitCard}>
              <View style={styles.benefitIcon}>
                <Feather name={item.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.benefitContent}>
                <Text style={styles.benefitTitle}>{item.title}</Text>
                <Text style={styles.benefitDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </Layout>
  );
};

// ============================================
// screens/RateUs/index.js
// ============================================

const RateUsScreen = () => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const { token } = useAuthStore();
  const { settings } = useSettings();

  const appLinks = {
    android: settings?.playStoreUrl || "",
    ios: settings?.appStoreUrl || "",
  };

  const handleRateApp = (rating) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedRating(rating);
  };

  const handleSubmitRating = async () => {
    if (selectedRating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const payload = {
        rating: selectedRating,
        feedback: feedback || null,
        platform: Platform.OS === "ios" ? "ios" : "android",
      };

      const res = await axios.post(
        `${API_URL_LOCAL_ENDPOINT}/app-ratings`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ FIX
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Rating submitted:", res.data);

      Alert.alert("Thank You!", "Your rating has been submitted successfully.");

      setSelectedRating(0);
      setFeedback("");
    } catch (error) {
      console.error("❌ Rating Submit Error:", error?.response || error);

      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to submit rating"
      );
    }
  };

  const openStoreLink = async (platform) => {
    console.log("pla", platform);
    const url = platform === "android" ? appLinks.android : appLinks.ios;
    console.log(url);
    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open the store link");
      }
    } else {
      Alert.alert("Info", "Store link not available");
    }
  };

  return (
    <Layout isHeaderShow={true}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Feather name="star" size={40} color={colors.warning} />
          </View>
          <Text style={styles.headerTitle}>Rate Us</Text>
          <Text style={styles.headerSubtitle}>
            Your feedback helps us improve the app
          </Text>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How would you rate us?</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => handleRateApp(star)}
                style={styles.starButton}
              >
                <Feather
                  name="star"
                  size={40}
                  color={
                    star <= selectedRating ? colors.warning : colors.border
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          {selectedRating > 0 && (
            <Text style={styles.ratingText}>
              {selectedRating === 1 && "Sorry to hear! 😞"}
              {selectedRating === 2 && "We can do better 😐"}
              {selectedRating === 3 && "Good! Thank you 👍"}
              {selectedRating === 4 && "Great! Glad you like it 😊"}
              {selectedRating === 5 && "Excellent! Thank you! 🎉"}
            </Text>
          )}
        </View>

        {/* Feedback Section */}
        {selectedRating > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {selectedRating < 3
                ? "What can we improve?"
                : "Tell us what you love!"}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Share your feedback here..."
              placeholderTextColor={colors.textLight}
              multiline
              value={feedback}
              onChangeText={setFeedback}
              maxLength={500}
            />
            <Text style={styles.charCount}>{feedback.length}/500</Text>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitRating}
            >
              <Feather name="check" size={16} color={colors.white} />
              <Text style={styles.submitButtonText}>Submit Rating</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Store Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rate on Store</Text>

          <TouchableOpacity
            style={styles.storeButton}
            onPress={() => openStoreLink("android")}
          >
            <View style={[styles.storeLogo, { backgroundColor: "#3DDC84" }]}>
              <Feather name="play" size={16} color={colors.white} />
            </View>
            <View style={styles.storeContent}>
              <Text style={styles.storeTitle}>Google Play Store</Text>
              <Text style={styles.storeSubtitle}>
                Rate us on the Play Store
              </Text>
            </View>
            <Feather
              name="arrow-right"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.storeButton}
            onPress={() => openStoreLink("ios")}
          >
            <View style={[styles.storeLogo, { backgroundColor: "#000" }]}>
              <Feather name="apple" size={16} color={colors.white} />
            </View>
            <View style={styles.storeContent}>
              <Text style={styles.storeTitle}>Apple App Store</Text>
              <Text style={styles.storeSubtitle}>Rate us on the App Store</Text>
            </View>
            <Feather
              name="arrow-right"
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </Layout>
  );
};

// ============================================
// screens/HelpSupport/index.js
// ============================================

import { TextInput } from "react-native";
import { useSettings } from "../../hooks/useSettings";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";
import axios from "axios";

const HelpSupportScreen = () => {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    category: "general",
    message: "",
  });

  const { settings, loading, error, refetch } = useSettings();

  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const categories = [
    { label: "General Query", value: "general" },
    { label: "Technical Issue", value: "technical" },
    { label: "Payment Issue", value: "payment" },
    { label: "Course Access", value: "course" },
    { label: "Other", value: "other" },
  ];

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

const handleSubmitForm = async () => {
  if (
    !formData.name ||
    !formData.email ||
    !formData.subject ||
    !formData.message
  ) {
    Alert.alert("Error", "Please fill in all required fields");
    return;
  }

  try {
    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      subject: formData.subject.trim(),
      category: formData.category || "general",
      message: formData.message.trim(),
    };

    const res = await axios.post(
      `${API_URL_LOCAL_ENDPOINT}/support`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          // Authorization: `Bearer ${token}`, // 🔐 if needed
        },
        timeout: 10000,
      }
    );

    await Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );

    Alert.alert(
      "Success",
      res?.data?.message ||
        "Your support ticket has been submitted. We'll get back to you soon!"
    );

    // Reset form
    setFormData({
      name: "",
      email: "",
      subject: "",
      category: "general",
      message: "",
    });
  } catch (error) {
    console.error("❌ Support Submit Error:", error);

    Alert.alert(
      "Error",
      error?.response?.data?.message ||
        "Failed to submit support ticket"
    );
  } finally {
    setIsSubmitting(false);
  }
};

  const openLink = async (type, value) => {
    if (!value) {
      Alert.alert("Info", "Contact information not available");
      return;
    }

    let url = "";
    switch (type) {
      case "phone":
        url = `tel:${value}`;
        break;
      case "whatsapp":
        url = `https://wa.me/${value.replace(/[^0-9]/g, "")}`; // sanitize number
        break;
      case "email":
        url = `mailto:${value}`;
        break;
      default:
        return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Cannot open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  return (
    <Layout isHeaderShow={true}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.iconContainer}>
            <Feather name="help-circle" size={40} color={colors.primary} />
          </View>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>
            We're here to help. Get in touch with us
          </Text>
        </View>

        {/* Contact Form */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send us a Message</Text>

          {/* Name Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="user"
                size={14}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textLight}
                value={formData.name}
                onChangeText={(text) => handleInputChange("name", text)}
              />
            </View>
          </View>

          {/* Email Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="mail"
                size={14}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Enter your email"
                placeholderTextColor={colors.textLight}
                keyboardType="email-address"
                value={formData.email}
                onChangeText={(text) => handleInputChange("email", text)}
              />
            </View>
          </View>

          {/* Category Select */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Issue Category *</Text>
            <View style={styles.selectWrapper}>
              <Feather
                name="list"
                size={14}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryOption,
                      formData.category === cat.value &&
                        styles.categoryOptionActive,
                    ]}
                    onPress={() => handleInputChange("category", cat.value)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        formData.category === cat.value &&
                          styles.categoryTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Subject Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Subject *</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="message-circle"
                size={14}
                color={colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.formInput}
                placeholder="Brief subject of your inquiry"
                placeholderTextColor={colors.textLight}
                value={formData.subject}
                onChangeText={(text) => handleInputChange("subject", text)}
              />
            </View>
          </View>

          {/* Message Field */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Message *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Describe your issue or question in detail..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={formData.message}
                onChangeText={(text) => handleInputChange("message", text)}
                maxLength={1000}
              />
            </View>
            <Text style={styles.charCount}>
              {formData.message.length}/1000 characters
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitDisabled]}
            onPress={handleSubmitForm}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Feather
              name={isSubmitting ? "loader" : "send"}
              size={16}
              color={colors.white}
            />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Ticket"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {[
            {
              q: "How do I access my courses?",
              a: "Go to the My Courses section to view all enrolled courses.",
            },
            {
              q: "Can I download course materials?",
              a: "Yes, you can download materials from the Downloads section.",
            },
            {
              q: "How do I reset my password?",
              a: "Use the forgot password option on the login screen.",
            },
          ].map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <View style={styles.faqQuestion}>
                <Feather
                  name="help-circle"
                  size={14}
                  color={colors.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.faqQuestionText}>{item.q}</Text>
              </View>
              <Text style={styles.faqAnswer}>{item.a}</Text>
            </View>
          ))}
        </View>

        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Other Ways to Reach Us</Text>

          <TouchableOpacity
            style={styles.contactOption}
            activeOpacity={0.7}
            onPress={() => openLink("phone", settings?.supportPhone)}
          >
            <Feather name="phone" size={16} color={colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Phone</Text>
              <Text style={styles.contactValue}>
                {settings?.supportPhone || "N/A"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactOption}
            activeOpacity={0.7}
            onPress={() => openLink("whatsapp", settings?.supportWhatsapp)}
          >
            <Feather name="message-circle" size={16} color={colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>WhatsApp</Text>
              <Text style={styles.contactValue}>
                {settings?.supportWhatsapp || "N/A"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactOption}
            activeOpacity={0.7}
            onPress={() => openLink("email", settings?.supportEmail)}
          >
            <Feather name="mail" size={16} color={colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Email</Text>
              <Text style={styles.contactValue}>
                {settings?.supportEmail || "N/A"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactOption} activeOpacity={0.7}>
            <Feather name="clock" size={16} color={colors.primary} />
            <View style={styles.contactText}>
              <Text style={styles.contactTitle}>Hours</Text>
              <Text style={styles.contactValue}>Mon-Fri, 9AM-6PM IST</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 12,
  },

  // Header
  headerSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.lightBlue,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 12,
  },

  // Share App Styles
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  shareButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },

  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  linkSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  benefitCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Rate Us Styles
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  starButton: {
    padding: 8,
  },
  ratingFeedback: {
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },

  feedbackInput: {
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontSize: 12,
    color: colors.text,
    textAlignVertical: "top",
    minHeight: 100,
  },
  charCount: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: "right",
  },

  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },

  storeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  storeLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  storeContent: {
    flex: 1,
  },
  storeTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  storeSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  // Help Support Styles
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  formInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.text,
  },
  messageInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    color: colors.text,
  },
  selectWrapper: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryScroll: {
    marginLeft: -8,
  },
  categoryOption: {
    backgroundColor: colors.background,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.text,
  },
  categoryTextActive: {
    color: colors.white,
  },

  faqItem: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  faqQuestionText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  faqAnswer: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  contactOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactText: {
    marginLeft: 12,
    flex: 1,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
  },
});

export { ShareAppScreen, RateUsScreen, HelpSupportScreen, colors };
