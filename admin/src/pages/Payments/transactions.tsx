import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, startOfDay, isAfter, isBefore } from "date-fns";
import {
  ShoppingCart,
  TrendingUp,
  Users,
  RefreshCw,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  IndianRupee,
  CalendarRange,
} from "lucide-react";

const API_BASE = "https://www.app.api.dikshantias.com/api/admin/";
const token = localStorage.getItem("accessToken");

interface Order {
  id: number;
  userId: number;
  type: string;
  itemId: number;
  amount: number;
  totalAmount: number;
  status: string;
  paymentDate?: string;
  createdAt: string;
  user: { name: string; email: string };
  itemName: string;
  razorpayOrderId: string;
  reason?: string;
}

interface Stats {
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: string;
  byType: Array<{ type: string; revenue: number; count: number }>;
  topBuyers: Array<{
    userId: number;
    totalSpent: number;
    orderCount: number;
    user: { name: string; email: string };
  }>;
  recentOrders: Order[];
}

// ─── Date Range Picker ────────────────────────────────────────────────────────

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const QUICK_RANGES = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [selecting, setSelecting] = useState<"start" | "end" | null>(null);
  const [tempStart, setTempStart] = useState<Date | null>(startDate ? new Date(startDate) : null);
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate ? new Date(endDate) : null);
  const [leftMonth, setLeftMonth] = useState(startDate ? subMonths(new Date(startDate), 0) : subMonths(new Date(), 1));
  const [rightMonth, setRightMonth] = useState(endDate ? new Date(endDate) : new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDayClick = (day: Date) => {
    if (!selecting || selecting === "start") {
      setTempStart(day);
      setTempEnd(null);
      setSelecting("end");
    } else {
      if (isBefore(day, tempStart!)) {
        setTempEnd(tempStart);
        setTempStart(day);
      } else {
        setTempEnd(day);
      }
      setSelecting(null);
    }
  };

  const applyRange = () => {
    if (tempStart && tempEnd) {
      onChange(format(tempStart, "yyyy-MM-dd"), format(tempEnd, "yyyy-MM-dd"));
      setOpen(false);
    }
  };

  const clearRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempStart(null);
    setTempEnd(null);
    setSelecting(null);
    onChange("", "");
    setOpen(false);
  };

  const applyQuick = (days: number) => {
    const end = new Date();
    const start = days === 0 ? end : new Date(Date.now() - days * 86400000);
    setTempStart(start);
    setTempEnd(end);
    onChange(format(start, "yyyy-MM-dd"), format(end, "yyyy-MM-dd"));
    setOpen(false);
  };

  const renderMonth = (baseMonth: Date) => {
    const start = startOfMonth(baseMonth);
    const end = endOfMonth(baseMonth);
    const days = eachDayOfInterval({ start, end });
    const firstDow = start.getDay(); // 0 = Sunday
    const blanks = Array(firstDow).fill(null);

    return (
      <div className="w-64">
        <div className="grid grid-cols-7 gap-0.5 text-center">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="text-[11px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
          {blanks.map((_, i) => <div key={`b${i}`} />)}
          {days.map((day) => {
            const isStart = tempStart && isSameDay(day, tempStart);
            const isEnd = tempEnd && isSameDay(day, tempEnd);
            const inRange =
              tempStart && (tempEnd || hoverDate)
                ? isWithinInterval(day, {
                  start: startOfDay(tempStart),
                  end: startOfDay(tempEnd || hoverDate!),
                })
                : false;
            const isToday = isSameDay(day, new Date());

            return (
              <button
                key={day.toISOString()}
                onMouseEnter={() => selecting === "end" && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(null)}
                onClick={() => handleDayClick(day)}
                className={[
                  "relative h-8 w-full text-sm transition-all",
                  isStart || isEnd
                    ? "bg-indigo-600 text-white rounded-lg font-semibold z-10"
                    : inRange
                      ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg",
                  isToday && !isStart && !isEnd ? "ring-1 ring-indigo-400 rounded-lg" : "",
                ].join(" ")}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const hasRange = startDate && endDate;
  const displayLabel = hasRange
    ? `${format(new Date(startDate), "MMM d")} → ${format(new Date(endDate), "MMM d, yyyy")}`
    : "Select date range";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex items-center gap-2 px-3 py-2.5 border rounded-lg text-sm transition min-w-[220px]",
          hasRange
            ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300",
        ].join(" ")}
      >
        <CalendarRange size={16} className="shrink-0" />
        <span className="flex-1 text-left">{displayLabel}</span>
        {hasRange && (
          <X size={14} onClick={clearRange} className="shrink-0 hover:text-red-500 transition" />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 w-max">
          {/* Quick ranges */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => applyQuick(r.days)}
                className="px-3 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition font-medium"
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Calendars */}
          <div className="flex gap-6">
            {/* Left month */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setLeftMonth((m) => subMonths(m, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {format(leftMonth, "MMMM yyyy")}
                </span>
                <button onClick={() => setLeftMonth((m) => addMonths(m, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ChevronRight size={16} />
                </button>
              </div>
              {renderMonth(leftMonth)}
            </div>

            <div className="w-px bg-gray-200 dark:bg-gray-700" />

            {/* Right month */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setRightMonth((m) => subMonths(m, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {format(rightMonth, "MMMM yyyy")}
                </span>
                <button onClick={() => setRightMonth((m) => addMonths(m, 1))} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
                  <ChevronRight size={16} />
                </button>
              </div>
              {renderMonth(rightMonth)}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {selecting === "end" ? "Now select end date" : tempStart && !tempEnd ? "Click a date to confirm" : tempStart && tempEnd ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                  {format(tempStart, "MMM d")} → {format(tempEnd, "MMM d, yyyy")}
                </span>
              ) : "Click to pick start date"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={applyRange}
                disabled={!tempStart || !tempEnd}
                className="px-4 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Transactions = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "15");
  const search = searchParams.get("search") || "";
  const statusFilter = searchParams.get("status") || "";
  const typeFilter = searchParams.get("type") || "";
  const startDate = searchParams.get("startDate") || "";
  const endDate = searchParams.get("endDate") || "";
  const statsPeriod = searchParams.get("statsPeriod") || "30d";

  const [stats, setStats] = React.useState<Stats | null>(null);
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [totalPages, setTotalPages] = React.useState(1);

  const axiosConfig = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), []);

  const updateParams = (newParams: Record<string, string | number | undefined>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === "" || value === 0) next.delete(key);
        else next.set(key, String(value));
      });
      return next;
    });
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_BASE}orders/stats`, { ...axiosConfig, params: { period: statsPeriod } });
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page, limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };
      const res = await axios.get(`${API_BASE}orders`, { ...axiosConfig, params });
      if (res.data.success) {
        setOrders(res.data.data);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const res = await axios.get(`${API_BASE}orders/export`, { ...axiosConfig, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `orders_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert("Failed to download export");
    }
  };

  const navigateToItem = (order: Order) => {
    const map: Record<string, string> = {
      batch: `/all-courses/view/${order.itemId}`,
      quiz: `/create-quizzes?id=${order.itemId}`,
      test: `/testseries/${order.itemId}`,
      quiz_bundle: `/edit-quiz-bundle/${order.itemId}`,
      test_series_bundle: `/edit-test-series-bundle/${order.itemId}`,
    };
    if (map[order.type]) navigate(map[order.type]);
  };

  useEffect(() => { fetchStats(); }, [statsPeriod]);
  useEffect(() => { fetchOrders(); }, [page, limit, search, statusFilter, typeFilter, startDate, endDate]);

  const formatCurrency = (paise: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise);

  const getTypeColor = (type: string) => {
    const map: Record<string, string> = {
      batch: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
      quiz: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
      test: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
      quiz_bundle: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
      test_series_bundle: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
    };
    return map[type] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getStatusColor = (status: string) => {
    if (status === "success") return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    if (status === "pending") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    if (status === "failed" || status === "cancelled") return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    if (status === "refunded") return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const hasActiveFilters = search || statusFilter || typeFilter || startDate || endDate;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage all purchases on the platform</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>

        {/* Stats Period Selector */}
        <div className="flex flex-wrap gap-2">
          {["7d", "30d", "90d", "all"].map((p) => (
            <button
              key={p}
              onClick={() => updateParams({ statsPeriod: p })}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${statsPeriod === p
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600"
                }`}
            >
              {p === "all" ? "All Time" : p}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={<IndianRupee color="#fff" size={22} />} title="Total Revenue" value={formatCurrency(stats.totalRevenue)} color="indigo" />
            <StatCard icon={<ShoppingCart color="#fff" size={22} />} title="Total Orders" value={stats.orderCount.toLocaleString()} color="blue" />
            <StatCard icon={<TrendingUp color="#fff" size={22} />} title="Avg. Order Value" value={formatCurrency(parseFloat(stats.averageOrderValue))} color="violet" />
            <StatCard icon={<Users color="#fff" size={22} />} title="Top Buyer Spend" value={stats.topBuyers[0] ? formatCurrency(stats.topBuyers[0].totalSpent) : "—"} color="amber" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search order ID, user, razorpay ID..."
                value={search}
                onChange={(e) => updateParams({ search: e.target.value, page: 1 })}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:text-white placeholder-gray-400"
              />
            </div>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[130px]"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Type */}
            <select
              value={typeFilter}
              onChange={(e) => updateParams({ type: e.target.value, page: 1 })}
              className="px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm min-w-[160px]"
            >
              <option value="">All Types</option>
              <option value="batch">Batch</option>
              <option value="quiz">Quiz</option>
              <option value="test">Test Series</option>
              <option value="quiz_bundle">Quiz Bundle</option>
              <option value="test_series_bundle">Test Series Bundle</option>
            </select>

            {/* Date Range Picker */}
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => updateParams({ startDate: start, endDate: end, page: 1 })}
            />

            {/* Clear all filters */}
            {hasActiveFilters && (
              <button
                onClick={() => updateParams({ search: "", status: "", type: "", startDate: "", endDate: "", page: 1 })}
                className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition border border-red-200 dark:border-red-800"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <RefreshCw className="animate-spin mb-4" size={32} />
              <p className="text-sm">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-600 dark:text-red-400 text-sm">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
              No transactions found for the selected filters.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900/60">
                    <tr>
                      {["Order", "User", "Type", "Item", "Amount", "Status", "Date"].map((h) => (
                        <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">#{order.id}</div>
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">
                            {order.razorpayOrderId
                              ? `${order.razorpayOrderId.slice(0, 14)}…`
                              : "FREE-ORDER"}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{order.user?.name || "—"}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.user?.email}</div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${getTypeColor(order.type)}`}>
                            {order.type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <button
                            onClick={() => navigateToItem(order)}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
                          >
                            {order.itemName || "View Item"}
                          </button>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {format(new Date(order.createdAt), "dd MMM yyyy")}
                          <div className="text-xs text-gray-400">{format(new Date(order.createdAt), "hh:mm a")}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-5 py-4 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 dark:border-gray-700 gap-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page <strong className="text-gray-900 dark:text-white">{page}</strong> of <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateParams({ page: page - 1 })}
                    disabled={page <= 1}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    onClick={() => updateParams({ page: page + 1 })}
                    disabled={page >= totalPages}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; icon: string }> = {
  indigo: { bg: "bg-indigo-50 dark:bg-indigo-900/20", icon: "bg-indigo-600" },
  blue: { bg: "bg-blue-50 dark:bg-blue-900/20", icon: "bg-blue-600" },
  violet: { bg: "bg-violet-50 dark:bg-violet-900/20", icon: "bg-violet-600" },
  amber: { bg: "bg-amber-50 dark:bg-amber-900/20", icon: "bg-amber-600" },
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode; title: string; value: string | number; color: string }) => {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 p-5 ${c.bg} flex items-center gap-4`}>
      <div className={`${c.icon} p-2.5 rounded-xl shrink-0`}>{icon}</div>
      <div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
};

export default Transactions;