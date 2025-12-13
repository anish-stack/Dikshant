const router = require('express').Router();
const ctrl = require('../controllers/BatchController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require("../middleware/upload");

router.get('/', ctrl.findAll);
router.post('/', auth, role(['admin']), upload.single('imageUrl'), ctrl.create);
router.get('/:id', ctrl.findOne);
router.put('/:id', upload.single('imageUrl'), ctrl.update);
router.delete('/:id', auth, role(['admin']), ctrl.delete);

module.exports = router;

