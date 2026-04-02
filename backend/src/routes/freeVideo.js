'use strict';
const router = require("express").Router();
const FreeVideoController = require("../controllers/freeVideo.controller");

router.post("/playlist", FreeVideoController.createPlaylist);
router.get("/playlist", FreeVideoController.getPlaylists);
router.put("/playlist/:id", FreeVideoController.updatePlaylist);
router.delete("/playlist/:id", FreeVideoController.deletePlaylist);

router.post("/video", FreeVideoController.addVideo);
router.get("/video/:playlistId", FreeVideoController.getVideos);
router.put("/video/:id", FreeVideoController.updateVideo);
router.delete("/video/:id", FreeVideoController.deleteVideo);

module.exports = router;