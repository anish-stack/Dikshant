const { User, Order, Batch, VideoCourse, Sequelize } = require("../models");
const { Op } = Sequelize;

class AdminStatisticsController {
  
  // GET ADMIN DASHBOARD STATISTICS
  static async getAdminStatistics(req, res) {
    try {
      // 1️⃣ Total Students
      const totalStudents = await User.count({
        where: { role: "student" }
      });

      // 2️⃣ Enrolled Students (with successful orders)
      const enrolledStudents = await Order.count({
        where: { 
          status: "success",
          type: "batch"
        },
        distinct: true,
        col: "userId"
      });

      // 3️⃣ Total Revenue (from successful orders)
      const revenueData = await Order.findAll({
        where: { status: "success" },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "totalRevenue"],
          [Sequelize.fn("SUM", Sequelize.col("amount")), "totalAmount"],
          [Sequelize.fn("SUM", Sequelize.col("discount")), "totalDiscount"],
          [Sequelize.fn("SUM", Sequelize.col("gst")), "totalGst"],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalOrders"]
        ],
        raw: true
      });

      const revenue = {
        totalRevenue: parseFloat(revenueData[0]?.totalRevenue || 0).toFixed(2),
        totalAmount: parseFloat(revenueData[0]?.totalAmount || 0).toFixed(2),
        totalDiscount: parseFloat(revenueData[0]?.totalDiscount || 0).toFixed(2),
        totalGst: parseFloat(revenueData[0]?.totalGst || 0).toFixed(2),
        totalOrders: parseInt(revenueData[0]?.totalOrders || 0)
      };

      // 4️⃣ Total Batches
      const totalBatches = await Batch.count();

      // 5️⃣ Active Batches
      const activeBatches = await Batch.count({
        where: { status: "active" }
      });

      // 6️⃣ Total Videos Uploaded
      const totalVideos = await VideoCourse.count();

      // 7️⃣ Live Videos Count
      const liveVideos = await VideoCourse.count({
        where: { isLive: true, isLiveEnded: false }
      });

      // 8️⃣ Scheduled Live Classes (upcoming)
      const today = new Date();
      const scheduledLiveClasses = await VideoCourse.count({
        where: {
          isLive: true,
          isLiveEnded: false,
          DateOfLive: { [Op.gte]: today }
        }
      });

      // 9️⃣ Best Selling Courses (Top 5)
      const bestSellingCourses = await Order.findAll({
        where: { 
          status: "success",
          type: "batch"
        },
        attributes: [
          "itemId",
          [Sequelize.fn("COUNT", Sequelize.col("Order.id")), "totalSales"],
          [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "totalRevenue"]
        ],
        include: [
          {
            model: Batch,
            as: "batch",
            attributes: ["id", "name", "imageUrl", "batchPrice", "batchDiscountPrice"]
          }
        ],
        group: ["itemId"],
        order: [[Sequelize.literal("totalSales"), "DESC"]],
        limit: 5,
        raw: false
      });

      // 🔟 Average Students Per Course
      const courseEnrollments = await Order.findAll({
        where: { 
          status: "success",
          type: "batch"
        },
        attributes: [
          "itemId",
          [Sequelize.fn("COUNT", Sequelize.col("userId")), "studentCount"]
        ],
        group: ["itemId"],
        raw: true
      });

      const avgStudentsPerCourse = courseEnrollments.length > 0
        ? (courseEnrollments.reduce((sum, c) => sum + parseInt(c.studentCount), 0) / courseEnrollments.length).toFixed(2)
        : 0;

