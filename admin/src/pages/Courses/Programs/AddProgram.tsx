import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import Input from "../../../components/form/input/InputField";
import Form from "../../../components/form/Form";
import Label from "../../../components/form/Label";
import { API_URL } from "../../../constant/constant";
import { Loader2, Upload, Image as ImageIcon, ArrowLeft } from "lucide-react";
// const COURSE_TYPES = ["Offline", "Online", "Recorded", "Live"] as const;

// type CourseType = (typeof COURSE_TYPES)[number];

interface ProgramFormData {
  name: string;
  slug: string;
  description: string;
  // typeOfCourse: CourseType;
  position: string;
}

const AddProgram = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProgramFormData>({
    name: "",
    slug: "",
    description: "",
    // typeOfCourse: "Online", // ✅ backend default
    position: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  // Generate slug
  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: value,
      slug: generateSlug(value),
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();

    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    toast.success("Image selected");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error("Program name is required");
    if (!formData.slug.trim()) return toast.error("Slug is required");
    if (!formData.position.trim()) return toast.error("Position is required");

    if (!imageFile) return toast.error("Upload a program image");

    setSubmitting(true);
    const loadingToast = toast.loading("Creating program...");

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("slug", formData.slug);
      data.append("description", formData.description);
      // data.append("typeOfCourse", formData.typeOfCourse);
      data.append("imageUrl", imageFile);

      await axios.post(`${API_URL}/programs`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Program created successfully!", { id: loadingToast });
      navigate("/all-programs");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create program", {
        id: loadingToast,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Add New Program | Admin Dashboard"
        description="Create a new program"
      />
      <PageBreadcrumb pageTitle="Add New Program" />

      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 p-6 lg:p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Add New Program
              </h1>
              <p className="text-gray-600 mt-1">
                Fill in the details to create a new program
              </p>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </div>

          {/* Form */}
          <Form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label>Program Name</Label>
                <Input
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="e.g. IAS Foundation 2025"
                />
              </div>

              <div>
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  placeholder="ias-foundation-2025"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated from the name. You can modify it.
                </p>
              </div>
            </div>
            {/* <div>
              <Label>Type Of Course</Label>

              <select
                value={formData.typeOfCourse}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    typeOfCourse: e.target.value as CourseType,
                  })
                }
                className="w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden"
                required
              >
                {COURSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div> */}

            <div>
              <Label>Position</Label>
              <Input
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: e.target.value })
                }
                placeholder="Place What u Show eg 1,2,3,4 ....."
              />
            </div>

            {/* Description */}
            <div className="mt-6">
              <Label>Description</Label>
              <textarea
                value={formData.description ?? ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden"
                placeholder="Describe the program, its features, target audience, etc..."
                rows={6}
              />
            </div>

            {/* Image Upload */}
            <div className="mt-8">
              <Label>Program Image</Label>

              <div className="mt-3">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full max-w-md h-64 object-cover rounded-xl border"
                    />

                    {/* Change button */}
                    <label
                      htmlFor="image-upload"
                      className="absolute bottom-3 right-3 bg-black/70 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-black/80 flex items-center gap-2 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      Change Image
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
                  >
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600 mt-3">
                      Click to upload image
                    </p>
                    <p className="text-xs text-gray-500">
                      JPG, PNG, WEBP up to 5MB
                    </p>
                  </label>
                )}

                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  required
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-10 flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                {submitting ? "Creating..." : "Create Program"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin/programs")}
                className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </Form>
        </div>
      </div>
    </>
  );
};

export default AddProgram;
