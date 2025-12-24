import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = process.env.UPLOAD_DIR || "uploads";

const ensureDirectoryExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

[
  "avatars",
  "documents",
  "services",
  "covers",
  "licenses",
  "categories",
].forEach((subdir) => {
  ensureDirectoryExists(path.join(uploadDir, subdir));
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const type = (req.query.type as string) || req.body.type || "documents";
    const dest = path.join(uploadDir, type);
    ensureDirectoryExists(dest);
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitized = basename.replace(/[^a-zA-Z0-9-_]/g, "-");
    cb(null, sanitized + "-" + uniqueSuffix + ext);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
  const allowedDocTypes = /pdf|doc|docx/;

  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  const mimeType = file.mimetype;

  if (
    file.fieldname === "image" ||
    req.body.type === "avatars" ||
    req.body.type === "services" ||
    req.body.type === "covers" ||
    req.body.type === "categories"
  ) {
    if (allowedImageTypes.test(ext) && mimeType.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  } else {
    if (allowedImageTypes.test(ext) || allowedDocTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only image and document files are allowed"));
    }
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || "10485760"),
  },
});
