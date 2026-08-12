import { Router } from "express";
import prisma from "../config/database";
import { sysCache } from "../config/cache";
import { ReviewAggregationService } from "../services/reviewAggregation";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/auth";
import { mapProductFields } from "../controllers/product";

import { sanitizeHtml } from "../utils/sanitizer";

const router = Router();

// Helper: Check if a user has a delivered order containing a specific product
async function hasVerifiedPurchase(
  userId: string,
  productId: string,
): Promise<{ verified: boolean; orderId?: string }> {
  if (!userId || !productId) return { verified: false };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, mobile: true },
  });

  if (!user) return { verified: false };

  // Find all customer accounts matching user ID, email, or mobile number
  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { userId: user.id },
        ...(user.email ? [{ user: { email: user.email } }] : []),
        ...(user.mobile ? [{ phone: user.mobile }] : []),
      ],
    },
    select: { id: true },
  });

  const customerIds = customers.map((c: any) => c.id);
  if (customerIds.length === 0) return { verified: false };

  // Find any non-cancelled order containing this product
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        customerId: { in: customerIds },
        status: {
          notIn: ["CANCELLED", "Cancelled", "cancelled", "FAILED", "Failed", "failed"],
        },
      },
    },
    select: { orderId: true },
  });

  if (orderItem) {
    return { verified: true, orderId: orderItem.orderId };
  }
  return { verified: false };
}

