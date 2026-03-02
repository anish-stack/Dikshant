import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Loader2, Eye, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_URL = "https://www.app.api.dikshantias.com/api";

const AllQuizBundle = () => {
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        Swal.fire("Error", "Please login to continue", "error");
        navigate("/login");
        return;
      }

      const res = await axios.get(`${API_URL}/quiz-bundles?isAdmin=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setBundles(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load quiz bundles:", error);
      Swal.fire("Error", "Could not load quiz bundles. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBundles();
  }, []);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: "Delete Quiz Bundle?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_URL}/quiz-bundles/${id}?isAdmin=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "Quiz bundle deleted successfully",
        timer: 1500,
      });

      fetchBundles(); // Refresh
    } catch (error) {
      Swal.fire("Error", "Failed to delete quiz bundle", "error");
    }
  };

  const handleView = (bundle) => {
    Swal.fire({
      title: bundle.title,
      html: `
        <div class="text-left space-y-3 text-gray-800 text-sm">
          <p><strong>Description:</strong> ${bundle.description || "No description provided"}</p>
          <p><strong>Original Price:</strong> ₹${bundle.price || 0}</p>
          ${
            bundle.discountPrice
              ? `<p><strong>Discount Price:</strong> ₹${bundle.discountPrice} 
                 <span class="text-green-600">(${Math.round(((bundle.price - bundle.discountPrice) / bundle.price) * 100)}% off)</span></p>`
              : ""
          }
          <p><strong>GST:</strong> ${bundle.gst || 0}%</p>
          <p><strong>Display Order:</strong> ${bundle.displayOrder || 0}</p>
          <p><strong>Status:</strong> ${
            bundle.isActive
              ? '<span class="text-green-600 font-medium">Active</span>'
              : '<span class="text-red-600 font-medium">Inactive</span>'
          }</p>
          <p><strong>Created:</strong> ${new Date(bundle.createdAt).toLocaleString("en-IN")}</p>
          ${
            bundle.expirBundle
              ? `<p><strong>Expires:</strong> ${new Date(bundle.expirBundle).toLocaleDateString("en-IN")}</p>`
              : ""
          }
          <hr class="my-4 border-gray-300">
          <h4 class="font-bold text-base">Included Quizzes (${bundle.quizzes?.length || 0})</h4>
          <ul class="list-disc pl-6 space-y-1">
            ${bundle.quizzes
              ?.map(
                (q) => `
                  <li>
                    ${q.title} 
                    <span class="text-gray-600">
                      (${q.totalQuestions || 0} Qs • ${q.durationMinutes || 0} min)
                      ${q.price ? ` • ₹${q.price}` : ""}
                      ${q.isFree ? " • <span class='text-green-600'>Free</span>" : ""}
                    </span>
                  </li>`
              )
              .join("") || "<li class='text-gray-500'>No quizzes included</li>"}
          </ul>
        </div>
      `,
      width: window.innerWidth < 640 ? "90%" : "720px",
      confirmButtonColor: "#6366f1",
      confirmButtonText: "Close",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading quiz bundles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">All Quiz Bundles</h1>
          <button
            onClick={() => navigate("/create-quiz-bundle")}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition shadow-md flex items-center gap-2"
          >
            + Create New Quiz Bundle
          </button>
        </div>

        {bundles.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-10 text-center">
            <p className="text-gray-600 text-lg mb-4">No quiz bundles found</p>
            <button
              onClick={() => navigate("/create-quiz-bundle")}
              className="text-indigo-600 hover:underline font-medium"
            >
              Create your first quiz bundle →
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Title</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Discount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Quizzes</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {bundles.map((bundle) => (
                    <tr key={bundle.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{bundle.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(bundle.createdAt).toLocaleDateString("en-IN")}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        ₹{bundle.price || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {bundle.discountPrice ? (
                          <div>
                            <span className="text-green-600 font-medium">₹{bundle.discountPrice}</span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({Math.round(((bundle.price - bundle.discountPrice) / bundle.price) * 100)}% off)
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {bundle.quizzes?.length || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            bundle.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {bundle.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-4">
                          <button
                            onClick={() => handleView(bundle)}
                            className="text-blue-600 hover:text-blue-800 transition"
                            title="View Details"
                          >
                            <Eye size={20} />
                          </button>

                          <button
                            onClick={() => navigate(`/edit-quiz-bundle/${bundle.id}`)}
                            className="text-indigo-600 hover:text-indigo-800 transition"
                            title="Edit Bundle"
                          >
                            <Edit size={20} />
                          </button>

                          <button
                            onClick={() => handleDelete(bundle.id)}
                            className="text-red-600 hover:text-red-800 transition"
                            title="Delete Bundle"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllQuizBundle;