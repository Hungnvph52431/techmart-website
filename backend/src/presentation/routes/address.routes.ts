// src/presentation/routes/address.routes.ts

import { Router } from 'express';
import { AddressController } from '../controllers/AddressController';
import { authMiddleware } from '../middlewares/auth.middleware';

export const createAddressRoutes = (addressController: AddressController) => {
  const router = Router();
  router.use(authMiddleware); // Tất cả route đều cần đăng nhập

  router.get('/',                       addressController.getMyAddresses);
  router.post('/',                      addressController.create);
  router.put('/:id',                    addressController.update);
  router.patch('/:id/default',          addressController.setDefault);
  router.delete('/:id',                 addressController.delete);

  return router;
};
