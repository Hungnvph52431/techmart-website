import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { WalletUseCase } from '../../application/use-cases/WalletUseCase';

export class WalletController {
  constructor(private walletUseCase: WalletUseCase) {}

  getBalance = async (req: AuthRequest, res: Response) => {
    try {
      const balance = await this.walletUseCase.getBalance(req.user.userId);
      res.json({ balance });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  getTransactions = async (req: AuthRequest, res: Response) => {
    try {
      const txs = await this.walletUseCase.getTransactions(req.user.userId);
      res.json(txs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  createVNPayTopup = async (req: AuthRequest, res: Response) => {
    try {
      const { amount } = req.body;
      if (!amount || isNaN(Number(amount))) {
        return res.status(400).json({ message: 'Số tiền không hợp lệ' });
      }
      const ipAddr =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress?.replace('::ffff:', '') ||
        '127.0.0.1';
      const result = await this.walletUseCase.createVNPayTopupUrl(req.user.userId, Number(amount), ipAddr);
      res.json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  adminListTopups = async (req: AuthRequest, res: Response) => {
    try {
      const days = req.query.days ? Number(req.query.days) : 7;
      const topups = await this.walletUseCase.adminListTopups(days);
      res.json(topups);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };
}
