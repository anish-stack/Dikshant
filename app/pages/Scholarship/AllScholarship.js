import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import Layout from "../../components/layout";
import { colors } from "../../constant/color";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";

const API = API_URL_LOCAL_ENDPOINT + "/scholarships";

export default function AllScholarship() {
  const navigation = useNavigation();
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchScholarships();
  }, []);

  const fetchScholarships = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await axios.get(API);

      if (response.data.success) {
        // Sort by discount percentage descending (highest first)
        const sorted = response.data.data.sort((a, b) => b.discountPercentage - a.discountPercentage);
        setScholarships(sorted);
      } else {
        throw new Error("Failed to fetch scholarships");
      }
    } catch (err) {
      console.error("Scholarship fetch error:", err);
      setError(true);
      Alert.alert("Error", "Failed to load scholarships. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleApply = (scholarship) => {
    if (scholarship.applyStatus !== "OPEN") {
      Alert.alert("Closed", "Applications are currently closed for this scholarship.");
      return;
    }
    navigation.navigate("ApplyScholarship", { scholarshipId: scholarship.id });
  };

  if (loading) {
    return (
      <Layout>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading scholarships...</Text>
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load scholarships</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchScholarships}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <Text style={styles.welcomeText}>WELCOME</Text>

          <View style={styles.titleContainer}>
            <Text style={styles.titleLine1}>
              Dikshant <Text style={styles.freeText}>FREE</Text> Coaching
            </Text>
            <Text style={styles.titleLine2}>& Scholarship Programme</Text>
          </View>

          {/* Registration Info */}
          <View style={styles.registrationInfo}>
            <Text style={styles.registrationText}>
              <Text style={styles.scholarshipLabel}>At Dikshant IAS, we believe that quality education and UPSC preparation </Text>
              <Text style={styles.normalText}>should be accessible to all, regardless of economic or social background.</Text>
            </Text>
            <Text style={styles.registrationText}>
              <Text style={styles.normalText}>To support deserving and hardworking aspirants, we proudly offer need-based and category-based scholarships.</Text>
              <Text style={styles.registrationLabel}>Dikshant Scholarship Program, is a welfare program run by Dikshant IAS under which free coaching is </Text>
            </Text>
            <Text style={styles.registrationTextLast}>
              <Text style={styles.normalText}>provided to socially and economically weaker students living in India. This program is funded by NGOs.</Text>
            </Text>
          </View>
          {/* === NEW PROFESSIONAL & MINIMAL CARDS === */}
          <View style={styles.cardsContainer}>
            {scholarships.map((item) => {
              const isOpen = item.applyStatus === "OPEN";
              const categories = JSON.parse(item.category || "[]");

              return (
                <View key={item.id} style={styles.card}>
                  {/* Discount Badge */}
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{item.discountPercentage}%</Text>
                    <Text style={styles.discountLabel}>Scholarship</Text>
                  </View>

                  {/* Content */}
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardDescription}>{item.description}</Text>



                    {/* Status & Apply Button */}
                    <View style={styles.cardFooter}>
                      <View
                        style={[
                          styles.statusBadge,
                          isOpen ? styles.statusOpen : styles.statusClosed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isOpen ? styles.statusOpenText : styles.statusClosedText,
                          ]}
                        >
                          {isOpen ? "OPEN" : "CLOSED"}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.applyBtn,
                          !isOpen && styles.applyBtnDisabled,
                        ]}
                        onPress={() => handleApply(item)}
                        disabled={!isOpen}
                      >
                        <Text style={styles.applyBtnText}>
                          {isOpen ? "Apply Now" : "Closed"}
                        </Text>
                        {isOpen && (
                          <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.applyIcon} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // === ORIGINAL HEADER STYLES (UNCHANGED) ===
  welcomeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 2,
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  titleLine1: {
    fontSize: 20,
    textAlign: 'center',
    color: '#1F2937',
    fontWeight: '600',
  },
  freeText: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  titleLine2: {
    fontSize: 20,
    textAlign: 'center',
    color: '#1F2937',
    fontWeight: '600',
  },
  registrationInfo: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  registrationText: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  registrationTextLast: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
  },
  scholarshipLabel: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  registrationLabel: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  normalText: {
    color: '#1F2937',
  },

  // === NEW MINIMAL & PROFESSIONAL CARDS ===
  cardsContainer: {
    paddingHorizontal: 20,
    marginTop: 30,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  discountBadge: {
    backgroundColor: "#EF4444",
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomRightRadius: 16,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
  },
  discountLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.9,
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    lineHeight: 24,
  },
  cardDescription: {
    fontSize: 14.5,
    color: "#4B5563",
    lineHeight: 21,
    marginBottom: 16,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryChipText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusOpen: {
    backgroundColor: "#D1FAE5",
  },
  statusClosed: {
    backgroundColor: "#F3F4F6",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusOpenText: {
    color: "#065F46",
  },
  statusClosedText: {
    color: "#6B7280",
  },
  applyBtn: {
    backgroundColor: "#EF4444",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  applyBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  applyIcon: {
    marginLeft: 4,
  },
});