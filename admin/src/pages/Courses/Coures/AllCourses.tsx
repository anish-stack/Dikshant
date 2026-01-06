import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "../../../components/ui/table";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import {
  Search,
  Plus,
  Calendar,
  IndianRupee,
  Users,
  Filter,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

const API_URL = "http://localhost:5001/api/batchs";

interface Subject {
  id: number;
  name: string;
  slug: string;
}

interface Program {
  id: number;
  name: string;
  slug: string;
}

interface Batch {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  displayOrder: number;
  programId: number;
  program: Program;
  subjects: Subject[];
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: "active" | "inactive" | "upcoming" | "completed";
  shortDescription: string;
  batchPrice: number;
  batchDiscountPrice: number;
  gst: number;
  isEmi: boolean;
  createdAt: string;
}

interface ApiResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: Batch[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "completed", label: "Completed" },
  { value: "inactive", label: "Inactive" },
];

const LIMIT_OPTIONS = [10, 25, 50, 100];

const AllBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusDropdown, setStatusDropdown] = useState(false);
  const [limitDropdown, setLimitDropdown] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    batch?: Batch;
  }>({
    open: false,
  });
  const [deleting, setDeleting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        limit,
        ...(searchTerm ? { search: searchTerm } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      };

      const res = await axios.get<ApiResponse>(API_URL, { params });
      setBatches(res.data.items);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || "Failed to load batches";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN").format(price);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "upcoming":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "inactive":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Toggle Status
  const toggleStatus = async (batch: Batch) => {
    const newStatus = batch.status === "active" ? "inactive" : "active";
    const loadingToast = toast.loading(`Updating status...`);

    try {
      await axios.put(
        `${API_URL}/${batch.id}`,
        { status: newStatus },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      toast.success(`Batch is now ${newStatus}!`, { id: loadingToast });
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, status: newStatus } : b))
      );
    } catch (err: unknown) {
      let message = "Failed to update status";

      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }

      toast.error(message, { id: loadingToast });
    }
  };

  // Delete Batch
  const deleteBatch = async () => {
    if (!deleteModal.batch) return;

    setDeleting(true);
    const loadingToast = toast.loading("Deleting batch...");

    try {
      await axios.delete(`${API_URL}/${deleteModal.batch.id}`);
      toast.success("Batch deleted successfully", { id: loadingToast });
      setBatches((prev) => prev.filter((b) => b.id !== deleteModal.batch?.id));
      setTotal((prev) => prev - 1);
      setDeleteModal({ open: false });
    } catch (err: unknown) {
      let message = "Failed to delete batch";

      if (axios.isAxiosError(err)) {
        message = err.response?.data?.message || message;
      }

      toast.error(message, { id: loadingToast });
    } finally {
      setDeleting(false);
    }
  };

  // Error State
  if (error && !loading) {
    return (
      <>
        <PageMeta title="Error | All Batches" description="" />
        <PageBreadcrumb pageTitle="All Batches" />
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                  Error Loading Batches
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={fetchBatches}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
                <Link to="/all-courses/add">
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create Batch
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="All Batches | Admin"
        description="Manage all course batches"
      />
      <PageBreadcrumb pageTitle="All Batches" />

      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              All Batches
              {!loading && (
                <span className="text-sm text-gray-500">({total})</span>
              )}
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              Manage and monitor all course batches
            </p>
          </div>

          <Link to="/all-courses/add">
            <Button className="flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" />
              Create Batch
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search batches..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 text-sm"
            />
          </div>

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setStatusDropdown(!statusDropdown);
                setLimitDropdown(false);
              }}
              className="flex items-center gap-2 w-full sm:w-auto justify-between text-sm"
            >
              <Filter className="w-4 h-4" />
              <span className="flex-1 text-left">
                {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label ||
                  "All Status"}
              </span>
              <ChevronDown className="w-4 h-4" />
            </Button>
            {statusDropdown && (
              <div className="absolute top-full mt-1 w-full sm:min-w-[200px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    tag="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setStatusDropdown(false);
                      setPage(1);
                    }}
                    className={cn(
                      "text-sm",
                      statusFilter === opt.value
                        ? "bg-indigo-50 dark:bg-indigo-900/20"
                        : ""
                    )}
                  >
                    {opt.label}
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setLimitDropdown(!limitDropdown);
                setStatusDropdown(false);
              }}
              className="text-sm flex items-center gap-2"
            >
              {limit} / page
              <ChevronDown className="w-4 h-4" />
            </Button>
            {limitDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                {LIMIT_OPTIONS.map((l) => (
                  <DropdownItem
                    key={l}
                    tag="button"
                    onClick={() => {
                      setLimit(l);
                      setLimitDropdown(false);
                      setPage(1);
                    }}
                    className={cn(
                      "text-sm",
                      limit === l ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                    )}
                  >
                    {l} per page
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableCell isHeader className="w-12 text-xs">
                  #
                </TableCell>
                <TableCell isHeader className="text-xs">
                  Batch
                </TableCell>
                <TableCell isHeader className="text-xs">
                  Program
                </TableCell>
                <TableCell isHeader className="text-xs">
                  Price
                </TableCell>
                <TableCell isHeader className="text-xs">
                  Dates
                </TableCell>
                <TableCell isHeader className="text-xs">
                  Status
                </TableCell>
                <TableCell isHeader className="text-center text-xs">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-6 w-6" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-36" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-40 mx-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-700" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No batches found
                      </p>
                      <Link to="/all-courses/add">
                        <Button size="sm" className="flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Create First Batch
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow
                    key={batch.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <TableCell className="font-semibold text-indigo-600 text-xs">
                      #{batch.displayOrder}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            batch.imageUrl || "https://via.placeholder.com/48"
                          }
                          alt={batch.name}
                          className="w-12 h-12 rounded object-cover border border-gray-200 dark:border-gray-700"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/48/e0e0e0/999999?text=Batch";
                          }}
                        />
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {batch.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                            {batch.shortDescription}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {batch.program.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {batch.batchDiscountPrice > 0 ? (
                          <>
                            <div className="line-through text-gray-500">
                              ₹{formatPrice(batch.batchPrice)}
                            </div>
                            <div className="text-green-600 dark:text-green-400 font-semibold">
                              ₹{formatPrice(batch.batchDiscountPrice)}
                            </div>
                          </>
                        ) : (
                          <div className="font-semibold">
                            ₹{formatPrice(batch.batchPrice)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {formatDate(batch.startDate)}
                          </span>
                        </div>
                        <div className="text-gray-500">
                          to {formatDate(batch.endDate)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                          getStatusStyle(batch.status)
                        )}
                      >
                        {batch.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center items-center gap-1">
                        <Button size="sm" variant="outline">
                          <Link
                            to={`/all-courses/add-video/${batch.id}`}
                            className="text-xs truncate"
                          >
                            Add Videos
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline">
                          <Link
                            to={`/all-courses/view/${batch.id}`}
                            className="text-xs"
                          >
                            View
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline">
                          <Link
                            to={`/all-courses/edit/${batch.id}`}
                            className="text-xs"
                          >
                            Edit
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus(batch)}
                          className={cn(
                            "text-xs",
                            batch.status === "active"
                              ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                              : "text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                        >
                          {batch.status === "active" ? (
                            <ToggleRight className="w-4 h-4" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs"
                          onClick={() => setDeleteModal({ open: true, batch })}
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

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3"
              >
                <Skeleton className="h-32 w-full rounded" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))
          ) : batches.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 dark:border-gray-800 rounded-lg">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                No batches found
              </p>
              <Link to="/all-courses/add">
                <Button size="sm" className="flex items-center gap-2 mx-auto">
                  <Plus className="w-4 h-4" />
                  Create First Batch
                </Button>
              </Link>
            </div>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
              >
                <img
                  src={batch.imageUrl || "https://via.placeholder.com/400x200"}
                  alt={batch.name}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      "https://via.placeholder.com/400x200/e0e0e0/999999?text=Batch+Image";
                  }}
                />
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm">
                      #{batch.displayOrder} {batch.name}
                    </h3>
                    <span
                      className={cn(
                        "inline-block px-2 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap",
                        getStatusStyle(batch.status)
                      )}
                    >
                      {batch.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {batch.shortDescription}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <IndianRupee className="w-3 h-3" />
                    <span className="font-semibold">
                      ₹
                      {formatPrice(
                        batch.batchDiscountPrice || batch.batchPrice
                      )}
                      {batch.batchDiscountPrice > 0 && (
                        <span className="line-through text-gray-500 ml-2">
                          ₹{formatPrice(batch.batchPrice)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(batch.startDate)} to {formatDate(batch.endDate)}
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Program:</span>{" "}
                    <span className="inline-block px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium">
                      {batch.program.name}
                    </span>
                  </div>
                  <div className="pt-3 flex gap-2 flex-wrap border-t border-gray-200 dark:border-gray-800">
                    <Button size="sm" className="text-xs">
                      <Link to={`/all-courses/view/${batch.id}`}>View</Link>
                    </Button>

                    <Button size="sm" className="text-xs" variant="outline">
                      <Link
                        to={`/all-courses/add-video/${batch.id}`}
                        className="text-xs truncate"
                      >
                        Add Videos
                      </Link>
                    </Button>

                    <Button size="sm" variant="outline" className="text-xs">
                      <Link to={`/all-courses/edit/${batch.id}`}>Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleStatus(batch)}
                      className={cn(
                        "text-xs",
                        batch.status === "active"
                          ? "border-green-600 text-green-600"
                          : "border-gray-600 text-gray-600"
                      )}
                    >
                      {batch.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setDeleteModal({ open: true, batch })}
                      className="text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="text-xs"
            >
              Previous
            </Button>
            <span className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                  Delete Batch?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Are you sure you want to delete "
                  <strong>{deleteModal.batch?.name}</strong>"? This action
                  cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false })}
                disabled={deleting}
                size="sm"
                className="text-sm"
              >
                Cancel
              </Button>
              <Button
                onClick={deleteBatch}
                disabled={deleting}
                size="sm"
                className="text-sm"
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllBatches;
