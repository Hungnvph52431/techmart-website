import { Request, Response } from 'express';
import { VietnamAdministrativeService } from '../../application/services/VietnamAdministrativeService';

export class LocationController {
  constructor(
    private readonly vietnamAdministrativeService: VietnamAdministrativeService
  ) {}

  getProvinces = (req: Request, res: Response) => {
    res.json(
      this.vietnamAdministrativeService.listProvinces(req.query.search as string)
    );
  };

  getWardsByProvince = (req: Request, res: Response) => {
    const province = this.vietnamAdministrativeService.findProvinceByCode(
      req.params.provinceCode
    );

    if (!province) {
      return res
        .status(404)
        .json({ message: 'Không tìm thấy tỉnh/thành phố tương ứng' });
    }

    res.json(
      this.vietnamAdministrativeService.listWardsByProvince(
        province.code,
        req.query.search as string
      )
    );
  };
}
