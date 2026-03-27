import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "https://www.app.api.dikshantias.com/api/assets"; // adjust if needed

type AppAssetsType = {
  id?: number;
  quizVideoIntro?: string;
  testSeriesVideoIntro?: string;
  onboardingImageOne?: string;
  onboardingImageTwo?: string;
  appName?: string;
  appLogo?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportWhatsappLink?: string;
  supportAddress?: string;
  facebookLink?: string;
  instagramLink?: string;
  youtubeLink?: string;
  telegramLink?: string;
  twitterLink?: string;
  linkedinLink?: string;
  isMaintenanceMode?: boolean;
  maintenanceTitle?: string;
  maintenanceMessage?: string;
  maintenanceStartAt?: string;
  maintenanceEndAt?: string;
  alert_enabled?: boolean;
  alert_title?: string;
  alert_message?: string;
  alert_type?: "info" | "warning" | "success" | "error";
  alert_display_type?: "popup" | "banner" | "toast";
  alert_start_at?: string;
  alert_end_at?: string;
  alert_is_blocking?: boolean;
};

type SocialLinkField =
  | "facebookLink"
  | "instagramLink"
  | "youtubeLink"
  | "telegramLink"
  | "twitterLink"
  | "linkedinLink";

const AppAssetsAdmin = () => {
  const [assets, setAssets] = useState<AppAssetsType | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File states
  const [files, setFiles] = useState<{
    quizVideoIntro: File | null;
    testSeriesVideoIntro: File | null;
    onboardingImageOne: File | null;
    onboardingImageTwo: File | null;
    appLogo: File | null;
  }>({
    quizVideoIntro: null,
    testSeriesVideoIntro: null,
    onboardingImageOne: null,
    onboardingImageTwo: null,
    appLogo: null,
  });

  // Form state (text, boolean, date)
  const [form, setForm] = useState<Partial<AppAssetsType>>({});

  const toDateTimeLocal = (value: string | number | Date | undefined) => {
    if (!value) return "";

    const date = new Date(value);

    // convert UTC → IST (+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(date.getTime() + istOffset);

    return istDate.toISOString().slice(0, 16);
  };

  // ─── FETCH ───────────────────────────────────────────────────────
  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(API_URL);
      const data = res.data.data || res.data;
      setAssets(data);
      setForm(data || {});
    } catch (err: any) {
      setError("Failed to load app assets");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // ─── FILE CHANGE ─────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles?.[0]) {
      setFiles((prev) => ({
        ...prev,
        [name]: selectedFiles[0],
      }));
    }
  };

  // ─── TEXT / BOOLEAN / DATE CHANGE ────────────────────────────────
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    let newValue: any = value;

    if (type === "checkbox") {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === "date" && value) {
      newValue = new Date(value).toISOString();
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  // ─── SAVE ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const formData = new FormData();

    // Append files
    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    // Append text/boolean/date fields
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    try {
      setSaving(true);
      setError(null);

      if (assets?.id) {
        await axios.put(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("App settings updated successfully!");
      } else {
        await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("App settings created successfully!");
      }

      // Reset file inputs
      setFiles({
        quizVideoIntro: null,
        testSeriesVideoIntro: null,
        onboardingImageOne: null,
        onboardingImageTwo: null,
        appLogo: null,
      });

      fetchAssets();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save settings");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ─── DELETE ──────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (
      !window.confirm(
        "Delete ALL app assets & settings? This cannot be undone.",
      )
    )
      return;

    try {
      setLoading(true);
      await axios.delete(API_URL);
      setAssets(null);
      setForm({});
      alert("All app assets deleted.");
    } catch (err) {
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const socialFields: SocialLinkField[] = [
    "facebookLink",
    "instagramLink",
    "youtubeLink",
    "telegramLink",
    "twitterLink",
    "linkedinLink",
  ];

  // ─── RENDER ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-20 text-lg">Loading app settings...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow border mt-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">App Assets</h1>
        <div className="space-x-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2.5 rounded-lg font-medium text-white transition ${
              saving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : assets ? "Save Changes" : "Create Settings"}
          </button>

          {assets && (
            <button
              onClick={handleDelete}
              disabled={loading || saving}
              className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Delete All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* ─── SECTIONS ──────────────────────────────────────────────── */}
      <div className="space-y-10">
        {/* 1. App Info */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            App Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                App Name
              </label>
              <input
                type="text"
                name="appName"
                value={form.appName || ""}
                onChange={handleInputChange}
                className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                App Logo
              </label>
              <input
                type="file"
                name="appLogo"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              {form.appLogo && !files.appLogo && (
                <img
                  src={form.appLogo}
                  alt="Logo"
                  className="mt-2 h-16 object-contain"
                />
              )}
            </div>
          </div>
        </section>

        {/* 3. Social Links */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Social Media Links
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {socialFields.map((field) => (
              <div key={field}>
                <label className="capitalize">
                  {field.replace("Link", "")}
                </label>
                <input
                  name={field}
                  value={form[field] ?? ""}
                  onChange={handleInputChange}
                  placeholder={`https://${field.replace("Link", "")}.com/...`}
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>
            ))}
          </div>
        </section>

        {/* 4. Maintenance Mode */}
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Maintenance Mode
          </h2>
          <div className="space-y-6">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="isMaintenanceMode"
                checked={form.isMaintenanceMode || false}
                onChange={handleInputChange}
                className="w-5 h-5 text-indigo-600 rounded"
              />
              <span className="font-medium">Enable Maintenance Mode</span>
            </label>

            {form.isMaintenanceMode && (
              <>
                <div>
                  <label>Title</label>
                  <input
                    name="maintenanceTitle"
                    value={form.maintenanceTitle || ""}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label>Message</label>
                  <textarea
                    name="maintenanceMessage"
                    value={form.maintenanceMessage || ""}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label>Start At</label>
                    <input
                      type="datetime-local"
                      name="maintenanceStartAt"
                      value={toDateTimeLocal(form.maintenanceStartAt)}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>

                  <div>
                    <label>End At</label>
                    <input
                      type="datetime-local"
                      name="maintenanceEndAt"
                      value={toDateTimeLocal(form.maintenanceEndAt)}
                      onChange={handleInputChange}
                      className="w-full border rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* 6. Media / Intro Assets */}
        <section className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Intro Videos & Onboarding
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Quiz Video */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Quiz Intro Video
              </label>
              <input
                type="file"
                name="quizVideoIntro"
                accept="video/*"
                onChange={handleFileChange}
                className="..."
              />
              {form.quizVideoIntro && (
                <video
                  controls
                  src={form.quizVideoIntro}
                  className="mt-3 w-full max-h-64 rounded shadow"
                />
              )}
            </div>

            {/* Test Series Video */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Test Series Intro Video
              </label>
              <input
                type="file"
                name="testSeriesVideoIntro"
                accept="video/*"
                onChange={handleFileChange}
                className="..."
              />
              {form.testSeriesVideoIntro && (
                <video
                  controls
                  src={form.testSeriesVideoIntro}
                  className="mt-3 w-full max-h-64 rounded shadow"
                />
              )}
            </div>

            {/* Onboarding Images */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">
                Onboarding Images
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <input
                    type="file"
                    name="onboardingImageOne"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {form.onboardingImageOne && (
                    <img
                      src={form.onboardingImageOne}
                      alt="Onboarding 1"
                      className="mt-3 w-full h-48 object-cover rounded shadow"
                    />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    name="onboardingImageTwo"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {form.onboardingImageTwo && (
                    <img
                      src={form.onboardingImageTwo}
                      alt="Onboarding 2"
                      className="mt-3 w-full h-48 object-cover rounded shadow"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AppAssetsAdmin;
