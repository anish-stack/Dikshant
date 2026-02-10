import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import useSWR from "swr";
import axios from "axios";
import { fetcher } from "../../constant/fetcher";
import { useNavigation } from "@react-navigation/native";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import { useAuthStore } from "../../stores/auth.store";

const { width } = Dimensions.get("window");
const CARD_MARGIN = 12;
const CARD_WIDTH = width * 0.72;

// === Horizontal Section Component ===
const HorizontalSection = ({
  title,
  data,
  renderItem,
  keyExtractor,
  cardWidth,
  isLoading,
  error,
  onSeeAll
}) => {
  if (isLoading) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={32} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load courses</Text>
          <Text style={styles.errorSubtext}>Please try again later</Text>
        </View>
      </View>
    );
  }

  if (!data || data.length === 0) {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Feather name="inbox" size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No courses available</Text>
          <Text style={styles.emptySubtext}>Check back soon for updates</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onSeeAll && data.length > 0 && (
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={onSeeAll}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>See all</Text>
            <Feather name="chevron-right" size={16} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={data}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.horizontalList}
        snapToInterval={cardWidth + CARD_MARGIN}
        snapToAlignment="start"
        decelerationRate="fast"
        initialNumToRender={3}
        maxToRenderPerBatch={5}
        windowSize={5}
      />
    </View>
  );
};

