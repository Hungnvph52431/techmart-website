import { Request, Response } from 'express';
import { BrandUseCase } from '../../application/use-cases/BrandUseCase';

export class BrandController {
  constructor(private brandUseCase: BrandUseCase) {}

  getAll = async (_req: Request, res: Response) => {
    try {
      const brands = await this.brandUseCase.getAllActiveBrands();
      res.json(brands);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
