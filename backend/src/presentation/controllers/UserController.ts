import { Request, Response } from 'express';
import { UserUseCase } from '../../application/use-cases/UserUseCase';

export class UserController {
  constructor(private userUseCase: UserUseCase) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const users = await this.userUseCase.getAllUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const user = await this.userUseCase.getUserById(Number(req.params.id));
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const user = await this.userUseCase.createUser(req.body);
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const user = await this.userUseCase.updateUser({
        userId: Number(req.params.id),
        ...req.body,
      });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const success = await this.userUseCase.updateUserStatus(Number(req.params.id), status);
      if (!success) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'Status updated' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteUser = async (req: Request, res: Response) => {
    try {
      const success = await this.userUseCase.deleteUser(Number(req.params.id));
      if (!success) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User deleted' });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}