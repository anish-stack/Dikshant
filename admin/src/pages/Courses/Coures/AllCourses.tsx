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
  X,
} from "lucide-react";

const cn = (...classes: (string | undefined | null | false)[]) =>
  classes.filter(Boolean).join(" ");

const API_URL = "https://www.app.api.dikshantias.com/api/batchs";

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
  position: number;
  programId: number;
  program: Program;
  subjects: any[];
  startDate: string;
  endDate: string;
  registrationStartDate: string;
  registrationEndDate: string;
  status: "active" | "inactive" | "upcoming" | "completed";
  batchPrice: number;
  batchDiscountPrice: number;
  gst: number;
  isEmi: boolean;
  category: string;           // "online" | "offline" | "recorded"
  medium: string;             // "Hindi Medium" | "Hindi / Eng. Medium" etc.
  c_status: string;
  fee_one_time?: string;
  fee_inst?: string;
  offerText?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
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

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "recorded", label: "Recorded" },
];

const MEDIUM_OPTIONS = [
  { value: "", label: "All Mediums" },
  { value: "Hindi Medium", label: "Hindi Medium" },
  { value: "Hindi / Eng. Medium", label: "Hindi / English" },
  { value: "English Medium", label: "English Medium" },
];

const LIMIT_OPTIONS = [10, 25, 50, 100];

