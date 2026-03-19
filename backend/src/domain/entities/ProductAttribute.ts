export type ProductAttributeInputType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multi_select'
  | 'color';

export type ProductAttributeScope = 'product' | 'variant';

export interface ProductAttributeOption {
  optionId: number;
  attributeId: number;
  label: string;
  value: string;
  colorHex?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ProductAttribute {
  attributeId: number;
  name: string;
  code: string;
  inputType: ProductAttributeInputType;
  scope: ProductAttributeScope;
  isRequired: boolean;
  isFilterable: boolean;
  isVariantAxis: boolean;
  displayOrder: number;
  isActive: boolean;
  options?: ProductAttributeOption[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryAttribute {
  categoryAttributeId: number;
  categoryId: number;
  attributeId: number;
  isRequired: boolean;
  isVariantAxis: boolean;
  displayOrder: number;
}

export interface CreateProductAttributeDTO {
  name: string;
  code: string;
  inputType: ProductAttributeInputType;
  scope: ProductAttributeScope;
  isRequired?: boolean;
  isFilterable?: boolean;
  isVariantAxis?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  options?: Array<{
    label: string;
    value: string;
    colorHex?: string;
    displayOrder?: number;
    isActive?: boolean;
  }>;
}

export interface UpdateProductAttributeDTO extends Partial<CreateProductAttributeDTO> {
  attributeId: number;
}

export interface AssignCategoryAttributesDTO {
  categoryId: number;
  attributes: Array<{
    attributeId: number;
    isRequired?: boolean;
    isVariantAxis?: boolean;
    displayOrder?: number;
  }>;
}
