// backend/src/presentation/routes/banner.routes.ts

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BannerController } from '../controllers/BannerController';
import { authMiddleware, adminMiddleware } from '../middlewares/auth.middleware';

// --- CẤU HÌNH MULTER LƯU FILE LOCAL ---
const uploadDir = path.join(process.cwd(), 'public/uploads/banners');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `banner-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, webp, gif)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// --- ROUTES ---
export const createBannerRoutes = (bannerController: BannerController) => {
  const router = Router();

  // Public - Storefront lấy banner đang active
  router.get('/', bannerController.getActive);

  return router;
};

export const createAdminBannerRoutes = (bannerController: BannerController) => {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);

  router.get('/', bannerController.getAll);
  router.get('/:id', bannerController.getById);
  router.post('/', upload.single('image'), bannerController.create);
  router.put('/:id', upload.single('image'), bannerController.update);
  router.delete('/:id', bannerController.delete);
  router.patch('/:id/toggle', bannerController.toggle);

  return router;
};