// GET /customer/reviews & GET /reviews/my-reviews (Customer's own review history)
async function handleGetMyReviews(req: any, res: any) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, mobile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User profile not found" });
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ user: { email: user.email } }] : []),
          ...(user.mobile ? [{ phone: user.mobile }] : []),
        ],
      },
      select: { id: true },
    });

    const customerIds = customers.map((c: any) => c.id);
    if (customerIds.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const reviews = await prisma.customerReview.findMany({
      where: {
        customerId: { in: customerIds },
      },
      include: {
        product: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = await Promise.all(
      reviews.map(async (review: any) => {
        const purchaseCheck = await hasVerifiedPurchase(userId, review.productId);
        
        let title = "Verified Review";
        let comment = review.reviewText || "";
        let images: string[] = [];
        let status = "APPROVED"; // APPROVED, PENDING, REJECTED
        let adminRemarks = null;
        let helpfulCount = 0;

        let rawText = (review.reviewText || "").trim();
        if (rawText.startsWith("{") || rawText.startsWith("[")) {
          try {
            const parsed = JSON.parse(rawText);
            if (parsed && typeof parsed === "object") {
              title = parsed.title || title;
              comment = parsed.comment || parsed.review || parsed.text || comment;
              images = Array.isArray(parsed.images) ? parsed.images : [];
              status = parsed.status || status;
              adminRemarks = parsed.adminRemarks || parsed.sellerReply || null;
              helpfulCount = parsed.helpfulCount || 0;
            }
          } catch (e) {}
        }

        // Secondary check: if comment itself is still a JSON string
        if (typeof comment === "string" && comment.trim().startsWith("{")) {
          try {
            const reParsed = JSON.parse(comment.trim());
            if (reParsed && typeof reParsed === "object") {
              title = reParsed.title || title;
              comment = reParsed.comment || reParsed.review || reParsed.text || "Nice product!";
              if (Array.isArray(reParsed.images) && reParsed.images.length > 0) {
                images = reParsed.images;
              }
            }
          } catch (e) {}
        }

        const prod = review.product;
        let productImage = null;
        if (prod) {
          try {
            const mappedProd = mapProductFields(prod);
            productImage = mappedProd?.primaryImage || mappedProd?.thumbnail || null;
          } catch (e) {}
        }
        if (!productImage || typeof productImage !== "string" || productImage.includes("undefined") || productImage === "https://via.placeholder.com/300x300?text=Product") {
          productImage = `https://picsum.photos/seed/${prod?.slug || review.productId || '3dgalaxy'}/300/300`;
        }

        return {
          id: review.id,
          productId: review.productId,
          productName: prod?.name || "3D Printing Product",
          productSlug: prod?.slug || review.productId,
          productImage,
          rating: review.rating,
          title,
          comment,
          images,
          status: (status || "APPROVED").toUpperCase(),
          adminRemarks,
          verified: purchaseCheck.verified,
          orderId: purchaseCheck.orderId || null,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.createdAt.toISOString(),
          helpfulCount,
        };
      })
    );

    return res.status(200).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

router.get("/customer/reviews", authenticateToken, handleGetMyReviews);
router.get("/reviews/my-reviews", authenticateToken, handleGetMyReviews);

router.get("/products/:id/reviews", async (req, res) => {
  try {
    const productId = req.params.id;
    const reviews = await prisma.customerReview.findMany({
      where: { productId },
      include: { customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = await Promise.all(
      reviews.map(async (review: any) => {
        let isVerified = false;
        const userId = review.customer?.userId;
        if (userId) {
          const purchaseCheck = await hasVerifiedPurchase(
            userId,
            productId,
          );
          isVerified = purchaseCheck.verified;
        }
        const user = review.customer?.user;
        let parsedTitle = "Verified Review";
        let parsedComment = review.reviewText || "";
        let parsedImages: string[] = [];
        let parsedRecommended = true;

        if (review.reviewText && review.reviewText.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(review.reviewText);
            parsedTitle = parsed.title || parsedTitle;
            parsedComment = parsed.comment || parsed.review || parsedComment;
            parsedImages = Array.isArray(parsed.images) ? parsed.images : [];
            if (typeof parsed.recommended === "boolean") {
              parsedRecommended = parsed.recommended;
            }
          } catch (e) {
            // Keep text fallback
          }
        }

        return {
          id: review.id,
          productId: review.productId,
          userName: user
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : "Customer",
          rating: review.rating,
          title: parsedTitle,
          comment: parsedComment,
          date: review.createdAt.toISOString(),
          verified: isVerified,
          images: parsedImages,
          recommended: parsedRecommended,
          helpfulCount: 0,
          sellerReply: null,
        };
      }),
    );

    return res.status(200).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Check if the authenticated user has purchased a specific product (delivered)
router.get(
  "/reviews/purchase-check/:productId",
  authenticateToken,
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;
      const isAdmin = ["Admin", "Super Admin", "Manager"].includes(userRole);
      const productId = req.params.productId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, canReview: false, error: "Not authenticated" });
      }

      // Check if user already reviewed this product
      const customer = await prisma.customer.findFirst({ where: { userId } });
      if (customer) {
        const existingReview = await prisma.customerReview.findFirst({
          where: { productId, customerId: customer.id },
        });
        if (existingReview) {
          return res.status(200).json({
            success: true,
            canReview: false,
            alreadyReviewed: true,
            error: "You have already reviewed this product",
          });
        }
      }

      const result = await hasVerifiedPurchase(userId, productId);
      return res.status(200).json({
        success: true,
        canReview: result.verified || isAdmin,
        orderId: result.orderId || null,
        alreadyReviewed: false,
      });
    } catch (error: any) {
      return res
        .status(500)
        .json({ success: false, canReview: false, error: error.message });
    }
  },
);

router.get("/orders/:id/review-status", async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const canReview = (order.status || "").toLowerCase() === "delivered";
    return res
      .status(200)
      .json({
        success: true,
        data: { canReview, orderId: order.id, status: order.status },
      });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/reviews", authenticateToken, async (req, res) => {
  try {
    const {
      productId,
      orderId,
      rating,
      title,
      review,
      images = [],
      video,
      recommended = true,
    } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const isAdmin = ["Admin", "Super Admin", "Manager"].includes(userRole);

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required to submit a review" });
    }

    if (!productId || !rating) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Product and rating are required",
        });
    }

    // Verify user has purchased and received this product (or is Admin)
    const purchaseCheck = await hasVerifiedPurchase(userId, productId);
    if (!purchaseCheck.verified && !isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only verified purchasers can review this product. Purchase and receive this product first.",
        });
    }

    let customer = await prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      customer = await prisma.customer.create({ data: { userId } });
    }

    // Check for duplicate reviews
    const existing = await prisma.customerReview.findFirst({
      where: { productId, customerId: customer.id },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "You already reviewed this product" });
    }

    const reviewData = {
      title: sanitizeHtml(title || "Verified Review"),
      comment: sanitizeHtml(review || ""),
      images: Array.isArray(images) ? images : [],
      recommended: Boolean(recommended),
      status: isAdmin ? "APPROVED" : "PENDING", // Customer reviews require admin moderation
      orderId: purchaseCheck.orderId || orderId || null,
    };

    const created = await prisma.customerReview.create({
      data: {
        productId,
        customerId: customer.id,
        rating: Number(rating),
        reviewText: JSON.stringify(reviewData),
      },
    });

    // Automatically recalculate product ratings and clear response cache
    await ReviewAggregationService.updateProductRating(productId);

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/customer/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const reviewId = req.params.id;
    const { rating, title, comment, images } = req.body;

    const existing = await prisma.customerReview.findUnique({
      where: { id: reviewId },
      include: { customer: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }

    if (existing.customer?.userId !== userId && (req as any).user?.role !== "Admin") {
      return res.status(403).json({ success: false, error: "Unauthorized to edit this review" });
    }

    let existingData: any = {};
    if (existing.reviewText && existing.reviewText.trim().startsWith("{")) {
      try { existingData = JSON.parse(existing.reviewText); } catch(e){}
    } else {
      existingData = { comment: existing.reviewText || "" };
    }

    const updatedData = {
      ...existingData,
      title: title !== undefined ? title : existingData.title || "Verified Review",
      comment: comment !== undefined ? comment : existingData.comment,
      images: Array.isArray(images) ? images : existingData.images || [],
    };

    const updated = await prisma.customerReview.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating: Number(rating) }),
        reviewText: JSON.stringify(updatedData),
      },
    });

    await ReviewAggregationService.updateProductRating(existing.productId);

    return res.status(200).json({ success: true, data: updated, message: "Review updated successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const { rating, reviewText } = req.body;
    const updated = await prisma.customerReview.update({
      where: { id: req.params.id },
      data: {
        ...(rating !== undefined && { rating: Number(rating) }),
        ...(reviewText !== undefined && { reviewText }),
      },
    });
    await ReviewAggregationService.updateProductRating(updated.productId);
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/customer/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const reviewId = req.params.id;

    const review = await prisma.customerReview.findUnique({
      where: { id: reviewId },
      include: { customer: true },
    });

    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }

    if (review.customer?.userId !== userId && (req as any).user?.role !== "Admin") {
      return res.status(403).json({ success: false, error: "Unauthorized to delete this review" });
    }

    const productId = review.productId;
    await prisma.customerReview.delete({ where: { id: reviewId } });

    await ReviewAggregationService.updateProductRating(productId);

    return res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const review = await prisma.customerReview.findUnique({ where: { id: req.params.id } });
    if (review) {
      await prisma.customerReview.delete({ where: { id: req.params.id } });
      await ReviewAggregationService.updateProductRating(review.productId);
    }
    return res.status(200).json({ success: true, message: "Review removed" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Extract clean title, comment, and images from review text string
function extractReviewDetails(rawText: string | null | undefined, defaultTitle = 'Verified Review'): {
  title: string;
  comment: string;
  images: string[];
  status?: string;
  adminRemarks?: string | null;
  helpfulCount?: number;
} {
  let title = defaultTitle;
  let comment = '';
  let images: string[] = [];
  let status: string | undefined = undefined;
  let adminRemarks: string | null = null;
  let helpfulCount = 0;

  if (!rawText) return { title, comment: '', images };

  let str = String(rawText).trim();

  // Handle up to 3 levels of JSON encoding
  for (let i = 0; i < 3; i++) {
    if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
      try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'string') {
          str = parsed.trim();
          continue;
        }
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (parsed.title && typeof parsed.title === 'string') title = parsed.title;
          
          const rawCmt = parsed.comment || parsed.review || parsed.text || parsed.reviewText || parsed.message || parsed.body;
          if (rawCmt && typeof rawCmt === 'string') {
            comment = rawCmt;
          }

          if (Array.isArray(parsed.images)) {
            images = parsed.images.filter((img: any) => typeof img === 'string' && img.trim().length > 0);
          }
          if (parsed.status && typeof parsed.status === 'string' && !status) {
            status = parsed.status;
          }
          if (parsed.adminRemarks || parsed.sellerReply) {
            adminRemarks = parsed.adminRemarks || parsed.sellerReply;
          }
          if (typeof parsed.helpfulCount === 'number') {
            helpfulCount = parsed.helpfulCount;
          }

          // If extracted comment itself is JSON, loop again with the comment
          if (comment && (comment.trim().startsWith('{') || comment.trim().startsWith('['))) {
            str = comment.trim();
            continue;
          }
          break;
        }
      } catch (e) {
        break;
      }
    } else {
      break;
    }
  }

  // Fallback if no comment was extracted
  if (!comment) {
    const commentMatch = str.match(/"comment"\s*:\s*"([^"]+)"/);
    if (commentMatch && commentMatch[1]) {
      comment = commentMatch[1];
    } else {
      comment = str;
    }
  }

  // Final check: if comment starts with JSON braces, extract text
  if (comment.trim().startsWith('{') && comment.trim().endsWith('}')) {
    try {
      const p = JSON.parse(comment);
      if (p && typeof p === 'object') {
        if (p.comment) comment = p.comment;
        if (p.title) title = p.title;
        if (Array.isArray(p.images) && images.length === 0) images = p.images;
      }
    } catch (e) {}
  }

  return { title, comment, images, status, adminRemarks, helpfulCount };
}

