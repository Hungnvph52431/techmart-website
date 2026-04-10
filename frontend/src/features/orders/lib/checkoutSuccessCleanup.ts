import type { CartItem } from "@/types";
import { getCartSelectionKey } from "@/features/cart/lib/cartQuantity";
import { useCartStore } from "@/store/cartStore";
import { useCheckoutSessionStore } from "@/store/checkoutSessionStore";

const PENDING_CHECKOUT_CLEANUP_KEY = "techmart_pending_checkout_cleanup";

type CheckoutCleanupSource = "direct" | "selected_cart" | "cart";

type PendingCheckoutCleanup = {
  orderId: number;
  source: CheckoutCleanupSource;
  selectionKeys: string[];
};

export const buildPendingCheckoutCleanup = (
  orderId: number,
  source: "direct" | "selected_cart" | "cart" | "empty",
  items: CartItem[],
): PendingCheckoutCleanup | null => {
  if (source === "empty") {
    return null;
  }

  return {
    orderId,
    source,
    selectionKeys:
      source === "selected_cart"
        ? items.map((item) =>
            getCartSelectionKey(
              item.product.productId,
              item.selectedVariantId,
            ),
          )
        : [],
  };
};

export const persistPendingCheckoutCleanup = (
  cleanup: PendingCheckoutCleanup,
) => {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    PENDING_CHECKOUT_CLEANUP_KEY,
    JSON.stringify(cleanup),
  );
};

export const consumePendingCheckoutCleanup = (
  orderId?: number | string | null,
): PendingCheckoutCleanup | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_CHECKOUT_CLEANUP_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingCheckoutCleanup;
    if (orderId != null && String(parsed.orderId) !== String(orderId)) {
      return null;
    }
    window.sessionStorage.removeItem(PENDING_CHECKOUT_CLEANUP_KEY);
    return parsed;
  } catch {
    window.sessionStorage.removeItem(PENDING_CHECKOUT_CLEANUP_KEY);
    return null;
  }
};

export const applyPendingCheckoutCleanup = (
  cleanup: PendingCheckoutCleanup,
) => {
  const cartStore = useCartStore.getState();
  const checkoutSessionStore = useCheckoutSessionStore.getState();

  if (cleanup.source === "direct") {
    checkoutSessionStore.clearDirectCheckout();
    return;
  }

  if (cleanup.source === "selected_cart") {
    if (cleanup.selectionKeys.length > 0) {
      cartStore.removeItemsBySelectionKeys(cleanup.selectionKeys);
    }
    checkoutSessionStore.clearDirectCheckout();
    return;
  }

  cartStore.clearCart();
  checkoutSessionStore.clearDirectCheckout();
};
