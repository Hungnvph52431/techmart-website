import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../database/connection';
import { IAttributeRepository } from '../../domain/repositories/IAttributeRepository';
import {
  AssignCategoryAttributesDTO,
  CategoryAttribute,
  CreateProductAttributeDTO,
  ProductAttribute,
  ProductAttributeOption,
  UpdateProductAttributeDTO,
} from '../../domain/entities/ProductAttribute';

export class AttributeRepository implements IAttributeRepository {
  async findAll(): Promise<ProductAttribute[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM product_attributes
       ORDER BY display_order ASC, name ASC`
    );

    return this.attachOptions(rows.map((row) => this.mapRowToAttribute(row)));
  }

  async findById(attributeId: number): Promise<ProductAttribute | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_attributes WHERE attribute_id = ?',
      [attributeId]
    );

    if (rows.length === 0) {
      return null;
    }

    const [attribute] = await this.attachOptions([this.mapRowToAttribute(rows[0])]);
    return attribute || null;
  }

  async findByCode(code: string): Promise<ProductAttribute | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM product_attributes WHERE code = ?',
      [code]
    );

    if (rows.length === 0) {
      return null;
    }

    const [attribute] = await this.attachOptions([this.mapRowToAttribute(rows[0])]);
    return attribute || null;
  }

  async findByCategoryId(categoryId: number): Promise<CategoryAttribute[]> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM category_attributes
       WHERE category_id = ?
       ORDER BY display_order ASC, category_attribute_id ASC`,
      [categoryId]
    );

    return rows.map((row) => ({
      categoryAttributeId: row.category_attribute_id,
      categoryId: row.category_id,
      attributeId: row.attribute_id,
      isRequired: Boolean(row.is_required),
      isVariantAxis: Boolean(row.is_variant_axis),
      displayOrder: row.display_order,
    }));
  }

  async create(attribute: CreateProductAttributeDTO): Promise<ProductAttribute> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const now = new Date();

      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO product_attributes (
          name, code, input_type, scope, is_required, is_filterable,
          is_variant_axis, display_order, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          attribute.name,
          attribute.code,
          attribute.inputType,
          attribute.scope,
          attribute.isRequired ?? false,
          attribute.isFilterable ?? false,
          attribute.isVariantAxis ?? false,
          attribute.displayOrder ?? 0,
          attribute.isActive ?? true,
          now,
          now,
        ]
      );

      await this.syncOptions(connection, result.insertId, attribute.options || []);
      await connection.commit();

      return (await this.findById(result.insertId))!;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async update(attribute: UpdateProductAttributeDTO): Promise<ProductAttribute | null> {
    const existing = await this.findById(attribute.attributeId);
    if (!existing) {
      return null;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const updates: string[] = [];
      const params: any[] = [];

      if (attribute.name !== undefined) {
        updates.push('name = ?');
        params.push(attribute.name);
      }
      if (attribute.code !== undefined) {
        updates.push('code = ?');
        params.push(attribute.code);
      }
      if (attribute.inputType !== undefined) {
        updates.push('input_type = ?');
        params.push(attribute.inputType);
      }
      if (attribute.scope !== undefined) {
        updates.push('scope = ?');
        params.push(attribute.scope);
      }
      if (attribute.isRequired !== undefined) {
        updates.push('is_required = ?');
        params.push(attribute.isRequired);
      }
      if (attribute.isFilterable !== undefined) {
        updates.push('is_filterable = ?');
        params.push(attribute.isFilterable);
      }
      if (attribute.isVariantAxis !== undefined) {
        updates.push('is_variant_axis = ?');
        params.push(attribute.isVariantAxis);
      }
      if (attribute.displayOrder !== undefined) {
        updates.push('display_order = ?');
        params.push(attribute.displayOrder);
      }
      if (attribute.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(attribute.isActive);
      }

      updates.push('updated_at = ?');
      params.push(new Date());
      params.push(attribute.attributeId);

      if (updates.length > 0) {
        await connection.execute(
          `UPDATE product_attributes SET ${updates.join(', ')} WHERE attribute_id = ?`,
          params
        );
      }

      if (attribute.options) {
        await this.syncOptions(connection, attribute.attributeId, attribute.options);
      }

      await connection.commit();
      return this.findById(attribute.attributeId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async delete(attributeId: number): Promise<boolean> {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM product_attributes WHERE attribute_id = ?',
      [attributeId]
    );
    return result.affectedRows > 0;
  }

  async assignToCategory(data: AssignCategoryAttributesDTO): Promise<CategoryAttribute[]> {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      await connection.execute(
        'DELETE FROM category_attributes WHERE category_id = ?',
        [data.categoryId]
      );

      for (const [index, attribute] of data.attributes.entries()) {
        await connection.execute(
          `INSERT INTO category_attributes (
            category_id, attribute_id, is_required, is_variant_axis, display_order
          ) VALUES (?, ?, ?, ?, ?)`,
          [
            data.categoryId,
            attribute.attributeId,
            attribute.isRequired ?? false,
            attribute.isVariantAxis ?? false,
            attribute.displayOrder ?? index,
          ]
        );
      }

      await connection.commit();
      return this.findByCategoryId(data.categoryId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  private async attachOptions(attributes: ProductAttribute[]) {
    if (attributes.length === 0) {
      return attributes;
    }

    const placeholders = attributes.map(() => '?').join(', ');
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT *
       FROM product_attribute_options
       WHERE attribute_id IN (${placeholders})
       ORDER BY display_order ASC, option_id ASC`,
      attributes.map((attribute) => attribute.attributeId)
    );

    const optionsByAttribute = rows.reduce<Map<number, ProductAttributeOption[]>>((map, row) => {
      const item: ProductAttributeOption = {
        optionId: row.option_id,
        attributeId: row.attribute_id,
        label: row.label,
        value: row.value,
        colorHex: row.color_hex,
        displayOrder: row.display_order,
        isActive: Boolean(row.is_active),
      };

      const bucket = map.get(item.attributeId) || [];
      bucket.push(item);
      map.set(item.attributeId, bucket);
      return map;
    }, new Map());

    return attributes.map((attribute) => ({
      ...attribute,
      options: optionsByAttribute.get(attribute.attributeId) || [],
    }));
  }

  private async syncOptions(
    connection: any,
    attributeId: number,
    options: CreateProductAttributeDTO['options']
  ) {
    await connection.execute(
      'DELETE FROM product_attribute_options WHERE attribute_id = ?',
      [attributeId]
    );

    for (const [index, option] of (options || []).entries()) {
      await connection.execute(
        `INSERT INTO product_attribute_options (
          attribute_id, label, value, color_hex, display_order, is_active
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          attributeId,
          option.label,
          option.value,
          option.colorHex || null,
          option.displayOrder ?? index,
          option.isActive ?? true,
        ]
      );
    }
  }

  private mapRowToAttribute(row: any): ProductAttribute {
    return {
      attributeId: row.attribute_id,
      name: row.name,
      code: row.code,
      inputType: row.input_type,
      scope: row.scope,
      isRequired: Boolean(row.is_required),
      isFilterable: Boolean(row.is_filterable),
      isVariantAxis: Boolean(row.is_variant_axis),
      displayOrder: row.display_order,
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
