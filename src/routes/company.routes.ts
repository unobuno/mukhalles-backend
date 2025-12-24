import { Router, type Router as IRouter } from "express";
import { authenticate } from "../middleware/auth.middleware";
import {
  registerCompany,
  getCompanyProfile,
  updateCompanyProfile,
  uploadCompanyDocument,
  deleteCompanyDocument,
  getBusinessForUser,
} from "../controllers/company.controller";
import { upload } from "../utils/fileUpload";

const router: IRouter = Router();

router.post("/register", authenticate, registerCompany);
router.get("/profile", authenticate, getCompanyProfile);
router.put("/profile", authenticate, updateCompanyProfile);
router.post(
  "/documents",
  authenticate,
  upload.single("file"),
  uploadCompanyDocument
);
router.delete("/documents/:documentId", authenticate, deleteCompanyDocument);
router.get("/business", authenticate, getBusinessForUser);

export default router;
