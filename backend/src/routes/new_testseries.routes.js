const express = require('express');
const router = express.Router();

const seriesController = require('../controllers/new_testSeries.controller');
const testController = require('../controllers/new_test.controller');
const questionController = require('../controllers/new_question.controller');
const purchaseController = require('../controllers/new_purchase.controller');
const mainsController = require('../controllers/new_mains.controller');
const analyticsController = require('../controllers/new_analytics.controller');
const notificationController = require('../controllers/new_notification.controller');
const adminController = require('../controllers/new_admin.controller');
const upload = require('../middleware/upload');
const protect = require('../middleware/auth');
const { getResult, getAllAttempts } = require('../controllers/result.testco');


// ─── Test Series ──────────────────────────────────────────────────────────────
router.get('/test-series', protect, seriesController.listSeries);
router.get('/test-series/admin/all', protect, seriesController.adminListSeries);
router.get('/test-series/:slug', protect, seriesController.getSeriesDetail);
router.post('/test-series', protect, upload.single('thumbnail'), seriesController.createSeries);
router.put('/test-series/:id', protect, upload.single('thumbnail'), seriesController.updateSeries);
router.delete('/test-series/:id', protect, seriesController.deleteSeries);
router.post('/test-series/:id/toggle-active', protect, seriesController.toggleActive);


// ─── Tests ────────────────────────────────────────────────────────────────────

router.get('/tests/admin/list', testController.adminListTests);
router.get('/tests/:id', protect, testController.getTest);
router.post('/tests/:id/start', protect, testController.startTest);
router.post('/tests/:id/autosave', protect, testController.autoSave);
router.post('/tests/:id/submit', protect, testController.submitTest);

router.get('/test/new/:id/result', protect, getResult);

router.get('/tests/all/:testId', protect, getAllAttempts);
router.get('/mains-test/:testId', protect, testController.mainsTestDetails);
router.post(
  '/mains/submit/:paperId',
  protect,
  upload.single('file'),
  testController.submitMainsAnswer
);
router.get(
  '/mains/my-submission/:paperId',
  protect,
  testController.getMySubmission
);

// 👉 Get all my mains submissions
router.get(
  '/mains/my-submissions',
  protect,
  testController.getMyAllSubmissions
);
// 👉 Get all submissions (filterable)
router.get(
  '/admin/mains/submissions',
  protect,
  testController.getAllSubmissions
);

// 👉 Start checking (mark under review)
router.put(
  '/admin/mains/start-check/:submissionId',
  protect,
  testController.startChecking
);

// 👉 Final check (upload checked PDF + marks)
router.put(
  '/admin/mains/check/:submissionId',
  protect,
  upload.single('file'),
  testController.checkMainsAnswer
);

// 👉 Re-check / update evaluation
router.put(
  '/admin/mains/recheck/:submissionId',
  protect,
  upload.single('file'),
  testController.recheckMainsAnswer
);



router.get('/tests/:id/solutions', protect, testController.getSolutions);
router.get('/tests/:id/leaderboard', testController.getLeaderboard);
router.post('/tests', protect, upload.single('answerKey'), testController.createTest);
router.put('/tests/:id', protect, upload.single('answerKey'), testController.updateTest);
router.put('/tests/:id/status', protect, testController.updateTestStatus);
router.delete('/tests/:id', protect, testController.deleteTest);


// ─── Questions ────────────────────────────────────────────────────────────────

router.get('/questions', protect, questionController.listQuestions);
router.get('/questions/:id', protect, questionController.getQuestion);
router.post('/questions', protect,
  upload.fields([{ name: 'question_image', maxCount: 1 }]),

  questionController.createQuestion
);
router.put('/questions/:id', protect,
  upload.fields([{ name: 'question_image', maxCount: 1 }]),
  questionController.updateQuestion
);
router.delete('/questions/:id', protect, questionController.deleteQuestion);
router.post('/questions/bulk', protect, questionController.bulkCreateQuestions);
router.post('/questions/reorder', protect, questionController.reorderQuestions);
router.post('/questions/:id/check-links', protect, questionController.checkLinks);

// ─── Mains Papers ────────────────────────────────────────────────────────────────

router.post("/mains-paper", upload.fields([
  { name: "question_pdf", maxCount: 1 },
  { name: "model_answer_pdf", maxCount: 1 },
]), questionController.createMainsPaper);

