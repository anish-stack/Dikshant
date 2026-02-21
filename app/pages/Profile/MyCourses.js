import React, { useEffect, useState } from 'react';
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
import { getStatusColor, formatDate } from '../../utils/getStatusColorCourse';
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
  disabled: '#9CA3AF',
};

// Date helpers
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
  if (order.reason === 'BATCH_INCLUDED') {
    return 'Validity follows batch schedule';
  }
  if (order.accessValidityDays != null && order.accessValidityDays > 0) {
    if (expiryDate) {
      return `Assigned validity: Expires on ${formatDate(expiryDate.toISOString())}`;
    }
  }
  // Fallback for normal courses
  if (order.batch?.endDate) {
    return `Valid until ${formatDate(order.batch.endDate)}`;
  }
  return 'Validity: Unlimited / Follows batch';
};

export default function MyCourses() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState('all');
  const navigation = useNavigation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    try {
      const res = await api.get(`/Orders/user/${user.id}`);
      if (res.data) {
        const batchOrders = res.data.filter((i) => i.type === 'batch');
        setCourses(batchOrders || []);
      }
    } catch (err) {
      console.log('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    fetchCourses();
  }, [user?.id]);

  // Process each order
  const processedCourses = courses.map((order) => {
    const batch = order.batch || {};
    let expiryDate = null;

    const isBatchIncluded = order.reason === 'BATCH_INCLUDED';

    if (!isBatchIncluded && typeof order.accessValidityDays === 'number' && order.accessValidityDays > 0) {
      expiryDate = addDays(order.createdAt, order.accessValidityDays);
    }

    const expired = isExpired(expiryDate);

    return {
      ...order,
      batch,
      expiryDate,
      expired,
      isBatchIncluded,
    };
  });

  // Sort: active → expired last
  const sortedCourses = [...processedCourses].sort((a, b) => {
    if (a.expired && !b.expired) return 1;
    if (!a.expired && b.expired) return -1;
    return 0;
  });

  const filteredCourses = sortedCourses.filter((order) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'in-progress') return order.batch?.c_status === 'In Progress';
    if (selectedTab === 'completed') return order.batch?.c_status === 'Completed';
    return true;
  });

  const handleCoursePress = (order) => {
    if (order.expired) return;

    const batch = order.batch || {};
    const url = batch.category === 'online' ? 'my-course' : 'my-course-subjects';
    navigation.navigate(url, { unlocked: true, courseId: batch.id });
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
              {selectedTab === key && <View style={styles.tabUnderline} />}
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
              const { batch, expired, expiryDate } = order;
              const statusStyle = getStatusColor(batch.c_status || 'Active');
              const expiryText = getExpiryText(order, expiryDate, expired);

              return (
                <TouchableOpacity
                  key={order.id}
                  style={[styles.courseCard, expired && styles.courseCardExpired]}
                  activeOpacity={expired ? 1 : 0.8}
                  disabled={expired}
                  onPress={() => handleCoursePress(order)}
                >
                  <View style={styles.cardHeader}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${statusStyle.bg}20`, borderColor: statusStyle.bg },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {batch.c_status || 'Active'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.courseTitle, expired && styles.expiredText]} numberOfLines={2}>
                    {batch.name || 'Untitled Course'}
                  </Text>

                  {batch.program?.name && (
                    <Text style={styles.programText}>{batch.program.name}</Text>
                  )}

                  <View style={styles.metaContainer}>
                    <View style={styles.metaRow}>
                      <Text style={styles.priceText}>
                        Paid: ₹{order.totalAmount?.toLocaleString('en-IN') || '0'}
                      </Text>
                      <Text style={styles.dateText}>
                        Enrolled: {formatDate(order.createdAt)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.expiryText,
                        expired ? styles.expiredExpiryText : null,
                      ]}
                    >
                      {expiryText}
                    </Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={styles.progressBackground}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: expired
                                ? '0%'
                                : batch.c_status === 'Completed'
                                ? '100%'
                                : batch.c_status === 'In Progress'
                                ? '60%'
                                : batch.c_status === 'Partially Complete'
                                ? '85%'
                                : '0%',
                              backgroundColor: expired ? colors.disabled : statusStyle.bg,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.progressLabel,
                        expired && { color: colors.disabled },
                      ]}
                    >
                      {expired
                        ? 'Expired'
                        : batch.c_status === 'Completed'
                        ? 'Completed'
                        : batch.c_status === 'In Progress'
                        ? 'In Progress'
                        : batch.c_status === 'Start Soon'
                        ? 'Not Started'
                        : 'Ongoing'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 15, color: colors.textLight },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  count: { fontSize: 14, color: colors.textLight },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 24, position: 'relative' },
  tabActive: {},
  tabText: { fontSize: 15, color: colors.textLight, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  tabUnderline: {
    position: 'absolute',
    bottom: -13,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, color: colors.textLight },
  coursesList: { padding: 20, paddingTop: 8 },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseCardExpired: {
    opacity: 0.55,
    backgroundColor: '#f8f8f8',
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  expiredText: { color: colors.textLight },
  programText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  metaContainer: {
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  dateText: { fontSize: 13, color: colors.textLight },
  expiryText: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
  },
  expiredExpiryText: {
    color: colors.danger,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: { flex: 1, marginRight: 12 },
  progressBackground: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});