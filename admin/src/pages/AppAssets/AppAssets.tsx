import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:5001/api/assets";

type AppAssetsType = {
  id?: number;
  quizVideoIntro?: string;
  testSeriesVideoIntro?: string;
  onboardingImageOne?: string;
  onboardingImageTwo?: string;
};

const AppAssets = () => {
  const [assets, setAssets] = useState<AppAssetsType | null>(null);
  const [loading, setLoading] = useState(false);

  const [files, setFiles] = useState({
    quizVideoIntro: null as File | null,
    testSeriesVideoIntro: null as File | null,
    onboardingImageOne: null as File | null,
    onboardingImageTwo: null as File | null,
  });

  // ────────────────────────────────────────────────
  //  FETCH ASSETS
  // ────────────────────────────────────────────────
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await axios.get(API_URL);
      setAssets(res.data.data);
    } catch (err) {
      setAssets(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // ────────────────────────────────────────────────
  //  FILE CHANGE
  // ────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFiles((prev) => ({
        ...prev,
        [name]: files[0],
      }));
    }
  };

  // ────────────────────────────────────────────────
  //  SAVE (CREATE / UPDATE)
  // ────────────────────────────────────────────────
  const handleSave = async () => {
    const formData = new FormData();

    Object.entries(files).forEach(([key, file]) => {
      if (file) formData.append(key, file);
    });

    try {
      setLoading(true);

      if (assets?.id) {
        await axios.put(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Assets updated successfully");
      } else {
        await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        alert("Assets created successfully");
      }

      // Reset file inputs
      setFiles({
        quizVideoIntro: null,
        testSeriesVideoIntro: null,
        onboardingImageOne: null,
        onboardingImageTwo: null,
      });

      fetchAssets();
    } catch (err) {
      alert("Failed to save assets");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  //  DELETE ALL ASSETS
  // ────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!window.confirm("Delete all app assets? This cannot be undone.")) return;

    try {
      setLoading(true);
      await axios.delete(API_URL);
      setAssets(null);
      alert("Assets deleted successfully");
    } catch (err) {
      alert("Delete failed");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  //  RENDER
  // ────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-sm border mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        App Assets Management
      </h2>

      {loading && (
        <div className="text-center py-4">
          <p className="text-indigo-600 font-medium">Loading...</p>
        </div>
      )}

      {/* Current Assets Preview */}
      {assets && (
        <div className="mb-10 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">
            Current Assets
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assets.quizVideoIntro && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Quiz Intro Video
                </p>
                <video
                  controls
                  className="w-full rounded-lg shadow-sm max-h-[240px] object-contain bg-black"
                  src={assets.quizVideoIntro}
                />
              </div>
            )}

            {assets.testSeriesVideoIntro && (
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Test Series Intro Video
                </p>
                <video
                  controls
                  className="w-full rounded-lg shadow-sm max-h-[240px] object-contain bg-black"
                  src={assets.testSeriesVideoIntro}
                />
              </div>
            )}
          </div>

          {(assets.onboardingImageOne || assets.onboardingImageTwo) && (
            <div className="mt-8">
              <p className="text-sm font-medium text-gray-600 mb-3">
                Onboarding Images
              </p>
              <div className="flex flex-wrap gap-4">
                {assets.onboardingImageOne && (
                  <img
                    src={assets.onboardingImageOne}
                    alt="Onboarding 1"
                    className="w-44 h-44 object-cover rounded-lg shadow-sm border border-gray-200"
                  />
                )}
                {assets.onboardingImageTwo && (
                  <img
                    src={assets.onboardingImageTwo}
                    alt="Onboarding 2"
                    className="w-44 h-44 object-cover rounded-lg shadow-sm border border-gray-200"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      <div className="space-y-5 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Quiz Intro Video
          </label>
          <input
            type="file"
            name="quizVideoIntro"
            accept="video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2.5 file:px-5
                     file:rounded-lg file:border-0
                     file:text-sm file:font-medium
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Test Series Intro Video
          </label>
          <input
            type="file"
            name="testSeriesVideoIntro"
            accept="video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2.5 file:px-5
                     file:rounded-lg file:border-0
                     file:text-sm file:font-medium
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Onboarding Image One
          </label>
          <input
            type="file"
            name="onboardingImageOne"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2.5 file:px-5
                     file:rounded-lg file:border-0
                     file:text-sm file:font-medium
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Onboarding Image Two
          </label>
          <input
            type="file"
            name="onboardingImageTwo"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                     file:mr-4 file:py-2.5 file:px-5
                     file:rounded-lg file:border-0
                     file:text-sm file:font-medium
                     file:bg-indigo-50 file:text-indigo-700
                     hover:file:bg-indigo-100
                     focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {assets ? "Update Assets" : "Create Assets"}
        </button>

        {assets && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-2.5 bg-red-600 text-white font-medium rounded-lg
                       hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Delete All Assets
          </button>
        )}
      </div>
    </div>
  );
};

export default AppAssets;