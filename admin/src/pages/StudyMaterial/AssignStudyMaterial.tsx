import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { API_URL } from "../../constant/constant";

const AssignStudyMaterial: React.FC = () => {

  const [materials, setMaterials] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  const [accessType, setAccessType] = useState("lifetime");
  const [expiryDate, setExpiryDate] = useState("");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const res = await axios.get(`${API_URL}/study-materials/materials`);
      setMaterials(res.data.data || []);
    } catch {
      toast.error("Failed to load materials");
    }
  };

  const fetchUsers = async (searchTerm = "") => {
    try {
      const res = await axios.get(`${API_URL}/auth/all-profile`, {
        params: { search: searchTerm, limit: 50 }
      });
      setUsers(res.data.data || []);
    } catch {
      toast.error("Failed to load users");
    }
  };

  useEffect(() => {
    fetchUsers(search);
  }, [search]);

  const handleAssign = async () => {

    if (!selectedMaterial || !selectedUser) {
      toast.error("Please select material and user");
      return;
    }

    if (accessType === "limited" && !expiryDate) {
      toast.error("Please select expiry date");
      return;
    }

    setLoading(true);

    try {

      await axios.post(`${API_URL}/study-materials/materials/assign`, {
        userId: selectedUser,
        materialId: selectedMaterial,
        accessType,
        expiryDate: accessType === "limited" ? expiryDate : null
      });

      toast.success("Material assigned successfully!");

      setSelectedMaterial("");
      setSelectedUser("");
      setAccessType("lifetime");
      setExpiryDate("");

    } catch (error: any) {
      toast.error(error.response?.data?.message || "Assignment failed");
    } finally {
      setLoading(false);
    }

  };

  return (

    <div className="p-8 max-w-5xl mx-auto">

      <h1 className="text-3xl font-bold mb-10">
        Assign Study Material
      </h1>

      <div className="grid md:grid-cols-2 gap-10">

        {/* MATERIAL SELECT */}

        <div>

          <label className="block font-medium mb-2">
            Select Material
          </label>

          <select
            value={selectedMaterial}
            onChange={(e) => setSelectedMaterial(e.target.value)}
            className="w-full border rounded-xl p-4"
          >

            <option value="">Choose Material</option>

            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title} {m.isPaid ? `(₹${m.price})` : "(Free)"}
              </option>
            ))}

          </select>

        </div>


        {/* ACCESS TYPE */}

        <div>

          <label className="block font-medium mb-2">
            Access Type
          </label>

          <select
            value={accessType}
            onChange={(e) => setAccessType(e.target.value)}
            className="w-full border rounded-xl p-4"
          >

            <option value="lifetime">
              Lifetime Access
            </option>

            <option value="limited">
              Limited Access
            </option>

          </select>

        </div>

      </div>


      {/* EXPIRY DATE */}

      {accessType === "limited" && (

        <div className="mt-6">

          <label className="block font-medium mb-2">
            Expiry Date
          </label>

          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full border rounded-xl p-4"
          />

        </div>

      )}


      {/* USER SEARCH */}

      <div className="mt-8">

        <label className="block font-medium mb-3">
          Search User
        </label>

        <div className="relative mb-4">

          <Search className="absolute left-3 top-3 text-gray-400" />

          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 p-3 border rounded-xl"
          />

        </div>

        <div className="max-h-80 overflow-auto border rounded-xl">

          {users.length === 0 && (
            <p className="p-6 text-center text-gray-500">
              No users found
            </p>
          )}

          {users.map((user) => (

            <div
              key={user.id}
              onClick={() => setSelectedUser(user.id)}
              className={`p-4 border-b cursor-pointer flex gap-3 items-center
              ${selectedUser === user.id ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >


              <div>

                <p className="font-medium">
                  {user.name || user.email}
                </p>

                <p className="text-sm text-gray-500">
                  {user.email}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>


      {/* ASSIGN BUTTON */}

      <button
        onClick={handleAssign}
        disabled={loading}
        className="mt-10 w-full bg-green-600 hover:bg-green-700 text-white py-5 rounded-xl text-lg font-semibold flex items-center justify-center gap-2"
      >

        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <UserPlus />
        )}

        Assign Material

      </button>

    </div>

  );
};

export default AssignStudyMaterial;