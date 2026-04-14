import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../../stores/auth.store';
import { formatDate } from '../../utils/getStatusColorCourse';
import Layout from '../../components/layout';
import api from '../../constant/fetcher';

const colors = {
  primary: '#DC2626',
  text: '#111827',
  textSecondary: '#4B5563',
  textLight: '#6B7280',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// Date Helpers
const addDays = (dateStr, days) => {
  if (!days || days <= 0) return null;
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date;
};

const isExpired = (expiryDate) => expiryDate && new Date() > expiryDate;

const getExpiryText = (order, expiryDate, expired) => {
  if (expired && expiryDate) {
    return `Expired on ${formatDate(expiryDate.toISOString())}`;
  }
  if (order.accessValidityDays && order.accessValidityDays > 0) {
    return `Expires on ${formatDate(expiryDate?.toISOString())}`;
  }
  if (order.batch?.endDate) {
    return `Valid until ${formatDate(order.batch.endDate)}`;
  }
  return 'Validity: Follows batch schedule';
};

export default function MyCourses() {
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('all');

  const fetchCourses = async () => {
    try {
      const res = await api.get(`/Orders/user/${user.id}`);
      if (res.data?.success) {
        // Filter only batch and subject purchases
        const filtered = res.data.data.filter((item) =>
          ["batch", "subject"].includes(item.type)
        );
        setCourses(filtered);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchCourses();
  }, [user?.id]);

  // Process orders with extra info
  const processedCourses = useMemo(() => {
    return courses.map((order) => {
      const batch = order.batch || {};
      let expiryDate = null;

      if (order.accessValidityDays && order.accessValidityDays > 0) {
        expiryDate = addDays(order.createdAt, order.accessValidityDays);
      }

      const expired = isExpired(expiryDate);

      return {
        ...order,
        batch,
        expiryDate,
        expired,
        isSubjectPurchase: order.type === "subject",
      };
    });
  }, [courses]);

  // Sort: Active first, then expired
  const sortedCourses = useMemo(() => {
    return [...processedCourses].sort((a, b) => {
      if (a.expired && !b.expired) return 1;
      if (!a.expired && b.expired) return -1;
      return 0;
    });
  }, [processedCourses]);

  const filteredCourses = sortedCourses.filter((order) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'in-progress') return order.batch?.c_status === 'In Progress';
    if (selectedTab === 'completed') return order.batch?.c_status === 'Completed';
    return true;
  });

  const handleCoursePress = (order) => {
    if (order.expired) return;

    const isSubject = order.type === "subject";

    const params = isSubject
      ? {
        unlocked: true,
        type: "subject",
        orderId: order.id,
        batchIdOfSubject: order.batchIdOfSubject,
        purchasedItem: order.itemId,
        courseId: order.batch?.id,
      }
      : {
        unlocked: true,
        type: "batch",
        orderId: order.id,
        courseId: order.batch?.id,
      };

    const screen = isSubject ? 'my-course-subjects' : 'my-course';

    navigation.navigate(screen, params);
  };

  if (loading) {
    return (
      <Layout isHeaderShow={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your courses...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout isHeaderShow={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={styles.count}>{processedCourses.length} courses</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {['all', 'in-progress', 'completed'].map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.tab, selectedTab === key && styles.tabActive]}
              onPress={() => setSelectedTab(key)}
            >
              <Text style={[styles.tabText, selectedTab === key && styles.tabTextActive]}>
                {key === 'all' ? 'All' : key === 'in-progress' ? 'In Progress' : 'Completed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        ) : (
          <View style={styles.coursesList}>
            {filteredCourses.map((order) => {
              const { batch, expired, expiryDate, isSubjectPurchase, subjects } = order;

              // For subject purchase - get subject name
              const subjectName = isSubjectPurchase && subjects?.[0]?.name
                ? subjects[0].name
                : null;

              const displayTitle = isSubjectPurchase && subjectName
                ? subjectName
                : (batch?.name || 'Untitled Course');

              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.courseCard, expired && styles.courseCardExpired]}
                  activeOpacity={expired ? 1 : 0.85}
                  disabled={expired}
                  onPress={() => handleCoursePress(order)}
                >
                  {/* Subject Badge */}
                  {isSubjectPurchase && (
                    <View style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>Subject Only</Text>
                    </View>
                  )}

                  {/* Main Title */}
                  <Text
                    style={[styles.courseTitle, expired && styles.expiredText]}
                    numberOfLines={2}
                  >
                    {displayTitle}
                  </Text>

                  {/* Batch Name (shown below for subject purchases) */}
                  {isSubjectPurchase && batch?.name && (
                    <Text style={styles.batchNameText}>
                      From Batch: {batch.name}
                    </Text>
                  )}



                  <View style={styles.metaContainer}>
                    <View style={styles.metaRow}>
                      <Text style={styles.priceText}>
                        Paid: ₹{order.totalAmount?.toLocaleString('en-IN') || '0'}
                      </Text>
                      <Text style={styles.dateText}>
                        {formatDate(order.createdAt)}
                      </Text>
                    </View>

                    <Text
                      style={[styles.expiryText, expired && styles.expiredExpiryText]}
                    >
                      {getExpiryText(order, expiryDate, expired)}
                    </Text>
                  </View>

                  {/* Extra note for subject purchase */}
                  {isSubjectPurchase && (
                    <Text style={styles.subjectNote}>
                      You purchased this subject individually from "{batch?.name}"
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: '#6B7280' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827' },
  count: { fontSize: 14, color: '#6B7280' },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 24 },
  tabActive: {},
  tabText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
  tabTextActive: { color: '#DC2626', fontWeight: '700' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#6B7280' },

  coursesList: { padding: 20, paddingTop: 8 },

  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  courseCardExpired: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },

  subjectBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  subjectBadgeText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700',
  },

  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    paddingRight: 80, // space for badge
  },
  expiredText: { color: '#9CA3AF' },

  programText: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },

  metaContainer: { marginTop: 8 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC2626',
  },
  dateText: { fontSize: 13, color: '#6B7280' },

  expiryText: {
    fontSize: 13.5,
    color: '#F59E0B',
    fontWeight: '500',
  },
  expiredExpiryText: {
    color: '#EF4444',
  },

  subjectNote: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
});