import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors } from "../../constant/color";
import WebView from "react-native-webview";

export default function CourseHeader({ batchData, videosCount }) {
  if (!batchData) return null;
  const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
       font-size: 14px;
          line-height: 1.7;
          color: #333;
          padding: 0;
          margin: 0;
      }
      p {
        margin-bottom: 12px;
      }
    </style>
  </head>
   <body>
      ${batchData?.shortDescription}
      <script>
        setTimeout(() => {
          window.ReactNativeWebView.postMessage(
            document.documentElement.scrollHeight
          );
        }, 300);
      </script>
    </body>
  </html>
`;
  return (
    <View style={styles.container}>
      {/* Course Image - Circular */}
      <View style={styles.imageContainer}>
        <Image
          source={{
            uri: batchData.imageUrl || "https://via.placeholder.com/300",
          }}
          style={styles.courseImage}
          resizeMode="cover"
        />

      </View>

      {/* Course Details */}
      <View style={styles.detailsContainer}>
        <Text style={styles.courseName} numberOfLines={2}>
          {batchData.name || "Course Name"}
        </Text>

        {batchData?.shortDescription && (

          <View style={styles.shortDescription}>
            <WebView
              originWhitelist={['*']}
              androidLayerType="hardware"
              nestedScrollEnabled={true}
              source={{ html: htmlContent }}
                style={{ height: 100 }}

              scrollEnabled={true}
              showsVerticalScrollIndicator={true}
            />
          </View>


        )}

        {/* Meta Badges Row */}
        <View style={styles.metaContainer}>
          <View style={styles.metaBadge}>
            <Feather name="video" size={14} color={colors.primary} />
            <Text style={styles.metaText}>{videosCount} Lectures</Text>
          </View>



        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    backgroundColor: colors.card,
    borderRadius: 20,
    elevation: 4,
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  imageContainer: {
    position: "relative",
  },

  courseImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },

  imageBorder: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: colors.primary + "30", // light primary tint
  },

  detailsContainer: {
    flex: 1,
    justifyContent: "center",
    marginLeft: 16,
  },

  courseName: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
  },

  courseDesc: {
    fontSize: 13.5,
    color: colors.textLight,
    lineHeight: 19,
    marginBottom: 14,
  },

  metaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight || "#E3F2FD",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  shortDescription: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    height: 150,
    backgroundColor: colors.background || "#F8F8F8",
    borderWidth: 1,
    borderColor: colors.border || "#E0E0E0",
    elevation: 2,
    shadowColor: colors.shadow || "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  metaText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.primary,
  },
});