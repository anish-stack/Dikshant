import { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";
import toast from "react-hot-toast";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import {
  Users,
  GraduationCap,
  DollarSign,
  BookOpen,
  TrendingUp,
  Package,
  Video,
  PlayCircle,
  AlertCircle,
} from "lucide-react";
import { API_URL } from "../../constant/constant";
import Badge from "../../components/ui/badge/Badge";
import { Skeleton } from "../../components/ui/Skeleton/Skeleton";
import PageMeta from "../../components/common/PageMeta";

interface AdminStats {
  students: {
    total: number;
    enrolled: number;
    notEnrolled: number;
  };
  revenue: {
    totalRevenue: string;
    totalAmount: string;
    totalDiscount: string;
    totalGst: string;
    totalOrders: number;
    monthlyRevenue: string;
    monthlyOrders: number;
  };
  batches: {
    total: number;
    active: number;
    inactive: number;
  };
  videos: {
    total: number;
    active: number;
    inactive: number;
    demo: number;
    paid: number;
    live: number;
    scheduledLive: number;
  };
  enrollments: {
    recentWeek: number;
    avgStudentsPerCourse: number;
  };
  freeAssignments: number;
  bestSellingCourses: Array<{
    batchId: number;
    batchName: string;
    batchImage: string;
    batchPrice: number;
    batchDiscountPrice: number;
    totalSales: number;
    totalRevenue: string;
  }>;
}

interface MonthlyData {
  month: string;
  revenue: string;
  orders: number;
}

interface TopBatch {
  batchId: number;
  batchDetails: {
    id: number;
    name: string;
    imageUrl: string;
    batchPrice: number;
    batchDiscountPrice: number;
    category: string;
    c_status: string;
  };
  enrollments: number;
  revenue: string;
  avgOrderValue: string;
}

export default function Home() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topBatches, setTopBatches] = useState<TopBatch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminStatistics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, monthlyRes, batchesRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard/statistics`, { headers }),
        axios.get(`${API_URL}/admin/dashboard/statistics/revenue-by-month?months=12`, {
          headers,
        }),
        axios.get(`${API_URL}/admin/dashboard/statistics/top-batches?limit=10`, {
          headers,
        }),
      ]);

      setStats(statsRes.data.data);
      setMonthlyData(monthlyRes.data.data);
      setTopBatches(batchesRes.data.data);
    } catch (err) {
  const error = err as AxiosError<{ message?: string }>;
  console.error("Failed to fetch statistics:", error);

  if (!error.response) {
    toast.error("Network error. Please check your internet.");
  } else {
    toast.error(error.response.data?.message || "Failed to load dashboard statistics");
  }
} finally {
  setLoading(false);
}
  }
  useEffect(() => {
    fetchAdminStatistics();
  }, []);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  // Chart Options for Monthly Revenue
  const getRevenueChartOptions = (): ApexOptions => {
    const categories = monthlyData.map((d) => {
      const [year, month] = d.month.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    });

    return {
      colors: ["#465fff", "#00D4AA"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "bar",
        height: 280,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "55%",
          borderRadius: 6,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      stroke: {
        show: true,
        width: 4,
        colors: ["transparent"],
      },
      xaxis: {
        categories,
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "left",
        fontFamily: "Outfit",
        markers: { size: 12 },
      },
      yaxis: [
        {
          title: { text: "Revenue (₹)" },
          labels: {
            formatter: (val: number) => `₹${(val / 1000).toFixed(0)}K`,
          },
        },
        {
          opposite: true,
          title: { text: "Orders" },
          labels: { formatter: (val: number) => val.toFixed(0) },
        },
      ],
      grid: {
        yaxis: { lines: { show: true } },
        borderColor: "#E4E7EC",
      },
      fill: { opacity: 1 },
      tooltip: {
        shared: true,
        intersect: false,
        y: [
          {
            formatter: (val: number) =>
              `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`,
          },
          { formatter: (val: number) => `${val} Orders` },
        ],
      },
    };
  };

  const getRevenueTargetOptions = (): ApexOptions => {

    return {
      colors: ["#465FFF"],
      chart: {
        fontFamily: "Outfit, sans-serif",
        type: "radialBar",
        height: 330,
        sparkline: { enabled: true },
      },
      plotOptions: {
        radialBar: {
          startAngle: -85,
          endAngle: 85,
          hollow: { size: "80%" },
          track: {
            background: "#E4E7EC",
            strokeWidth: "100%",
            margin: 5,
          },
          dataLabels: {
            name: { show: false },
            value: {
              fontSize: "36px",
              fontWeight: "600",
              offsetY: -40,
              color: "#1D2939",
              formatter: function (val) {
                return val.toFixed(1) + "%";
              },
            },
          },
        },
      },
      fill: { type: "solid", colors: ["#465FFF"] },
      stroke: { lineCap: "round" },
      labels: ["Progress"],
    };
  };

  if (loading) {
    return (
      <>
        <PageMeta description="Admin Dashboard" title="Admin Dashboard | Loading..." />
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-12 space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
                >
                  <Skeleton className="w-12 h-12 rounded-xl mb-5" />
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Failed to load statistics</p>
      </div>
    );
  }

  const totalRevenue = parseFloat(stats.revenue.totalRevenue);
  const monthlyRevenue = parseFloat(stats.revenue.monthlyRevenue);
  const targetPercentage =
    totalRevenue > 0 ? (monthlyRevenue / totalRevenue) * 100 : 0;

  const revenueData = monthlyData.map((d) => parseFloat(d.revenue));
  const ordersData = monthlyData.map((d) => d.orders);

  return (
    <div>
      <PageMeta
        title="Admin Dashboard | Statistics"
        description="Comprehensive admin dashboard"
      />

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Main Metrics - 8 Cards */}
        <div className="col-span-12 xl:col-span-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
            {/* Total Students */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl dark:bg-blue-900/30">
                <Users className="text-blue-600 dark:text-blue-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total Students
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.students.total.toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Enrolled: {stats.students.enrolled}
                  </p>
                </div>
                <Badge color="primary" variant="light">
                  <TrendingUp className="w-3 h-3" />
                  {((stats.students.enrolled / stats.students.total) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>

            {/* Enrolled Students */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl dark:bg-green-900/30">
                <GraduationCap className="text-green-600 dark:text-green-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Enrolled Students
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.students.enrolled.toLocaleString()}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    This week: +{stats.enrollments.recentWeek}
                  </p>
                </div>
                <Badge color="success" variant="light">
                  Active
                </Badge>
              </div>
            </div>

            {/* Total Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl dark:bg-purple-900/30">
                <DollarSign className="text-purple-600 dark:text-purple-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total Revenue
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {formatCurrency(stats.revenue.totalRevenue)}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Orders: {stats.revenue.totalOrders}
                  </p>
                </div>
                <Badge color="success" variant="light">
                  <TrendingUp className="w-3 h-3" />
                </Badge>
              </div>
            </div>

            {/* Active Batches */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl dark:bg-orange-900/30">
                <BookOpen className="text-orange-600 dark:text-orange-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Active Batches
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.batches.active}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Total: {stats.batches.total}
                  </p>
                </div>
                <Badge color="warning" variant="light">
                  Live
                </Badge>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl dark:bg-indigo-900/30">
                <DollarSign className="text-indigo-600 dark:text-indigo-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Monthly Revenue
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {formatCurrency(stats.revenue.monthlyRevenue)}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Orders: {stats.revenue.monthlyOrders}
                  </p>
                </div>
                <Badge color="primary" variant="light">
                  Month
                </Badge>
              </div>
            </div>

            {/* Total Videos */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-xl dark:bg-red-900/30">
                <Video className="text-red-600 dark:text-red-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Total Videos
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.videos.total}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Active: {stats.videos.active}
                  </p>
                </div>
                <Badge color="error" variant="light">
                  <Video className="w-3 h-3" />
                </Badge>
              </div>
            </div>

            {/* Live Videos */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-rose-100 rounded-xl dark:bg-rose-900/30">
                <PlayCircle className="text-rose-600 dark:text-rose-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Live Classes
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.videos.live}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Scheduled: {stats.videos.scheduledLive}
                  </p>
                </div>
                <Badge color="error" variant="light">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                </Badge>
              </div>
            </div>

            {/* Free Assignments */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-pink-100 rounded-xl dark:bg-pink-900/30">
                <Package className="text-pink-600 dark:text-pink-400 size-6" />
              </div>
              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Free Assignments
                  </span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {stats.freeAssignments}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">Admin assigned</p>
                </div>
                <Badge color="primary" variant="light">
                  Free
                </Badge>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-5 pt-5 sm:px-6 sm:pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Monthly Revenue & Orders
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Last 12 months performance
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total Revenue
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                    {formatCurrency(
                      revenueData.reduce((sum, val) => sum + val, 0)
                    )}
                  </p>
                </div>
                <div className="w-px bg-gray-200 h-8 dark:bg-gray-800"></div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Total Orders
                  </p>
                  <p className="text-xl font-bold text-gray-800 dark:text-white/90">
                    {ordersData.reduce((sum, val) => sum + val, 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-full overflow-x-auto px-5 sm:px-6">
              <div className="-ml-5 min-w-[650px] xl:min-w-full pl-2">
                <Chart
                  options={getRevenueChartOptions()}
                  series={[
                    { name: "Revenue", type: "column", data: revenueData },
                    { name: "Orders", type: "line", data: ordersData },
                  ]}
                  type="line"
                  height={280}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Target Gauge */}
        <div className="col-span-12 xl:col-span-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
              <div className="flex justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    Revenue Target
                  </h3>
                  <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
                    Monthly vs Total Revenue
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="max-h-[330px]">
                  <Chart
                    options={getRevenueTargetOptions()}
                    series={[targetPercentage]}
                    type="radialBar"
                    height={330}
                  />
                </div>

                <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[95%] rounded-full bg-success-50 px-3 py-1 text-xs font-medium text-success-600 dark:bg-success-500/15 dark:text-success-500">
                  {targetPercentage > 10 ? "+" : ""}
                  {targetPercentage.toFixed(1)}%
                </span>
              </div>
              <p className="mx-auto mt-10 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
                Monthly revenue is {formatCurrency(monthlyRevenue)}, which is{" "}
                {targetPercentage.toFixed(1)}% of total revenue!
              </p>
            </div>

            <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
              <div>
                <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                  Total
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {formatCurrency(totalRevenue)}
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </p>
              </div>

              <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

              <div>
                <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                  Monthly
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {formatCurrency(monthlyRevenue)}
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </p>
              </div>

              <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

              <div>
                <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                  Orders
                </p>
                <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                  {stats.revenue.monthlyOrders}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Batches Table */}
        <div className="col-span-12">
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Top Performing Batches
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Batch
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Category
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Enrollments
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Revenue
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Avg Order Value
                    </th>
                    <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
          <tbody>
  {loading ? (
    // Skeleton Rows
    Array.from({ length: 5 }).map((_, i) => (
      <tr
        key={i}
        className="border-b border-gray-100 dark:border-gray-800"
      >
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div>
              <Skeleton className="h-4 w-40 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </td>
        <td className="py-4 px-6 text-center">
          <Skeleton className="h-6 w-20 mx-auto" />
        </td>
        <td className="py-4 px-6 text-center">
          <Skeleton className="h-5 w-16 mx-auto" />
        </td>
        <td className="py-4 px-6 text-center">
          <Skeleton className="h-5 w-24 mx-auto" />
        </td>
        <td className="py-4 px-6 text-center">
          <Skeleton className="h-5 w-20 mx-auto" />
        </td>
        <td className="py-4 px-6 text-center">
          <Skeleton className="h-6 w-20 mx-auto rounded-full" />
        </td>
      </tr>
    ))
  ) : topBatches.length === 0 ? (
    <tr>
      <td colSpan={6} className="text-center py-12 text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
        <p className="text-sm">No batch data available</p>
      </td>
    </tr>
  ) : (
    topBatches.map((batch, index) => {
      // ❌ Invalid batch safety
      if (!batch || !batch.batchDetails) {
        console.warn("Invalid batch data:", batch);
        return (
          <tr key={index}>
            <td colSpan={6} className="text-center py-6 text-gray-400">
              Batch data unavailable
            </td>
          </tr>
        );
      }

      const {
        name = "Untitled Batch",
        imageUrl,
        batchDiscountPrice = 0,
        category = "General",
        c_status = "Draft",
      } = batch.batchDetails;

      return (
        <tr
          key={batch.batchId || index}
          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <td className="py-4 px-6">
            <div className="flex items-center gap-4">
              <img
                src={imageUrl || "/placeholder-batch.jpg"}
                alt={name}
                className="w-12 h-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder-batch.jpg";
                }}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatCurrency(batchDiscountPrice)}
                </p>
              </div>
            </div>
          </td>

          <td className="py-4 px-6 text-center">
           <Badge variant="light" size="sm" color="light">
  {category}
</Badge>

          </td>

          <td className="py-4 px-6 text-center">
            <span className="font-semibold text-gray-800 dark:text-white text-lg">
              {batch.enrollments ?? 0}
            </span>
          </td>

          <td className="py-4 px-6 text-center">
            <span className="font-semibold text-green-600 dark:text-green-400 text-lg">
              {formatCurrency(batch.revenue ?? 0)}
            </span>
          </td>

          <td className="py-4 px-6 text-center">
            <span className="text-gray-700 dark:text-gray-300">
              {formatCurrency(batch.avgOrderValue ?? 0)}
            </span>
          </td>

          <td className="py-4 px-6 text-center">
            <Badge
  color={
    c_status === "Live"
      ? "success"
      : c_status === "Upcoming"
      ? "warning"
      : "dark"
  }
>
  {c_status}
</Badge>

          </td>
        </tr>
      );
    })
  )}
</tbody>

              </table>
            </div>

            {/* Optional: Footer note */}
            {!loading && topBatches.length > 0 && (
              <div className="mt-4 text-center text-xs text-gray-500">
                Showing top {topBatches.length} performing batches
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

)}
