const router = require('express').Router();
const ctrl = require('../controllers/PDFNoteController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const upload = require('../middleware/upload');

const pdfCategoryController = require("../controllers/pdfCategory.controller");


router.post("/pdf-category", pdfCategoryController.createPdfCategory);
router.get("/pdf-category", pdfCategoryController.getAllPdfCategories);
router.get("/pdf-category/:id", pdfCategoryController.getPdfCategoryById);
router.put("/pdf-category/:id", pdfCategoryController.updatePdfCategory);
router.delete("/pdf-category/:id", pdfCategoryController.deletePdfCategory);


router.get('/', ctrl.findAll);
router.post('/', auth, role(['admin']), upload.single('fileUrl'), ctrl.create);
router.get('/:id', ctrl.findOne);
router.put('/:id', auth, role(['admin']), upload.single('fileUrl'), ctrl.update);
router.delete('/:id', auth, role(['admin']), ctrl.delete);

module.exports = router;
