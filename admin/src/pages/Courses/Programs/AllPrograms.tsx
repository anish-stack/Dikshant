import React, { useEffect, useState } from "react";
import axios from "axios";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import PageMeta from "../../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import Badge from "../../../components/ui/badge/Badge";
import {
  Search,
  Globe,
  Video,
  BookOpen,
  MapPin,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  Plus,
} from "lucide-react";
import Input from "../../../components/form/input/InputField";
import Button from "../../../components/ui/button/Button";
import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";
import { DropdownItem } from "../../../components/ui/dropdown/DropdownItem";
import { API_URL } from "../../../constant/constant";
import { Link } from "react-router-dom";

interface Program {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  description: string;
  // typeOfCourse: "Online" | "Offline" | "Recorded" | "Live";
  position: number;
  isActive: boolean;
  createdAt: string;
}

interface ApiResponse {
  total: number;
  page: number;
  limit: number;
  pages: number;
  data: Program[];
}

const LIMIT_OPTIONS = [10, 25, 50, 100];
const COURSE_TYPES = [
  { value: "", label: "All Courses", icon: <Globe className="w-4 h-4" /> },
  {
    value: "Online",
    label: "Online Live",
    icon: <Video className="w-4 h-4" />,
  },
  { value: "Offline", label: "Offline", icon: <MapPin className="w-4 h-4" /> },
  {
    value: "Recorded",
    label: "Recorded",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    value: "Live",
    label: "Live Streaming",
    icon: <Video className="w-4 h-4" />,
  },
];

const PLACEHOLDER_IMAGE = "https://placehold.co/300x200";

