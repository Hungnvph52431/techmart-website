import { Request, Response } from 'express';
import { AttributeUseCase } from '../../application/use-cases/AttributeUseCase';

export class AttributeController {
  constructor(private attributeUseCase: AttributeUseCase) {}

  getAll = async (_req: Request, res: Response) => {
    try {
      const attributes = await this.attributeUseCase.getAllAttributes();
      res.json(attributes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const attribute = await this.attributeUseCase.getAttributeById(Number(req.params.id));

      if (!attribute) {
        return res.status(404).json({ message: 'Attribute not found' });
      }

      res.json(attribute);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getCategoryAttributes = async (req: Request, res: Response) => {
    try {
      const attributes = await this.attributeUseCase.getCategoryAttributes(
        Number(req.params.categoryId)
      );
      res.json(attributes);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const attribute = await this.attributeUseCase.createAttribute(req.body);
      res.status(201).json(attribute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const attribute = await this.attributeUseCase.updateAttribute({
        attributeId: Number(req.params.id),
        ...req.body,
      });

      if (!attribute) {
        return res.status(404).json({ message: 'Attribute not found' });
      }

      res.json(attribute);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await this.attributeUseCase.deleteAttribute(Number(req.params.id));

      if (!success) {
        return res.status(404).json({ message: 'Attribute not found' });
      }

      res.json({ message: 'Attribute deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  assignCategoryAttributes = async (req: Request, res: Response) => {
    try {
      const result = await this.attributeUseCase.assignCategoryAttributes({
        categoryId: Number(req.params.categoryId),
        attributes: req.body.attributes || [],
      });
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}
