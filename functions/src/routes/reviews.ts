import { Router } from "express";
import prisma from "../config/database";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/auth";

const router = Router();

router.get("/products/:id/reviews", async (req, res) => {
  try {
    const productId = req.params.id;
    const reviews = await prisma.productReview.findMany({
      where: { productId, isApproved: true },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const mapped = reviews.map((review: any) => ({
      id: review.id,
      productId: review.productId,
      userName: review.user
        ? `${review.user.firstName || ""} ${review.user.lastName || ""}`.trim()
        : "Customer",
      rating: review.rating,
      title: review.title || "Great purchase",
      comment: review.comment || "",
      date: review.createdAt.toISOString(),
      verified: true,
      images: [],
      recommended: true,
      helpfulCount: 0,
      sellerReply: null,
    }));

    return res.status(200).json({ success: true, data: mapped });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

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

router.post("/reviews", optionalAuthenticateToken, async (req, res) => {
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
      customerName,
    } = req.body;
    const userId = (req as any).user?.id;

    if (!productId || !rating) {
      return res
        .status(400)
        .json({
          success: false,
          error: "Product and rating are required",
        });
    }

    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found" });
      }

      if ((order.status || "").toLowerCase() !== "delivered") {
        return res
          .status(400)
          .json({
            success: false,
            error: "Only delivered orders can be reviewed",
          });
      }
    }

    const existing = await prisma.productReview.findFirst({
      where: { productId, userId: userId || undefined },
    });
    if (existing) {
      return res
        .status(409)
        .json({ success: false, error: "You already reviewed this product" });
    }

    const created = await prisma.productReview.create({
      data: {
        productId,
        userId: userId || null,
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
