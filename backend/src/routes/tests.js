const router = require("express").Router();
const ctrl = require("../controllers/TestController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");

router.get("/", ctrl.findAll);
router.post("/", auth, role(["admin"]), upload.single("solutionFileUrl"), ctrl.create);
router.get("/:id", ctrl.findOne);
router.put("/:id", auth, role(["admin"]), upload.single("solutionFileUrl"), ctrl.update);
router.delete("/:id", auth, role(["admin"]), ctrl.delete);
router.get('/:id/questions', auth, ctrl.getQuestions);
module.exports = router;
