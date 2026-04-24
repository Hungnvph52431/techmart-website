const BACKEND_URL =
  (import.meta.env.VITE_API_URL as string)?.replace("/api", "") ||
  "http://localhost:5001";

export const getImageUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    amount,
  );

export const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const formatOrderItemVariantSummary = (item: {
  variantName?: string;
  variant_name?: string;
  sku?: string;
}) => {
  const variantName = item.variantName ?? item.variant_name ?? "";
  const sku = item.sku ?? "";

  if (variantName && sku) {
    return `${variantName} • SKU: ${sku}`;
  }

  if (variantName) {
    return variantName;
  }

  if (sku) {
    return `SKU: ${sku}`;
  }

  return "";
};
