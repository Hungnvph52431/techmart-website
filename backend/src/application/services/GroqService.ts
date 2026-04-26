// FEATURE: Chatbot AI (Groq Llama)
// Endpoint: /api/chat (sync) + /api/chat/stream (SSE streaming)
// Tool calling: ChatToolsService — bot tự tra cứu sản phẩm/đơn của user
// Rate limit: trả 429 khi quá hạn quota
// Xem chi tiết: MAP.md mục #11

import Groq from "groq-sdk";
import { ChatToolsService } from "./ChatToolsService";

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  reply: string;
  timestamp: string;
  toolCalls?: string[]; // Tên các tool đã được gọi (để debug/log)
}

export type StreamEvent =
  | { type: "content"; delta: string }
  | { type: "tool_start"; names: string[] }
  | { type: "done"; toolCalls: string[]; timestamp: string }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = `Bạn là TechMart AI - nhân viên tư vấn của TechMart (điện thoại, laptop, tablet, phụ kiện).

TÍNH CÁCH: thân thiện, xưng "mình"/"bạn", ngắn gọn, không bịa dữ liệu.

TOOLS (luôn gọi để lấy data thật, KHÔNG bịa):
- search_products: tìm SP theo query/minPrice/maxPrice/brandSlug/categorySlug/isBestseller/isNew
- get_product_detail: chi tiết spec + variant (productId)
- lookup_order: tra đơn ORD-XXXXXX (orderCode, email nếu guest)
- get_active_coupons: mã giảm giá
- get_categories: danh mục

QUY TẮC:
- Gọi nhiều tool SONG SONG nếu khách hỏi nhiều thứ cùng lúc.
- Suy luận hint trước khi hỏi (sinh viên → tầm trung, cho mẹ → dễ dùng, gaming → chip mạnh). KHÔNG hỏi lại cái đã đoán được.
- Có mã ORD → gọi lookup_order ngay. Nếu trả code='need_email' → xin email rồi gọi lại.

GỌI search_products ĐÚNG CÁCH (cực quan trọng):
- query = LOẠI sản phẩm chính khách muốn ("điện thoại", "laptop", "tai nghe"). KHÔNG truyền nhu cầu như "gaming"/"chụp ảnh"/"pin trâu" vào query (không có trong tên SP).
- Nhu cầu (gaming/chụp ảnh/pin trâu/công việc) → chỉ dùng làm HINT để CHỌN ra 2-3 máy phù hợp từ kết quả, KHÔNG dùng làm filter.
- brandSlug CHỈ truyền khi khách nêu rõ tên hãng (apple/samsung/xiaomi...).
- categorySlug CHỈ truyền sau khi đã get_categories và biết chắc slug. Nếu không chắc → để trống.
- Nếu tool trả found=0 → GỌI LẠI search_products với filter nới lỏng hơn (bỏ query cụ thể, chỉ giữ giá). KHÔNG từ chối khách ngay.
- Nếu tool trả note='Đã nới lỏng...' → thông báo khéo với khách "Mình chưa thấy đúng ý, nhưng có mấy máy tương tự..."

TƯ VẤN SP: gợi 2-3 máy match nhất, mỗi máy 1 dòng (tên - giá - 1 lý do). Có salePrice → báo "giảm X%". Stock<5 → "chỉ còn N máy". Rating≥4.5 hoặc bestseller → nêu để củng cố.

CHÍNH SÁCH (trả lời trực tiếp, không tool):
- Ship nội thành 1-2 ngày, tỉnh 3-5 ngày, freeship >500k
- Đổi trả 7 ngày lỗi NSX, bảo hành 12 tháng theo hãng
- COD/VNPay/MoMo/ZaloPay/ví TechMart/trả góp

NGOÀI PHẠM VI (chính trị, y tế, code...): từ chối ngắn, kéo về mua sắm điện tử.

OUTPUT: <120 từ, tiếng Việt, bullet khi list, 1 emoji, không markdown heading/bảng.`;

const MAX_TOOL_ROUNDS = 2;
const HISTORY_LIMIT = 6;
const MAX_TOKENS_MAIN = 500;
const MAX_TOKENS_FALLBACK = 400;

// Kiểu ChatCompletionMessageParam của Groq SDK để support role "tool"
type GroqMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: any[] }
  | { role: "tool"; tool_call_id: string; content: string };

export class GroqService {
  private client: Groq;
  private model: string = "llama-3.3-70b-versatile";
  private tools: ChatToolsService;

