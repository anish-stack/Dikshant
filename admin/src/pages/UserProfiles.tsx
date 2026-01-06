import { useEffect, useState } from "react";
import axios,{ AxiosError } from "axios";
import { API_URL } from "../constant/constant";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageMeta from "../components/common/PageMeta";
import toast from "react-hot-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Badge from "../components/ui/badge/Badge";
import {
  Search,
  Users,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import Input from "../components/form/input/InputField";
import Button from "../components/ui/button/Button";
import { Skeleton } from "../components/ui/Skeleton/Skeleton";
import Modal from "./UiElements/AlertDialog";
import { useNavigate } from "react-router";

interface Batch {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  batchPrice: number;
  batchDiscountPrice: number;
  category: string;
  c_status: string;
  program: {
    id: number;
    name: string;
    slug: string;
  };
}

interface Course {
  id: number;
  title: string;
  batch?: Batch; // optional, kyunki batch null/undefined ho sakta hai
}
interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  createdAt: string;
  hasCourse: boolean;
  courses: Course[];
}

interface ApiResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: User[];
}


interface BatchResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: Batch[];
}

// Predefined reasons for quick selection
const ASSIGNMENT_REASONS = [
  "Scholarship Student",
  "Free Trial",
  "Company Sponsored",
  "Promotional Offer",
  "Teacher/Staff Access",
];

export default function UserProfiles() {
  const router = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit, setLimit] = useState(10);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewCoursesOpen, setIsViewCoursesOpen] = useState(false);
  const [isAssignCourseOpen, setIsAssignCourseOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isConfirmAssignOpen, setIsConfirmAssignOpen] = useState(false);

  // Course assignment states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [accessValidityDays, setAccessValidityDays] = useState<number>(365);
  const [assignReason, setAssignReason] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [batchSearchTerm, setBatchSearchTerm] = useState("");

  const fetchUsers = async (pageNum = 1, search = "", itemsPerPage = limit) => {
    setLoading(true);
    try {
      const params = {
        limit: itemsPerPage,
        page: pageNum,
        ...(search && { search }),
      };
      const res = await axios.get<ApiResponse>(`${API_URL}/auth/all-profile`, {
        params,
      });

      setUsers(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotalUsers(res.data.total);
      setPage(res.data.page);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await axios.get<BatchResponse>(`${API_URL}/batchs`, {
        params: { page: 1, limit: 500 }, // Increased limit to 500
      });
      setBatches(res.data.items);
    } catch (error) {
      console.error("Failed to fetch batches:", error);
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, "", limit);
  }, [limit]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1, searchTerm, limit), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      fetchUsers(newPage, searchTerm, limit);
    }
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

const handleToggleBlock = async (user: User) => {
  try {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

 await axios.patch(
      `${API_URL}/auth/users/${user.id}/toggle-active`,
      null,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Update UI
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      )
    );

    // Success toast
    toast.success(
      user.is_active
        ? "User blocked successfully"
        : "User unblocked successfully"
    );
  } catch (err) {
  const error = err as AxiosError<{ message?: string }>;

  console.error("Failed to toggle block:", error);

  // ❌ No response (network issue)
  if (!error.response) {
    toast.error("Network error. Please check your internet.");
    return;
  }

  const { status, data } = error.response;

  // ❌ Auth error
  if (status === 401) {
    toast.error("Unauthorized. Please login again.");
  }
  // ❌ Forbidden
  else if (status === 403) {
    toast.error(data?.message || "You are not allowed to perform this action");
  }
  // ❌ User not found
  else if (status === 404) {
    toast.error("User not found");
  }
  // ❌ Server error
  else if (status >= 500) {
    toast.error("Server error. Please try again later.");
  }
  // ❌ Custom backend message
  else {
    toast.error(data?.message || "Failed to update user status");
  }
}
}

