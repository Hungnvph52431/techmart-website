import { IOrderRepository } from '../../domain/repositories/IOrderRepository';
import { IProductRepository } from '../../domain/repositories/IProductRepository';
import { CreateOrderDTO, UpdateOrderDTO } from '../../domain/entities/Order';

export class OrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private productRepository: IProductRepository
  ) {}

  async getAllOrders() {
    return this.orderRepository.findAll();
  }

  async getOrderById(orderId: number) {
    return this.orderRepository.findById(orderId);
  }

  async getOrdersByUserId(userId: number) {
    return this.orderRepository.findByUserId(userId);
  }

  async getOrderDetails(orderId: number) {
    return this.orderRepository.getOrderDetails(orderId);
  }

  async createOrder(orderData: CreateOrderDTO) {
    // Validate product stock
    for (const item of orderData.items) {
      const product = await this.productRepository.findById(item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (item.variantId) {
        const variant = await this.productRepository.findVariantById(item.variantId);
        if (!variant || variant.productId !== item.productId || !variant.isActive) {
          throw new Error(`Variant ${item.variantId} not found`);
        }
        if (variant.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for variant ${variant.variantName}`);
        }
      } else if (product.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}`);
      }
    }

    // Create order
    const order = await this.orderRepository.create(orderData);

    // Update product stock
    for (const item of orderData.items) {
      if (item.variantId) {
        await this.productRepository.updateVariantStock(item.variantId, -item.quantity);
      }
      await this.productRepository.updateStock(item.productId, -item.quantity);
    }

    return order;
  }

  async updateOrder(orderData: UpdateOrderDTO) {
    return this.orderRepository.update(orderData);
  }

  async updateOrderStatus(orderId: number, status: any) {
    return this.orderRepository.updateStatus(orderId, status);
  }

  async updatePaymentStatus(orderId: number, status: any) {
    return this.orderRepository.updatePaymentStatus(orderId, status);
  }
}
