import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  IndianRupee, 
  Tag, 
  BookOpen, 
  Users, 
  AlertCircle, 
  Calculator,
  RefreshCw
} from "lucide-react";

const API_URL = "https://www.dikapi.olyox.in/api/batchs";

interface Subject {
  id: number;
  name: string;
  slug: string;
  description?: string;
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
  longDescription: string;
  batchPrice: number;
  batchDiscountPrice: number;
  gst: number;
  offerValidityDays: number;
  isEmi: boolean;
  emiTotal?: number | null;
  emiSchedule?: Array<{ month: number; amount: number }> | null;
  createdAt: string;
  updatedAt: string;
}

const ViewBatch = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = async () => {
    if (!id) {
      setError("Invalid batch ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get<Batch>(`${API_URL}/${id}`);
      setBatch(res.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to load batch details";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error("Error fetching batch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [id]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-IN").format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "upcoming":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "inactive":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const cn = (...classes: (string | undefined | null | false)[]) =>
    classes.filter(Boolean).join(" ");

  // Loading State
  if (loading) {
    return (
      <>
        <PageMeta title="Loading Batch..." description="" />
        <PageBreadcrumb pageTitle="Loading..." />
        <div className="max-w-5xl mx-auto p-4 sm:p-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-48 w-full rounded-lg mb-6" />
            <div className="grid md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error || !batch) {
    return (
      <>
        <PageMeta title="Error Loading Batch" description="" />
        <PageBreadcrumb pageTitle="Error" />
        <div className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-8">
            <div className="flex flex-col items-center text-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
              <div>
                <h2 className="text-lg font-bold text-red-800 dark:text-red-200 mb-2">
                  {error || "Batch Not Found"}
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error || "The batch you're looking for doesn't exist or has been removed."}
                </p>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={fetchBatch}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
                <Link to="/all-courses">
                  <button className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm font-medium rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                    Back to Batches
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const finalPrice = batch.batchDiscountPrice > 0 ? batch.batchDiscountPrice : batch.batchPrice;
  const gstAmount = Math.round((finalPrice * batch.gst) / 100);
  const savings = batch.batchDiscountPrice > 0 ? batch.batchPrice - batch.batchDiscountPrice : 0;

  return (
    <>
      <PageMeta title={`${batch.name} - Batch Details`} description={batch.shortDescription} />
      <PageBreadcrumb pageTitle={batch.name} />

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to="/all-courses"
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Batches
          </Link>

          <Link to={`/all-courses/edit/${batch.id}`}>
            <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              Edit Batch
            </button>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Hero Image */}
          <div className="relative h-64 bg-gradient-to-br from-indigo-600 to-purple-700">
            {batch.imageUrl ? (
              <img
                src={batch.imageUrl}
                alt={batch.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "https://via.placeholder.com/1200x400/6366f1/ffffff?text=Batch+Image";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/30">
                <BookOpen className="w-24 h-24" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                  Order #{batch.displayOrder}
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    getStatusColor(batch.status)
                  )}
                >
                  {batch.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold leading-tight">{batch.name}</h1>
            </div>
          </div>

          <div className="p-6">
            {/* Short Description */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                Description
              </h2>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                {batch.shortDescription}
              </p>
            </div>

            {/* Program & Subjects */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                  Program
                </h3>
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
                  <p className="text-base font-bold text-indigo-800 dark:text-indigo-400">
                    {batch.program.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    ID: {batch.program.id} • {batch.program.slug}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  Subjects ({batch.subjects.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {batch.subjects.map((subject) => (
                    <span
                      key={subject.id}
                      className="px-3 py-1.5 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium"
                    >
                      {subject.name}
                    </span>
                  ))}
                  {batch.subjects.length === 0 && (
                    <span className="text-xs text-gray-500">No subjects assigned</span>
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Batch Timeline
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-xs">
                    <span className="text-gray-700 dark:text-gray-300">Start Date</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatDate(batch.startDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-xs">
                    <span className="text-gray-700 dark:text-gray-300">End Date</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-400">
                      {formatDate(batch.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Registration Period
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-xs">
                    <span className="text-gray-700 dark:text-gray-300">Opens</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-400">
                      {formatDate(batch.registrationStartDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs">
                    <span className="text-gray-700 dark:text-gray-300">Closes</span>
                    <span className="font-semibold text-red-700 dark:text-red-400">
                      {formatDate(batch.registrationEndDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 mb-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-indigo-600" />
                Pricing
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Original Price</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-300 line-through">
                    ₹{formatPrice(batch.batchPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Final Price</p>
                  <p className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                    ₹{formatPrice(finalPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    GST ({batch.gst}%)
                  </p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    +₹{formatPrice(gstAmount)}
                  </p>
                </div>
              </div>
              {savings > 0 && (
                <p className="text-center text-sm font-bold text-green-600 dark:text-green-400 mt-3">
                  You Save ₹{formatPrice(savings)}
                </p>
              )}
              {batch.offerValidityDays > 0 && (
                <p className="text-center text-xs font-semibold text-orange-600 dark:text-orange-400 mt-2">
                  Offer valid for {batch.offerValidityDays} days
                </p>
              )}
            </div>

            {/* EMI Section */}
            {batch.isEmi && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-6 mb-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-600" />
                  EMI Available
                </h3>

                {batch.emiSchedule && batch.emiSchedule.length > 0 ? (
                  <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div className="bg-emerald-600 text-white p-4 text-center">
                      <p className="text-xs font-medium">Monthly EMI</p>
                      <p className="text-2xl font-extrabold mt-1">
                        ₹
                        {Math.round(
                          (batch.emiTotal || finalPrice) / batch.emiSchedule.length
                        ).toLocaleString("en-IN")}{" "}
                        / month
                      </p>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                        {batch.emiSchedule.map((emi, index) => (
                          <div
                            key={index}
                            className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg"
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Month {emi.month}
                            </p>
                            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                              ₹{emi.amount.toLocaleString("en-IN")}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-800 flex justify-between items-center">
                        <span className="text-sm font-semibold">Total EMI</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{(batch.emiTotal || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-sm text-emerald-700 dark:text-emerald-400">
                    EMI enabled but schedule not configured
                  </p>
                )}
              </div>
            )}

            {/* Long Description */}
            {batch.longDescription && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  Full Description
                </h3>
                <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {batch.longDescription}
                  </p>
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">EMI</p>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                  {batch.isEmi ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Created</p>
                <p className="text-sm font-semibold">{formatDate(batch.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Updated</p>
                <p className="text-sm font-semibold">{formatDate(batch.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewBatch;