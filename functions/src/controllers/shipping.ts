import { Request, Response } from 'express';
import { ShippingService } from '../services/shipping.service';

/**
 * Controller to calculate shipping charges dynamically for Cart, Checkout, and Admin Preview
 */
export const calculateShipping = async (req: Request, res: Response) => {
  try {
    const { items, address, shippingSettings } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(200).json({
        shippingCharge: 0,
        source: 'FREE_SHIPPING',
        totalWeightGrams: 0,
        formattedWeight: '0 g',
        estimatedDays: 3,
        freeShipping: true,
        shippingLabel: 'Free Shipping',
        appliedRule: {
          type: 'FREE_SHIPPING',
          name: 'Free Shipping',
        },
        breakdown: [],
      });
    }

    const result = await ShippingService.calculateShipping(items, shippingSettings);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Shipping calculation error:', error);
    return res.status(500).json({
      error: 'Failed to calculate dynamic shipping',
      details: error.message,
    });
  }
};
