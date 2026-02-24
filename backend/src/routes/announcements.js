const router = require("express").Router();
const ctrl = require("../controllers/AnnouncementController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");

router.get("/", ctrl.findAll);

router.post("/", upload.single("image"),ctrl.create);

router.get("/:id", ctrl.findOne);

router.put("/:id",upload.single("image"), ctrl.update);

router.delete("/:id", ctrl.delete);

module.exports = router;