      // 1️⃣1️⃣ Recent Enrollments (Last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentEnrollments = await Order.count({
        where: {
          status: "success",
          type: "batch",
          createdAt: { [Op.gte]: sevenDaysAgo }
        }
      });

      // 1️⃣2️⃣ Revenue This Month
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyRevenue = await Order.findAll({
        where: {
          status: "success",
          createdAt: { [Op.gte]: firstDayOfMonth }
        },
        attributes: [
          [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "monthlyRevenue"],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "monthlyOrders"]
        ],
        raw: true
      });

      // 1️⃣3️⃣ Free Assignments Count (admin assigned courses)
      const freeAssignments = await Order.count({
        where: {
          status: "success",
          totalAmount: 0
        }
      });

      // 1️⃣4️⃣ Videos by Status
      const videoStats = await VideoCourse.findAll({
        attributes: [
          "status",
          [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
        ],
        group: ["status"],
        raw: true
      });

      const activeVideos = videoStats.find(v => v.status === "active")?.count || 0;
      const inactiveVideos = videoStats.find(v => v.status === "inactive")?.count || 0;

      // 1️⃣5️⃣ Demo vs Paid Videos
      const demoVideos = await VideoCourse.count({ where: { isDemo: true } });
      const paidVideos = totalVideos - demoVideos;

      // 📊 Final Response
      return res.json({
        status: "success",
        message: "Admin statistics fetched successfully",
        data: {
          students: {
            total: totalStudents,
            enrolled: enrolledStudents,
            notEnrolled: totalStudents - enrolledStudents
          },
          revenue: {
            ...revenue,
            monthlyRevenue: parseFloat(monthlyRevenue[0]?.monthlyRevenue || 0).toFixed(2),
            monthlyOrders: parseInt(monthlyRevenue[0]?.monthlyOrders || 0)
          },
          batches: {
            total: totalBatches,
            active: activeBatches,
            inactive: totalBatches - activeBatches
          },
          videos: {
            total: totalVideos,
            active: activeVideos,
            inactive: inactiveVideos,
            demo: demoVideos,
            paid: paidVideos,
            live: liveVideos,
            scheduledLive: scheduledLiveClasses
          },
          enrollments: {
            recentWeek: recentEnrollments,
            avgStudentsPerCourse: parseFloat(avgStudentsPerCourse)
          },
          freeAssignments,
          bestSellingCourses: bestSellingCourses.map(course => ({
            batchId: course.itemId,
            batchName: course.batch?.name || "N/A",
            batchImage: course.batch?.imageUrl || null,
            batchPrice: course.batch?.batchPrice || 0,
            batchDiscountPrice: course.batch?.batchDiscountPrice || 0,
            totalSales: parseInt(course.get("totalSales")),
            totalRevenue: parseFloat(course.get("totalRevenue")).toFixed(2)
          }))
        }
      });

    } catch (error) {
      console.error("Admin Statistics Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch admin statistics",
        error: error.message
      });
    }
  }

  // GET REVENUE BREAKDOWN BY MONTH (Last 12 months)
  static async getRevenueByMonth(req, res) {
    try {
      const { months = 12 } = req.query;
      
      const monthsAgo = new Date();
      monthsAgo.setMonth(monthsAgo.getMonth() - parseInt(months));

      const monthlyData = await Order.findAll({
        where: {
          status: "success",
          createdAt: { [Op.gte]: monthsAgo }
        },
        attributes: [
          [Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m"), "month"],
          [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "revenue"],
          [Sequelize.fn("COUNT", Sequelize.col("id")), "orders"]
        ],
        group: [Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m")],
        order: [[Sequelize.fn("DATE_FORMAT", Sequelize.col("createdAt"), "%Y-%m"), "ASC"]],
        raw: true
      });

      return res.json({
        status: "success",
        message: "Monthly revenue data fetched successfully",
        data: monthlyData.map(m => ({
          month: m.month,
          revenue: parseFloat(m.revenue).toFixed(2),
          orders: parseInt(m.orders)
        }))
      });

    } catch (error) {
      console.error("Revenue By Month Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch monthly revenue",
        error: error.message
      });
    }
  }

  // GET TOP PERFORMING BATCHES
  static async getTopBatches(req, res) {
    try {
      const { limit = 10 } = req.query;

      const topBatches = await Order.findAll({
        where: { 
          status: "success",
          type: "batch"
        },
        attributes: [
          "itemId",
          [Sequelize.fn("COUNT", Sequelize.col("Order.id")), "enrollments"],
          [Sequelize.fn("SUM", Sequelize.col("totalAmount")), "revenue"],
          [Sequelize.fn("AVG", Sequelize.col("totalAmount")), "avgOrderValue"]
        ],
        include: [
          {
            model: Batch,
            as: "batch",
            attributes: ["id", "name", "imageUrl", "batchPrice", "batchDiscountPrice", "category", "c_status"]
          }
        ],
        group: ["itemId"],
        order: [[Sequelize.literal("enrollments"), "DESC"]],
        limit: parseInt(limit),
        raw: false
      });

      return res.json({
        status: "success",
        message: "Top batches fetched successfully",
        data: topBatches.map(batch => ({
          batchId: batch.itemId,
          batchDetails: batch.batch,
          enrollments: parseInt(batch.get("enrollments")),
          revenue: parseFloat(batch.get("revenue")).toFixed(2),
          avgOrderValue: parseFloat(batch.get("avgOrderValue")).toFixed(2)
        }))
      });

    } catch (error) {
      console.error("Top Batches Error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to fetch top batches",
        error: error.message
      });
    }
  }

}

module.exports = AdminStatisticsController;