const AllPrograms: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>(searchTerm);
  const [selectedType, setSelectedType] = useState<string>("");
  const [limit, setLimit] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [limitDropdownOpen, setLimitDropdownOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    program?: Program;
  }>({ open: false });
  const [deleting, setDeleting] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.length >= 2 || searchTerm.length === 0) {
        setDebouncedSearch(searchTerm);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch programs whenever page, limit, type, or debounced search changes
  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      try {
        const params: any = {
          page,
          limit,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(selectedType && { type: selectedType }),
        };

        const res = await axios.get<ApiResponse>(`${API_URL}/programs`, {
          params,
        });
        const sorted = res.data.data.sort((a, b) => a.position - b.position);
        setPrograms(sorted);
        setTotalPages(res.data.pages);
        setTotal(res.data.total);
      } catch (err) {
        console.error("Failed to fetch programs:", err);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrograms();
  }, [page, limit, debouncedSearch, selectedType]);

  // Delete program
  const handleDelete = async () => {
  const program = deleteModal.program;
  if (!program) return; // ✅ TS is now happy

  setDeleting(true);
  try {
    await axios.delete(`${API_URL}/programs/${program.id}`);

    setPrograms((prev) => prev.filter((p) => p.id !== program.id));

    setDeleteModal({ open: false });
  } catch (err: any) {
    const message =
      err.response?.data?.message ||
      err.message ||
      "Failed to delete program. Please try again.";
    alert(message);
  } finally {
    setDeleting(false);
  }
};


  const currentFilter =
    COURSE_TYPES.find((t) => t.value === selectedType) || COURSE_TYPES[0];

  return (
    <>
      <PageMeta
        title="All Programs | Admin Dashboard"
        description="Manage all courses and programs"
      />
      <PageBreadcrumb pageTitle="All Programs" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            All Programs ({total})
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search programs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10 w-full sm:w-80"
              />
            </div>

            {/* Type Filter */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
                className="flex items-center gap-2 min-w-48 justify-between"
              >
                <span className="flex items-center gap-2">
                  {currentFilter.icon}
                  {currentFilter.label}
                </span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
              {typeDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                  {COURSE_TYPES.map((type) => (
                    <DropdownItem
                      key={type.value}
                      tag="button"
                      onClick={() => {
                        setSelectedType(type.value);
                        setTypeDropdownOpen(false);
                        setPage(1);
                      }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedType === type.value
                          ? "bg-indigo-50 dark:bg-indigo-900/20"
                          : ""
                      }`}
                    >
                      {type.icon}
                      <span>{type.label}</span>
                      {selectedType === type.value && (
                        <span className="ml-auto text-indigo-600">Check</span>
                      )}
                    </DropdownItem>
                  ))}
                </div>
              )}
            </div>

            {/* Limit Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setLimitDropdownOpen(!limitDropdownOpen)}
                className="min-w-32"
              >
                {limit} / page
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </Button>
              {limitDropdownOpen && (
                <div className="absolute top-full mt-2 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                  {LIMIT_OPTIONS.map((l) => (
                    <DropdownItem
                      key={l}
                      tag="button"
                      onClick={() => {
                        setLimit(l);
                        setLimitDropdownOpen(false);
                        setPage(1);
                      }}
                      className={
                        limit === l ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                      }
                    >
                      {l} per page
                    </DropdownItem>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-white/[0.03]">
                  <TableCell isHeader className="w-12 px-6 py-4">
                    Pos
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4">
                    Program
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4">
                    Type
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4">
                    Status
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4">
                    Created
                  </TableCell>
                  <TableCell isHeader className="px-6 py-4 text-center">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-8 w-8 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-4">
                          <Skeleton className="w-16 h-16 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-5 w-64" />
                            <Skeleton className="h-4 w-96" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-24 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-20 rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-10 w-32 mx-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : programs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-16 text-gray-500"
                    >
                      <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg text-center">No programs found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((program) => (
                    <TableRow
                      key={program.id}
                      className="hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <TableCell className="px-6 py-4 font-bold text-indigo-600">
                        #{program.position}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={program.imageUrl || PLACEHOLDER_IMAGE}
                            alt={program.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                            onError={(e) =>
                              (e.currentTarget.src = PLACEHOLDER_IMAGE)
                            }
                          />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {program.name}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {program.description}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      {/* <TableCell className="px-6 py-4">
                        <Badge
                          color={
                            program.typeOfCourse === "Online"
                              ? "success"
                              : "info"
                          }
                        >
                          {program.typeOfCourse}
                        </Badge>
                      </TableCell> */}
                      <TableCell className="px-6 py-4">
                        <Badge color={program.isActive ? "success" : "error"}>
                          {program.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-sm text-gray-500">
                        {new Date(program.createdAt).toLocaleDateString(
                          "en-IN"
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button size="sm" variant="outline">
                            <Link
                              to={`/programs?type=view&slug=${program.name}&id=${program.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline">
                            <Link
                              to={`/programs?type=edit&slug=${program.name}&id=${program.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() =>
                              setDeleteModal({ open: true, program })
                            }
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
        </div>

        {/* Mobile Cards */}
        <div className="lg:hidden space-y-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="border rounded-xl p-4 space-y-3">
                  <Skeleton className="h-48 w-full rounded-lg" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ))
            : programs.map((program) => (
                <div
                  key={program.id}
                  className="border border-gray-200 rounded-xl overflow-hidden"
                >
                  <img
                    src={program.imageUrl || PLACEHOLDER_IMAGE}
                    alt={program.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => (e.currentTarget.src = PLACEHOLDER_IMAGE)}
                  />
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg">
                        #{program.position} {program.name}
                      </h3>
                      <Badge
                        color={program.isActive ? "success" : "error"}
                        size="sm"
                      >
                        {program.isActive ? "Live" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {program.description}
                    </p>
                    {/* <div className="flex gap-2 flex-wrap">
                      <Badge color="info">{program.typeOfCourse}</Badge>
                    </div> */}
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" >
                        <Link to={`/admin/programs/view/${program.slug}`}>
                          View
                        </Link>
                      </Button>
                      <Button size="sm" variant="outline" >
                        <Link to={`/all-programs/${program.id}`}>Edit</Link>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setDeleteModal({ open: true, program })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        <Link to={`/programs-add`}
>
          <Button
            size="sm"
            className="bg-red-400 mb-5 absolute right-8 rounded-4xl bottom-5"
          >
            <Plus />
          </Button>
        </Link>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-99999 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold">Delete Program?</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "
              <strong>{deleteModal.program?.name}</strong>"? This action cannot
              be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => setDeleteModal({ open: false })}
              >
                Cancel
              </Button>
              <Button onClick={handleDelete}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AllPrograms;