  constructor(tools?: ChatToolsService) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("GROQ_API_KEY is not defined in environment variables");
    }
    this.client = new Groq({ apiKey });
    this.tools = tools || new ChatToolsService();
  }

  async chat(
    message: string,
    conversationHistory: Message[] = []
  ): Promise<ChatResponse> {
    const messages: GroqMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-HISTORY_LIMIT).map((m) => ({
        role: m.role,
        content: m.content,
      })) as GroqMessage[],
      { role: "user", content: message },
    ];

    const toolCallsLog: string[] = [];
    const toolDefs = this.tools.getToolDefinitions();

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const completion = await this.callWithRetry({
        model: this.model,
        messages: messages as any,
        tools: toolDefs as any,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: MAX_TOKENS_MAIN,
      });

      const choice = completion.choices[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        return {
          reply: "Xin lỗi, mình chưa xử lý được câu này. Bạn thử lại nhé 😊",
          timestamp: new Date().toISOString(),
          toolCalls: toolCallsLog,
        };
      }

      const toolCalls = assistantMsg.tool_calls;

      // Không còn tool call → AI đã trả lời xong
      if (!toolCalls || toolCalls.length === 0) {
        return {
          reply:
            assistantMsg.content?.trim() ||
            "Mình chưa rõ ý bạn lắm, bạn nói rõ hơn được không?",
          timestamp: new Date().toISOString(),
          toolCalls: toolCallsLog,
        };
      }

      // Có tool calls → đẩy assistant message (kèm tool_calls) vào history
      messages.push({
        role: "assistant",
        content: assistantMsg.content ?? null,
        tool_calls: toolCalls,
      });

      // Thực thi tất cả tool calls song song và đẩy kết quả vào messages
      const toolResults = await Promise.all(
        toolCalls.map(async (call: any) => {
          const name = call.function?.name || "";
          const args = call.function?.arguments || "{}";
          toolCallsLog.push(`${name}(${args})`);
          const result = await this.tools.execute(name, args);
          return { tool_call_id: call.id, content: result };
        })
      );

      for (const r of toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: r.tool_call_id,
          content: r.content,
        });
      }
      // Loop tiếp: gọi AI lại với tool results
    }

    // Hết số round mà AI vẫn gọi tool → ép trả lời (không cho gọi tool nữa)
    const finalCompletion = await this.callWithRetry({
      model: this.model,
      messages: messages as any,
      temperature: 0.4,
      max_tokens: MAX_TOKENS_FALLBACK,
    });

    return {
      reply:
        finalCompletion.choices[0]?.message?.content?.trim() ||
        "Mình cần thêm thông tin để trả lời chính xác. Bạn mô tả rõ hơn nhé 😊",
      timestamp: new Date().toISOString(),
      toolCalls: toolCallsLog,
    };
  }

  // Streaming version: yield từng chunk text cho SSE. Tool calls vẫn chạy ngầm
  // (không stream), nhưng text reply cuối cùng sẽ stream token-by-token tới user.
  async *chatStream(
    message: string,
    conversationHistory: Message[] = []
  ): AsyncGenerator<StreamEvent> {
    const messages: GroqMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-HISTORY_LIMIT).map((m) => ({
        role: m.role,
        content: m.content,
      })) as GroqMessage[],
      { role: "user", content: message },
    ];

    const toolCallsLog: string[] = [];
    const toolDefs = this.tools.getToolDefinitions();

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const stream = await this.createStreamWithRetry({
        model: this.model,
        messages: messages as any,
        tools: toolDefs as any,
        tool_choice: "auto",
        temperature: 0.4,
        max_tokens: MAX_TOKENS_MAIN,
        stream: true,
      });

      let contentAccumulated = "";
      const toolCallsAccumulated: any[] = [];
      let finishReason: string | null = null;

      for await (const chunk of stream as any) {
        const choice = chunk.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (delta?.content) {
          contentAccumulated += delta.content;
          yield { type: "content", delta: delta.content };
        }

        if (delta?.tool_calls) {
          for (const tcDelta of delta.tool_calls) {
            const idx = tcDelta.index ?? 0;
            if (!toolCallsAccumulated[idx]) {
              toolCallsAccumulated[idx] = {
                id: "",
                type: "function",
                function: { name: "", arguments: "" },
              };
            }
            if (tcDelta.id) toolCallsAccumulated[idx].id = tcDelta.id;
            if (tcDelta.function?.name) {
              toolCallsAccumulated[idx].function.name += tcDelta.function.name;
            }
            if (tcDelta.function?.arguments) {
              toolCallsAccumulated[idx].function.arguments +=
                tcDelta.function.arguments;
            }
          }
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      }

      // Stream xong round này
      const hasTools = toolCallsAccumulated.length > 0;

      if (!hasTools) {
        // AI đã trả lời text → xong
        if (!contentAccumulated) {
          yield {
            type: "content",
            delta: "Mình chưa rõ ý bạn, bạn nói rõ hơn nhé 😊",
          };
        }
        yield {
          type: "done",
          toolCalls: toolCallsLog,
          timestamp: new Date().toISOString(),
        };
        return;
      }

      // Có tool calls → thông báo FE đang chạy tool, rồi execute
      yield {
        type: "tool_start",
        names: toolCallsAccumulated.map((t) => t.function.name),
      };

      messages.push({
        role: "assistant",
        content: contentAccumulated || null,
        tool_calls: toolCallsAccumulated,
      });

      const toolResults = await Promise.all(
        toolCallsAccumulated.map(async (call) => {
          const name = call.function.name;
          const args = call.function.arguments || "{}";
          toolCallsLog.push(`${name}(${args})`);
          const result = await this.tools.execute(name, args);
          return { tool_call_id: call.id, content: result };
        })
      );

      for (const r of toolResults) {
        messages.push({
          role: "tool",
          tool_call_id: r.tool_call_id,
          content: r.content,
        });
      }

      // finish_reason không dùng, chỉ để silencer cho linter biết biến có giá trị
      void finishReason;
    }

    // Hết MAX_TOOL_ROUNDS → gọi lần cuối không cho tool, vẫn stream
    const finalStream = await this.createStreamWithRetry({
      model: this.model,
      messages: messages as any,
      temperature: 0.4,
      max_tokens: MAX_TOKENS_FALLBACK,
      stream: true,
    });

    let gotFinal = false;
    for await (const chunk of finalStream as any) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        gotFinal = true;
        yield { type: "content", delta };
      }
    }

    if (!gotFinal) {
      yield {
        type: "content",
        delta:
          "Mình cần thêm thông tin để trả lời chính xác. Bạn mô tả rõ hơn nhé 😊",
      };
    }
    yield {
      type: "done",
      toolCalls: toolCallsLog,
      timestamp: new Date().toISOString(),
    };
  }

  private async createStreamWithRetry(
    params: any,
    attempt: number = 0
  ): Promise<any> {
    try {
      return await this.client.chat.completions.create(params);
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.error?.error?.code === "rate_limit_exceeded" ||
        (err?.message && err.message.includes("rate_limit"));

      if (isRateLimit && attempt === 0) {
        const retryAfterMs = this.extractRetryAfterMs(err);
        console.warn(`[Groq stream] Rate limited, retry sau ${retryAfterMs}ms`);
        await new Promise((r) => setTimeout(r, retryAfterMs));
        return this.createStreamWithRetry(params, attempt + 1);
      }
      throw err;
    }
  }

  // Gọi Groq kèm retry 1 lần nếu bị rate limit (dựa vào header retry-after nếu có)
  private async callWithRetry(params: any, attempt: number = 0): Promise<any> {
    try {
      return await this.client.chat.completions.create(params);
    } catch (err: any) {
      const isRateLimit =
        err?.status === 429 ||
        err?.error?.error?.code === "rate_limit_exceeded" ||
        (err?.message && err.message.includes("rate_limit"));

      if (isRateLimit && attempt === 0) {
        const retryAfterMs = this.extractRetryAfterMs(err);
        console.warn(`[Groq] Rate limited, retry sau ${retryAfterMs}ms`);
        await new Promise((r) => setTimeout(r, retryAfterMs));
        return this.callWithRetry(params, attempt + 1);
      }
      throw err;
    }
  }

  private extractRetryAfterMs(err: any): number {
    // Groq trả ms trong message: "Please try again in 10.485s"
    const msg: string = err?.error?.error?.message || err?.message || "";
    const match = msg.match(/try again in ([\d.]+)s/i);
    if (match) {
      const seconds = parseFloat(match[1]);
      return Math.min(Math.ceil(seconds * 1000) + 200, 15000); // cap 15s
    }
    return 3000;
  }
}
