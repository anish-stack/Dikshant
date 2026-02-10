const ChatController = require("../controllers/ChatController");
const router = require("express").Router();

router.get("/admin-message", ChatController.adminMessage)
router.get("/joined-student/:videoId",ChatController.getUsersChatStatus)
router.get("/chat-message/:videoId",ChatController.getAllChatsMessageFromVideo)



router.post('/Student-join-api',ChatController.saveJoinApi)
router.post('/Student-Leave-api',ChatController.saveLeaveApi)
router.post("/chat/save-message", ChatController.saveMessageApi);

router.get("/history/:videoId", async (req, res) => {
    const { videoId } = req.params
    const limit = parseInt(req.query.limit) || 500

    const result = await ChatController.getChatHistory(videoId, limit)
    return res.json(result)
})
module.exports = router;
