const router = require("express").Router();
const ctrl = require("../controllers/CouponController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");

router.get("/", ctrl.findAll);
router.post("/", auth, role(["admin"]), ctrl.create);
router.post("/apply", ctrl.apply);
router.put("/:id", auth, role(["admin"]), ctrl.update);
router.delete("/:id", auth, role(["admin"]), ctrl.delete);

module.exports = router;
