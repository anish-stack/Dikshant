import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from "react-native";
import React, { useEffect, useState, useMemo } from "react";
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
  const [isRefresh, setIsRefreshed] = useState(false)
  /* 🔁 Fetch quizzes */
  const fetchQuizes = async () => {
    try {

      setLoading(true);
      const res = await axios.get(`${LOCAL_ENDPOINT}/quiz/quizzes`);
      setQuizes(res.data.data || []);
    } catch (error) {
      console.log("Error fetching quizzes:", error);
    } finally {
      setIsRefreshed(false)
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizes();
  }, []);

  /* 🔍 Search filtering (fast & safe) */
  const filteredQuizes = useMemo(() => {
    if (!searchQuery.trim()) return quizes;

    const query = searchQuery.toLowerCase();

    return quizes.filter((quiz) => {
      return (
        quiz.title?.toLowerCase().includes(query) ||
        quiz.description?.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, quizes]);

  /* 🔄 Refresh button click */
  const handleRefreshClick = () => {
    setSearchQuery(""); // clear search
    setIsRefreshed(true)
    fetchQuizes();      // refetch
  };

  return (
    <Layout onRefresh={handleRefreshClick} isRefreshing={isRefresh} isHeaderShow={false}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandName}>Dikshant IAS</Text>
            <Text style={styles.tagline}>
              Master UPSC with Daily Quizzes
            </Text>
          </View>

          {/* 🔄 Refresh Button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefreshClick}
          >
            <Ionicons name="refresh" size={26} color="#B11226" />
          </TouchableOpacity>
        </View>

        {/* 🔍 Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#6B7280"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search quizzes, topics..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />

          {/* ❌ Clear search */}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Quiz List */}
      <FlatList
        data={filteredQuizes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <QuizCard isRefresh={isRefresh} setIsPurchased={setIsPurchased} onPress={() => navigation.navigate("QuizDetails", { quizId: item.id, isPurchased })} item={item} />}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={fetchQuizes}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No quizzes found.
          </Text>
        }
      />
    </Layout>
  );
}


const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#FFFFFF",

    paddingHorizontal: 16,
    paddingBottom: 16,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 1,
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  brandName: {
    fontSize: 26,
    fontWeight: "900",
    color: "#B11226",
    letterSpacing: 0.5,
  },

  tagline: {
    fontSize: 14,
    color: "#4B5563",
    marginTop: 4,
    fontWeight: "600",
  },



  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 50,
    // marginBottom: 16,
  },

  searchIcon: {
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },


  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#6B7280",
  },
});