const CourseCard = ({ item: batch, navigation, token, purchasedCourses }) => {
  const imageUrl = batch.imageUrl;
  const startDate = batch.startDate ? new Date(batch.startDate) : null;

  // Check if this course is purchased
  const purchaseData = purchasedCourses[batch.id];
  const isPurchased = !!purchaseData;

  // Calculate discount percentage
  const discountPercent = batch.batchPrice && batch.batchDiscountPrice
    ? Math.round(((batch.batchPrice - batch.batchDiscountPrice) / batch.batchPrice) * 100)
    : 0;

  // Format dates
  const formatDate = (date) => {
    if (!date) return null;
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handlePress = () => {
    if (isPurchased) {
      const url = batch.category === "online" ? "my-course" : "my-course-subjects"
      navigation.navigate(url, {
        unlocked: true,
        courseId: batch.id,
      });
    } else {
      navigation.navigate("CourseDetail", {
        courseId: batch.id,
        batchData: batch,
      });
    }
  };

  return (
    <TouchableOpacity
      style={[styles.courseCard, { width: CARD_WIDTH }]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      {/* Image Section */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.courseImage}
          resizeMode="cover"
        />
        <View style={styles.imageOverlay}>
          <View style={styles.playButton}>
            <Feather name="play" size={20} color="#ffffff" />
          </View>
        </View>

        {/* Subscribed Badge - Top Priority */}
        {isPurchased ? (
          <View style={styles.subscribedBadge}>
            <Feather name="check-circle" size={12} color="#ffffff" />
            <Text style={styles.subscribedText}>SUBSCRIBED</Text>
          </View>
        ) : (
          /* Discount Badge - Only show if not subscribed */
          discountPercent > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discountPercent}% OFF</Text>
            </View>
          )
        )}
      </View>

      {/* Content Section */}
      <View style={styles.cardContent}>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {batch.name}
        </Text>

        {/* Program Name */}
        {batch.program?.name && (
          <Text style={styles.programName} numberOfLines={1}>
            {batch.program.name}
          </Text>
        )}

        {/* Meta Information */}
        <View style={styles.metaContainer}>
          {startDate && (
            <View style={styles.metaItem}>
              <Feather name="calendar" size={12} color="#64748b" />
              <Text style={styles.metaText}>{formatDate(startDate)}</Text>
            </View>
          )}
          {batch.subjects && batch.subjects.length > 0 && (
            <View style={styles.metaItem}>
              <Feather name="book-open" size={12} color="#64748b" />
              <Text style={styles.metaText}>{batch.subjects.length} subjects</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {isPurchased ? (
            <View style={styles.accessButton}>
              <Feather name="play-circle" size={16} color="#22c55e" />
              <Text style={styles.accessButtonText}>Go To ClassRoom</Text>
            </View>
          ) : (
            <View style={styles.priceContainer}>
              {batch.batchDiscountPrice && batch.batchDiscountPrice < batch.batchPrice ? (
                <>
                  <Text style={styles.originalPrice}>₹{batch.batchPrice.toLocaleString('en-IN')}</Text>
                  <Text style={styles.discountPrice}>₹{batch.batchDiscountPrice.toLocaleString('en-IN')}</Text>
                </>
              ) : (
                <Text style={styles.price}>₹{batch.batchPrice.toLocaleString('en-IN')}</Text>
              )}
            </View>
          )}

          {batch.category && (
            <View style={[
              styles.categoryTag,
              batch.category === "online" && styles.categoryTagOnline,
              batch.category === "offline" && styles.categoryTagOffline,
              batch.category === "recorded" && styles.categoryTagRecorded,
            ]}>
              <Text style={[
                styles.categoryTagText,
                batch.category === "online" && styles.categoryTagTextOnline,
                batch.category === "offline" && styles.categoryTagTextOffline,
                batch.category === "recorded" && styles.categoryTagTextRecorded,
              ]}>
                {batch.category.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function Course({ refreshing }) {
  const navigation = useNavigation();
  const [purchasedCourses, setPurchasedCourses] = useState({});
  const [checkingPurchases, setCheckingPurchases] = useState(false);
  const { token } = useAuthStore()
  // Fetch courses from API
  const { data: coursesResponse, error, isLoading, mutate } = useSWR(
    "/batchs",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
    }
  );

  const courses = coursesResponse?.items || [];

  // Function to check if courses are purchased
  const checkPurchaseStatus = async (batchIds) => {
    if (!token || batchIds.length === 0) return;

    setCheckingPurchases(true);
    const purchaseMap = {};

    try {
      // Check purchases in batches or individually
      const checkPromises = batchIds.map(async (batchId) => {
        try {
          const response = await axios.get(
            `${API_URL_LOCAL_ENDPOINT}/orders/already-purchased`,
            {
              params: {
                type: "batch",
                itemId: batchId,
              },
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (response.data?.purchased) {
            console.log(response.data)
            purchaseMap[batchId] = response.data;
          }
        } catch (error) {
          console.error(`Error checking purchase for batch ${batchId}:`, error);
        }
      });

      await Promise.all(checkPromises);
      setPurchasedCourses(purchaseMap);
    } catch (error) {
      console.error("Error checking purchase statuses:", error);
    } finally {
      setCheckingPurchases(false);
    }
  };

  // Check purchase status when courses load
  useEffect(() => {
    if (courses.length > 0 && token) {
      const batchIds = courses.map(course => course.id);
      checkPurchaseStatus(batchIds);
    }
  }, [courses, token]);

  useEffect(() => {
    if (refreshing) {
      mutate();
      // Also refresh purchase status
      if (courses.length > 0 && token) {
        const batchIds = courses.map(course => course.id);
        checkPurchaseStatus(batchIds);
      }
    }
  }, [refreshing, mutate]);

  const sortedCourses = [...courses].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Filter categories + take first 6
  const liveCourses = sortedCourses.filter(c => c.category === "online").slice(0, 6);
  const offlineCourses = sortedCourses.filter(c => c.category === "offline").slice(0, 6);
  const recordedCourses = sortedCourses.filter(c => c.category === "recorded").slice(0, 6);

  // Handle See All navigation
  const handleSeeAll = (courseType) => {
    navigation?.navigate?.("Courses", { type: courseType });
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Live Courses Section */}
      <HorizontalSection
        title="Live Courses"
        data={liveCourses}
        renderItem={({ item }) => (
          <CourseCard
            item={item}
            navigation={navigation}
            token={token}
            purchasedCourses={purchasedCourses}
          />
        )}
        keyExtractor={(item) => `online-${item.id}`}
        cardWidth={CARD_WIDTH}
        isLoading={isLoading}
        error={error}
        onSeeAll={() => handleSeeAll("Online")}
      />

      {/* Recorded Courses Section */}
      <HorizontalSection
        title="Recorded Courses"
        data={recordedCourses}
        renderItem={({ item }) => (
          <CourseCard
            item={item}
            navigation={navigation}
            token={token}
            purchasedCourses={purchasedCourses}
          />
        )}
        keyExtractor={(item) => `recorded-${item.id}`}
        cardWidth={CARD_WIDTH}
        isLoading={isLoading}
        error={error}
        onSeeAll={() => handleSeeAll("Recorded")}
      />

      {/* Offline Courses Section */}
      <HorizontalSection
        title="Offline Courses"
        data={offlineCourses}
        renderItem={({ item }) => (
          <CourseCard
            item={item}
            navigation={navigation}
            token={token}
            purchasedCourses={purchasedCourses}
          />
        )}
        keyExtractor={(item) => `offline-${item.id}`}
        cardWidth={CARD_WIDTH}
        isLoading={isLoading}
        error={error}
        onSeeAll={() => handleSeeAll("Offline")}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.5,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 20,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },

  // List Styles
  horizontalList: {
    paddingLeft: 16,
    paddingRight: 16,
  },

  // Loading State
  loadingContainer: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },

  // Error State
  errorContainer: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  errorSubtext: {
    fontSize: 13,
    color: "#64748b",
  },

  // Empty State
  emptyContainer: {
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    marginHorizontal: 16,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  emptySubtext: {
    fontSize: 13,
    color: "#94a3b8",
  },

  // Course Card Styles
  courseCard: {
    marginBottom: 12,
    marginRight: CARD_MARGIN,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  // Image Section
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 160,
  },
  courseImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e2e8f0",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(59, 130, 246, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Subscribed Badge (NEW)
  subscribedBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  subscribedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },

  // Discount Badge
  discountBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#ef4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },

  // Content Section
  cardContent: {
    padding: 12,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 20,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  programName: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "600",
    marginBottom: 8,
  },

  // Meta Information
  metaContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Access Button (NEW)
  accessButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  accessButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22c55e",
    letterSpacing: -0.2,
  },

  // Price Container
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  originalPrice: {
    fontSize: 13,
    fontWeight: "600",
    color: "#94a3b8",
    textDecorationLine: "line-through",
  },
  discountPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: "#22c55e",
    letterSpacing: -0.3,
  },

  // Category Tags
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagOnline: {
    backgroundColor: "#dbeafe",
  },
  categoryTagOffline: {
    backgroundColor: "#fef3c7",
  },
  categoryTagRecorded: {
    backgroundColor: "#f3e8ff",
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  categoryTagTextOnline: {
    color: "#1e40af",
  },
  categoryTagTextOffline: {
    color: "#92400e",
  },
  categoryTagTextRecorded: {
    color: "#6b21a8",
  },
});