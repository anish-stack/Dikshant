const router = require("express").Router();
const ctrl = require("../controllers/authController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.post("/signup", ctrl.signup);
router.post("/request-otp", ctrl.requestOtp);
router.post("/verify-otp", ctrl.verifyOtp);
router.post("/login", ctrl.login);
router.post("/admin-login", ctrl.adminLogin);
router.put("/profile", auth, ctrl.updateProfile);
router.get("/profile-details", auth, ctrl.getProfile);
router.get("/refresh-token", ctrl.refreshToken);
router.get("/logout", auth, ctrl.logout);
router.post("/update-fcm-token", auth, ctrl.updateFcmToken);
router.post("/update-password", ctrl.updatePassword);

router.patch("/users/:userId/toggle-active",auth,role(["admin"]),ctrl.toggleUserActive);

// Delete user and all related data
router.delete("/users/:userId",auth,role(["admin"]),ctrl.deleteUser);

router.get("/all-profile", ctrl.getAllProfile);

module.exports = router;
