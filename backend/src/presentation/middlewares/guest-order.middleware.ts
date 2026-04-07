import { NextFunction, Request, Response } from 'express';
import {
  GuestOrderAccessPayload,
  verifyGuestOrderAccessToken,
} from '../../application/services/GuestOrderAccessService';

export interface GuestOrderRequest extends Request {
  guestOrder?: GuestOrderAccessPayload;
}

export const guestOrderAccessMiddleware = (
  req: GuestOrderRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const headerToken =
      typeof req.headers['x-guest-order-token'] === 'string'
        ? req.headers['x-guest-order-token']
        : req.headers.authorization?.split(' ')[1];

    if (!headerToken) {
      return res
        .status(401)
        .json({ message: 'Thiếu mã truy cập đơn hàng dành cho khách vãng lai' });
    }

    req.guestOrder = verifyGuestOrderAccessToken(headerToken);
    next();
  } catch {
    return res
      .status(401)
      .json({ message: 'Mã truy cập đơn hàng không hợp lệ hoặc đã hết hạn' });
  }
};
