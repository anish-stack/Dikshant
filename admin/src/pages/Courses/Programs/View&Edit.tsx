import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Form from "../../../components/form/Form";
import Label from "../../../components/form/Label";
import { API_URL } from "../../../constant/constant";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";

const ViewEdit = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get("type"); // "edit" or "view"
  const id = searchParams.get("id");

  const isViewMode = type === "view";
  const isEditMode = type === "edit";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fields, setFields] = useState({
    name: "",
    slug: "",
    description: "",
    position: "",
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");

  // Fetch program details
  const fetchProgram = useCallback(async () => {
    if (!id) {
      toast.error("No program ID provided");
      navigate(-1);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/programs/${id}`);
      const data = res.data;

      setFields({
        name: data.name || "",
        slug: data.slug || "",
        description: data.description || "",
        position: data?.position || "",
        imageUrl: data.imageUrl || "",
      });

      setImagePreview(data.imageUrl || "");
    } catch (error: unknown) {
      let message = "Failed to load program";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      toast.error(message);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    toast.success("Image selected");
  };

  // Auto generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFields((prev) => ({
      ...prev,
      name: value,
      slug:
        prev.slug === generateSlug(prev.name) ? generateSlug(value) : prev.slug,
    }));
  };

  // Submit update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fields.name.trim()) {
      toast.error("Program name is required");
      return;
    }

    if (!fields.slug.trim()) {
      toast.error("Slug is required");
      return;
    }

    setSubmitting(true);
    const loadingToast = toast.loading("Updating program...");

    try {
      const formData = new FormData();
      formData.append("name", fields.name);
      formData.append("slug", fields.slug);
      formData.append("description", fields.description || "");
      formData.append("position", fields.position || "");

      if (imageFile) {
        formData.append("imageUrl", imageFile);
      }

      await axios.put(`${API_URL}/programs/${id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Program updated successfully!", { id: loadingToast });
      navigate("/all-programs");
    } catch (error: unknown) {
      let message = "Failed to update program";

      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }

      toast.error(message, { id: loadingToast });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`${isEditMode ? "Edit" : "View"} Program`}
        description="View or edit program details"
      />
      <PageBreadcrumb
        pageTitle={`${isEditMode ? "Edit" : "View"} Program - ${
          fields.name || "Loading..."
        }`}
      />

      <div className="max-w-7xl mx-auto">
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Program" : "Program Details"}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isEditMode
                ? "Make changes to the program details below"
                : "You are viewing this program in read-only mode"}
            </p>
          </div>

          <Form onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <Label>Program Name</Label>
                <Input
                  value={fields.name}
                  onChange={handleNameChange}
                  placeholder="Enter program name"
                  disabled={isViewMode}
                />
              </div>

              {/* Slug */}
              <div>
                <Label>Slug (URL)</Label>
                <Input
                  value={fields.slug}
                  onChange={(e) =>
                    setFields({ ...fields, slug: e.target.value })
                  }
                  placeholder="program-slug"
                  disabled={isViewMode}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated from name. Edit if needed.
                </p>
              </div>
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={fields.position}
                onChange={(e) =>
                  setFields({ ...fields, position: e.target.value })
                }
                disabled={isViewMode}
                placeholder="Place What u Show eg 1,2,3,4 ....."
              />
            </div>

            {/* Description */}
            <div className="mt-6">
              <Label>Description</Label>
              <TextArea
                value={fields.description}
                onChange={(value) =>
                  setFields({ ...fields, description: value })
                }
                placeholder="Describe the program..."
                rows={6}
                disabled={isViewMode}
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
                      className="w-full  h-64 object-cover rounded-xl border border-gray-200"
                    />
                    {!isViewMode && (
                      <label
                        htmlFor="image-upload"
                        className="absolute bottom-3 right-3 bg-black/70 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-black/80 flex items-center gap-2 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Change Image
                      </label>
                    )}
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className={`flex flex-col items-center justify-center w-full max-w-md h-64 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isViewMode
                        ? "border-gray-300 bg-gray-50 opacity-60 cursor-not-allowed"
                        : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-3 text-gray-500">
                      <ImageIcon className="w-12 h-12" />
                      <p className="text-sm">
                        {isViewMode
                          ? "No image uploaded"
                          : "Click to upload image"}
                      </p>
                      {!isViewMode && (
                        <p className="text-xs">PNG, JPG up to 5MB</p>
                      )}
                    </div>
                  </label>
                )}

                {!isViewMode && (
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-10 flex gap-4">
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Updating..." : "Update Program"}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                {isViewMode ? "Back" : "Cancel"}
              </button>
            </div>
          </Form>
        </div>
      </div>
    </>
  );
};

export default ViewEdit;
