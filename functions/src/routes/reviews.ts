import { Router } from "express";
import prisma from "../config/database";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/auth";

const router = Router();

// Helper: Check if a user has a delivered order containing a specific product
async function hasVerifiedPurchase(
  userId: string,
  productId: string,
): Promise<{ verified: boolean; orderId?: string }> {
  // Find the customer record for this user
  const customer = await prisma.customer.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (!customer) return { verified: false };

  // Find a delivered order containing the product
  const orderItem = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: {
        customerId: customer.id,
        status: { in: ["DELIVERED", "Delivered", "delivered"] },
      },
    },
    select: { orderId: true },
  });

  if (orderItem) {
    return { verified: true, orderId: orderItem.orderId };
  }
  return { verified: false };
}

router.get("/products/:id/reviews", async (req, res) => {
  try {
    const productId = req.params.id;
    const reviews = await prisma.productReview.findMany({
      where: { productId, isApproved: true },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    // Check verified purchase status for each reviewer
    const mapped = await Promise.all(
      reviews.map(async (review: any) => {
        let isVerified = false;
        if (review.userId) {
          const purchaseCheck = await hasVerifiedPurchase(
            review.userId,
            productId,
          );
          isVerified = purchaseCheck.verified;
        }
        return {
          id: review.id,
          productId: review.productId,
          userName: review.user
            ? `${review.user.firstName || ""} ${review.user.lastName || ""}`.trim()
            : "Customer",
          rating: review.rating,
          title: review.title || "Great purchase",
          comment: review.comment || "",
          date: review.createdAt.toISOString(),
          verified: isVerified,
          images: [],
          recommended: true,
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
      const productId = req.params.productId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, canReview: false, error: "Not authenticated" });
      }

      // Check if user already reviewed this product
      const existingReview = await prisma.productReview.findFirst({
        where: { productId, userId },
      });
      if (existingReview) {
        return res.status(200).json({
          success: true,
          canReview: false,
          alreadyReviewed: true,
          error: "You have already reviewed this product",
        });
      }

      const result = await hasVerifiedPurchase(userId, productId);
      return res.status(200).json({
        success: true,
        canReview: result.verified,
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

    // Verify the user has actually purchased and received this product
    const purchaseCheck = await hasVerifiedPurchase(userId, productId);
    if (!purchaseCheck.verified) {
      return res
        .status(403)
        .json({
          success: false,
          error: "Only verified purchasers can review this product. Purchase and receive this product first.",
        });
    }

    // Check for duplicate reviews
    const existing = await prisma.productReview.findFirst({
      where: { productId, userId },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "You already reviewed this product" });
    }

    const created = await prisma.productReview.create({
      data: {
        productId,
        userId,
        rating: Number(rating),
        title: title || "Great purchase",
        comment: review || "",
        isApproved: true,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.put("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    const updated = await prisma.productReview.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete("/reviews/:id", authenticateToken, async (req, res) => {
  try {
    await prisma.productReview.delete({ where: { id: req.params.id } });
    return res.status(200).json({ success: true, message: "Review removed" });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get("/admin/reviews", authenticateToken, async (req, res) => {
  try {
    const reviews = await prisma.productReview.findMany({
      include: { product: true, user: true },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, data: reviews });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/admin/reviews/:id/reply", authenticateToken, async (req, res) => {
  return res.status(200).json({ success: true, message: "Reply saved" });
});

router.post(
  "/admin/reviews/:id/approve",
  authenticateToken,
  async (req, res) => {
    try {
      const updated = await prisma.productReview.update({
        where: { id: req.params.id },
        data: { isApproved: true },
      });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
);

router.post(
  "/admin/reviews/:id/reject",
  authenticateToken,
  async (req, res) => {
    try {
      const updated = await prisma.productReview.update({
        where: { id: req.params.id },
        data: { isApproved: false },
      });
      return res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
);

export default router;
