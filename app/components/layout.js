// components/layout.js

import { View, ScrollView, RefreshControl } from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "./Header";
import BottomBar from "./Bottom";

export default function Layout({
  isHeaderShow = true,
  isBottomBarShow = true,
  children,
  isRefreshing = false,    // नया prop
  onRefresh = () => {},    // नया prop
}) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* HEADER FIXED */}
      {isHeaderShow && <Header />}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: isBottomBarShow ? 90 : 20,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={["#d62828"]}    
            tintColor="#d62828"    
            title="Refreshing..."    
            titleColor="#666"
          />
        }
      >
        {children}
      </ScrollView>

      {/* BOTTOM BAR FIXED */}
      {isBottomBarShow && (
        <View style={{ position: "absolute", bottom: 10, left: 0, right: 0 }}>
          <BottomBar />
        </View>
      )}
    </SafeAreaView>
  );
}