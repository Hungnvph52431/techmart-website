const GUEST_ORDER_ACCESS_PREFIX = "techmart_guest_order_access:";

export interface GuestOrderAccessSession {
  orderCode: string;
  email: string;
  accessToken: string;
}

const normalizeOrderCode = (orderCode: string) => orderCode.trim().toUpperCase();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const getStorageKey = (orderCode: string) =>
  `${GUEST_ORDER_ACCESS_PREFIX}${normalizeOrderCode(orderCode)}`;

export const persistGuestOrderAccess = (session: GuestOrderAccessSession) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    getStorageKey(session.orderCode),
    JSON.stringify({
      orderCode: normalizeOrderCode(session.orderCode),
      email: normalizeEmail(session.email),
      accessToken: session.accessToken,
    } satisfies GuestOrderAccessSession),
  );
};

export const getGuestOrderAccess = (
  orderCode: string,
): GuestOrderAccessSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(getStorageKey(orderCode));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as GuestOrderAccessSession;
    if (!parsed?.orderCode || !parsed?.email || !parsed?.accessToken) {
      window.sessionStorage.removeItem(getStorageKey(orderCode));
      return null;
    }

    return {
      orderCode: normalizeOrderCode(parsed.orderCode),
      email: normalizeEmail(parsed.email),
      accessToken: parsed.accessToken,
    };
  } catch {
    window.sessionStorage.removeItem(getStorageKey(orderCode));
    return null;
  }
};

export const clearGuestOrderAccess = (orderCode: string) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getStorageKey(orderCode));
};

export const buildGuestOrderHeaders = (accessToken: string) => ({
  "x-guest-order-token": accessToken,
});
