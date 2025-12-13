import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import Layout from "../../components/layout";
import styles from "./commonStyle";
import * as Haptics from "expo-haptics";
import { Linking } from "react-native";
import { useSettings } from "../../hooks/useSettings";
import { useNavigation } from "@react-navigation/native";

export function HelpSupport() {
  const { settings, refetch } = useSettings();
  const navigation = useNavigation()
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  // ----------------------- FAQs -----------------------
  const faqItems = [
    {
      question: "How do I enroll in a UPSC course?",
      answer:
        'Browse our Foundation, Prelims, Mains, or Optional courses. Select your batch and tap "Enroll Now" to complete payment.',
    },
    {
      question: "Is Test Series available online?",
      answer:
        "Yes. Both Prelims and Mains Test Series are available in online mode with instant evaluation.",
    },
    {
      question: "How can I access recorded lectures?",
      answer:
        'Recordings can be accessed anytime in the "My Courses" section for the duration of your subscription.',
    },
    {
      question: "Do you offer answer writing evaluation?",
      answer:
        "Yes. Mains Answer Writing mentorship and evaluation is included in several batches.",
    },
    {
      question: "What is the refund or batch-shift policy?",
      answer:
        "Refunds are permitted only within 48 hours of purchase. Batch shifting is subject to availability.",
    },
    {
      question: "How do I contact faculty for doubts?",
      answer:
        "Use the Doubt Portal available inside each enrolled course. You can also raise academic questions via the Help Center.",
    },
  ];

  // ----------------------- Support Cards -----------------------
  const supportOptions = [
    {
      icon: "phone",
      title: "Call Support",
      description: settings?.supportPhone,
      color: "#f59e0b",
      action: () => {
        triggerHaptic();
        Linking.openURL(`tel:${settings?.supportPhone}`);
      },
    },
    {
      icon: "mail",
      title: "Email Support",
      description: settings?.supportEmail,
      color: "#10b981",
      action: () => {
        triggerHaptic();
        Linking.openURL(`mailto:${settings?.supportEmail}`);
      },
    },
    {
      icon: "message-circle",
      title: "WhatsApp Support",
      description: "Chat with our team",
      color: "#25D366",
      action: () => {
        triggerHaptic();
        Linking.openURL(`https://wa.me/${settings?.supportWhatsapp}`);
      },
    },
    {
      icon: "help-circle",
      title: "Help Center",
      description: "Guides & FAQs",
      color: "#6366f1",
      action: () => {
        triggerHaptic();
        navigation.navigate("HelpSupport")
      },
    },
  ];

  useEffect(() => {
    refetch();
  }, []);
  // ----------------------- Quick Links -----------------------
  const quickLinks = [
    { icon: "book-open", label: "UPSC Syllabus" },
    { icon: "layers", label: "Prelims & Mains Strategy" },
    { icon: "file-text", label: "Terms & Conditions" },
    { icon: "shield", label: "Privacy Policy" },
  ];

  return (
    <Layout>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Help & Support</Text>
          <Text style={styles.headerSubtitle}>
            We're here to guide you in your UPSC journey
          </Text>
        </View>

        {/* Support Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>Contact Us</Text>
          <View style={styles.supportGrid}>
            {supportOptions.map((option, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.supportCard}
                onPress={option.action}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.supportIcon,
                    { backgroundColor: option.color + "20" },
                  ]}
                >
                  <Feather name={option.icon} size={24} color={option.color} />
                </View>
                <Text style={styles.supportTitle}>{option.title}</Text>
                <Text style={styles.supportDescription}>
                  {option.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleMain}>
            Frequently Asked Questions
          </Text>
          <View style={styles.card}>
            {faqItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.faqItem,
                  idx !== faqItems.length - 1 && styles.settingItemBorder,
                ]}
                onPress={triggerHaptic}
                activeOpacity={0.7}
              >
                <View style={styles.faqContent}>
                  <View style={styles.faqHeader}>
                    <Feather name="help-circle" size={18} color="#6366f1" />
                    <Text style={styles.faqQuestion}>{item.question}</Text>
                  </View>
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
                <Feather name="chevron-down" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>


        <View style={{ height: 40 }} />
      </ScrollView>
    </Layout>
  );
}
