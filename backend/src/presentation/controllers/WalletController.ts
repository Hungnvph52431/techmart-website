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

  getSupportedBanks = async (_req: AuthRequest, res: Response) => {
    try {
      res.json(this.walletUseCase.getSupportedBanks());
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  getWithdrawalProfile = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await this.walletUseCase.getWithdrawalProfile(req.user.userId);
      res.json(profile);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  setupWithdrawalProfile = async (req: AuthRequest, res: Response) => {
    try {
      const profile = await this.walletUseCase.setupWithdrawalProfile(req.user.userId, {
        bankCode: String(req.body.bankCode || ''),
        accountNumber: String(req.body.accountNumber || ''),
        accountHolderName: String(req.body.accountHolderName || ''),
        branchName: String(req.body.branchName || ''),
        pin: String(req.body.pin || ''),
        confirmPin: String(req.body.confirmPin || ''),
      });
      res.status(201).json(profile);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };

  getWithdrawals = async (req: AuthRequest, res: Response) => {
    try {
      const withdrawals = await this.walletUseCase.getWithdrawals(req.user.userId);
      res.json(withdrawals);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  createWithdrawal = async (req: AuthRequest, res: Response) => {
    try {
      const result = await this.walletUseCase.createWithdrawal(req.user.userId, {
        amount: Number(req.body.amount),
        pin: String(req.body.pin || ''),
        customerNote: req.body.customerNote ? String(req.body.customerNote) : undefined,
      });
      res.status(201).json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
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

  adminListWithdrawals = async (req: AuthRequest, res: Response) => {
    try {
      const status = req.query.status ? String(req.query.status) : 'all';
      const days = req.query.days ? Number(req.query.days) : 30;
      const withdrawals = await this.walletUseCase.adminListWithdrawals(status, days);
      res.json(withdrawals);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  adminUpdateWithdrawalStatus = async (req: AuthRequest, res: Response) => {
    try {
      const requestId = Number(req.params.id);
      if (Number.isNaN(requestId)) {
        return res.status(400).json({ message: 'Mã yêu cầu rút tiền không hợp lệ' });
      }

      const result = await this.walletUseCase.adminUpdateWithdrawalStatus(requestId, req.user.userId, {
        status: req.body.status,
        adminNote: req.body.adminNote,
      });

      res.json(result);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  };
}
