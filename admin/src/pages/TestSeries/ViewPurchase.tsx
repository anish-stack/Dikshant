import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import {
  Loader2,
  ArrowLeft,
  Users,
  IndianRupee,
  Calendar,
  CheckCircle,
  CreditCard,
  User,
} from "lucide-react";
import { API_URL } from "../../constant/constant";

interface Purchase {
  id: number;
  userId: number;
  amount: number;
  totalAmount: number;
  razorpayPaymentId: string;
  status: string;
  paymentDate: string;
  user: {
    id: number;
    name: string;
    email: string;
    mobile: string;
  };
}

interface ApiResponse {
  success: boolean;
  testSeries: {
    id: number;
    title: string;
    price: number;
    discountPrice: number;
  };
  data: Purchase[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ViewPurchase = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ApiResponse | null>(null);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const res = await axios.get(`${API_URL}/testseriess/payments/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setResponse(res.data);
        } else {
          toast.error("Failed to load purchases");
        }
      } catch (err) {
        toast.error("Error loading purchases");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPurchases();
  }, [id]);

  const formatDateTime = (dateString: string) =>
    new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const totalRevenue = response?.data.reduce((sum, p) => sum + p.totalAmount, 0) || 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!response || response.data.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Users className="w-20 h-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {response?.testSeries.title || "Test Series"}
            </h2>
            <p className="text-lg text-gray-600">No purchases yet</p>
            <p className="text-sm text-gray-500 mt-2">
              No students have enrolled in this test series.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <h1 className="text-3xl font-bold text-gray-800">
            Enrollments & Payments
          </h1>
          <p className="text-xl text-blue-600 font-semibold mt-2">
            {response.testSeries.title}
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <Users className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Total Enrollments</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {response.pagination.total}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <IndianRupee className="w-10 h-10 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Regular Price</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₹{response.testSeries.price}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <IndianRupee className="w-10 h-10 text-orange-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Discount Price</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              ₹{response.testSeries.discountPrice || response.testSeries.price}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6 text-center">
            <IndianRupee className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Total Revenue</p>
            <p className="text-3xl font-bold text-purple-700 mt-2">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              Payment Records
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Student
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Amount Paid
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Payment Date
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">
                    Transaction ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {response.data.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {purchase.user.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {purchase.user.email}
                          </p>
                          <p className="text-xs text-gray-400">
                            {purchase.user.mobile}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-green-600" />
                        <span className="font-bold text-lg text-gray-900">
                          ₹{purchase.totalAmount}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateTime(purchase.paymentDate)}</span>
                      </div>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Success
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <code className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg text-gray-700 font-mono">
                        {purchase.razorpayPaymentId}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {response.pagination.totalPages > 1 && (
            <div className="p-6 border-t flex justify-center">
              <p className="text-sm text-gray-600">
                Page {response.pagination.page} of {response.pagination.totalPages}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewPurchase;