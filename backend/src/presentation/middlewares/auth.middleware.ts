import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export interface AuthRequest extends Request {
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Admin + Staff
export const staffMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['admin', 'staff'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Yêu cầu quyền nhân viên' });
  }
  next();
};

// Admin + Staff + Shipper (tất cả role nội bộ)
export const internalMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['admin', 'staff', 'shipper'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Yêu cầu quyền nội bộ' });
  }
  next();
};

// Admin + Shipper
export const warehouseMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!['admin', 'shipper'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Yêu cầu quyền kho' });
  }
  next();
};

// Shipper only
export const shipperMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'shipper') {
    return res.status(403).json({ success: false, message: 'Yêu cầu quyền shipper' });
  }
  next();
};
