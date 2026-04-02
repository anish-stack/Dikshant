import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
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
  RefreshCw,
} from "lucide-react";

import PageMeta from "../../../components/common/PageMeta";
import PageBreadcrumb from "../../../components/common/PageBreadCrumb";
import { Skeleton } from "../../../components/ui/Skeleton/Skeleton";

const API_URL = "https://www.app.api.dikshantias.com/api/batchs";

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

interface EmiInstallment {
  month: number;
  amount: number;
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
  emiSchedule?: EmiInstallment[] | null;
  createdAt: string;
  updatedAt: string;
}

const ViewBatch = () => {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBatch = useCallback(async () => {
    if (!id || isNaN(Number(id))) {
      setError("Invalid batch ID");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.get<Batch>(`${API_URL}/${id}`);
      setBatch(data);
    } catch (err: unknown) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : "Failed to load batch details";
      setError(message);
      toast.error(message);
      console.error("Fetch batch error:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  // ────────────────────────────────────────────────
  // Helpers
  // ────────────────────────────────────────────────

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const formatPrice = (amount: number) => new Intl.NumberFormat("en-IN").format(amount);

  const getStatusStyle = (status: Batch["status"]) => {
    const styles = {
      active: "bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-300",
      upcoming: "bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-300",
      completed: "bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-300",
      inactive: "bg-red-100 text-red-800 dark:bg-red-800/30 dark:text-red-300",
    };
    return styles[status] || "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  if (loading) {
    return (
      <>
        <PageMeta title="Loading Batch..." />
        <PageBreadcrumb pageTitle="Loading..." />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <Skeleton className="h-10 w-3/5 mb-6" />
            <Skeleton className="h-64 w-full rounded-xl mb-8" />
            <div className="grid md:grid-cols-2 gap-6">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !batch) {
    return (
      <>
        <PageMeta title="Batch Not Found" />
        <PageBreadcrumb pageTitle="Error" />
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            {error || "Batch Not Found"}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The batch may have been removed or is temporarily unavailable.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={fetchBatch}
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
            <Link
              to="/all-courses"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium rounded-lg transition"
            >
              <ArrowLeft size={18} />
              Back to Batches
            </Link>
          </div>
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────
  // Computed values
  // ────────────────────────────────────────────────

  const finalPrice = batch.batchDiscountPrice > 0 ? batch.batchDiscountPrice : batch.batchPrice;
  const gstAmount = Math.round((finalPrice * batch.gst) / 100);
  const savings = batch.batchDiscountPrice > 0 ? batch.batchPrice - batch.batchDiscountPrice : 0;
  const hasEmiSchedule = Array.isArray(batch.emiSchedule) && batch.emiSchedule.length > 0;
  const totalEmiAmount = batch.emiTotal ?? finalPrice;
  const monthlyEmiEstimate = hasEmiSchedule
    ? Math.round(totalEmiAmount / batch.emiSchedule.length)
    : 0;

  return (
    <>
      <PageMeta title={`${batch.name} • Batch Details`} description={batch.shortDescription} />

      <PageBreadcrumb pageTitle={batch.name} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Top navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Link
            to="/all-courses"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition font-medium"
          >
            <ArrowLeft size={18} />
            Back to All Batches
          </Link>

          <Link
            to={`/all-courses/edit/${batch.id}`}
            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition shadow-sm"
          >
            Edit Batch
          </Link>
        </div>

        {/* Main content card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Hero */}
          <div className="relative h-64 md:h-80">
            {batch.imageUrl ? (
              <img
                src={batch.imageUrl}
                alt={batch.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src =
                    "https://via.placeholder.com/1200x400/6366f1/ffffff?text=Batch+Image";
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                <BookOpen className="w-24 h-24 text-white/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                  #{batch.position}
                </span>
                <span
                  className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getStatusStyle(
                    batch.status
                  )}`}
                >
                  {batch.status}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{batch.name}</h1>
            </div>
          </div>

          <div className="p-6 md:p-8 space-y-10">
            {/* Short Description */}
            <section>
              <h2 className="text-xl font-semibold flex items-center gap-3 mb-4 text-gray-900 dark:text-white">
                <Tag className="text-indigo-600" />
                Overview
              </h2>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                {batch.shortDescription}
              </p>
            </section>

            {/* Program & Subjects */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-white">
                  <BookOpen className="text-indigo-600" />
                  Program
                </h3>
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                  <p className="font-bold text-lg text-indigo-800 dark:text-indigo-300">
                    {batch.program.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    ID: {batch.program.id} • {batch.program.slug}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-white">
                  <Users className="text-purple-600" />
                  Subjects ({batch.subjects.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {batch.subjects.length === 0 ? (
                    <span className="text-gray-500 dark:text-gray-400 italic">
                      No subjects assigned yet
                    </span>
                  ) : (
                    batch.subjects.map((s) => (
                      <span
                        key={s.id}
                        className="px-4 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium"
                      >
                        {s.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-white">
                  <Calendar className="text-emerald-600" />
                  Batch Duration
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-sm border border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-gray-700 dark:text-gray-300">Starts</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {formatDate(batch.startDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-sm border border-rose-100 dark:border-rose-900/40">
                    <span className="text-gray-700 dark:text-gray-300">Ends</span>
                    <span className="font-semibold text-rose-700 dark:text-rose-300">
                      {formatDate(batch.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-3 text-gray-900 dark:text-white">
                  <Clock className="text-orange-600" />
                  Registration Window
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-xl text-sm border border-orange-100 dark:border-orange-900/40">
                    <span className="text-gray-700 dark:text-gray-300">Opens</span>
                    <span className="font-semibold text-orange-700 dark:text-orange-300">
                      {formatDate(batch.registrationStartDate)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-950/30 rounded-xl text-sm border border-red-100 dark:border-red-900/40">
                    <span className="text-gray-700 dark:text-gray-300">Closes</span>
                    <span className="font-semibold text-red-700 dark:text-red-300">
                      {formatDate(batch.registrationEndDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <section className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-indigo-950/40 rounded-2xl p-6 md:p-8 border border-indigo-100 dark:border-indigo-900/50">
              <h3 className="text-2xl font-bold flex items-center gap-3 mb-6 text-gray-900 dark:text-white">
                <IndianRupee className="text-indigo-600" size={28} />
                Pricing & Offer
              </h3>

              <div className="grid sm:grid-cols-3 gap-6 text-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Original</p>
                  <p className="text-xl font-bold text-gray-500 dark:text-gray-400 line-through">
                    ₹{formatPrice(batch.batchPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">You Pay</p>
                  <p className="text-3xl font-extrabold text-green-600 dark:text-green-400">
                    ₹{formatPrice(finalPrice)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    GST ({batch.gst}%)
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-gray-200">
                    +₹{formatPrice(gstAmount)}
                  </p>
                </div>
              </div>

              {savings > 0 && (
                <p className="text-center mt-6 text-lg font-bold text-green-600 dark:text-green-400">
                  You Save ₹{formatPrice(savings)} 🎉
                </p>
              )}

              {batch.offerValidityDays > 0 && (
                <p className="text-center mt-3 text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Offer valid for next {batch.offerValidityDays} days
                </p>
              )}
            </section>

            {/* EMI */}
            {batch.isEmi && (
              <section className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-emerald-950/40 rounded-2xl p-6 md:p-8 border border-emerald-100 dark:border-emerald-900/50">
                <h3 className="text-2xl font-bold flex items-center gap-3 mb-6 text-gray-900 dark:text-white">
                  <Calculator className="text-emerald-600" size={28} />
                  EMI Option Available
                </h3>

                {hasEmiSchedule ? (
                  <div className="bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="bg-emerald-600 text-white p-6 text-center">
                      <p className="text-sm font-medium opacity-90">Per Month</p>
                      <p className="text-4xl font-extrabold mt-1">
                        ₹{formatPrice(monthlyEmiEstimate)}
                      </p>
                    </div>

                    <div className="p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-72 overflow-y-auto">
                        {batch.emiSchedule.map((emi) => (
                          <div
                            key={emi.month}
                            className="text-center p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-100 dark:border-emerald-900/50"
                          >
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              Month {emi.month}
                            </p>
                            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                              ₹{formatPrice(emi.amount)}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 pt-6 border-t border-emerald-100 dark:border-emerald-900/50 flex justify-between items-center text-lg">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          Total Amount
                        </span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                          ₹{formatPrice(totalEmiAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-xl">
                    EMI is available — schedule will be provided upon registration
                  </div>
                )}
              </section>
            )}

            {/* Long Description */}
            {batch.longDescription && (
              <section>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  Detailed Description
                </h3>
                <div
                  className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: batch.longDescription }}
                />
              </section>
            )}

            {/* Meta */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">EMI Available</p>
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                  {batch.isEmi ? "Yes" : "No"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-semibold mt-1">{formatDate(batch.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Last Updated</p>
                <p className="font-semibold mt-1">{formatDate(batch.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewBatch;