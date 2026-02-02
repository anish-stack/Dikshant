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
import useSWR from 'swr';
import { useAuthStore } from '../../stores/auth.store'; // assuming
import { useSettings } from '../../hooks/useSettings';
import { getStatusColor, formatDate } from '../../utils/getStatusColorCourse';
import Layout from '../../components/layout';
import api from '../../constant/fetcher';

const colors = {
  primary: "#DC2626",
  text: "#111827",
  textSecondary: "#4B5563",
  textLight: "#6B7280",
  border: "#E5E7EB",
  surface: "#F9FAFB",
  success: "#10B981",
  warning: "#F59E0B",
};

const fetcher = (url) => fetch(url).then(res => res.json()); // adjust if needed

export default function MyCourses() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState("all");
  const navigation = useNavigation();
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true);


  const fetchCourses = async () => {
    try {
      const res = await api.get(`/Orders/user/${user.id}`);
    
      if (res.data) {
        const batch = res.data.filter((i)=> i.type === 'batch')
        setCourses(batch  || []);
      }
    } catch (err) {
      console.log("Error:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!user?.id) return;
    fetchCourses();
  }, [user?.id]);

  const myCourses =courses


  const filteredCourses = myCourses.filter((order) => {
    if (selectedTab === "all") return true;
    if (selectedTab === "in-progress") return order.batch?.c_status === "In Progress";
    if (selectedTab === "completed") return order.batch?.c_status === "Completed";
    return true;
  });

  const redirectCourse = (id) => {
  navigation.navigate("my-course-subjects", { unlocked: true, courseId: id });

    // navigation.navigate("my-course", { unlocked: true, courseId: id });
  };

  if (loading) {
    return (
      <Layout isHeaderShow={true}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout isHeaderShow={true}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>My Courses</Text>
          <Text style={styles.count}>{myCourses.length} courses</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {[
            { key: "all", label: "All" },
            { key: "in-progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                selectedTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setSelectedTab(tab.key)}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === tab.key && styles.tabTextActive
                ]}
              >
                {tab.label}
              </Text>
              {selectedTab === tab.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Course List */}
        {filteredCourses.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="book-open" size={48} color={colors.textLight} />
            <Text style={styles.emptyText}>No courses found</Text>
          </View>
        ) : (
          <View style={styles.coursesList}>
            {filteredCourses.map((order) => {
              const batch = order.batch || {};
              const statusStyle = getStatusColor(batch.c_status);

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.courseCard}
                  activeOpacity={0.85}
                  onPress={() => redirectCourse(batch.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg + '20' },
                      { borderColor: statusStyle.bg }
                    ]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {batch.c_status || "Active"}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.courseTitle} numberOfLines={2}>
                    {batch.name || "Untitled Course"}
                  </Text>

                  {batch.program && (
                    <Text style={styles.programText}>{batch.program.name}</Text>
                  )}

                  <View style={styles.metaRow}>
                    <Text style={styles.priceText}>
                      Paid: ₹{order.totalAmount?.toLocaleString("en-IN")}
                    </Text>
                    <Text style={styles.dateText}>
                      Enrolled: {formatDate(order.createdAt)}
                    </Text>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={styles.progressBackground}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: batch.c_status === "Completed" ? "100%" :
                                batch.c_status === "In Progress" ? "60%" :
                                  batch.c_status === "Partially Complete" ? "85%" : "0%",
                              backgroundColor: statusStyle.bg,
                            },
                          ]}
                        />
                      </View>
                    </View>
                    <Text style={styles.progressLabel}>
                      {batch.c_status === "Completed" ? "Completed" :
                        batch.c_status === "In Progress" ? "In Progress" :
                          batch.c_status === "Start Soon" ? "Not Started" : "Ongoing"}
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
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.textLight,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  count: {
    fontSize: 14,
    color: colors.textLight,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 24,
    position: 'relative',
  },
  tabActive: {
    // no background, just underline
  },
  tabText: {
    fontSize: 15,
    color: colors.textLight,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -13,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textLight,
  },
  coursesList: {
    padding: 20,
    paddingTop: 8,
  },
  courseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courseTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  programText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  dateText: {
    fontSize: 13,
    color: colors.textLight,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    marginRight: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});