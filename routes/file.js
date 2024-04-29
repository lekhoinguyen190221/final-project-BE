const express = require("express");
const multer = require("multer");
const router = express.Router();

// Set up Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Choose the directory to save the uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname); // Set the file name to be unique
  },
});
const upload = multer({ dest: "uploads/", storage: storage });

/**
 * @swagger
 * components:
 *   schemas:
 *     file:
 *       type: file
 */

/**
 * @swagger
 * tags:
 *   name: file
 *   description: The file managing API
 */

/**
 * @swagger
 * /file/upload:
 *   post:
 *     summary: Upload
 *     tags: [file]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 $ref: '#/components/schemas/file'
 *     responses:
 *        200:
 *          description: The list of the data
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                example: []
 *        500:
 *          description: Some server error
 */
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    file.path = `/static/${file.filename}`;
    res.status(200).json(file);
  } catch (error) {
    res.status(500).json({ message: "Đã có lỗi xảy ra" });
  }
});
module.exports = router;
