import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5001/api";

const EditTestSeriesBundle = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [gst, setGst] = useState("");
  const [description, setDescription] = useState("");
  const [testSeries, setTestSeries] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch single bundle + all test series
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");

        // Fetch all test series
        const seriesRes = await axios.get(`${API_URL}/testseriess?isAdmin=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (seriesRes.data.success) {
          setTestSeries(seriesRes.data.data || []);
        }

        // Fetch single bundle
        const bundleRes = await axios.get(`${API_URL}/testseries-bundles/${id}?isAdmin=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (bundleRes.data.success) {
          const bundle = bundleRes.data.data;
          setTitle(bundle.title || "");
          setPrice(bundle.price?.toString() || "");
          setDiscountPrice(bundle.discountPrice?.toString() || "");
          setGst(bundle.gst?.toString() || "");
          setDescription(bundle.description || "");
          setSelectedSeries(bundle.testSeries?.map((ts) => ts.id) || []);

          // Calculate percent if discount exists
          if (bundle.price && bundle.discountPrice && bundle.discountPrice < bundle.price) {
            const percent = ((bundle.price - bundle.discountPrice) / bundle.price) * 100;
            setDiscountPercent(percent.toFixed(1));
          }
        }
      } catch (error) {
        Swal.fire("Error", "Failed to load bundle data", "error");
        navigate("/all-test-series-bundle");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate]);

  // Discount logic (same as create)
  const calculateFromDiscountPrice = (discPriceStr) => {
    const discPrice = Number(discPriceStr);
    const original = Number(price);

    if (!original || original <= 0) return;

    if (isNaN(discPrice) || discPrice < 0) {
      setDiscountPercent("");
      return;
    }

    if (discPrice >= original) {
      Swal.fire("Warning", "Discount price cannot be ≥ original price", "warning");
      setDiscountPrice("");
      setDiscountPercent("");
      return;
    }

    const percent = ((original - discPrice) / original) * 100;
    setDiscountPercent(percent.toFixed(1));
  };

  const calculateFromDiscountPercent = (percentStr) => {
    const percent = Number(percentStr);
    const original = Number(price);

    if (!original || original <= 0) return;

    if (isNaN(percent) || percent < 0 || percent > 100) {
      Swal.fire("Warning", "Discount % must be between 0 and 100", "warning");
      setDiscountPercent("");
      setDiscountPrice("");
      return;
    }

    const discountAmount = original * (percent / 100);
    const finalPrice = original - discountAmount;
    setDiscountPrice(Math.round(finalPrice).toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) return Swal.fire("Error", "Title is required", "error");
    if (selectedSeries.length === 0) return Swal.fire("Error", "Select at least one test series", "error");
    if (!price || Number(price) <= 0) return Swal.fire("Error", "Original price must be > 0", "error");

    try {
      setSaving(true);
      const token = localStorage.getItem("accessToken");

      const payload = {
        title: title.trim(),
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        gst: gst ? Number(gst) : 0,
        description: description.trim() || null,
        testSeriesIds: selectedSeries,
      };

      const res = await axios.put(
        `${API_URL}/testseries-bundles/${id}?isAdmin=true`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Swal.fire("Success", "Bundle updated successfully", "success");
        navigate("/all-test-series-bundle");
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Failed to update bundle", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white">
          <h2 className="text-2xl md:text-3xl font-bold">Edit Test Series Bundle</h2>
          <p className="mt-2 text-indigo-100">Update bundle details and included tests</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-7">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bundle Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Original Price (₹) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (discountPercent) calculateFromDiscountPercent(discountPercent);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount Price (₹)</label>
              <input
                type="number"
                min="0"
                value={discountPrice}
                onChange={(e) => {
                  setDiscountPrice(e.target.value);
                  calculateFromDiscountPrice(e.target.value);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Discount (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => {
                  setDiscountPercent(e.target.value);
                  calculateFromDiscountPercent(e.target.value);
                }}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Savings preview */}
          {price && discountPrice && Number(discountPrice) < Number(price) && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl">
              Savings: ₹{Math.round(Number(price) - Number(discountPrice))} ({discountPercent}%)
            </div>
          )}

          {/* GST */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GST (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={gst}
              onChange={(e) => setGst(e.target.value)}
              className="w-full md:w-1/3 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
            />
          </div>

          {/* Test Series Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Included Test Series <span className="text-red-600">*</span>
              </label>
              <span className="text-sm text-gray-600">{selectedSeries.length} selected</span>
            </div>

            <div className="max-h-72 overflow-y-auto border rounded-xl bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {testSeries.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                    selectedSeries.includes(item.id)
                      ? "bg-indigo-50 border-indigo-300"
                      : "bg-white border-gray-200 hover:bg-indigo-50/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSeries.includes(item.id)}
                    onChange={() => {
                      setSelectedSeries((prev) =>
                        prev.includes(item.id)
                          ? prev.filter((i) => i !== item.id)
                          : [...prev, item.id]
                      );
                    }}
                    className="mt-1 h-5 w-5 text-indigo-600 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ₹{item.price}
                      {item.discountPrice && (
                        <span className="text-green-600 ml-2">→ ₹{item.discountPrice}</span>
                      )}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-5 h-5 animate-spin" />}
              {saving ? "Saving..." : "Update Bundle"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/all-test-series-bundle")}
              className="flex-1 px-6 py-3.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTestSeriesBundle;