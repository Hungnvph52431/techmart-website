import { Voucher } from '../entities/Voucher';

export interface IVoucherRepository {
  findByCode(code: string): Promise<any | null>;
  findAll(): Promise<Voucher[]>;
  create(data: any): Promise<Voucher>;
  delete(id: number): Promise<boolean>;
}