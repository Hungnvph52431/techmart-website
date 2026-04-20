import { Request, Response } from "express";
import { GroqService, Message } from "../../application/services/GroqService";
import { ProductRepository } from "../../infrastructure/repositories/ProductRepository";

const groqService = new GroqService();
const productRepository = new ProductRepository();

export interface ChatRequest {
  message: string;
  userId?: string;
  conversationHistory?: Message[];
}

// Nhận diện intent từ tin nhắn
function detectIntent(message: string): "product_search" | "order_check" | "general" {
  const msg = message.toLowerCase();

  const productKeywords = [
    "mua", "điện thoại", "laptop", "máy tính", "tablet", "ipad",
    "samsung", "iphone", "xiaomi", "oppo", "realme", "vivo",
    "giá", "bao nhiêu", "tầm giá", "ngân sách", "triệu",
    "gaming", "chụp ảnh", "pin", "ram", "bộ nhớ", "chip",
    "gợi ý", "tư vấn", "nên mua", "so sánh", "tìm", "có bán không",
    "sản phẩm", "model", "máy", "phụ kiện", "tai nghe", "sạc"
  ];

  const orderKeywords = [
    "đơn hàng", "order", "mã đơn", "tra cứu", "vận chuyển",
    "giao hàng", "đã đặt", "trạng thái", "ord-", "shipping"
  ];

  if (orderKeywords.some(k => msg.includes(k))) return "order_check";
  if (productKeywords.some(k => msg.includes(k))) return "product_search";
  return "general";
}

// Trích xuất filter từ tin nhắn
function extractProductFilters(message: string): any {
  const msg = message.toLowerCase();
  const filters: any = { status: "active" };

  // Ngân sách
  const budgetMatch = msg.match(/(\d+)\s*(triệu|tr|million)/);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1]) * 1_000_000;
    filters.maxPrice = amount * 1.1; // thêm 10% buffer
    filters.minPrice = amount * 0.5;
  }

  // Tìm kiếm theo từ khóa tên
  const brands = ["samsung", "iphone", "apple", "xiaomi", "oppo", "realme", "vivo", "nokia", "asus", "lg"];
  for (const brand of brands) {
    if (msg.includes(brand)) {
      filters.search = brand;
      break;
    }
  }

  // Từ khóa chung
  if (!filters.search) {
    if (msg.includes("gaming")) filters.search = "gaming";
    else if (msg.includes("chụp ảnh")) filters.search = "camera";
    else if (msg.includes("pin trâu")) filters.search = "pin";
    else if (msg.includes("điện thoại")) filters.search = "điện thoại";
    else if (msg.includes("laptop")) filters.search = "laptop";
    else if (msg.includes("tai nghe")) filters.search = "tai nghe";
    else if (msg.includes("sạc")) filters.search = "sạc";
  }

  return filters;
}

export class ChatController {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { message, conversationHistory = [] }: ChatRequest = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        res.status(400).json({ error: "Tin nhắn không hợp lệ." });
        return;
      }

      if (message.length > 2000) {
        res.status(400).json({ error: "Tin nhắn quá dài. Tối đa 2000 ký tự." });
        return;
      }

      const intent = detectIntent(message);
      let contextData = "";

      // Query DB nếu là hỏi sản phẩm
      if (intent === "product_search") {
        try {
          const filters = extractProductFilters(message);
          const result = await productRepository.findAllPaginated(filters, 1, 5);

          if (result.data.length > 0) {
            const productList = result.data.map(p => {
              const price = p.salePrice
                ? `${p.salePrice.toLocaleString("vi-VN")}đ (giảm từ ${p.price.toLocaleString("vi-VN")}đ)`
                : `${p.price.toLocaleString("vi-VN")}đ`;
              return `- ${p.name} | Giá: ${price} | Tồn kho: ${p.availableStockQuantity} máy | Thương hiệu: ${p.brandName || "N/A"}`;
            }).join("\n");

            contextData = `\n\n[DỮ LIỆU SẢN PHẨM THỰC TẾ TỪ HỆ THỐNG - chỉ tư vấn dựa trên danh sách này, KHÔNG bịa thêm sản phẩm khác]:
${productList}
Tổng có ${result.total} sản phẩm phù hợp.`;
          } else {
            contextData = `\n\n[HỆ THỐNG: Không tìm thấy sản phẩm phù hợp với yêu cầu này trong kho. Hãy thông báo lịch sự cho khách và gợi ý họ xem thêm tại website hoặc liên hệ nhân viên.]`;
          }
        } catch (dbError) {
          console.error("[ChatController] DB query error:", dbError);
        }
      }

      const response = await groqService.chat(message.trim(), conversationHistory, contextData);
      res.status(200).json(response);

    } catch (error) {
      console.error("[ChatController] Error:", error);

      if (error instanceof Error) {
        if (error.message.includes("GROQ_API_KEY")) {
          res.status(500).json({ error: "Dịch vụ AI chưa được cấu hình đúng." });
          return;
        }
        if (error.message.includes("rate_limit") || error.message.includes("429")) {
          res.status(429).json({ error: "Quá nhiều yêu cầu. Vui lòng thử lại sau." });
          return;
        }
      }

      res.status(500).json({ error: "Đã xảy ra lỗi khi xử lý tin nhắn. Vui lòng thử lại." });
    }
  }
}