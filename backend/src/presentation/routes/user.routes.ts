import { Router } from "express";
import { UserController } from "../controllers/UserControllers";
import { authMiddleware, adminMiddleware } from "../middlewares/auth.middleware";

export const createUserRoutes = (userController: UserController) => {
    const router = Router();
    router.use(authMiddleware, adminMiddleware);
    router.get('/', userController.getAll);
    router.get('/stats', userController.getStats);
    router.get('/:id', userController.getById);
    router.post('/', userController.create);
    router.put('/:id', userController.update);
    router.delete('/:id', userController.delete);
    router.patch('/:id/status', userController.updateStatus);
    router.patch('/:id/points', userController.updatePoints);
    router.patch('/:id/password', userController.changePassword);
    return router;
};