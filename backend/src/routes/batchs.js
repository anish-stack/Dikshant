const router = require('express').Router();
const ctrl = require('../controllers/BatchController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require("../middleware/upload");

router.get('/', ctrl.findAll);
router.post('/', upload.single('imageUrl'), ctrl.create);
router.get('/:id', ctrl.findOne);
router.put('/:id', upload.single('imageUrl'), ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;

