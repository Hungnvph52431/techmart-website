import Groq from "groq-sdk";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  reply: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `Bạn là trợ lý AI chuyên biệt của TechMart - cửa hàng điện thoại & thiết bị điện tử.

## PHẠM VI HỖ TRỢ:
- Tư vấn mua điện thoại, laptop, tablet, phụ kiện dựa trên dữ liệu sản phẩm được cung cấp
- Trạng thái đơn hàng và hướng dẫn tra cứu
- Chính sách vận chuyển, đổi trả, bảo hành
- Phương thức thanh toán, khuyến mãi

## NGUYÊN TẮC TƯ VẤN SẢN PHẨM (QUAN TRỌNG):
- CHỈ tư vấn sản phẩm có trong danh sách [DỮ LIỆU SẢN PHẨM THỰC TẾ] được cung cấp
- TUYỆT ĐỐI không bịa đặt hoặc đề xuất sản phẩm không có trong dữ liệu
- Nếu không có sản phẩm phù hợp → thông báo lịch sự, đề nghị khách xem website hoặc liên hệ nhân viên
- Khi tư vấn, đề cập tên sản phẩm, giá và tồn kho từ dữ liệu thực tế

## QUY TRÌNH TƯ VẤN MUA ĐIỆN THOẠI:
Nếu khách chưa nói rõ nhu cầu, hỏi lần lượt:
1. Ngân sách (dưới 5tr / 5-10tr / 10-20tr / trên 20tr)?
2. Nhu cầu chính (chụp ảnh / gaming / pin trâu / công việc)?
Sau khi có đủ thông tin → gợi ý từ danh sách sản phẩm thực tế.

## QUY TRÌNH TRA ĐƠN HÀNG:
1. Hỏi mã đơn hàng (dạng ORD-XXXXXX)
2. Hướng dẫn: vào Tài khoản → Đơn hàng của tôi trên website TechMart

## NGOÀI PHẠM VI - TỪ CHỐI LỊCH SỰ:
Chính trị, tôn giáo, y tế, pháp lý, hoặc bất kỳ chủ đề không liên quan mua sắm điện tử.
Mẫu từ chối: "Xin lỗi, tôi chỉ hỗ trợ về sản phẩm và đơn hàng tại TechMart. Bạn cần tư vấn gì về điện thoại không? 😊"

## NGUYÊN TẮC CHUNG:
- Trả lời tiếng Việt, thân thiện, ngắn gọn dưới 150 từ
- Dùng emoji vừa phải`;

export class GroqService {
  private client: Groq;
  private model: string = "llama-3.3-70b-versatile";

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined in environment variables");
    }
    this.client = new Groq({ apiKey });
  }

  // Thêm tham số contextData để nhét data DB vào prompt
  async chat(
    message: string,
    conversationHistory: Message[] = [],
    contextData: string = ""
  ): Promise<ChatResponse> {
    const messages: Message[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-10),
      {
        role: "user",
        content: message + contextData, // Đính kèm data DB vào tin nhắn
      },
    ];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.3, // Giảm xuống để AI bám sát dữ liệu hơn
      max_tokens: 512,
    });

    const reply =
      completion.choices[0]?.message?.content ||
      "Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này.";

    return {
      reply,
      timestamp: new Date().toISOString(),
    };
  }
}