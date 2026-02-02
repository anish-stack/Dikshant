import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuthStore } from "../../stores/auth.store";
import { API_URL_LOCAL_ENDPOINT } from "../../constant/api";
import Layout from "../../components/layout";

const API_BASE = API_URL_LOCAL_ENDPOINT;

export default function ApplyScholarship() {
  const navigation = useNavigation();
  const route = useRoute();
  const { scholarshipId } = route.params || {};
  const { token } = useAuthStore();

  const [scholarship, setScholarship] = useState(null);
  const [loadingScholarship, setLoadingScholarship] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    mobile: "",
    gender: "",
    category: "",
    course: "",
    medium: "",
  });

  const [certificate, setCertificate] = useState(null);
  const [photo, setPhoto] = useState(null);

  // Fetch scholarship details
  useEffect(() => {
    if (!scholarshipId || !token) return;

    const fetchScholarship = async () => {
      try {
        setLoadingScholarship(true);
        const res = await axios.get(`${API_BASE}/scholarships/${scholarshipId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setScholarship(res.data.data);
        } else {
          Alert.alert("Error", "Failed to load scholarship details");
          navigation.goBack();
        }
      } catch (err) {
        console.error("Fetch scholarship error:", err);
        Alert.alert("Error", "Unable to load scholarship. Please try again.");
        navigation.goBack();
      } finally {
        setLoadingScholarship(false);
      }
    };

    fetchScholarship();
  }, [scholarshipId, token]);

  // Permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Needed", "Allow photo access to upload candidate photo.");
        }
      }
    })();
  }, []);

  const pickCertificate = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setCertificate({
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
        });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick certificate.");
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setPhoto({ uri: result.assets[0].uri });
      }
    } catch (err) {
      Alert.alert("Error", "Failed to pick photo.");
    }
  };

  const handleSubmit = async () => {
    if (!form.fullName.trim()) return Alert.alert("Required", "Enter full name");
    if (!form.mobile.trim() || form.mobile.length !== 10) return Alert.alert("Invalid", "Enter valid 10-digit mobile");
    if (!form.gender) return Alert.alert("Required", "Select gender");
    if (!form.category) return Alert.alert("Required", "Select category");
    if (!form.course) return Alert.alert("Required", "Select course");
    if (!form.medium) return Alert.alert("Required", "Select medium");
    if (!certificate) return Alert.alert("Required", "Upload certificate");
    if (!photo) return Alert.alert("Required", "Upload photo");

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("scholarshipId", scholarshipId);
      formData.append("fullName", form.fullName.trim());
      formData.append("mobile", form.mobile.trim());
      formData.append("gender", form.gender);
      formData.append("category", form.category);
      formData.append("course", form.course);
      formData.append("medium", form.medium);

      formData.append("certificate", {
        uri: certificate.uri,
        name: certificate.name || "certificate.pdf",
        type: certificate.mimeType || "application/pdf",
      });

      formData.append("photo", {
        uri: photo.uri,
        name: "photo.jpg",
        type: "image/jpeg",
      });

      const res = await axios.post(`${API_BASE}/scholarshipapplications`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        Alert.alert("Success ✅", "Application submitted successfully!", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Failed", res.data.message || "Submission failed");
      }
    } catch (error) {
      console.error("Submit error:", error.response?.data?.message || error);
      Alert.alert("Info",  error.response?.data?.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingScholarship) {
    return (
      <Layout isBottomBarShow={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EF4444" />
          <Text style={styles.loadingText}>Loading scholarship...</Text>
        </View>
      </Layout>
    );
  }

  if (!scholarship) {
    return null;
  }

  // Parse from API
  const categories = JSON.parse(scholarship.category || "[]");
  const courses = JSON.parse(scholarship.offeredCourseIds || "[]");

  return (
    <Layout isBottomBarShow={false}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Scholarship Header */}
        <View style={styles.headerCard}>
          <Text style={styles.scholarshipTitle}>{scholarship.name}</Text>
          <Text style={styles.scholarshipDesc}>{scholarship.description}</Text>
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{scholarship.discountPercentage}% Scholarship</Text>
          </View>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>

          {/* Full Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Enter your full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              value={form.fullName}
              onChangeText={(t) => setForm({ ...form, fullName: t })}
            />
          </View>

          {/* Mobile */}
          <View style={styles.field}>
            <Text style={styles.label}>Enter your mobile number</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile Number"
              keyboardType="numeric"
              maxLength={10}
              value={form.mobile}
              onChangeText={(t) => setForm({ ...form, mobile: t.replace(/[^0-9]/g, "") })}
            />
          </View>

          {/* Gender & Category */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Select Gender</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={form.gender}
                  onValueChange={(v) => setForm({ ...form, gender: v })}
                >
                  <Picker.Item label="Select Gender" value="" />
                  <Picker.Item label="Male" value="Male" />
                  <Picker.Item label="Female" value="Female" />
                  <Picker.Item label="Other" value="Other" />
                </Picker>
              </View>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Select Category</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <Picker.Item label="Select Category" value="" />
                  {categories.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Course & Medium */}
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={styles.label}>Select Course</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={form.course}
                  onValueChange={(v) => setForm({ ...form, course: v })}
                >
                  <Picker.Item label="Select Course" value="" />
                  {courses.map((course) => (
                    <Picker.Item key={course} label={course} value={course} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.half}>
              <Text style={styles.label}>Select Medium</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={form.medium}
                  onValueChange={(v) => setForm({ ...form, medium: v })}
                >
                  <Picker.Item label="Select Medium" value="" />
                  <Picker.Item label="Hindi" value="Hindi" />
                  <Picker.Item label="English" value="English" />
                  <Picker.Item label="Bilingual" value="Bilingual" />
                </Picker>
              </View>
            </View>
          </View>

          {/* Certificate Upload */}
          <View style={styles.upload}>
            <Text style={styles.uploadLabel}>Upload Certificate *</Text>
            <Text style={styles.hint}>(Caste / Income / Other valid certificate)</Text>
            <TouchableOpacity style={styles.chooseBtn} onPress={pickCertificate}>
              <Text style={styles.chooseText}>Choose file</Text>
            </TouchableOpacity>
            <Text style={styles.fileText}>
              {certificate ? certificate.name : "No file chosen"}
            </Text>
          </View>

          {/* Photo Upload */}
          <View style={styles.upload}>
            <Text style={styles.uploadLabel}>Upload Candidate Photo *</Text>
            <Text style={styles.hint}>(Clear passport-size photo – JPG/PNG only)</Text>
            <TouchableOpacity style={styles.chooseBtn} onPress={pickPhoto}>
              <Text style={styles.chooseText}>Choose file</Text>
            </TouchableOpacity>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
            ) : (
              <Text style={styles.fileText}>No file chosen</Text>
            )}
          </View>

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submit, submitting && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  headerCard: {
    backgroundColor: "#FFF5F5",
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  scholarshipTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#B91C1C",
    marginBottom: 8,
  },
  scholarshipDesc: {
    fontSize: 14.5,
    color: "#444",
    lineHeight: 21,
    marginBottom: 12,
  },
  discountBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EF4444",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  discountText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
  },
  form: {
    paddingHorizontal: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15.5,
    color: "#333",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  half: {
    flex: 0.485,
  },
  picker: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  upload: {
    marginBottom: 28,
  },
  uploadLabel: {
    fontSize: 15.5,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  hint: {
    fontSize: 13.5,
    color: "#666",
    marginBottom: 14,
    lineHeight: 19,
  },
  chooseBtn: {
    backgroundColor: "#EF4444",
    alignSelf: "flex-start",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  chooseText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  fileText: {
    marginTop: 12,
    fontSize: 14.5,
    color: "#555",
  },
  photoPreview: {
    width: 140,
    height: 140,
    borderRadius: 16,
    marginTop: 14,
    alignSelf: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 20,
    marginTop: 30,
  },
  cancel: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelText: {
    fontSize: 16,
    color: "#4B5563",
    fontWeight: "600",
  },
  submit: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});