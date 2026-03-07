import { Request, Response } from 'express';
import { BrandUseCase } from '../../application/use-cases/BrandUseCase';

export class BrandController {
  constructor(private brandUseCase: BrandUseCase) { }

  getAll = async (req: Request, res: Response) => {
    try {
      const brands = await this.brandUseCase.getAllBrands();
      res.json(brands);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const brand = await this.brandUseCase.getBrandById(Number(req.params.id));

      if (!brand) {
        return res.status(404).json({ message: 'Brand not found' });
      }

      res.json(brand);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, slug } = req.body;

      if (!name || !slug) {
        return res.status(400).json({ message: 'Name and slug are required' });
      }

      const newBrand = await this.brandUseCase.createBrand(req.body);
      res.status(201).json(newBrand);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const brandId = Number(req.params.id);

      const updated = await this.brandUseCase.updateBrand({
        brandId,
        ...req.body,
      });

      if (!updated) {
        return res.status(404).json({ message: 'Brand not found' });
      }

      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const brandId = Number(req.params.id);
      const success = await this.brandUseCase.deleteBrand(brandId);

      if (!success) {
        return res.status(404).json({ message: 'Brand not found' });
      }

      res.json({ message: 'Brand deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
