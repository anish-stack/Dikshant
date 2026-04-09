"use strict";

const { FreeVideoPlaylist, FreeVideo } = require("../models");
const { Op } = require("sequelize");
const PositionService = require("../utils/position.service");

class FreeVideoController {

  /* =====================================================
     PLAYLIST CRUD
  ====================================================== */


  static async createPlaylist(req, res) {
    try {

      let position = Number(req.body.position);

      if (!position || position < 1) {
        const maxPosition = await FreeVideoPlaylist.max("position");
        position = (maxPosition || 0) + 1;
      }

      position = await PositionService.insert(FreeVideoPlaylist, "position", req.body.position)


      const item = await FreeVideoPlaylist.create({
        title: req.body.title,
        slug: req.body.title.toLowerCase().replace(/\s+/g, "-"),
        description: req.body.description,
        subjectId: req.body.subjectId,
        position
      });

      return res.status(201).json(item);

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Create playlist failed", err });
    }
  }

  static async getPlaylists(req, res) {
    try {

      const items = await FreeVideoPlaylist.findAll({
        order: [["position", "ASC"]],
        include: [{ model: FreeVideo, as: "videos" }]
      });

      return res.json(items);

    } catch (err) {
      return res.status(500).json({ message: "Fetch failed", err });
    }
  }

  static async updatePlaylist(req, res) {
    try {

      const item = await FreeVideoPlaylist.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Playlist not found" });

      let position = req.body.position ?? item.position;

      position = await PositionService.swap(FreeVideoPlaylist, req.params.id, "position", req.body.position)


      await item.update({
        title: req.body.title ?? item.title,
        description: req.body.description ?? item.description,
        subjectId: req.body.subjectId ?? item.subjectId,
        position: newPo
      });

      return res.json(item);

    } catch (err) {
      return res.status(500).json({ message: "Update failed", err });
    }
  }

  static async deletePlaylist(req, res) {
    try {

      const item = await FreeVideoPlaylist.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Playlist not found" });

      await item.destroy();

      const playlists = await FreeVideoPlaylist.findAll({ order: [["position", "ASC"]] });

      for (let i = 0; i < playlists.length; i++) {
        await playlists[i].update({ position: i + 1 });
      }

      return res.json({ message: "Playlist deleted" });

    } catch (err) {
      return res.status(500).json({ message: "Delete failed", err });
    }
  }

  /* =====================================================
     VIDEO CRUD
  ====================================================== */

  static async addVideo(req, res) {
    try {

      function extractYoutubeId(url) {
        if (!url) return null;

        const regExp =
          /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/;

        const match = url.match(regExp);

        if (match && match[1]) {
          return match[1];
        }

        // If already videoId
        if (url.length === 11) {
          return url;
        }

        return null;
      }

      const { playlistId } = req.body;
      console.log(req.body)
      let position = Number(req.body.position);

      if (!position || position < 1) {
        const maxPosition = await FreeVideo.max("position", { where: { playlistId } });
        position = (maxPosition || 0) + 1;
      }

      const newPos = await PositionService.insert(FreeVideo, "position", req.body.position)

      const videoId = extractYoutubeId(req.body.youtubeUrl)
      console.log(videoId)
      const item = await FreeVideo.create({
        playlistId,
        title: req.body.title,
        youtubeUrl: req.body.youtubeUrl,
        youtubeVideoId: videoId,
        description: req.body?.description || null,
        duration: req.body.duration,
        position: newPos
      });

      return res.status(201).json(item);

    } catch (err) {
      return res.status(500).json({ message: "Add video failed", err });
    }
  }

  static async getVideos(req, res) {
    try {

      const items = await FreeVideo.findAll({
        where: { playlistId: req.params.playlistId },
        order: [["position", "ASC"]]
      });

      return res.json(items);

    } catch (err) {
      return res.status(500).json({ message: "Fetch failed", err });
    }
  }

  static async updateVideo(req, res) {
    try {

      // Extract YouTube Video ID
      const extractYoutubeId = (url) => {
        if (!url) return null;

        const regExp =
          /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]+)/;

        const match = url.match(regExp);

        if (match && match[1]) return match[1];

        // If already videoId
        if (url.length === 11) return url;

        return null;
      };

      const item = await FreeVideo.findByPk(req.params.id);

      if (!item) {
        return res.status(404).json({ message: "Video not found" });
      }

      // Handle position swap
      const newPosition = await PositionService.swap(
        FreeVideo,
        req.params.id,
        "position",
        req.body.position
      );

      // Extract videoId from URL or ID
      const youtubeVideoId = req.body.youtubeUrl
        ? extractYoutubeId(req.body.youtubeUrl)
        : item.youtubeVideoId;

      await item.update({
        title: req.body.title ?? item.title,
        youtubeVideoId: youtubeVideoId,
        youtubeVideoId: youtubeVideoId ?? item.youtubeVideoId,
        duration: req.body.duration ?? item.duration,
        description: req.body.description ?? item.description,
        position: newPosition ?? item.position
      });

      return res.json(item);

    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "Update failed", err });
    }
  }

  static async deleteVideo(req, res) {
    try {

      const item = await FreeVideo.findByPk(req.params.id);

      if (!item) return res.status(404).json({ message: "Video not found" });

      const playlistId = item.playlistId;

      await item.destroy();

      const videos = await FreeVideo.findAll({
        where: { playlistId },
        order: [["position", "ASC"]]
      });

      for (let i = 0; i < videos.length; i++) {
        await videos[i].update({ position: i + 1 });
      }

      return res.json({ message: "Video deleted" });

    } catch (err) {
      return res.status(500).json({ message: "Delete failed", err });
    }
  }
}

module.exports = FreeVideoController;