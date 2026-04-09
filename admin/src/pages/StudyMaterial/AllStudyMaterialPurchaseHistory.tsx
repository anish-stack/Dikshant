import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_URL } from "../../constant/constant";

const AllStudyMaterialPurchaseHistory: React.FC = () => {

  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {

      const res = await axios.get(`${API_URL}/study-materials/purchases`);

      setPurchases(res.data.data || []);

    } catch (error) {

      toast.error("Failed to load purchase history");

    } finally {

      setLoading(false);

    }
  };

  if (loading)
    return (
      <div className="p-10 text-center text-lg">
        Loading purchase history...
      </div>
    );

  return (

    <div className="p-6 max-w-7xl mx-auto">

      <h1 className="text-3xl font-bold mb-8">
        Study Material Purchase & Assignment History
      </h1>

      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="w-full text-sm">

          <thead className="bg-gray-100">

            <tr>

              <th className="px-6 py-4 text-left">User</th>
              <th className="px-6 py-4 text-left">Material</th>
              <th className="px-6 py-4 text-left">Category</th>
              <th className="px-6 py-4 text-left">Type</th>
              <th className="px-6 py-4 text-left">Price</th>
              <th className="px-6 py-4 text-left">Access</th>
              <th className="px-6 py-4 text-left">Expiry</th>
              <th className="px-6 py-4 text-left">Status</th>
              <th className="px-6 py-4 text-left">Date</th>

            </tr>

          </thead>

          <tbody>

            {purchases.map((p) => (

              <tr key={p.id} className="border-t hover:bg-gray-50">

                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium">
                      {p.user?.name || "Unknown"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {p.user?.email}
                    </p>
                  </div>
                </td>

                <td className="px-6 py-4 font-medium">
                  {p.material?.title}
                </td>

                <td className="px-6 py-4 text-gray-600">
                  {p.material?.category?.name}
                </td>

                <td className="px-6 py-4">

                  {p.paymentId === "admin-assigned" ? (

                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">
                      Admin Assigned
                    </span>

                  ) : (

                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
                      Paid
                    </span>

                  )}

                </td>

                <td className="px-6 py-4">

                  {p.purchasePrice > 0
                    ? `₹${p.purchasePrice}`
                    : "Free"}

                </td>

                <td className="px-6 py-4 capitalize">
                  {p.accessType}
                </td>

                <td className="px-6 py-4">

                  {p.expiryDate
                    ? new Date(p.expiryDate).toLocaleDateString()
                    : "-"}

                </td>

                <td className="px-6 py-4">

                  {p.isActive ? (

                    <span className="text-green-600 font-medium">
                      Active
                    </span>

                  ) : (

                    <span className="text-red-500 font-medium">
                      Revoked
                    </span>

                  )}

                </td>

                <td className="px-6 py-4 text-gray-500">

                  {new Date(p.createdAt).toLocaleDateString()}

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );
};

export default AllStudyMaterialPurchaseHistory;