const AllBatches = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [mediumFilter, setMediumFilter] = useState("");

  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusDropdown, setStatusDropdown] = useState(false);
  const [categoryDropdown, setCategoryDropdown] = useState(false);
  const [mediumDropdown, setMediumDropdown] = useState(false);
  const [limitDropdown, setLimitDropdown] = useState(false);

  const [deleteModal, setDeleteModal] = useState<{ open: boolean; batch?: Batch }>({ open: false });
  const [deleting, setDeleting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page,
        limit,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(mediumFilter && { medium: mediumFilter }),
      };

      const res = await axios.get<ApiResponse>(API_URL, { params });
      console.log(API_URL)
      setBatches(res.data.items);
      setTotalPages(res.data.pages);
      setTotal(res.data.total);
      setPage(res.data.page);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to load batches";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, statusFilter, categoryFilter, mediumFilter]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("");
    setCategoryFilter("");
    setMediumFilter("");
    setPage(1);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatPrice = (price: number) => new Intl.NumberFormat("en-IN").format(price);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "upcoming": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "inactive": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const toggleStatus = async (batch: Batch) => {
    const newStatus = batch.status === "active" ? "inactive" : "active";
    const loadingToast = toast.loading("Updating status...");

    try {
      await axios.put(`${API_URL}/${batch.id}`, { status: newStatus });
      toast.success(`Batch is now ${newStatus}!`, { id: loadingToast });
      setBatches((prev) =>
        prev.map((b) => (b.id === batch.id ? { ...b, status: newStatus } : b))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update status", { id: loadingToast });
    }
  };

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
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete batch", { id: loadingToast });
    } finally {
      setDeleting(false);
    }
  };

  // Active filter chips
  const activeFilters = [
    statusFilter && { label: STATUS_OPTIONS.find(s => s.value === statusFilter)?.label, onClear: () => setStatusFilter("") },
    categoryFilter && { label: CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label, onClear: () => setCategoryFilter("") },
    mediumFilter && { label: MEDIUM_OPTIONS.find(m => m.value === mediumFilter)?.label, onClear: () => setMediumFilter("") },
  ].filter(Boolean) as { label: string; onClear: () => void }[];

  if (error && !loading) {
    return (
      <>
        <PageMeta title="Error | All Batches" description="" />
        <PageBreadcrumb pageTitle="All Batches" />
        <div className="max-w-3xl mx-auto p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-2">Error Loading Batches</h2>
            <p className="text-red-700 dark:text-red-300 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={fetchBatches} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" /> Retry
              </Button>
              <Link to="/all-courses/add">
                <Button><Plus className="w-4 h-4 mr-2" /> Create Batch</Button>
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta title="All Batches | Admin" description="Manage all course batches" />
      <PageBreadcrumb pageTitle="All Batches" />

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-white">
              <Users className="w-6 h-6 text-indigo-600" />
              All Batches
              {!loading && <span className="text-sm text-gray-500 font-normal">({total})</span>}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Manage your course batches efficiently</p>
          </div>

          <Link to="/all-courses/add">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create New Batch
            </Button>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-wrap gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search by batch name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDropdown(!categoryDropdown);
                setStatusDropdown(false);
                setMediumDropdown(false);
                setLimitDropdown(false);
              }}
              className="flex items-center gap-2 min-w-[160px] justify-between"
            >
              <Filter className="w-4 h-4" />
              {CATEGORY_OPTIONS.find(c => c.value === categoryFilter)?.label || "Category"}
              <ChevronDown className="w-4 h-4" />
            </Button>

            {categoryDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                {CATEGORY_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    tag="button"
                    onClick={() => { setCategoryFilter(opt.value); setCategoryDropdown(false); setPage(1); }}
                    className={cn(categoryFilter === opt.value && "bg-indigo-50 dark:bg-indigo-900/20")}
                  >
                    {opt.label}
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setStatusDropdown(!statusDropdown);
                setCategoryDropdown(false);
                setMediumDropdown(false);
                setLimitDropdown(false);
              }}
              className="flex items-center gap-2 min-w-[160px] justify-between"
            >
              {STATUS_OPTIONS.find(s => s.value === statusFilter)?.label || "Status"}
              <ChevronDown className="w-4 h-4" />
            </Button>

            {statusDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    tag="button"
                    onClick={() => { setStatusFilter(opt.value); setStatusDropdown(false); setPage(1); }}
                    className={cn(statusFilter === opt.value && "bg-indigo-50 dark:bg-indigo-900/20")}
                  >
                    {opt.label}
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>

          {/* Medium Filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => {
                setMediumDropdown(!mediumDropdown);
                setStatusDropdown(false);
                setCategoryDropdown(false);
                setLimitDropdown(false);
              }}
              className="flex items-center gap-2 min-w-[170px] justify-between"
            >
              {MEDIUM_OPTIONS.find(m => m.value === mediumFilter)?.label || "Medium"}
              <ChevronDown className="w-4 h-4" />
            </Button>

            {mediumDropdown && (
              <div className="absolute top-full mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                {MEDIUM_OPTIONS.map((opt) => (
                  <DropdownItem
                    key={opt.value}
                    tag="button"
                    onClick={() => { setMediumFilter(opt.value); setMediumDropdown(false); setPage(1); }}
                    className={cn(mediumFilter === opt.value && "bg-indigo-50 dark:bg-indigo-900/20")}
                  >
                    {opt.label}
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>

          {/* Results per page */}
          <div className="relative ml-auto">
            <Button
              variant="outline"
              onClick={() => {
                setLimitDropdown(!limitDropdown);
                setStatusDropdown(false);
                setCategoryDropdown(false);
                setMediumDropdown(false);
              }}
              className="flex items-center gap-2"
            >
              {limit} per page
              <ChevronDown className="w-4 h-4" />
            </Button>

            {limitDropdown && (
              <div className="absolute top-full mt-1 right-0 w-40 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50">
                {LIMIT_OPTIONS.map((l) => (
                  <DropdownItem
                    key={l}
                    tag="button"
                    onClick={() => { setLimit(l); setLimitDropdown(false); setPage(1); }}
                    className={cn(limit === l && "bg-indigo-50 dark:bg-indigo-900/20")}
                  >
                    {l} per page
                  </DropdownItem>
                ))}
              </div>
            )}
          </div>

          {/* Clear Filters */}
          {(searchTerm || statusFilter || categoryFilter || mediumFilter) && (
            <Button variant="ghost" onClick={resetFilters} className="text-red-600 hover:text-red-700 flex items-center gap-1">
              <X className="w-4 h-4" /> Clear All
            </Button>
          )}
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters.map((filter, idx) => (
              <div key={idx} className="inline-flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs px-3 py-1 rounded-full">
                {filter.label}
                <button onClick={filter.onClear} className="hover:text-red-600">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Table (Desktop) */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableCell isHeader className="w-12">#</TableCell>
                <TableCell isHeader>Batch</TableCell>
                <TableCell isHeader>Category</TableCell>
                <TableCell isHeader>Medium</TableCell>
                <TableCell isHeader>Program</TableCell>
                <TableCell isHeader>Price</TableCell>
                <TableCell isHeader>Dates</TableCell>
                <TableCell isHeader>Status</TableCell>
                <TableCell isHeader className="text-center">Actions</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-8 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : batches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No batches found matching your filters</p>
                    <Button onClick={resetFilters} variant="outline" className="mt-4">Clear Filters</Button>
                  </TableCell>
                </TableRow>
              ) : (
                batches.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell className="font-semibold text-indigo-600">#{batch.position}</TableCell>

                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={batch.imageUrl || "https://via.placeholder.com/48"}
                          alt={batch.name}
                          className="w-12 h-12 rounded-lg object-cover border"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://via.placeholder.com/48/e0e0e0/666?text=Batch"; }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm line-clamp-2">{batch.name}</p>
                          {batch.offerText && <p className="text-xs text-amber-600">{batch.offerText}</p>}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="capitalize px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                        {batch.category}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-sm">{batch.medium}</span>
                    </TableCell>

                    <TableCell>
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                        {batch.program.name}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="text-sm">
                        {batch.batchDiscountPrice && batch.batchDiscountPrice < batch.batchPrice ? (
                          <>
                            <span className="line-through text-gray-400">₹{formatPrice(batch.batchPrice)}</span>
                            <span className="font-semibold text-green-600 ml-2">₹{formatPrice(batch.batchDiscountPrice)}</span>
                          </>
                        ) : (
                          <span className="font-semibold">₹{formatPrice(batch.batchPrice)}</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs">
                      <div>{formatDate(batch.startDate)}</div>
                      <div className="text-gray-500">to {formatDate(batch.endDate)}</div>
                    </TableCell>

                    <TableCell>
                      <span className={cn("inline-flex px-3 py-1 rounded-full text-xs font-medium capitalize", getStatusStyle(batch.status))}>
                        {batch.status}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/all-courses/view/${batch.id}`}>View</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/all-courses/add-video/${batch.id}`}>Videos</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/all-courses/edit/${batch.id}`}>Edit</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleStatus(batch)}
                          className={batch.status === "active" ? "text-green-600" : ""}
                        >
                          {batch.status === "active" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50"
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

        {/* Mobile Cards - Omitted for brevity but you can keep/adapt your existing mobile view */}
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
                      #{batch.position} {batch.name}
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
          <div className="mt-8 flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 self-center">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Delete Modal - Same as before */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-xl">Delete Batch?</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Are you sure you want to delete <strong>{deleteModal.batch?.name}</strong>? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8 justify-end">
              <Button variant="outline" onClick={() => setDeleteModal({ open: false })} disabled={deleting}>
                Cancel
              </Button>
              <Button onClick={deleteBatch} disabled={deleting} className="bg-red-600 hover:bg-red-700">
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