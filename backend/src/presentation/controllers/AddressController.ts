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

      // Check trùng lặp
      const allAddresses = await this.addressRepository.findByUserId(req.user.userId);
      const duplicate = allAddresses.find(a =>
        a.fullName === fullName && a.phone === phone && a.addressLine === addressLine
        && a.ward === ward && a.district === district && a.city === city
      );
      if (duplicate) {
        return res.status(400).json({ message: 'Địa chỉ này đã tồn tại (trùng hoàn toàn với địa chỉ của ' + duplicate.fullName + ' - ' + duplicate.phone + ', ' + duplicate.addressLine + ', ' + duplicate.ward + ', ' + duplicate.district + ', ' + duplicate.city + ')' });
      }

      // Check trùng từng phần - cảnh báo cụ thể
      for (const a of allAddresses) {
        const trung: string[] = [];
        if (a.fullName === fullName && a.phone === phone) trung.push('họ tên & SĐT');
        if (a.addressLine === addressLine && a.ward === ward && a.district === district && a.city === city) trung.push('địa chỉ');
        if (trung.length > 0) {
          return res.status(400).json({ message: `Trùng ${trung.join(' và ')} với địa chỉ đã lưu: "${a.fullName} - ${a.phone}, ${a.addressLine}, ${a.ward}, ${a.district}, ${a.city}"` });
        }
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

      // Check trùng lặp (trừ chính nó)
      const { fullName, phone, addressLine, ward, district, city } = req.body;
      if (fullName && phone && addressLine && ward && district && city) {
        const others = (await this.addressRepository.findByUserId(req.user.userId)).filter(a => a.addressId !== addressId);
        const duplicate = others.find(a =>
          a.fullName === fullName && a.phone === phone && a.addressLine === addressLine
          && a.ward === ward && a.district === district && a.city === city
        );
        if (duplicate) {
          return res.status(400).json({ message: 'Địa chỉ này đã tồn tại (trùng hoàn toàn với địa chỉ của ' + duplicate.fullName + ' - ' + duplicate.phone + ', ' + duplicate.addressLine + ')' });
        }
        for (const a of others) {
          const trung: string[] = [];
          if (a.fullName === fullName && a.phone === phone) trung.push('họ tên & SĐT');
          if (a.addressLine === addressLine && a.ward === ward && a.district === district && a.city === city) trung.push('địa chỉ');
          if (trung.length > 0) {
            return res.status(400).json({ message: `Trùng ${trung.join(' và ')} với địa chỉ đã lưu: "${a.fullName} - ${a.phone}, ${a.addressLine}, ${a.ward}"` });
          }
        }
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
