import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2 } from "lucide-react";

const API_URL = "https://www.app.api.dikshantias.com//api";

const CreateTestSeriesBundle = () => {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [gst, setGst] = useState("");
  const [description, setDescription] = useState("");
  const [testSeries, setTestSeries] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch test series
  const fetchTestSeries = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API_URL}/testseriess?isAdmin=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setTestSeries(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load test series:", error);
    }
  };

  useEffect(() => {
    fetchTestSeries();
  }, []);

  // Checkbox toggle
  const handleCheckboxChange = (id) => {
    setSelectedSeries((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── FIXED Discount Calculators ──
  const calculateFromDiscountPrice = (discPriceStr) => {
    const discPrice = Number(discPriceStr);
    const original = Number(price);

    if (!original || isNaN(original) || original <= 0) return;

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

    if (!original || isNaN(original) || original <= 0) return;

    if (isNaN(percent) || percent < 0 || percent > 100) {
      Swal.fire("Warning", "Discount % must be between 0 and 100", "warning");
      setDiscountPercent("");
      setDiscountPrice("");
      return;
    }

    const discountAmount = original * (percent / 100);
    const finalPrice = original - discountAmount;

    // Round to nearest whole number (common for pricing in India)
    setDiscountPrice(Math.round(finalPrice).toString());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      return Swal.fire("Error", "Bundle title is required", "error");
    }
    if (selectedSeries.length === 0) {
      return Swal.fire("Error", "Select at least one test series", "error");
    }
    if (!price || Number(price) <= 0) {
      return Swal.fire("Error", "Original price must be > 0", "error");
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");

      const payload = {
        title: title.trim(),
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        gst: gst ? Number(gst) : 0,
        description: description.trim() || null,
        testSeriesIds: selectedSeries,
      };

      const res = await axios.post(
        `${API_URL}/testseries-bundles?isAdmin=true`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        Swal.fire({
          icon: "success",
          title: "Success",
          text: "Bundle created successfully",
          timer: 1800,
        });

        // Reset form
        setTitle("");
        setPrice("");
        setDiscountPrice("");
        setDiscountPercent("");
        setGst("");
        setDescription("");
        setSelectedSeries([]);
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Failed",
        text: error.response?.data?.message || "Could not create bundle",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-8 py-6 text-white">
          <h2 className="text-2xl md:text-3xl font-bold">Create Test Series Bundle</h2>
          <p className="mt-2 text-indigo-100">Group multiple tests with attractive pricing</p>
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="e.g. UPSC 2026 Full Mock Series Bundle"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="999"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={discountPrice}
                onChange={(e) => {
                  setDiscountPrice(e.target.value);
                  calculateFromDiscountPrice(e.target.value);
                }}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="799"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount (%)
              </label>
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
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="20"
              />
            </div>
          </div>

          {/* Savings Preview */}
          {price && discountPrice && Number(discountPrice) < Number(price) && (
            <div className="text-sm text-green-700 bg-green-50 p-3 rounded-xl">
              You save <strong>₹{Math.round(Number(price) - Number(discountPrice))}</strong> (
              {discountPercent}%)
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
              className="w-full md:w-1/3 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="18"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-y"
              placeholder="What this bundle includes, validity, benefits, target exams..."
            />
          </div>

          {/* Test Series Selection */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Test Series <span className="text-red-600">*</span>
              </label>
              <span className="text-sm text-gray-600">
                {selectedSeries.length} selected
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-xl bg-gray-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {testSeries.length === 0 ? (
                <p className="text-gray-500 col-span-2 text-center py-10">
                  No test series available
                </p>
              ) : (
                testSeries.map((item) => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer hover:bg-indigo-50/40 ${
                      selectedSeries.includes(item.id)
                        ? "bg-indigo-50 border-indigo-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeries.includes(item.id)}
                      onChange={() => handleCheckboxChange(item.id)}
                      className="mt-1 h-5 w-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.price && (
                        <p className="text-sm text-gray-600 mt-1">
                          ₹{item.price}
                          {item.discountPrice && (
                            <span className="text-green-600 ml-2">
                              → ₹{item.discountPrice}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3.5 rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Creating..." : "Create Bundle"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateTestSeriesBundle;