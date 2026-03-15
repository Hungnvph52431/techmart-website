import { Router } from 'express';
import { AttributeController } from '../../controllers/AttributeController';
import { adminMiddleware, authMiddleware } from '../../middlewares/auth.middleware';

export const createAdminAttributeRoutes = (attributeController: AttributeController) => {
  const router = Router();

  router.use(authMiddleware, adminMiddleware);
  router.get('/', attributeController.getAll);
  router.get('/category/:categoryId', attributeController.getCategoryAttributes);
  router.put('/category/:categoryId', attributeController.assignCategoryAttributes);
  router.get('/:id', attributeController.getById);
  router.post('/', attributeController.create);
  router.put('/:id', attributeController.update);
  router.delete('/:id', attributeController.delete);

  return router;
};