const handleDeleteUser = async () => {
  if (!selectedUser) return;

  const token = localStorage.getItem("accessToken");

  if (!token) {
    toast.error("Session expired. Please login again.");
    return;
  }

  try {
    await axios.delete(`${API_URL}/auth/users/${selectedUser.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // ✅ Update UI
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));

    toast.success("User deleted successfully");

    // ✅ Reset selection & close modal
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  } catch (err) {
    // ✅ Type-safe error
    const error = err as AxiosError<{ error?: string }>;

    console.error("Failed to delete user:", error);

    // ❌ Network / no response
    if (!error.response) {
      toast.error("Network error. Please check your internet.");
      return;
    }

    const { status, data } = error.response;

    // ❌ Handle different status codes
    switch (status) {
      case 401:
        toast.error("Unauthorized. Please login again.");
        break;
      case 403:
        toast.error(data?.error || "You are not allowed to delete this user");
        break;
      case 404:
        toast.error("User not found");
        break;
      case 409:
        toast.error(data?.error || "User cannot be deleted due to dependencies");
        break;
      default:
        if (status >= 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(data?.error || "Failed to delete user");
        }
        break;
    }
  }
};

  const openAssignModal = (user: User) => {
    setSelectedUser(user);
    setIsAssignCourseOpen(true);
    fetchBatches();
  };

const handleAssignCourse = async () => {
  if (!selectedUser || !selectedBatch) {
    toast.error("Please select a course");
    return;
  }

  setAssignLoading(true);

  try {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    await axios.post(
      `${API_URL}/orders/admin/assign-course`,
      {
        userId: selectedUser.id,
        type: "batch",
        itemId: selectedBatch,
        accessValidityDays,
        reason: assignReason || "Admin Assignment",
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    toast.success("Course assigned successfully");

    setIsConfirmAssignOpen(false);
    setIsAssignCourseOpen(false);
    setSelectedBatch(null);
    setAccessValidityDays(365);
    setAssignReason("");

    fetchUsers(page, searchTerm, limit);
  } catch (err) {
    // ✅ Type-safe error handling
    const error = err as AxiosError<{ message?: string }>;

    console.error("Failed to assign course:", error);

    if (!error.response) {
      toast.error("Network error. Please check your internet.");
      return;
    }

    const { status, data } = error.response;

    switch (status) {
      case 401:
        toast.error("Unauthorized. Please login again.");
        break;
      case 403:
        toast.error(data?.message || "You are not allowed to assign courses");
        break;
      case 404:
        toast.error(data?.message || "User or course not found");
        break;
      case 409:
        toast.error(data?.message || "Course already assigned to this user");
        break;
      case 422:
        toast.error(data?.message || "Invalid assignment data");
        break;
      default:
        if (status >= 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(data?.message || "Failed to assign course");
        }
        break;
    }
  } finally {
    setAssignLoading(false);
  }
};

  const filteredBatches = batches.filter(
    (batch) =>
      batch.name.toLowerCase().includes(batchSearchTerm.toLowerCase()) ||
      batch.program.name.toLowerCase().includes(batchSearchTerm.toLowerCase())
  );

  const selectedBatchData = batches.find((b) => b.id === selectedBatch);

  return (
    <>
      <PageMeta
        title="All User Profiles | Admin Dashboard"
        description="Manage and view all registered users"
      />
      <PageBreadcrumb pageTitle="All Users" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            <Users className="inline-block w-6 h-6 mr-2 -mt-1" />
            All Users ({totalUsers})
          </h3>

          <div className="flex items-center gap-3">
            {/* Items per page selector */}
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 
                         rounded-lg px-4 py-2 pr-10 text-sm font-medium text-gray-700 dark:text-gray-300
                         hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-80"
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    User
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    Contact
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    Role
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    Courses
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 font-semibold">
                    Joined
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-6 py-4 font-semibold text-center"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j} className="px-6 py-4">
                          <Skeleton className="h-4 w-28" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-gray-500"
                    >
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              ID: {user.id}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        <div>
                          <p className="text-sm">{user.email}</p>
                          <p className="text-sm font-mono">{user.mobile}</p>
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <Badge variant="light">{user.role}</Badge>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-2">
                         <Badge color={user.courses.length > 0 ? "success" : "light"} size="sm">
  {user.courses.length} Course{user.courses.length !== 1 ? "s" : ""}
</Badge>

                          {user.courses.length > 0 && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsViewCoursesOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Badge color={user.is_active ? "success" : "error"}>
                            {user.is_active ? "Active" : "Blocked"}
                          </Badge>
                          {!user.is_verified && (
                            <Badge color="warning">Unverified</Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => openAssignModal(user)}
            
                          >
                            <Plus className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            
                            onClick={() => handleToggleBlock(user)}
                          
                          >
                            {user.is_active ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                           
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDeleteModalOpen(true);
                            }}
                            
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/[0.05] gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, totalUsers)} of {totalUsers} users
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        size="sm"
                        variant={page === pageNum ? "primary" : "outline"}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      <span className="px-2 text-gray-500">...</span>
                      <Button
                        size="sm"
                        variant={page === totalPages ? "primary" : "outline"}
                        onClick={() => handlePageChange(totalPages)}
                      >
                        {totalPages}
                      </Button>
                    </>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* View Courses Modal */}
      <Modal
        isOpen={isViewCoursesOpen}
        onClose={() => setIsViewCoursesOpen(false)}
        title={`Courses - ${selectedUser?.name}`}
      >
        {selectedUser?.courses?.length ? (
          <div className="space-y-3">
            {selectedUser.courses.map((course) => {
              const batch = course?.batch;
              const hasValidBatch = batch && batch?.name;

              return (
                <div
                  key={course.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4
                     dark:border-gray-700 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    {batch?.imageUrl && (
                      <img
                        src={batch.imageUrl}
                        alt={batch.name}
                        className="h-12 w-12 rounded-md object-cover border"
                      />
                    )}

                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {batch?.name || "N/A"}
                      </p>

                      {batch && (
                        <p className="text-sm text-gray-500">
                          <span className="line-through mr-2">
                            ₹{batch.batchPrice}
                          </span>
                          <span className="text-green-600 font-semibold">
                            ₹{batch.batchDiscountPrice}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {hasValidBatch && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        router(`/all-courses/view/${batch.id}`);
                      }}
                    >
                      View Course
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-10">
            No courses enrolled yet.
          </p>
        )}
      </Modal>

      {/* Assign Course Modal */}
      <Modal
        isOpen={isAssignCourseOpen}
        onClose={() => {
          setIsAssignCourseOpen(false);
          setSelectedBatch(null);
          setBatchSearchTerm("");
          setAssignReason("");
        }}
        title={`Assign Course to ${selectedUser?.name}`}
      >
        <div className="space-y-4">
          {/* Search Batch */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search courses..."
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Batch List */}
          <div className="max-h-96 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            {loadingBatches ? (
              <div className="text-center py-8 text-gray-500">
                Loading courses...
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No courses found
              </div>
            ) : (
              filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatch(batch.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all
                    ${
                      selectedBatch === batch.id
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                    }`}
                >
                  <img
                    src={batch.imageUrl}
                    alt={batch.name}
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {batch.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {batch.program.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className="line-through mr-2">
                        ₹{batch.batchPrice}
                      </span>
                      <span className="text-green-600 font-semibold">
                        ₹{batch.batchDiscountPrice}
                      </span>
                    </p>
                  </div>
                  {selectedBatch === batch.id && (
                    <CheckCircle className="w-6 h-6 text-indigo-500" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Additional Fields */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Access Validity (Days)
              </label>
              <Input
                type="number"
                value={accessValidityDays}
                onChange={(e) =>
                  setAccessValidityDays(parseInt(e.target.value) || 365)
                }
            
                placeholder="365"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assignment Reason
              </label>

              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {ASSIGNMENT_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setAssignReason(reason)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-all
                      ${
                        assignReason === reason
                          ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                          : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <Input
                type="text"
                value={assignReason}
                onChange={(e) => setAssignReason(e.target.value)}
                placeholder="Or type custom reason..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAssignCourseOpen(false);
                setSelectedBatch(null);
                setBatchSearchTerm("");
                setAssignReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedBatch}
              onClick={() => setIsConfirmAssignOpen(true)}
            >
              Assign Course
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Assign Modal */}
      <Modal
        isOpen={isConfirmAssignOpen}
        onClose={() => setIsConfirmAssignOpen(false)}
        title="Confirm Course Assignment"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-200 dark:border-indigo-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Student:</strong> {selectedUser?.name}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Course:</strong> {selectedBatchData?.name}
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Validity:</strong> {accessValidityDays} days
            </p>
            {assignReason && (
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong>Reason:</strong> {assignReason}
              </p>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            This will assign the course to the student without any payment. The
            student will have immediate access to all course materials.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsConfirmAssignOpen(false)}
              disabled={assignLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignCourse} disabled={assignLoading}>
              {assignLoading ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete{" "}
              <strong>{selectedUser?.name}</strong>?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mt-2">
              This action cannot be undone. All user data will be permanently
              removed.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUser(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
