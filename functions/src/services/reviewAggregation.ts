import prisma from '../config/database';
import { clearCache } from '../middleware/cache';

export interface ProductRatingStats {
  productId: string;
  averageRating: number;
  totalReviews: number;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
  };
  latestReview: {
    id: string;
    rating: number;
    title: string;
    comment: string;
    authorName: string;
    images: string[];
    createdAt: string;
  } | null;
  lastReviewDate: string | null;
}

// In-memory cache for ultra-fast response times
const ratingCache = new Map<string, ProductRatingStats>();

export class ReviewAggregationService {
  /**
   * Aggregates and calculates accurate review statistics for a product.
   * Only includes APPROVED reviews (excludes PENDING, REJECTED, and DELETED).
   */
  static async aggregateProductRating(productId: string): Promise<ProductRatingStats> {
    if (!productId) {
      return this.getEmptyStats('');
    }

    try {
      // 1. Fetch CustomerReview records
      const customerReviews = await prisma.customerReview.findMany({
        where: { productId },
        include: {
          customer: {
            include: { user: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 2. Fetch ProductReview records
      const productReviews = await prisma.productReview.findMany({
        where: { productId, isApproved: true },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });

      const approvedItems: Array<{
        id: string;
        rating: number;
        title: string;
        comment: string;
        authorName: string;
        images: string[];
        createdAt: Date;
      }> = [];

      // Process CustomerReviews
      for (const cr of customerReviews) {
        let title = 'Verified Customer Review';
        let comment = cr.reviewText || '';
        let images: string[] = [];
        let status = 'APPROVED';

        if (cr.reviewText && cr.reviewText.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(cr.reviewText);
            title = parsed.title || title;
            comment = parsed.comment || parsed.review || comment;
            images = Array.isArray(parsed.images) ? parsed.images : [];
            status = parsed.status || status;
          } catch (e) {
            // Keep raw text fallback
          }
        }

        // Exclude pending or rejected reviews
        if (status.toUpperCase() === 'APPROVED') {
          const authorName =
            cr.customer?.user?.firstName
              ? `${cr.customer.user.firstName} ${cr.customer.user.lastName || ''}`.trim()
              : 'Verified Buyer';

          approvedItems.push({
            id: cr.id,
            rating: Number(cr.rating) || 5,
            title,
            comment,
            authorName,
            images,
            createdAt: cr.createdAt,
          });
        }
      }

      // Process ProductReviews
      for (const pr of productReviews) {
        const authorName = pr.user?.firstName
          ? `${pr.user.firstName} ${pr.user.lastName || ''}`.trim()
          : 'Verified Buyer';

        approvedItems.push({
          id: pr.id,
          rating: Number(pr.rating) || 5,
          title: pr.title || 'Product Review',
          comment: pr.comment || '',
          authorName,
          images: [],
          createdAt: pr.createdAt,
        });
      }

      // Sort by newest date
      approvedItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const totalReviews = approvedItems.length;
      if (totalReviews === 0) {
        const emptyStats = this.getEmptyStats(productId);
        ratingCache.set(productId, emptyStats);
        return emptyStats;
      }

      let rating1Count = 0;
      let rating2Count = 0;
      let rating3Count = 0;
      let rating4Count = 0;
      let rating5Count = 0;
      let sumRating = 0;

      for (const item of approvedItems) {
        const r = Math.min(5, Math.max(1, Math.round(item.rating)));
        sumRating += r;
        if (r === 1) rating1Count++;
        else if (r === 2) rating2Count++;
        else if (r === 3) rating3Count++;
        else if (r === 4) rating4Count++;
        else if (r === 5) rating5Count++;
      }

      const averageRating = Math.round((sumRating / totalReviews) * 10) / 10;
      const latest = approvedItems[0];

      const stats: ProductRatingStats = {
        productId,
        averageRating,
        totalReviews,
        rating1Count,
        rating2Count,
        rating3Count,
        rating4Count,
        rating5Count,
        ratingDistribution: {
          '1': rating1Count,
          '2': rating2Count,
          '3': rating3Count,
          '4': rating4Count,
          '5': rating5Count,
        },
        latestReview: latest
          ? {
              id: latest.id,
              rating: latest.rating,
              title: latest.title,
              comment: latest.comment,
              authorName: latest.authorName,
              images: latest.images,
              createdAt: latest.createdAt.toISOString(),
            }
          : null,
        lastReviewDate: latest ? latest.createdAt.toISOString() : null,
      };

      ratingCache.set(productId, stats);
      return stats;
    } catch (error) {
      console.error(`[ReviewAggregationService] Error aggregating product ${productId}:`, error);
      return this.getEmptyStats(productId);
    }
  }

  /**
   * Recalculates product rating statistics and clears system response caches.
   */
  static async updateProductRating(productId: string): Promise<ProductRatingStats> {
    const stats = await this.aggregateProductRating(productId);
    clearCache(); // Invalidate global endpoint cache (sysCache)
    return stats;
  }

  /**
   * Rebuilds rating statistics for all products in the database.
   */
  static async rebuildProductRatings(): Promise<{
    totalProductsProcessed: number;
    updatedProducts: number;
    timestamp: string;
  }> {
    const products = await prisma.product.findMany({
      select: { id: true },
    });

    let updatedProducts = 0;
    for (const p of products) {
      await this.aggregateProductRating(p.id);
      updatedProducts++;
    }

    clearCache();

    return {
      totalProductsProcessed: products.length,
      updatedProducts,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Gets rating stats from cache or computes them if missing.
   */
  static async getProductRating(productId: string, fallbackReviews?: any[]): Promise<ProductRatingStats> {
    if (ratingCache.has(productId)) {
      return ratingCache.get(productId)!;
    }

    // Fallback inline calculation if reviews list is already available
    if (Array.isArray(fallbackReviews) && fallbackReviews.length > 0) {
      const approved = fallbackReviews.filter((r: any) => {
        if (r.isApproved === false) return false;
        if (r.reviewText && r.reviewText.startsWith('{')) {
          try {
            const p = JSON.parse(r.reviewText);
            if (p.status && p.status !== 'APPROVED') return false;
          } catch (e) {}
        }
        return true;
      });

      if (approved.length > 0) {
        let sum = 0;
        let r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0;
        for (const item of approved) {
          const r = Math.min(5, Math.max(1, Math.round(Number(item.rating) || 5)));
          sum += r;
          if (r === 1) r1++;
          else if (r === 2) r2++;
          else if (r === 3) r3++;
          else if (r === 4) r4++;
          else if (r === 5) r5++;
        }
        const avg = Math.round((sum / approved.length) * 10) / 10;
        const stats: ProductRatingStats = {
          productId,
          averageRating: avg,
          totalReviews: approved.length,
          rating1Count: r1,
          rating2Count: r2,
          rating3Count: r3,
          rating4Count: r4,
          rating5Count: r5,
          ratingDistribution: { '1': r1, '2': r2, '3': r3, '4': r4, '5': r5 },
          latestReview: null,
          lastReviewDate: null,
        };
        ratingCache.set(productId, stats);
        return stats;
      }
    }

    return this.aggregateProductRating(productId);
  }

  /**
   * Analytics breakdown for Admin panel
   */
  static async getReviewAnalytics() {
    const customerReviews = await prisma.customerReview.findMany({
      include: { product: true },
    });
    const productReviews = await prisma.productReview.findMany({
      include: { product: true },
    });

    let totalCount = 0;
    let approvedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    let totalRatingSum = 0;

    const productRatingMap: Record<string, { productName: string; totalRating: number; count: number }> = {};

    const processReview = (productId: string, productName: string, rating: number, status: string) => {
      totalCount++;
      const normStatus = status.toUpperCase();
      if (normStatus === 'APPROVED') {
        approvedCount++;
        totalRatingSum += rating;
        if (!productRatingMap[productId]) {
          productRatingMap[productId] = { productName, totalRating: 0, count: 0 };
        }
        productRatingMap[productId].totalRating += rating;
        productRatingMap[productId].count += 1;
      } else if (normStatus === 'PENDING') {
        pendingCount++;
      } else if (normStatus === 'REJECTED') {
        rejectedCount++;
      }
    };

    for (const cr of customerReviews) {
      let status = 'APPROVED';
      if (cr.reviewText && cr.reviewText.startsWith('{')) {
        try {
          const parsed = JSON.parse(cr.reviewText);
          status = parsed.status || status;
        } catch (e) {}
      }
      processReview(cr.productId, cr.product?.name || 'Product', Number(cr.rating) || 5, status);
    }

    for (const pr of productReviews) {
      const status = pr.isApproved ? 'APPROVED' : 'PENDING';
      processReview(pr.productId, pr.product?.name || 'Product', Number(pr.rating) || 5, status);
    }

    const averageStoreRating = approvedCount > 0 ? Math.round((totalRatingSum / approvedCount) * 10) / 10 : 0;

    const productStatsList = Object.entries(productRatingMap).map(([id, data]) => ({
      productId: id,
      productName: data.productName,
      averageRating: Math.round((data.totalRating / data.count) * 10) / 10,
      totalReviews: data.count,
    }));

    const topRatedProducts = [...productStatsList]
      .sort((a, b) => b.averageRating - a.averageRating || b.totalReviews - a.totalReviews)
      .slice(0, 5);

    const lowestRatedProducts = [...productStatsList]
      .filter((p) => p.totalReviews > 0)
      .sort((a, b) => a.averageRating - b.averageRating)
      .slice(0, 5);

    const mostReviewedProducts = [...productStatsList]
      .sort((a, b) => b.totalReviews - a.totalReviews)
      .slice(0, 5);

    return {
      totalReviews: totalCount,
      approvedReviews: approvedCount,
      pendingReviews: pendingCount,
      rejectedReviews: rejectedCount,
      averageStoreRating,
      topRatedProducts,
      lowestRatedProducts,
      mostReviewedProducts,
    };
  }

  private static getEmptyStats(productId: string): ProductRatingStats {
    return {
      productId,
      averageRating: 0,
      totalReviews: 0,
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      latestReview: null,
      lastReviewDate: null,
    };
  }
}