router.get("/mains-paper/:test_id", questionController.getMainsPaper);
router.put("/mains-paper/:id", upload.fields([
  { name: "question_pdf", maxCount: 1 },
  { name: "model_answer_pdf", maxCount: 1 },
]), questionController.updateMainsPaper);
router.delete("/mains-paper/:id", questionController.deleteMainsPaper);
router.patch("/mains-paper/:id/status", questionController.updatePaperStatus);



// ─── Purchases ────────────────────────────────────────────────────────────────

router.post('/purchases', protect, purchaseController.initiatePurchase);
router.post(
  "/admin/assign-series",
  protect,
  purchaseController.assignTestSeriesViaAdmin
);
router.post('/purchases/verify', protect, purchaseController.verifyPayment);
router.post('/purchases/webhook', purchaseController.razorpayWebhook); // No auth — Razorpay webhook
router.get('/purchases/my', protect, purchaseController.getMyPurchases);
router.get('/purchases/admin/all', protect, purchaseController.adminListPurchases);
router.post('/purchases/:id/refund', protect, purchaseController.refundPurchase);

// Coupons
router.post('/purchases/validate-coupon', protect, purchaseController.validateCoupon);
router.post('/purchases/coupons', protect, purchaseController.createCoupon);
router.get('/purchases/coupons', protect, purchaseController.listCoupons);
router.put('/purchases/coupons/:id', protect, purchaseController.updateCoupon);

// ─── Mains ────────────────────────────────────────────────────────────────────

router.post('/mains/submit', protect, upload.single('pdf'), mainsController.submitMainsAnswer);
router.post('/mains/submit-all', protect, mainsController.submitMainsTest);
router.get('/mains/my-submissions', protect, mainsController.getMySubmissions);
router.get('/mains/pending', protect, mainsController.getPendingEvaluations);
router.post('/mains/:id/evaluate', protect, upload.single('checked_pdf'), mainsController.submitEvaluation);
router.put('/mains/:id/publish', protect, mainsController.publishResult);
router.get('/mains/evaluator/stats', protect, mainsController.getEvaluatorStats);

// Evaluator management
router.post('/mains/evaluators', protect, mainsController.createEvaluator);
router.get('/mains/evaluators', protect, mainsController.listEvaluators);
router.put('/mains/evaluators/:id', protect, mainsController.updateEvaluator);
router.post('/mains/assign', protect, mainsController.assignEvaluation);

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get('/analytics/my/performance', protect, analyticsController.getMyPerformance);
router.get('/analytics/my/attempt/:attempt_id', protect, analyticsController.getAttemptAnalysis);
router.get('/analytics/test/:id', protect, analyticsController.getTestAnalytics);
router.get('/analytics/revenue', protect, analyticsController.getRevenueAnalytics);
router.get('/analytics/overview', protect, analyticsController.getDashboardOverview);
router.get('/analytics/series/:id', protect, analyticsController.getSeriesAnalytics);

// ─── Notifications ────────────────────────────────────────────────────────────

router.get('/notifications', protect, notificationController.getMyNotifications);
router.get('/notifications/unread-count', protect, notificationController.getUnreadCount);
router.put('/notifications/mark-all-read', protect, notificationController.markAllRead);
router.put('/notifications/:id/read', protect, notificationController.markRead);
router.post('/notifications/send', protect, notificationController.sendNotification);
router.post('/notifications/send-test-reminder', protect, notificationController.sendTestReminder);
router.get('/notifications/admin/list', protect, notificationController.adminListNotifications);
router.delete('/notifications/:id', protect, notificationController.deleteNotification);

// ─── Admin ────────────────────────────────────────────────────────────────────

router.get('/admin/users', protect, adminController.listUsers);
router.get('/admin/users/:id', protect, adminController.getUser);
router.post('/admin/users', protect, adminController.createUser);
router.put('/admin/users/:id', protect, adminController.updateUser);
router.delete('/admin/users/:id', protect, adminController.deleteUser);
router.put('/admin/users/:id/reset-password', protect, adminController.adminResetPassword);
router.get('/admin/users/:id/attempts', protect, adminController.getUserAttempts);
router.post('/admin/users/bulk-email', protect, adminController.bulkEmail);

router.post('/admin/ranks/recalculate', protect, adminController.triggerRankRecalculation);
router.get('/admin/ranks/:test_id', protect, adminController.getTestRanks);

router.get('/admin/system/health', protect, adminController.systemHealth);
router.get('/admin/system/queue-stats', protect, adminController.getQueueStats);

module.exports = router;