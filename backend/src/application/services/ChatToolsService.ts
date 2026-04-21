import { ProductRepository } from "../../infrastructure/repositories/ProductRepository";
import { OrderRepository } from "../../infrastructure/repositories/OrderRepository";
import { CouponRepository } from "../../infrastructure/repositories/CouponRepository";
import { CategoryRepository } from "../../infrastructure/repositories/CategoryRepository";
import { CouponUseCase } from "../use-cases/CouponUseCase";
import { ProductFilters } from "../../domain/repositories/IProductRepository";

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "search_products",
      description: "Tìm sản phẩm theo bộ lọc. Trả về tối đa 4 máy.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Từ khóa tên SP" },
          minPrice: { type: "number", description: "Giá tối thiểu VNĐ" },
          maxPrice: { type: "number", description: "Giá tối đa VNĐ" },
          brandSlug: { type: "string", description: "Slug brand: apple/samsung/xiaomi/asus/dell..." },
          categorySlug: { type: "string", description: "Slug danh mục" },
          isBestseller: { type: "boolean" },
          isNew: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_product_detail",
      description: "Chi tiết 1 SP (spec, variant).",
      parameters: {
        type: "object",
        properties: { productId: { type: "number" } },
        required: ["productId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "lookup_order",
      description: "Tra đơn theo mã ORD-XXXXXX.",
      parameters: {
        type: "object",
        properties: {
          orderCode: { type: "string" },
          email: { type: "string", description: "Email đặt đơn (guest)" },
        },
        required: ["orderCode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_active_coupons",
      description: "Mã giảm giá còn hiệu lực.",
      parameters: {
        type: "object",
        properties: {
          minOrderValue: { type: "number", description: "Lọc coupon dùng được với đơn <= X đồng" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_categories",
      description: "Danh mục có sẵn.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export class ChatToolsService {
  private productRepo = new ProductRepository();
  private orderRepo = new OrderRepository();
  private categoryRepo = new CategoryRepository();
  private couponUseCase = new CouponUseCase(new CouponRepository());

  getToolDefinitions(): ToolDefinition[] {
    return TOOL_DEFINITIONS;
  }

  async execute(toolName: string, rawArgs: string): Promise<string> {
    let args: Record<string, unknown> = {};
    try {
      args = rawArgs ? JSON.parse(rawArgs) : {};
    } catch {
      return JSON.stringify({ error: "Tham số tool không đúng định dạng JSON." });
    }

    try {
      switch (toolName) {
        case "search_products":
          return await this.searchProducts(args);
        case "get_product_detail":
          return await this.getProductDetail(args);
        case "lookup_order":
          return await this.lookupOrder(args);
        case "get_active_coupons":
          return await this.getActiveCoupons(args);
        case "get_categories":
          return await this.getCategories();
        default:
          return JSON.stringify({ error: `Tool '${toolName}' không tồn tại.` });
      }
    } catch (err) {
      console.error(`[ChatTools] Tool '${toolName}' failed:`, err);
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      return JSON.stringify({ error: msg });
    }
  }

  private async searchProducts(args: Record<string, unknown>): Promise<string> {
    const filters: ProductFilters = { status: "active" };
    if (typeof args.query === "string" && args.query.trim()) filters.search = args.query.trim();
    if (typeof args.minPrice === "number") filters.minPrice = args.minPrice;
    if (typeof args.maxPrice === "number") filters.maxPrice = args.maxPrice;
    if (typeof args.brandSlug === "string") filters.brandSlug = args.brandSlug;
    if (typeof args.categorySlug === "string") filters.categorySlug = args.categorySlug;
    if (args.isBestseller === true) filters.isBestseller = true;
    if (args.isNew === true) filters.isNew = true;

    let result = await this.productRepo.findAllPaginated(filters, 1, 4);
    let relaxed: string | null = null;

    // Fallback 1: bỏ category/brand/flags, giữ giá + query
    if (result.data.length === 0 && (filters.categorySlug || filters.brandSlug || filters.isBestseller || filters.isNew)) {
      const f2: ProductFilters = { status: "active" };
      if (filters.search) f2.search = filters.search;
      if (filters.minPrice) f2.minPrice = filters.minPrice;
      if (filters.maxPrice) f2.maxPrice = filters.maxPrice;
      result = await this.productRepo.findAllPaginated(f2, 1, 4);
      if (result.data.length > 0) relaxed = "bỏ bộ lọc category/brand";
    }

    // Fallback 2: bỏ query text, chỉ giữ giá
    if (result.data.length === 0 && filters.search) {
      const f3: ProductFilters = { status: "active" };
      if (filters.minPrice) f3.minPrice = filters.minPrice;
      if (filters.maxPrice) f3.maxPrice = filters.maxPrice;
      result = await this.productRepo.findAllPaginated(f3, 1, 4);
      if (result.data.length > 0) relaxed = "bỏ từ khóa, chỉ giữ khoảng giá";
    }

    if (result.data.length === 0) {
      return JSON.stringify({ found: 0 });
    }

    const items = result.data.map((p) => {
      const stock = p.availableStockQuantity ?? p.stockQuantity;
      const discount =
        p.salePrice && p.price > 0
          ? Math.round(((p.price - p.salePrice) / p.price) * 100)
          : 0;
      const row: Record<string, unknown> = {
        id: p.productId,
        name: p.name,
        brand: p.brandName,
        price: p.salePrice || p.price,
        stock,
      };
      if (discount > 0) row.discount = `${discount}%`;
      if (p.ratingAvg >= 4.5 && p.reviewCount > 0) row.rating = p.ratingAvg;
      if (p.isBestseller) row.bestseller = true;
      if (p.isNew) row.new = true;
      return row;
    });

    const payload: Record<string, unknown> = { found: result.total, products: items };
    if (relaxed) payload.note = `Đã nới lỏng: ${relaxed}`;
    return JSON.stringify(payload);
  }

  private async getProductDetail(args: Record<string, unknown>): Promise<string> {
    const productId = Number(args.productId);
    if (!Number.isInteger(productId) || productId <= 0) {
      return JSON.stringify({ error: "productId không hợp lệ." });
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      return JSON.stringify({ error: "Không tìm thấy sản phẩm." });
    }

    const variants = await this.productRepo.findVariants(productId);

    return JSON.stringify({
      id: product.productId,
      name: product.name,
      brand: product.brandName,
      price: product.salePrice || product.price,
      originalPrice: product.salePrice ? product.price : undefined,
      stock: product.availableStockQuantity ?? product.stockQuantity,
      rating: product.ratingAvg,
      reviewCount: product.reviewCount,
      specs: product.specifications || null,
      variants: variants.slice(0, 5).map((v) => ({
        name: v.variantName,
        priceAdjust: v.priceAdjustment || 0,
        stock: v.availableStockQuantity ?? v.stockQuantity,
      })),
    });
  }

  private async lookupOrder(args: Record<string, unknown>): Promise<string> {
    const orderCode = typeof args.orderCode === "string" ? args.orderCode.trim() : "";
    if (!orderCode) {
      return JSON.stringify({ error: "Thiếu mã đơn hàng." });
    }

    const email = typeof args.email === "string" ? args.email.trim() : "";

    // Ưu tiên tra đơn khách vãng lai (có email) để tránh lộ thông tin
    if (email) {
      const guestDetail = await this.orderRepo.findGuestDetailByCode(orderCode, email);
      if (guestDetail) {
        return JSON.stringify(this.formatOrderAggregate(guestDetail));
      }
    }

    // Không có email: trả về thông tin công khai tối thiểu (trạng thái + timeline)
    const order = await this.orderRepo.findByOrderCode(orderCode);
    if (!order) {
      return JSON.stringify({ error: "Không tìm thấy đơn hàng với mã này." });
    }

    if (order.userId && !email) {
      return JSON.stringify({
        code: "need_auth",
        message:
          "Đơn thuộc tài khoản đã đăng ký. Đề nghị khách đăng nhập vào website để xem chi tiết, hoặc cung cấp email đặt đơn.",
        orderCode: order.orderCode,
        status: order.status,
      });
    }

    if (!order.userId && !email) {
      return JSON.stringify({
        code: "need_email",
        message: "Đây là đơn khách vãng lai - cần email để xác thực.",
        orderCode: order.orderCode,
      });
    }

    const timeline = await this.orderRepo.getOrderTimeline(order.orderId);
    return JSON.stringify({
      orderCode: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      shippingCity: order.shippingCity,
      orderDate: order.orderDate,
      deliveredAt: order.deliveredAt || null,
      timeline: timeline.slice(-6).map((e) => ({
        event: e.eventType,
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt,
        note: e.note,
      })),
    });
  }

  private formatOrderAggregate(agg: any): Record<string, unknown> {
    const order = agg.order || agg;
    return {
      orderCode: order.orderCode,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discountAmount: order.discountAmount,
      total: order.total,
      shippingAddress: `${order.shippingAddress}, ${order.shippingCity}`,
      orderDate: order.orderDate,
      deliveredAt: order.deliveredAt || null,
      items: (agg.details || []).map((d: any) => ({
        name: d.productName,
        variant: d.variantName,
        quantity: d.quantity,
        subtotal: d.subtotal,
      })),
      timeline: (agg.timeline || []).slice(-6).map((e: any) => ({
        event: e.eventType,
        from: e.fromStatus,
        to: e.toStatus,
        at: e.createdAt,
        note: e.note,
      })),
    };
  }

  private async getActiveCoupons(args: Record<string, unknown>): Promise<string> {
    const coupons = await this.couponUseCase.getAvailableCoupons();
    const minOrderValue =
      typeof args.minOrderValue === "number" ? args.minOrderValue : null;

    const filtered =
      minOrderValue !== null
        ? coupons.filter((c) => c.minOrderValue <= minOrderValue)
        : coupons;

    if (filtered.length === 0) {
      return JSON.stringify({ found: 0 });
    }

    return JSON.stringify({
      coupons: filtered.slice(0, 5).map((c) => ({
        code: c.code,
        off:
          c.discountType === "percentage"
            ? `${c.discountValue}%${c.maxDiscountAmount ? ` (max ${c.maxDiscountAmount})` : ""}`
            : `${c.discountValue}đ`,
        minOrder: c.minOrderValue,
      })),
    });
  }

  private async getCategories(): Promise<string> {
    const categories = await this.categoryRepo.findAll();
    return JSON.stringify({
      categories: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
      })),
    });
  }
}
