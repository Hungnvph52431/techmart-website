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

  return router;
}