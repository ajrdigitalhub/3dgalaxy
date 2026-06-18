import { Request, Response, NextFunction } from 'express';
import * as BannerService from './banner.service';

export const getBanners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banners = await BannerService.getBanners(req.query.type as string);
    res.json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banner = await BannerService.createBanner(req.body);
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const banner = await BannerService.updateBanner(req.params.id, req.body);
    res.json({ success: true, data: banner });
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await BannerService.deleteBanner(req.params.id);
    res.json({ success: true, message: 'Banner deleted successfully' });
  } catch (error) {
    next(error);
  }
};
