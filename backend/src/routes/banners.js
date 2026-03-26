'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/BannerController");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const upload = require("../middleware/upload");

const uploadFields = upload.fields([
  { name: "imageUrl", maxCount: 1 },
  { name: "MobileImageUrl", maxCount: 1 }
]);
router.get("/", ctrl.findAll);
router.get("/:id", ctrl.findOne);

router.post( "/", uploadFields, ctrl.create);
router.put( "/:id", uploadFields, ctrl.update);
router.delete("/:id",  ctrl.delete);

module.exports = router;
