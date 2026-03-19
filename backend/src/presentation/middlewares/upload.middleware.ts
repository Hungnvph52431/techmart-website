import multer from 'multer';
import path from 'path';
import fs from 'fs';

// --- Helper: tạo folder nếu chưa có ---
const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Chỉ chấp nhận ảnh JPG, PNG, WEBP'));
};

// --- 1. Upload ảnh sản phẩm ---
const productDir = path.join(process.cwd(), 'public', 'images', 'products');
ensureDir(productDir);

export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, productDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `product-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// --- 2. Upload ảnh bằng chứng hoàn trả (tối đa 5 ảnh, mỗi ảnh 5MB) ---
const returnDir = path.join(process.cwd(), 'public', 'images', 'returns');
ensureDir(returnDir);

export const uploadReturnEvidence = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, returnDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `return-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});
