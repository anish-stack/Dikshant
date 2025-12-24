import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  Pressable,
  Animated,
  LayoutAnimation,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import useSWR from "swr";
import { fetcher } from "../../constant/fetcher";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import YoutubePlayer from "react-native-youtube-iframe";

const { width } = Dimensions.get("window");

// Updated color scheme
const colors = {
  primary: "#DC2626", // Red
  secondary: "#1F2937", // Dark gray/black
  background: "#FFFFFF", // White
  surface: "#FAFAFA", // Light gray
  text: "#111827", // Dark text
  textSecondary: "#6B7280", // Gray text
  textLight: "#9CA3AF", // Light gray text
  accent: "#EF4444", // Light red
  success: "#10B981", // Green
  warning: "#F59E0B", // Orange
  danger: "#DC2626", // Red
  border: "#E5E7EB", // Light border
  white: "#FFFFFF",
  black: "#000000",
};

const AccordionItem = ({
  title,
  children,
  icon = "book",
  initiallyOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const [heightAnim] = useState(new Animated.Value(initiallyOpen ? 1 : 0));

  const toggleAccordion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  const rotateAnim = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <View style={styles.accordionContainer}>
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={toggleAccordion}
        activeOpacity={0.8}
      >
        <View style={styles.accordionHeaderLeft}>
          <Feather name={icon} size={18} color={colors.primary} />
          <Text style={styles.accordionTitle}>{title}</Text>
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateAnim }] }}>
          <Feather name="chevron-down" size={20} color={colors.textLight} />
        </Animated.View>
      </TouchableOpacity>

      {isOpen && <View style={styles.accordionContent}>{children}</View>}
    </View>
  );
};

