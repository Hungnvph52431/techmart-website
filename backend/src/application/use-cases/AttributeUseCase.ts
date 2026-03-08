import {
  AssignCategoryAttributesDTO,
  CreateProductAttributeDTO,
  UpdateProductAttributeDTO,
} from '../../domain/entities/ProductAttribute';
import { IAttributeRepository } from '../../domain/repositories/IAttributeRepository';

export class AttributeUseCase {
  constructor(private attributeRepository: IAttributeRepository) {}

  async getAllAttributes() {
    return this.attributeRepository.findAll();
  }

  async getAttributeById(id: number) {
    return this.attributeRepository.findById(id);
  }

  async getCategoryAttributes(categoryId: number) {
    return this.attributeRepository.findByCategoryId(categoryId);
  }

  async createAttribute(data: CreateProductAttributeDTO) {
    await this.ensureCodeIsUnique(data.code);
    return this.attributeRepository.create(data);
  }

  async updateAttribute(data: UpdateProductAttributeDTO) {
    if (data.code) {
      await this.ensureCodeIsUnique(data.code, data.attributeId);
    }

    return this.attributeRepository.update(data);
  }

  async deleteAttribute(id: number) {
    return this.attributeRepository.delete(id);
  }

  async assignCategoryAttributes(data: AssignCategoryAttributesDTO) {
    return this.attributeRepository.assignToCategory(data);
  }

  private async ensureCodeIsUnique(code: string, currentAttributeId?: number) {
    const existing = await this.attributeRepository.findByCode(code);
    if (existing && existing.attributeId !== currentAttributeId) {
      throw new Error('Attribute code already exists');
    }
  }
}
