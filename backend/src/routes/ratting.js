const express = require("express");
const controller = require("../controllers/RatingController");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/",auth, controller.create);
router.get("/", controller.findAll);
router.get("/summary", controller.summary);
router.get("/:id", controller.findOne);
router.put("/:id", controller.update);
router.delete("/:id", controller.remove);

module.exports = router;
