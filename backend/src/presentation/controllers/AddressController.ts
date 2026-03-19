// src/presentation/controllers/AddressController.ts

import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { AddressRepository } from '../../infrastructure/repositories/AddressRepository';

export class AddressController {
  constructor(private addressRepository: AddressRepository) {}

  // GET /api/addresses — lấy tất cả địa chỉ của user đang đăng nhập
  getMyAddresses = async (req: AuthRequest, res: Response) => {
    try {
      const addresses = await this.addressRepository.findByUserId(req.user.userId);
      res.json(addresses);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };

  // POST /api/addresses — tạo địa chỉ mới
  create = async (req: AuthRequest, res: Response) => {
    try {
      const { fullName, phone, addressLine, ward, district, city, isDefault } = req.body;

      if (!fullName || !phone || !addressLine || !ward || !district || !city) {
        return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin địa chỉ' });
      }

      const address = await this.addressRepository.create(req.user.userId, {
        fullName, phone, addressLine, ward, district, city, isDefault,
      });

      res.status(201).json(address);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };

  // PUT /api/addresses/:id — cập nhật địa chỉ
  update = async (req: AuthRequest, res: Response) => {
    try {
      const addressId = Number(req.params.id);
      const existing = await this.addressRepository.findById(addressId);

      if (!existing || existing.userId !== req.user.userId) {
        return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
      }

      const updated = await this.addressRepository.update(addressId, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };

  // PATCH /api/addresses/:id/default — đặt làm địa chỉ mặc định
  setDefault = async (req: AuthRequest, res: Response) => {
    try {
      const addressId = Number(req.params.id);
      const existing = await this.addressRepository.findById(addressId);

      if (!existing || existing.userId !== req.user.userId) {
        return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
      }

      await this.addressRepository.setDefault(addressId, req.user.userId);
      res.json({ message: 'Đã đặt làm địa chỉ mặc định' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };

  // DELETE /api/addresses/:id — xóa địa chỉ
  delete = async (req: AuthRequest, res: Response) => {
    try {
      const addressId = Number(req.params.id);
      const existing = await this.addressRepository.findById(addressId);

      if (!existing || existing.userId !== req.user.userId) {
        return res.status(404).json({ message: 'Không tìm thấy địa chỉ' });
      }

      await this.addressRepository.delete(addressId, req.user.userId);
      res.json({ message: 'Đã xóa địa chỉ' });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  };
}
