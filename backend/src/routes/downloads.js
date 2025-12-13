'use strict';
const router = require("express").Router();
const ctrl = require("../controllers/DownloadController");
const auth = require("../middleware/auth");

router.post("/", auth, ctrl.create);               // Save download log  
router.get("/:userId", auth, ctrl.findByUser);     // Fetch user downloads
router.get("/", (req, res) => res.status(200).json({ message: "Downloads endpoint" }));
router.delete("/:userId/:id", auth, ctrl.deletebyUser);          // Delete all downloads (admin only)


module.exports = router;