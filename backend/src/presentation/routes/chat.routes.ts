import { Router } from "express";
import { ChatController } from "../controllers/ChatController";

const chatController = new ChatController();

export function createChatRoutes(): Router {
  const router = Router();

  /**
   * POST /api/chat
   * Body: { message: string, userId?: string, conversationHistory?: Message[] }
   * Response: { reply: string, timestamp: string }
   */
  router.post("/", (req, res) => chatController.sendMessage(req, res));

  /**
   * POST /api/chat/stream
   * Same body. Returns Server-Sent Events:
   *   data: {"type":"content","delta":"..."}
   *   data: {"type":"tool_start","names":["search_products"]}
   *   data: {"type":"done","toolCalls":[...],"timestamp":"..."}
   *   data: {"type":"error","message":"..."}
   */
  router.post("/stream", (req, res) => chatController.streamMessage(req, res));

  return router;
}