export default function CourseDetail() {
  const route = useRoute();
  const navigation = useNavigation();
  const { batchId } = route.params || {};
  console.log("batchId",batchId)

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [playing, setPlaying] = useState(false);

  // Fetch batch details
  const {
    data: batchData,
    error: batchError,
    isLoading: batchLoading,
  } = useSWR(batchId ? `/batchs/${batchId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  // Fetch videos for this batch
  const {
    data: videosResponse,
    error: videosError,
    isLoading: videosLoading,
  } = useSWR(batchId ? `/videocourses/batch/${batchId}` : null, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const videos = useMemo(() => {
    return videosResponse?.data || [];
  }, [videosResponse]);

  const { demoVideos, lockedVideos } = useMemo(() => {
    const demo = videos.filter((v) => v.isDemo && v.status === "active");
    const locked = videos.filter((v) => !v.isDemo && v.status === "active");
    return { demoVideos: demo, lockedVideos: locked };
  }, [videos]);

  // Calculate discount percentage
  const discountPercent = useMemo(() => {
    if (!batchData?.batchPrice || !batchData?.batchDiscountPrice) return 0;
    return Math.round(
      ((batchData.batchPrice - batchData.batchDiscountPrice) /
        batchData.batchPrice) *
        100
    );
  }, [batchData]);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  };

  const handleBack = () => {
    triggerHaptic();
    navigation.goBack();
  };

  const handleEnrollPress = () => {
    if (batchData?.isEmi) {
      setShowPaymentModal(true);
      triggerHaptic();
    } else {
      navigation.navigate("enroll-course", {
       batchId: batchData.id, userId: 456
      });
    }
  };

  const handlePaymentSelect = (type) => {
    triggerHaptic();
    setSelectedPayment(type);
  };

  const handleConfirmPayment = () => {
    triggerHaptic();
    setShowPaymentModal(false);
    console.log("Payment confirmed:", {
      type: selectedPayment,
      batchId: batchData?.id,
      amount:
        selectedPayment === "full"
          ? batchData?.batchDiscountPrice
          : batchData?.emiSchedule?.[0]?.amount,
    });
  };

  const handleVideoPress = (video) => {
    triggerHaptic();
    setCurrentVideo(video);
    setShowVideoModal(true);
    setPlaying(true);
  };

  const handleCloseVideo = () => {
    triggerHaptic();
    setPlaying(false);
    setShowVideoModal(false);
    setTimeout(() => setCurrentVideo(null), 300);
  };

  const onStateChange = useCallback((state) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  // YouTube Helpers
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regex =
      /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/|youtube\.com\/shorts\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const getYouTubeThumbnail = (url) => {
    const videoId = getYouTubeVideoId(url);
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : null;
  };

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateFinalPrice = (price) => {
    if (!price) return price;
    return Math.round(price);
  };

  if (batchLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading course details...</Text>
      </SafeAreaView>
    );
  }

  console.log("batchData",batchData)

  if (batchError || !batchData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Feather name="alert-circle" size={48} color={colors.danger} />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>
          We couldn't load the course details
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleBack}>
          <Feather name="arrow-left" size={18} color={colors.white} />
          <Text style={styles.retryText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const finalPriceWithGST = calculateFinalPrice(batchData.batchDiscountPrice);
  const savings = batchData.batchPrice - batchData.batchDiscountPrice;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Feather name="arrow-left" size={22} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Course Details
        </Text>
        <TouchableOpacity style={styles.iconButton} onPress={triggerHaptic}>
          <Feather name="share-2" size={20} color={colors.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Image */}
        <View style={styles.hero}>
          <Image
            source={{ uri: batchData.imageUrl }}
            style={styles.heroImage}
            resizeMode="contain"
          />

          {discountPercent > 0 && (
            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>{discountPercent}% OFF</Text>
            </View>
          )}
        </View>

        {/* Course Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.courseTitle}>{batchData.name}</Text>

          {/* Program Name */}
          {batchData.program?.name && (
            <View style={styles.programBadge}>
              <Feather name="layers" size={12} color={colors.primary} />
              <Text style={styles.programName}>{batchData.program.name}</Text>
            </View>
          )}

          {batchData.shortDescription && (
            <Text style={styles.courseSubtitle}>
              {batchData.shortDescription}
            </Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Feather name="calendar" size={14} color={colors.primary} />
              <Text style={styles.statText}>
                {formatDate(batchData.startDate)}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="book-open" size={14} color={colors.primary} />
              <Text style={styles.statText}>
                {batchData.subjects?.length || 0} Subjects
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Feather name="video" size={14} color={colors.primary} />
              <Text style={styles.statText}>{videos.length} Videos</Text>
            </View>
          </View>
        </View>

        {/* Long Description */}
        {batchData.longDescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About This Course</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>
                {batchData.longDescription}
              </Text>
            </View>
          </View>
        )}

        {/* Subjects Section */}
        {batchData.subjects && batchData.subjects.length > 0 && (
          <View style={styles.section}>
            <AccordionItem
              title={`Course Subjects (${batchData.subjects.length})`}
              icon="book-open"
              initiallyOpen={false}
            >
              <View style={styles.subjectsGrid}>
                {batchData.subjects.map((subject) => (
                  <View key={subject.id} style={styles.subjectCard}>
                    <View style={styles.subjectIcon}>
                      <Feather name="book" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectName}>{subject.name}</Text>
                      {subject.description && (
                        <Text style={styles.subjectDesc} numberOfLines={3}>
                          {subject.description}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </AccordionItem>
          </View>
        )}

        {/* Demo Videos Section */}
        {demoVideos.length > 0 && (
          <View style={styles.section}>
            <AccordionItem
              title={`Demo Videos (${demoVideos.length} Free)`}
              icon="play-circle"
              initiallyOpen={true}
            >
              {demoVideos.map((video) => {
                const thumbnailUrl =
                  video.imageUrl || getYouTubeThumbnail(video.url);

                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoItem}
                    onPress={() => handleVideoPress(video)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.videoThumb}>
                      {thumbnailUrl ? (
                        <Image
                          source={{ uri: thumbnailUrl }}
                          style={styles.thumbImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.thumbPlaceholder}>
                          <Feather
                            name="video"
                            size={20}
                            color={colors.white}
                          />
                        </View>
                      )}
                      <View style={styles.playIcon}>
                        <Feather name="play" size={14} color={colors.white} />
                      </View>
                    </View>

                    <View style={styles.videoDetails}>
                      <Text style={styles.videoTitle} numberOfLines={2}>
                        {video.title}
                      </Text>
                      <View style={styles.videoMeta}>
                        <View style={styles.freeTag}>
                          <Text style={styles.freeTagText}>FREE DEMO</Text>
                        </View>
                        {video.duration && (
                          <Text style={styles.durationText}>
                            {video.duration}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={colors.textLight}
                    />
                  </TouchableOpacity>
                );
              })}
            </AccordionItem>
          </View>
        )}

        {/* Videos Loading State */}
        {videosLoading && (
          <View style={styles.videosLoadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.videosLoadingText}>Loading videos...</Text>
          </View>
        )}

        {/* Pricing Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Pricing</Text>

          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <View>
                {batchData.batchPrice && (
                  <Text style={styles.originalPrice}>
                    ₹{batchData.batchPrice.toLocaleString("en-IN")}
                  </Text>
                )}
                <View style={styles.finalPriceRow}>
                  <Text style={styles.finalPrice}>
                    ₹{batchData.batchDiscountPrice.toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
              {discountPercent > 0 && (
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>
                    Save ₹{savings.toLocaleString("en-IN")}
                  </Text>
                </View>
              )}
            </View>

            {/* Total with GST */}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount (incl. GST)</Text>
              <Text style={styles.totalValue}>
                ₹{finalPriceWithGST.toLocaleString("en-IN")}
              </Text>
            </View>

            {/* Offer Validity */}
            {batchData.offerValidityDays > 0 && (
              <View style={styles.validityBanner}>
                <Feather name="clock" size={12} color={colors.danger} />
                <Text style={styles.validityText}>
                  Offer valid for {batchData.offerValidityDays} days only!
                </Text>
              </View>
            )}

            {/* EMI Options */}
            {batchData.isEmi &&
              batchData.emiSchedule &&
              batchData.emiSchedule.length > 0 && (
                <View style={styles.emiCard}>
                  <View style={styles.emiHeader}>
                    <Feather
                      name="credit-card"
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.emiTitle}>Easy EMI Available</Text>
                  </View>

                  {batchData.emiSchedule.map((emi, idx) => (
                    <View key={idx} style={styles.emiRow}>
                      <Text style={styles.emiLabel}>
                        Month {emi.month} Payment
                      </Text>
                      <Text style={styles.emiValue}>
                        ₹{emi.amount.toLocaleString("en-IN")}
                      </Text>
                    </View>
                  ))}

                  <View style={styles.emiTotal}>
                    <Text style={styles.emiTotalLabel}>Total EMI Amount</Text>
                    <Text style={styles.emiTotalValue}>
                      ₹{batchData.emiTotal.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              )}
          </View>
        </View>

        {/* Registration Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Important Dates</Text>
          <View style={styles.datesCard}>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={16} color={colors.primary} />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Course Starts</Text>
                <Text style={styles.dateValue}>
                  {formatDate(batchData.startDate)}
                </Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <Feather name="calendar" size={16} color={colors.danger} />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Course Ends</Text>
                <Text style={styles.dateValue}>
                  {formatDate(batchData.endDate)}
                </Text>
              </View>
            </View>
            <View style={styles.dateRow}>
              <Feather name="clock" size={16} color={colors.success} />
              <View style={styles.dateInfo}>
                <Text style={styles.dateLabel}>Registration Closes</Text>
                <Text style={styles.dateValue}>
                  {formatDate(batchData.registrationEndDate)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fixed Enroll Button */}
      <View style={styles.enrollContainer}>
        <View style={styles.enrollPriceInfo}>
          <Text style={styles.enrollPriceLabel}>Total Price</Text>
          <Text style={styles.enrollPriceValue}>
            ₹{finalPriceWithGST.toLocaleString("en-IN")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.enrollButton}
          onPress={handleEnrollPress}
          activeOpacity={0.9}
        >
          <Text style={styles.enrollButtonText}>Enroll Now</Text>
          <Feather name="arrow-right" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Video Modal */}
      <Modal
        visible={showVideoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.videoModalOverlay}>
          <SafeAreaView style={styles.videoModalContainer}>
            <View style={styles.videoModalHeader}>
              <View style={styles.videoModalTitleContainer}>
                <Text style={styles.videoModalTitle} numberOfLines={1}>
                  {currentVideo?.title}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseVideo}
              >
                <Feather name="x" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.videoPlayerWrapper}>
              {currentVideo?.url && (
                <YoutubePlayer
                  height={width * 0.5625}
                  width={width}
                  videoId={getYouTubeVideoId(currentVideo.url)}
                  play={playing}
                  onChangeState={onStateChange}
                  webViewStyle={styles.youtubePlayer}
                />
              )}
            </View>

            <View style={styles.videoModalFooter}>
              <Feather name="info" size={16} color={colors.textLight} />
              <Text style={styles.videoModalDesc}>
                Explore the course content through this preview
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Payment Modal */}
      {batchData.isEmi && (
        <Modal
          visible={showPaymentModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPaymentModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              triggerHaptic();
              setShowPaymentModal(false);
            }}
          >
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHandle} />

              <Text style={styles.modalTitle}>Choose Payment Option</Text>
              <Text style={styles.modalSubtitle}>
                Select your preferred payment method
              </Text>

              {/* Full Payment Option */}
              <TouchableOpacity
                style={[
                  styles.paymentOption,
                  selectedPayment === "full" && styles.paymentOptionActive,
                ]}
                onPress={() => handlePaymentSelect("full")}
                activeOpacity={0.8}
              >
                <View style={styles.paymentOptionIcon}>
                  <Feather name="zap" size={22} color={colors.primary} />
                </View>
                <View style={styles.paymentOptionDetails}>
                  <Text style={styles.paymentOptionTitle}>Full Payment</Text>
                  <Text style={styles.paymentOptionDesc}>
                    Pay once, get instant access
                  </Text>
                  <Text style={styles.paymentOptionPrice}>
                    ₹{finalPriceWithGST.toLocaleString("en-IN")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioCircle,
                    selectedPayment === "full" && styles.radioCircleActive,
                  ]}
                >
                  {selectedPayment === "full" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
              </TouchableOpacity>

              {/* EMI Option */}
              {batchData.isEmi && batchData.emiSchedule?.length > 0 && (
                <TouchableOpacity
                  style={[
                    styles.paymentOption,
                    selectedPayment === "emi" && styles.paymentOptionActive,
                  ]}
                  onPress={() => handlePaymentSelect("emi")}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentOptionIcon}>
                    <Feather
                      name="credit-card"
                      size={22}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.paymentOptionDetails}>
                    <Text style={styles.paymentOptionTitle}>Easy EMI</Text>
                    <Text style={styles.paymentOptionDesc}>
                      Pay in {batchData.emiSchedule.length} monthly installments
                    </Text>
                    <Text style={styles.paymentOptionPrice}>
                      ₹{batchData.emiSchedule[0].amount.toLocaleString("en-IN")}
                      <Text style={styles.paymentOptionSub}> /month</Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      selectedPayment === "emi" && styles.radioCircleActive,
                    ]}
                  >
                    {selectedPayment === "emi" && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedPayment && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmPayment}
                disabled={!selectedPayment}
                activeOpacity={0.9}
              >
                <Text style={styles.confirmButtonText}>
                  Continue to Payment
                </Text>
                <Feather name="arrow-right" size={18} color={colors.white} />
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 12,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    marginHorizontal: 16,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  hero: {
    position: "relative",
    height: 220,
    marginHorizontal: 6,
    marginTop: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  statusText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "600",
  },
  discountTag: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  discountTagText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
    lineHeight: 28,
  },
  programBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
    gap: 4,
  },
  programName: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  courseSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 12,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  onlineBadge: {
    backgroundColor: colors.success,
  },
  offlineBadge: {
    backgroundColor: "#F59E0B",
  },
  recordedBadge: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  videoCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  videoCountText: {
    fontSize: 10,
    color: colors.success,
    fontWeight: "600",
  },
  descriptionCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  subjectsGrid: {
    gap: 12,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  subjectIcon: {
    width: 32,
    height: 32,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  subjectDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  accordionContainer: {
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    // marginBottom: 12,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "#FEF2F2",
  },
  accordionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  accordionContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: colors.background,
  },

  videoItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  videoThumb: {
    position: "relative",
    width: 60,
    height: 45,
    borderRadius: 6,
    overflow: "hidden",
  },
  thumbImage: {
    width: "100%",
    height: "100%",
  },
  thumbPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.textLight,
    justifyContent: "center",
    alignItems: "center",
  },
  playIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -10 }, { translateY: -10 }],
    width: 20,
    height: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  videoDetails: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  videoMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  freeTag: {
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeTagText: {
    fontSize: 9,
    color: colors.success,
    fontWeight: "600",
  },
  sourceTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  sourceText: {
    fontSize: 8,
    color: colors.textLight,
    fontWeight: "500",
  },
  lockedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  lockedInfo: {
    flex: 1,
  },
  lockedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  lockedText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  videosLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  videosLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.textLight,
    textDecorationLine: "line-through",
    marginBottom: 4,
  },
  finalPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  gstText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  saveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveText: {
    fontSize: 11,
    color: colors.white,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.secondary,
  },
  validityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    marginBottom: 16,
  },
  validityText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: "500",
  },
  emiCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emiHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  emiTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  emiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  emiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emiValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  emiTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emiTotalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  emiTotalValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  datesCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  enrollContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  enrollPriceInfo: {
    flex: 1,
  },
  enrollPriceLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  enrollPriceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  enrollButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
    minWidth: 140,
    justifyContent: "center",
  },
  enrollButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
  },
  videoModalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  videoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  videoModalTitleContainer: {
    flex: 1,
  },
  videoModalTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  videoPlayerWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  youtubePlayer: {
    borderRadius: 8,
  },
  videoModalFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  videoModalDesc: {
    color: colors.textLight,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    minHeight: 400,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 18,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  paymentOptionActive: {
    borderColor: colors.primary,
    backgroundColor: "#FEF2F2",
  },
  paymentOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
  },
  paymentOptionDetails: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  paymentOptionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  paymentOptionPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  paymentOptionSub: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 24,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.textLight,
  },
  confirmButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
