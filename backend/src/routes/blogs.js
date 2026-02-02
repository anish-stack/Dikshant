const router = require("express").Router();
const ctrl = require("../controllers/BlogController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");

router.get("/", ctrl.findAll);
router.get("/:slug", ctrl.findOne);
router.get("/details/:id", ctrl.findOneById);
router.post("/", auth, role(["admin"]), upload.single("imageUrl"), ctrl.create);
router.put("/:id", auth, role(["admin"]), upload.single("imageUrl"), ctrl.update);
router.delete("/:id", auth, role(["admin"]), ctrl.delete);

module.exports = router;
