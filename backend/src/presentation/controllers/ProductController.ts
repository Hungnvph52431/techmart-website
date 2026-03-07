import { Request, Response } from 'express';
import { ProductUseCase } from '../../application/use-cases/ProductUseCase';

export class ProductController {
  constructor(private productUseCase: ProductUseCase) { }

  getAll = async (req: Request, res: Response) => {
    try {
      const filters = {
        categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
        brandId: req.query.brandId ? Number(req.query.brandId) : undefined,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        search: req.query.search as string,
        isFeatured: req.query.featured === 'true' ? true : req.query.featured === 'false' ? false : undefined,
        isNew: req.query.isNew === 'true' ? true : req.query.isNew === 'false' ? false : undefined,
        isBestseller: req.query.isBestseller === 'true' ? true : req.query.isBestseller === 'false' ? false : undefined,
        status: req.query.status as string,
      };

      const page = req.query.page ? Number(req.query.page) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      if (page && limit) {
        const result = await this.productUseCase.getAllProductsPaginated(filters, page, limit);
        return res.json(result);
      }

      const products = await this.productUseCase.getAllProducts(filters);
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductById(Number(req.params.id));

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getBySlug = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.getProductBySlug(req.params.slug);

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, slug, sku, categoryId, price } = req.body;

      if (!name || !slug || !sku || !categoryId || !price) {
        return res.status(400).json({ message: 'Name, slug, sku, categoryId, and price are required' });
      }

      const product = await this.productUseCase.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const product = await this.productUseCase.updateProduct({
        productId: Number(req.params.id),
        ...req.body,
      });

      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProduct(Number(req.params.id));

      if (!success) {
        return res.status(404).json({ message: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // ==========================================
  // Product Images
  // ==========================================

  getImages = async (req: Request, res: Response) => {
    try {
      const images = await this.productUseCase.getProductImages(Number(req.params.id));
      res.json(images);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  addImage = async (req: Request, res: Response) => {
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ message: 'imageUrl is required' });
      }

      const image = await this.productUseCase.addProductImage({
        productId: Number(req.params.id),
        ...req.body,
      });
      res.status(201).json(image);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteImage = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProductImage(Number(req.params.imageId));

      if (!success) {
        return res.status(404).json({ message: 'Image not found' });
      }

      res.json({ message: 'Image deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  // ==========================================
  // Product Variants
  // ==========================================

  getVariants = async (req: Request, res: Response) => {
    try {
      const variants = await this.productUseCase.getProductVariants(Number(req.params.id));
      res.json(variants);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  addVariant = async (req: Request, res: Response) => {
    try {
      const { variantName } = req.body;
      if (!variantName) {
        return res.status(400).json({ message: 'variantName is required' });
      }

      const variant = await this.productUseCase.addProductVariant({
        productId: Number(req.params.id),
        ...req.body,
      });
      res.status(201).json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateVariant = async (req: Request, res: Response) => {
    try {
      const variant = await this.productUseCase.updateProductVariant({
        variantId: Number(req.params.variantId),
        ...req.body,
      });

      if (!variant) {
        return res.status(404).json({ message: 'Variant not found' });
      }

      res.json(variant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteVariant = async (req: Request, res: Response) => {
    try {
      const success = await this.productUseCase.deleteProductVariant(Number(req.params.variantId));

      if (!success) {
        return res.status(404).json({ message: 'Variant not found' });
      }

      res.json({ message: 'Variant deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };
}
