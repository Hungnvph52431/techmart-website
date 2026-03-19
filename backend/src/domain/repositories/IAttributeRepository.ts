import {
  AssignCategoryAttributesDTO,
  CategoryAttribute,
  CreateProductAttributeDTO,
  ProductAttribute,
  UpdateProductAttributeDTO,
} from '../entities/ProductAttribute';

export interface IAttributeRepository {
  findAll(): Promise<ProductAttribute[]>;
  findById(attributeId: number): Promise<ProductAttribute | null>;
  findByCode(code: string): Promise<ProductAttribute | null>;
  findByCategoryId(categoryId: number): Promise<CategoryAttribute[]>;
  create(attribute: CreateProductAttributeDTO): Promise<ProductAttribute>;
  update(attribute: UpdateProductAttributeDTO): Promise<ProductAttribute | null>;
  delete(attributeId: number): Promise<boolean>;
  assignToCategory(data: AssignCategoryAttributesDTO): Promise<CategoryAttribute[]>;
}
