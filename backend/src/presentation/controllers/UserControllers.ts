import { Request, Response } from "express";
import { UserUseCase } from "../../application/use-cases/UserUseCase";

export class UserController {
    constructor(private userUseCase: UserUseCase) { }

    getAll = async (req: Request, res: Response) => {
        try {
            const filters = {
                role: req.query.role as 'customer' | 'admin' | 'staff' | 'warehouse' | undefined,
                status: req.query.status as 'active' | 'inactive' | 'banned' | undefined,
                search: req.query.search as string | undefined,
                membershipLevel: req.query.membershipLevel as 'bronze' | 'silver' | 'gold' | 'platinum' | undefined,
            };
            const users = await this.userUseCase.getAllUsers(filters);
            res.json({
                success: true,
                data: users,
                count: users.length,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching users',
            });
        }
    };
    getById = async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                });
            }
            const user = await this.userUseCase.getUserById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            res.json({
                success: true,
                data: user,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error fetching user',
            });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const { email, password, name, phone, role } = req.body;
            if (!email || !password || !name) {
                return res.status(400).json({
                    success: false,
                    message: 'Email, password, and name are required',
                });
            }
            const userData = {
                email,
                password,
                name,
                phone,
                role: role || 'customer',
            };
            const user = await this.userUseCase.createUser(userData);
            res.status(201).json({
                success: true,
                data: user,
                message: 'User created successfully',
            });
        } catch (error: any) {
            const duplicateEmail = error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Email already exists');
            const message = duplicateEmail
                ? 'Email đã tồn tại'
                : (error.message || 'Error creating user');

            res.status(400).json({
                success: false,
                message,
            });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                });
            }
            const userData = {
                userId,
                ...req.body,
            };
            const user = await this.userUseCase.updateUser(userData);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully',
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Error updating user',
            });
        }
    };
    delete = async (req: Request, res: Response) => {
        try {
            const userId = parseInt(req.params.id);
            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: ' User not found',
                });
            }

            const deleted = await this.userUseCase.deleteUser(userId);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            res.json({
                success: true,
                message: 'User deleted successfully',
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Error deleting user',
            });
        }
    };
    updateStatus = async (req: Request, res: Response) => {
        try {
            const userId = Number(req.params.id);
            const { status } = req.body;

            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                });
            }

            if (!status || !['active', 'inactive', 'banned'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid status is required (active, inactive, or banned)',
                });
            }

            const user = await this.userUseCase.updateStatus(userId, status);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            res.json({
                success: true,
                message: 'User status updated successfully',
                data: user,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update user status',
            });
        }
    };
    updatePoints = async (req: Request, res: Response) => {
        try {
            const userId = Number(req.params.id);
            const { points } = req.body;

            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                });
            }

            if (typeof points !== 'number' || points < 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid points value is required',
                });
            }

            const user = await this.userUseCase.updateUserPoints(userId, points);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found',
                });
            }

            res.json({
                success: true,
                message: 'User points updated successfully',
                data: user,
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to update user points',
            });
        }
    };
    getStats = async (req: Request, res: Response) => {
        try {
            const stats = await this.userUseCase.getUserStatus();

            res.json({
                success: true,
                data: stats,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to fetch user statistics',
            });
        }
    };

    changePassword = async (req: Request, res: Response) => {
        try {
            const userId = Number(req.params.id);
            const { oldPassword, newPassword } = req.body;

            if (isNaN(userId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid user ID',
                });
            }

            if (!oldPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Old password and new password are required',
                });
            }

            const success = await this.userUseCase.changePassword(userId, oldPassword, newPassword);

            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: 'Failed to change password',
                });
            }

            res.json({
                success: true,
                message: 'Password changed successfully',
            });
        } catch (error: any) {
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to change password',
            });
        }
    };
}
