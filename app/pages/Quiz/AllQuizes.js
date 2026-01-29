import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Layout from "../../components/layout";
import QuizCard from "./QuizCard";
import { LOCAL_ENDPOINT } from "../../constant/api";
import { Ionicons } from "@expo/vector-icons";

export default function AllQuizes({ navigation }) {
  const [quizes, setQuizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPurchased, setIsPurchased] = useState(false);
  const [isRefresh, setIsRefreshed] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 10;

  /* 🔁 Fetch quizzes with pagination support */
  const fetchQuizes = async (page = 1, search = "", append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const params = {
        page,
        limit: ITEMS_PER_PAGE,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      const res = await axios.get(`${LOCAL_ENDPOINT}/quiz/quizzes`, { params });

      const newQuizes = res.data.data || [];
      const total = res.data.totalPages || 1;

      setQuizes(append ? [...quizes, ...newQuizes] : newQuizes);
      setTotalPages(total);
      setCurrentPage(page);
    } catch (error) {
      console.log("Error fetching quizzes:", error);
    } finally {
      setIsRefreshed(false);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchQuizes(1, searchQuery);
  }, []);

  /* 🔍 Handle search with debouncing effect */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        setCurrentPage(1);
        fetchQuizes(1, searchQuery);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  /* 🔽 Load more quizzes (pagination) */
  const handleLoadMore = () => {
    if (!loadingMore && currentPage < totalPages) {
      fetchQuizes(currentPage + 1, searchQuery, true);
    }
  };

  /* 🔄 Refresh button click */
  const handleRefreshClick = useCallback(() => {
    setSearchQuery("");
    setIsRefreshed(true);
    setCurrentPage(1);
    fetchQuizes(1, "");
  }, []);

  /* 🎯 Navigate to quiz details */
  const handleQuizPress = useCallback(
    (quizData) => {
      navigation.navigate("QuizDetails", {
        quizId: quizData.id,
        isPurchased,
      });
    },
    [navigation, isPurchased]
  );

  /* 📊 Render footer for pagination */
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#B11226" />
        <Text style={styles.loadingMoreText}>Loading more quizzes...</Text>
      </View>
    );
  };

  /* 📭 Empty state component */
  const renderEmptyState = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>
          {searchQuery.trim()
            ? "No quizzes found"
            : "No quizzes available yet"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {searchQuery.trim()
            ? "Try a different keyword or browse all quizzes"
            : "New quizzes will appear here soon 😊"}
        </Text>
        {searchQuery.trim() && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearSearchText}>Clear search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Layout
      onRefresh={handleRefreshClick}
      isRefreshing={isRefresh}
      isHeaderShow={false}
    >
      {/* Enhanced Header */}
      <View style={styles.headerContainer}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.brandSection}>
            <Text style={styles.brandName}>Dikshant IAS</Text>
            <Text style={styles.tagline}>Practice daily. Improve steadily.</Text>
          </View>

          {/* Refresh Button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshClick}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={24} color="#B11226" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quizzes, topics, subjects..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />

          {/* Clear Button */}
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Count */}
        {!loading && quizes.length > 0 && (
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {searchQuery.trim()
                ? `Found ${quizes.length} quiz${quizes.length !== 1 ? "es" : ""}`
                : `${quizes.length} quiz${quizes.length !== 1 ? "es" : ""} available`}
            </Text>
          </View>
        )}
      </View>

      {/* Quiz List */}
      <FlatList
        data={quizes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <QuizCard
            isRefresh={isRefresh}
            setIsPurchased={setIsPurchased}
            onPress={handleQuizPress}
            item={item}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshing={loading}
        onRefresh={handleRefreshClick}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  brandSection: {
    flex: 1,
  },

  brandName: {
    fontSize: 28,
    fontWeight: "900",
    color: "#B11226",
    letterSpacing: -0.5,
  },

  tagline: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    fontWeight: "500",
  },

  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
  },

  clearButton: {
    padding: 4,
  },

  resultsBar: {
    marginTop: 12,
  },

  resultsText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },

  listContent: {
    paddingTop: 16,
    paddingBottom: 30,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },

  clearSearchButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  clearSearchText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  loadingMore: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 10,
  },

  loadingMoreText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
});