router.get("/admin/reviews", authenticateToken, async (req, res) => {
  try {
    const reviews = await prisma.customerReview.findMany({
      include: { product: true, customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });

    const mapped = await Promise.all(
      reviews.map(async (review: any) => {
        const details = extractReviewDetails(review.reviewText);

        const prod = review.product;
        let productImage = null;
        if (prod) {
          try {
            const mappedProd = mapProductFields(prod);
            productImage = mappedProd?.primaryImage || mappedProd?.thumbnail || null;
          } catch (e) {}
        }
        if (!productImage || typeof productImage !== "string" || productImage.includes("undefined")) {
          productImage = `https://picsum.photos/seed/${prod?.slug || review.productId || '3dgalaxy'}/300/300`;
        }

        const user = review.customer?.user;
        const userName = user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
          : "Customer";

        const status = (details.status || (review as any).status || "PENDING").toUpperCase();

        return {
          id: review.id,
          productId: review.productId,
          productName: prod?.name || "3D Printing Product",
          productSlug: prod?.slug || review.productId,
          productImage,
          rating: Number(review.rating) || 5,
          title: details.title,
          comment: details.comment,
          images: details.images,
          status,
          userName: userName || "Verified Customer",
          userEmail: user?.email || "",
          userMobile: user?.mobile || review.customer?.phone || "",
          adminRemarks: details.adminRemarks,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt ? review.updatedAt.toISOString() : review.createdAt.toISOString(),
          helpfulCount: details.helpfulCount || 0,
        };
      })
    );

    return res.status(200).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/admin/reviews/analytics", authenticateToken, async (req, res) => {
  try {
    const analytics = await ReviewAggregationService.getReviewAnalytics();
    return res.status(200).json({ success: true, data: analytics });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/admin/reviews/rebuild-ratings", authenticateToken, async (req, res) => {
  try {
    const result = await ReviewAggregationService.rebuildProductRatings();
    return res.status(200).json({ success: true, data: result, message: "Product ratings rebuilt successfully" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/admin/reviews/:id/reply", authenticateToken, async (req, res) => {
  return res.status(200).json({ success: true, message: "Reply saved" });
});

// Approve Review (supports both POST and PUT)
const handleApprove = async (req: any, res: any) => {
  try {
    const reviewId = req.params.id;
    const review = await prisma.customerReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    let existingData: any = {};
    if (review.reviewText && review.reviewText.startsWith("{")) {
      try { existingData = JSON.parse(review.reviewText); } catch(e){}
    } else {
      existingData = { comment: review.reviewText || "" };
    }
    existingData.status = "APPROVED";

    if (existingData.comment && typeof existingData.comment === 'string' && existingData.comment.trim().startsWith('{')) {
      try {
        const nested = JSON.parse(existingData.comment);
        if (nested && typeof nested === 'object') {
          nested.status = "APPROVED";
          existingData.comment = JSON.stringify(nested);
        }
      } catch (e) {}
    }

    const updatePayload: any = { reviewText: JSON.stringify(existingData) };
    if ('status' in review) {
      updatePayload.status = "APPROVED";
    }

    const updated = await prisma.customerReview.update({
      where: { id: reviewId },
      data: updatePayload,
    });
    await ReviewAggregationService.updateProductRating(review.productId);
    return res.status(200).json({ success: true, message: "Review approved successfully", data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

router.post("/admin/reviews/:id/approve", authenticateToken, handleApprove);
router.put("/admin/reviews/:id/approve", authenticateToken, handleApprove);

// Reject Review (supports both POST and PUT)
const handleReject = async (req: any, res: any) => {
  try {
    const reviewId = req.params.id;
    const review = await prisma.customerReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    let existingData: any = {};
    if (review.reviewText && review.reviewText.startsWith("{")) {
      try { existingData = JSON.parse(review.reviewText); } catch(e){}
    } else {
      existingData = { comment: review.reviewText || "" };
    }
    existingData.status = "REJECTED";

    if (existingData.comment && typeof existingData.comment === 'string' && existingData.comment.trim().startsWith('{')) {
      try {
        const nested = JSON.parse(existingData.comment);
        if (nested && typeof nested === 'object') {
          nested.status = "REJECTED";
          existingData.comment = JSON.stringify(nested);
        }
      } catch (e) {}
    }

    const updatePayload: any = { reviewText: JSON.stringify(existingData) };
    if ('status' in review) {
      updatePayload.status = "REJECTED";
    }

    const updated = await prisma.customerReview.update({
      where: { id: reviewId },
      data: updatePayload,
    });
    await ReviewAggregationService.updateProductRating(review.productId);
    return res.status(200).json({ success: true, message: "Review rejected successfully", data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

router.post("/admin/reviews/:id/reject", authenticateToken, handleReject);
router.put("/admin/reviews/:id/reject", authenticateToken, handleReject);

// Delete Review (Admin)
router.delete("/admin/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const reviewId = req.params.id;
    const review = await prisma.customerReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      return res.status(404).json({ success: false, error: "Review not found" });
    }
    await prisma.customerReview.delete({ where: { id: reviewId } });
    await ReviewAggregationService.updateProductRating(review.productId);
    return res.status(200).json({ success: true, message: "Review deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
