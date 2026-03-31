import { Router } from 'express';
import { LocationController } from '../controllers/LocationController';

export const createLocationRoutes = (locationController: LocationController) => {
  const router = Router();

  router.get('/provinces', locationController.getProvinces);
  router.get(
    '/provinces/:provinceCode/wards',
    locationController.getWardsByProvince
  );

  return router;
};
