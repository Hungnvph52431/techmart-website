import { IPaymentRepository } from '../../../domain/repositories/IPaymentRepository';
import { CODTodaySummary } from '../../../domain/entities/Payment';

export class GetCODTodayUseCase {
  constructor(private paymentRepo: IPaymentRepository) {}

  async execute(shipperId: number): Promise<CODTodaySummary> {
    return this.paymentRepo.getTodaySummary(shipperId);
  }
}
