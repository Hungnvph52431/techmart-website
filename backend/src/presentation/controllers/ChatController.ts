import { Request, Response } from "express";
import { GroqService, Message } from "../../application/services/GroqService";

const groqService = new GroqService();

export interface ChatRequest {
  message: string;
  userId?: string;
  conversationHistory?: Message[];
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

      const response = await groqService.chat(message.trim(), conversationHistory);

      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(`[Chat] Tools used: ${response.toolCalls.join(", ")}`);
      }

      res.status(200).json({
        reply: response.reply,
        timestamp: response.timestamp,
      });
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

  async streamMessage(req: Request, res: Response): Promise<void> {
    const { message, conversationHistory = [] }: ChatRequest = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Tin nhắn không hợp lệ." });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({ error: "Tin nhắn quá dài. Tối đa 2000 ký tự." });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    const write = (event: unknown) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const event of groqService.chatStream(
        message.trim(),
        conversationHistory
      )) {
        write(event);
        if (event.type === "done" && event.toolCalls.length > 0) {
          console.log(`[Chat stream] Tools used: ${event.toolCalls.join(", ")}`);
        }
      }
    } catch (error) {
      console.error("[ChatController.stream] Error:", error);
      const msg =
        error instanceof Error && error.message.includes("rate_limit")
          ? "Dịch vụ AI đang quá tải, thử lại sau vài giây."
          : "Có lỗi xảy ra khi xử lý tin nhắn.";
      write({ type: "error", message: msg });
    } finally {
      res.end();
    }
  }
}
