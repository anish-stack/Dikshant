import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Form from "../../../components/form/Form";
import Label from "../../../components/form/Label";
import {
  Loader2,
  Upload,
  ArrowLeft,
  Image as ImageIcon,
  Calculator,
  Check,
  Search,
  AlertCircle,
  ChevronDown,
} from "lucide-react";

const BATCH_API = "https://www.dikapi.olyox.in/api/batchs";
const SUBJECTS_API = "https://www.dikapi.olyox.in/api/subjects";
const PROGRAMS_API = "https://www.dikapi.olyox.in/api/programs";

interface Subject {
  id: number;
  name: string;
  slug: string;
  description?: string;
}

interface Program {
  id: number;
  name: string;
  slug: string;
}

const CreateBatch = () => {
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [subjectsError, setSubjectsError] = useState<string | null>(null);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectsDropdownOpen, setSubjectsDropdownOpen] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);

  const [isEmi, setIsEmi] = useState(false);
  const [emiMonths, setEmiMonths] = useState(2);
  const [emiSchedule, setEmiSchedule] = useState<
    Array<{ month: number; amount: number }>
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    displayOrder: 1,
    programId: "",
    startDate: "",
    endDate: "",
    registrationStartDate: "",
    registrationEndDate: "",
    status: "active" as const,
    shortDescription: "",
    longDescription: "",
    batchPrice: 0,
    batchDiscountPrice: 0,
    gst: 18,
    offerValidityDays: 0,
    category: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const finalPrice =
    formData.batchDiscountPrice > 0
      ? formData.batchDiscountPrice
      : formData.batchPrice;

  // Auto-calculate EMI schedule
  useEffect(() => {
    if (!isEmi || emiMonths < 1 || finalPrice <= 0) {
      setEmiSchedule([]);
      return;
    }

    const monthly = Math.round(finalPrice / emiMonths);
    const schedule = Array.from({ length: emiMonths }, (_, i) => ({
      month: i + 1,
      amount: i === emiMonths - 1 ? finalPrice - monthly * i : monthly,
    }));
    setEmiSchedule(schedule);
  }, [isEmi, emiMonths, finalPrice]);

  const totalEmi = emiSchedule.reduce((sum, item) => sum + item.amount, 0);

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      setLoadingSubjects(true);
      setSubjectsError(null);

      try {
        const res = await axios.get<Subject[]>(SUBJECTS_API);
        setAllSubjects(res.data);
      } catch (err: any) {
        const errorMsg =
          err.response?.data?.message || "Failed to load subjects";
        setSubjectsError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const res = await axios.get(PROGRAMS_API);
        // console.log("res",res)
        setPrograms(res.data?.data);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
      }
    };

    fetchPrograms();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error("Batch name is required");
      return;
    }

    if (!formData.programId) {
      toast.error("Program ID is required");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      toast.error("Please select at least one subject");
      return;
    }

    if (!imageFile) {
      toast.error("Please upload a batch image");
      return;
    }

    if (formData.batchPrice <= 0) {
      toast.error("Please enter a valid batch price");
      return;
    }

    if (!formData.category) {
  toast.error("Please select a batch category");
  return;
}


    setSubmitting(true);
    const loadingToast = toast.loading("Creating batch...");

    try {
      const data = new FormData();
      data.append("name", formData.name.trim());
      data.append("displayOrder", formData.displayOrder.toString());
      data.append("programId", formData.programId);
      data.append("category", formData.category);
      data.append("subjectId", JSON.stringify(selectedSubjectIds));
      data.append("startDate", formData.startDate);
      data.append("endDate", formData.endDate);
      data.append("registrationStartDate", formData.registrationStartDate);
      data.append("registrationEndDate", formData.registrationEndDate);
      data.append("status", formData.status);
      data.append("shortDescription", formData.shortDescription.trim());
      data.append("longDescription", formData.longDescription.trim());
      data.append("batchPrice", formData.batchPrice.toString());


      if (formData.batchDiscountPrice > 0) {
        data.append(
          "batchDiscountPrice",
          formData.batchDiscountPrice.toString()
        );
      }

      data.append("gst", formData.gst.toString());

      if (formData.offerValidityDays > 0) {
        data.append("offerValidityDays", formData.offerValidityDays.toString());
      }

      data.append("isEmi", isEmi.toString());
      if (isEmi && emiSchedule.length > 0) {
        data.append("emiTotal", totalEmi.toString());
        data.append("emiSchedule", JSON.stringify(emiSchedule));
      }

      data.append("imageUrl", imageFile);

      await axios.post(BATCH_API, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Batch created successfully!", { id: loadingToast });
      navigate("/all-courses");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to create batch";
      toast.error(errorMsg, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubjects = allSubjects.filter((s) =>
    s.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  return (
    <>
      <PageMeta title="Create New Batch" description="Create New Batch" />
      <PageBreadcrumb pageTitle="Create New Batch" />

      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <Link
          to="/all-courses"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batches
        </Link>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
          <h1 className="text-xl font-bold mb-6">Create New Batch</h1>

          <Form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Batch Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="text-sm"
                    placeholder="e.g., UPSC 2025 Batch"
                  />
                </div>
                <div>
                  <Label className="text-sm">Display Order</Label>
                  <Input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: parseInt(e.target.value) || 1,
                      })
                    }
                    className="text-sm"
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Program</Label>
                <select
                  value={formData.programId}
                  onChange={(e) =>
                    setFormData({ ...formData, programId: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">Select Program</option>
                  {programs &&
                    programs.map((program) => (
                      <option key={program.id} value={program.id}>
                        {program.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <Label className="text-sm">Batch Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                >
                  <option value="">Select Category</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="recorded">Recorded</option>
                </select>
              </div>
            </div>

            {/* Subjects Multi-Select */}
            <div className="mb-6">
              <Label className="text-sm">
                Subjects{" "}
                <span className="text-xs text-gray-500">
                  ({selectedSubjectIds.length} selected)
                </span>
              </Label>

              {subjectsError ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
                      Failed to load subjects
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      {subjectsError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setSubjectsDropdownOpen(!subjectsDropdownOpen)
                    }
                    disabled={loadingSubjects}
                    className="w-full px-3 py-2 text-sm text-left border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 flex justify-between items-center hover:border-gray-400 dark:hover:border-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="truncate">
                      {loadingSubjects
                        ? "Loading subjects..."
                        : selectedSubjectIds.length === 0
                        ? "Select subjects..."
                        : selectedSubjectIds
                            .map(
                              (id) => allSubjects.find((s) => s.id === id)?.name
                            )
                            .filter(Boolean)
                            .join(", ")}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        subjectsDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {subjectsDropdownOpen && !loadingSubjects && (
                    <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-99999 max-h-80 overflow-hidden">
                      <div className="p-2 sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <Input
                            placeholder="Search subjects..."
                            value={subjectSearch}
                            onChange={(e) => setSubjectSearch(e.target.value)}
                            className="pl-9 text-sm"
                          />
                        </div>
                      </div>

                      <div className="max-h-64 overflow-y-auto py-1">
                        {filteredSubjects.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-gray-500">
                            No subjects found
                          </div>
                        ) : (
                          filteredSubjects.map((subject) => {
                            const isSelected = selectedSubjectIds.includes(
                              subject.id
                            );
                            return (
                              <label
                                key={subject.id}
                                className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                              >
                                <div
                                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                                    isSelected
                                      ? "bg-indigo-600 border-indigo-600"
                                      : "border-gray-300 dark:border-gray-600"
                                  }`}
                                >
                                  {isSelected && (
                                    <Check className="w-3 h-3 text-white" />
                                  )}
                                </div>
                                <div
                                  className="flex-1 min-w-0"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setSelectedSubjectIds((prev) =>
                                      prev.includes(subject.id)
                                        ? prev.filter((id) => id !== subject.id)
                                        : [...prev, subject.id]
                                    );
                                  }}
                                >
                                  <div className="font-medium text-sm">
                                    {subject.name}
                                  </div>
                                  {subject.description && (
                                    <div className="text-xs text-gray-500 line-clamp-1">
                                      {subject.description}
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>

                      {selectedSubjectIds.length > 0 && (
                        <div className="p-2 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                          <button
                            type="button"
                            onClick={() => setSelectedSubjectIds([])}
                            className="text-xs text-red-600 hover:text-red-700 font-medium"
                          >
                            Clear all ({selectedSubjectIds.length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Registration Start</Label>
                  <Input
                    type="date"
                    value={formData.registrationStartDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationStartDate: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-sm">Registration End</Label>
                  <Input
                    type="date"
                    value={formData.registrationEndDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        registrationEndDate: e.target.value,
                      })
                    }
                    className="text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <Label className="text-sm">Status</Label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="upcoming">Upcoming</option>
              </select>
            </div>

            {/* Descriptions */}
            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-sm">Short Description</Label>
                <TextArea
                  value={formData.shortDescription}
                  onChange={(value) =>
                    setFormData({ ...formData, shortDescription: value })
                  }
                  rows={2}
                  className="text-sm"
                  placeholder="Brief description of the batch"
                />
              </div>
              <div>
                <Label className="text-sm">Long Description</Label>
                <TextArea
                  value={formData.longDescription}
                  onChange={(value) =>
                    setFormData({ ...formData, longDescription: value })
                  }
                  rows={3}
                  className="text-sm"
                  placeholder="Detailed description (optional)"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm">Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.batchPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batchPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <Label className="text-sm">Discount Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.batchDiscountPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        batchDiscountPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="text-sm"
                    min="0"
                  />
                </div>
                <div>
                  <Label className="text-sm">GST (%)</Label>
                  <Input
                    type="number"
                    value={formData.gst}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst: parseFloat(e.target.value) || 18,
                      })
                    }
                    className="text-sm"
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Offer Validity (Days)</Label>
                <Input
                  type="number"
                  value={formData.offerValidityDays}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      offerValidityDays: parseInt(e.target.value) || 0,
                    })
                  }
                  className="text-sm"
                  min="0"
                  placeholder="0 = no expiry"
                />
              </div>
            </div>

            {/* EMI Section */}
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg mb-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="isEmi"
                  checked={isEmi}
                  onChange={(e) => setIsEmi(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <Label
                  htmlFor="isEmi"
                  className="text-sm font-semibold cursor-pointer flex items-center gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Enable EMI Payment
                </Label>
              </div>

              {isEmi && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">EMI Tenure</Label>
                      <select
                        value={emiMonths}
                        onChange={(e) => setEmiMonths(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        {[2, 3, 4, 5, 6, 7, 8, 9, 12, 18, 24].map((m) => (
                          <option key={m} value={m}>
                            {m} months
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm">Monthly EMI</Label>
                      <div className="px-3 py-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 text-sm font-semibold text-indigo-600">
                        ₹
                        {emiSchedule.length > 0
                          ? Math.round(finalPrice / emiMonths).toLocaleString(
                              "en-IN"
                            )
                          : 0}
                      </div>
                    </div>
                  </div>

                  {emiSchedule.length > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                      <h4 className="text-sm font-semibold mb-3">
                        EMI Schedule
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {emiSchedule.map((item, i) => (
                          <div
                            key={i}
                            className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs"
                          >
                            <span className="text-gray-600 dark:text-gray-400">
                              Month {item.month}
                            </span>
                            <div className="font-semibold mt-1">
                              ₹{item.amount.toLocaleString("en-IN")}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex justify-between text-sm font-bold">
                        <span>Total</span>
                        <span className="text-indigo-600">
                          ₹{totalEmi.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Image Upload */}
            <div className="mb-6">
              <Label className="text-sm">Batch Image</Label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative inline-block w-full max-w-md">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                    />
                    <label
                      htmlFor="image-upload"
                      className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-2 text-xs font-medium transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Change
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-400 dark:hover:border-gray-600 transition bg-gray-50 dark:bg-gray-800/30"
                  >
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Click to upload image
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PNG, JPG up to 5MB
                    </span>
                  </label>
                )}
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
              <button
                type="submit"
                disabled={submitting || loadingSubjects}
                className="px-6 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Creating..." : "Create Batch"}
              </button>
              <Link to="/all-courses">
                <button
                  type="button"
                  className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
              </Link>
            </div>
          </Form>
        </div>
      </div>
    </>
  );
};

export default CreateBatch;
