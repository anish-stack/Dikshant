import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import axios from "axios";
import { API_URL_LOCAL_ENDPOINT } from "../constant/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDE_HEIGHT = SCREEN_WIDTH * 0.35;
const AUTO_PLAY_INTERVAL = 3000;

export default function Slider({refreshing}) {
  const [banners, setBanners] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef(null);

  // Fetch banners from API
  const fetchBanners = async () => {
    try {
      const response = await axios.get(`${API_URL_LOCAL_ENDPOINT}/banners`);
      setBanners(response.data);
    } catch (error) {
      console.error("Failed to fetch banners:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, [refreshing]);

  // Auto-play effect
  useEffect(() => {
    if (banners.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollToIndex(next);
        return next;
      });
    }, AUTO_PLAY_INTERVAL);

    return () => clearInterval(interval);
  }, [banners]);

  const scrollToIndex = (index) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({ animated: true, index });
    }
  };

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const handleBannerPress = (linkUrl) => {
    if (linkUrl) {
      Linking.openURL(linkUrl).catch((err) =>
        console.error("Failed to open URL:", err)
      );
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleBannerPress(item.linkUrl)}
      style={styles.slide}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
   
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  if (banners.length === 0) {
    return (
      <View style={styles.container}>
        <Image
          source={require("../assets/images/placeholder.png")}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Slider */}
      <FlatList
        ref={flatListRef}
        data={banners}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {banners.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              currentIndex === index ? styles.activeDot : styles.inactiveDot,
            ]}
            onPress={() => {
              setCurrentIndex(index);
              scrollToIndex(index);
            }}
            activeOpacity={0.7}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SLIDE_HEIGHT,
    position: "relative",
  },
  slide: {
    width: SCREEN_WIDTH,
    height: SLIDE_HEIGHT,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },

  pagination: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  activeDot: {
    backgroundColor: "#fff",
    width: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  inactiveDot: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
});
