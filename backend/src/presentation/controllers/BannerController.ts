// backend/src/presentation/controllers/BannerController.ts

import { Request, Response } from 'express';
import { BannerUseCase } from '../../application/use-cases/BannerUseCase';
import path from 'path';
import fs from 'fs';

export class BannerController {
  constructor(private bannerUseCase: BannerUseCase) {}

  // GET /api/banners?position=home_slider  (public - storefront)
  getActive = async (req: Request, res: Response) => {
    try {
      const position = req.query.position as string | undefined;
      const banners = await this.bannerUseCase.getActiveBanners(position);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // GET /api/admin/banners  (admin)
  getAll = async (req: Request, res: Response) => {
    try {
      const position = req.query.position as string | undefined;
      const banners = await this.bannerUseCase.getAllBanners(position);
      res.json(banners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const banner = await this.bannerUseCase.getBannerById(Number(req.params.id));
      if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
      res.json(banner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // POST /api/admin/banners  (multipart/form-data)
  create = async (req: Request, res: Response) => {
    try {
      let imageUrl = req.body.imageUrl;

      // Nếu có file upload thì dùng đường dẫn file
      if (req.file) {
        imageUrl = `/uploads/banners/${req.file.filename}`;
      }

      if (!imageUrl) {
        return res.status(400).json({ message: 'Vui lòng upload ảnh hoặc nhập đường dẫn ảnh' });
      }

      const banner = await this.bannerUseCase.createBanner({
        ...req.body,
        imageUrl,
        displayOrder: req.body.displayOrder ? Number(req.body.displayOrder) : 0,
        isActive: req.body.isActive !== 'false' && req.body.isActive !== false,
      });

      res.status(201).json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  // PUT /api/admin/banners/:id  (multipart/form-data)
  update = async (req: Request, res: Response) => {
    try {
      let imageUrl = req.body.imageUrl;

      if (req.file) {
        imageUrl = `/uploads/banners/${req.file.filename}`;

        // Xóa ảnh cũ nếu có
        const oldBanner = await this.bannerUseCase.getBannerById(Number(req.params.id));
        if (oldBanner?.imageUrl?.startsWith('/uploads/banners/')) {
          const oldPath = path.join(process.cwd(), 'public', oldBanner.imageUrl);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }
      }

      const banner = await this.bannerUseCase.updateBanner({
        bannerId: Number(req.params.id),
        ...req.body,
        ...(imageUrl && { imageUrl }),
        ...(req.body.displayOrder !== undefined && { displayOrder: Number(req.body.displayOrder) }),
        ...(req.body.isActive !== undefined && { isActive: req.body.isActive !== 'false' && req.body.isActive !== false }),
      });

      if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });
      res.json(banner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      // Xóa ảnh local nếu có
      const banner = await this.bannerUseCase.getBannerById(Number(req.params.id));
      if (banner?.imageUrl?.startsWith('/uploads/banners/')) {
        const filePath = path.join(process.cwd(), 'public', banner.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      const success = await this.bannerUseCase.deleteBanner(Number(req.params.id));
      if (!success) return res.status(404).json({ message: 'Không tìm thấy banner' });
      res.json({ message: 'Xóa banner thành công' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // PATCH /api/admin/banners/:id/toggle  - bật/tắt nhanh
  toggle = async (req: Request, res: Response) => {
    try {
      const banner = await this.bannerUseCase.getBannerById(Number(req.params.id));
      if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });

      const updated = await this.bannerUseCase.updateBanner({
        bannerId: banner.bannerId,
        isActive: !banner.isActive,
      });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
