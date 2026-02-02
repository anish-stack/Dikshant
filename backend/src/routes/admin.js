const router = require("express").Router();

const AdminStatisticsController = require("../controllers/AdminControllerDashboard");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get(
    "/statistics",
    auth,
    role(["admin"]),
    AdminStatisticsController.getAdminStatistics
);

router.get(
    "/statistics/revenue-by-month",
    auth,
    role(["admin"]),
    AdminStatisticsController.getRevenueByMonth
);

router.get(
    "/statistics/top-batches",
    auth,
    role(["admin"]),
    AdminStatisticsController.getTopBatches
);

module.exports = router;
