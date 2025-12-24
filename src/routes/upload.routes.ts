import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { upload } from "../utils/fileUpload";
import { uploadLimiter } from "../middleware/rateLimiter";

const router: IRouter = Router();
router.use(uploadLimiter);

router.post("/image", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // Use query param for type - same as what multer uses for destination
  const type = (req.query.type as string) || req.body.type || "documents";
  const fileUrl = `/uploads/${type}/${req.file.filename}`;

  return res.status(200).json({
    success: true,
    data: {
      id: req.file.filename,
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    },
  });
});

router.post("/document", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const type = req.body.type || "documents";
  const fileUrl = `/uploads/${type}/${req.file.filename}`;

  return res.status(200).json({
    success: true,
    data: {
      id: req.file.filename,
      url: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
    },
  });
});

export default router;
