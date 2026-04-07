import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const GUEST_ORDER_ACCESS_EXPIRES_IN = '30d';

export interface GuestOrderAccessPayload {
  type: 'guest_order';
  orderCode: string;
  email: string;
}

export const createGuestOrderAccessToken = (
  payload: Omit<GuestOrderAccessPayload, 'type'>,
) =>
  jwt.sign(
    {
      type: 'guest_order',
      orderCode: payload.orderCode.trim().toUpperCase(),
      email: payload.email.trim().toLowerCase(),
    } satisfies GuestOrderAccessPayload,
    JWT_SECRET,
    { expiresIn: GUEST_ORDER_ACCESS_EXPIRES_IN },
  );

export const verifyGuestOrderAccessToken = (
  token: string,
): GuestOrderAccessPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);

  if (
    !decoded ||
    typeof decoded !== 'object' ||
    decoded.type !== 'guest_order' ||
    typeof decoded.orderCode !== 'string' ||
    typeof decoded.email !== 'string'
  ) {
    throw new Error('INVALID_GUEST_ORDER_TOKEN');
  }

  return {
    type: 'guest_order',
    orderCode: decoded.orderCode.trim().toUpperCase(),
    email: decoded.email.trim().toLowerCase(),
  };
};
