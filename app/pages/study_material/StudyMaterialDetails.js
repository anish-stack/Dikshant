import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useRoute, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RazorpayCheckout from "react-native-razorpay";

import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";

import api from "../../constant/fetcher";

export default function StudyMaterialDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { slug:materialId } = route.params || {};   // We are passing materialId from previous screen

  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  // Fetch material details
  useEffect(() => {
    if (materialId) fetchMaterialDetails();
  }, [materialId]);

  const fetchMaterialDetails = async () => {
    try {
      const res = await api.get(`/study-materials/materials/${materialId}`); 
      // If your API uses slug instead of id, change accordingly.
      // In your example response, you can also use /materials/${materialId} if it's by ID.

      setMaterial(res.data.data);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to load material details");
    } finally {
      setLoading(false);
    }
  };

  // Handle Buy Now → Create Order + Open Razorpay
  const handleBuyNow = async () => {
    if (!material || !material.isPaid) return;

    setPurchasing(true);

    try {
      // 1. Create Order from Backend
      const orderRes = await api.post("/study-materials/materials/order", {
        materialId: material.id,
      });

      const { orderId, key, amount, currency, materialTitle } = orderRes.data.data;

      // 2. Razorpay Options
      const options = {
        description: material.description || "Study Material Purchase",
        image: material.coverImage || "https://yourapp.com/logo.png",
        currency: currency || "INR",
        key: key,                    // Razorpay Key ID from backend
        amount: amount,              // Already in paise from backend
        name: "Dikshant IAS",
        order_id: orderId,
        prefill: {
          name: "User Name",         // You can get from user context
          email: "user@example.com",
          contact: "9999999999",
        },
        theme: { color: "#6366F1" },
        modal: {
          ondismiss: () => {
            console.log("Payment modal dismissed by user");
          },
        },
      };

      // 3. Open Razorpay Checkout
      const data = await RazorpayCheckout.open(options);

      // 4. On Success → Verify Payment
      await verifyPayment(data.razorpay_payment_id, data.razorpay_order_id, data.razorpay_signature);

    } catch (error) {
      console.error("Payment Error:", error);

      // Handle different cancel/failure cases
      if (error.code === "BAD_REQUEST_ERROR" || error.description?.includes("cancelled")) {
        Alert.alert("Payment Cancelled", "You cancelled the payment.");
      } else {
        Alert.alert(
          "Payment Failed",
          error.description || "Something went wrong. Please try again."
        );
      }
    } finally {
      setPurchasing(false);
    }
  };

  // Verify Payment on Backend
  const verifyPayment = async (paymentId, orderId, signature) => {
    try {
      const verifyRes = await api.post("/study-materials/materials/verify-payment", {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        materialId: material.id,
      });

      if (verifyRes.data.success) {
        Alert.alert(
          "Payment Successful!",
          `You have successfully purchased "${material.title}".`,
          [
            {
              text: "Open Now",
              onPress: () => openPurchasedMaterial(),
            },
            { text: "Later", style: "cancel" },
          ]
        );
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Verification Failed", "Payment was successful but verification failed. Contact support.");
    }
  };

  // Open material after successful purchase (same as download logic)
  const openPurchasedMaterial = async () => {
    if (!material?.fileUrl) return;

    try {
      // You can directly open or download here
      await Linking.openURL(material.fileUrl);
    } catch {
      Alert.alert("Cannot Open", "Try downloading the file.");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </SafeAreaView>
    );
  }

  if (!material) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Material not found</Text>
      </SafeAreaView>
    );
  }

  const isPaid = material.isPaid && parseFloat(material.price) > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Cover Image */}
        <Image
          source={{ uri: material.coverImage }}
          style={styles.coverImage}
          resizeMode="cover"
        />

        <View style={styles.content}>
          <Text style={styles.title}>{material.title}</Text>

          {material.description && (
            <Text style={styles.description}>{material.description}</Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>₹{parseFloat(material.price).toFixed(0)}</Text>
          </View>

          {/* Action Button */}
          {isPaid ? (
            <TouchableOpacity
              style={styles.buyButton}
              onPress={handleBuyNow}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="cart-outline" size={22} color="#fff" />
                  <Text style={styles.buyButtonText}>Buy Now - ₹{material.price}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.freeButton}
              onPress={() => Linking.openURL(material.fileUrl)}
            >
              <Icon name="eye-outline" size={22} color="#fff" />
              <Text style={styles.freeButtonText}>View Free Material</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollContent: { paddingBottom: 40 },
  coverImage: {
    width: "100%",
    height: 260,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  description: {
    fontSize: 15.5,
    color: "#475569",
    lineHeight: 23,
    marginBottom: 20,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceLabel: { fontSize: 16, color: "#64748B" },
  price: { fontSize: 26, fontWeight: "700", color: "#10B981" },

  buyButton: {
    backgroundColor: "#10B981",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buyButtonText: {
    color: "#fff",
    fontSize: 16.5,
    fontWeight: "700",
  },

  freeButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  freeButtonText: {
    color: "#fff",
    fontSize: 16.5,
    fontWeight: "700",
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#64748B",
  },
});