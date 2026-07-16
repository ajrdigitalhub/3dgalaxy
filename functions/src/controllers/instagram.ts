import { Request, Response } from "express";
import { sysCache } from "../config/cache";
import { getSettingsService } from "../modules/settings/settings.service";

const INSTAGRAM_CACHE_KEY = "instagram_feed";

function mapInstagramMedia(item: any) {
  return {
    id: item.id,
    caption: item.caption || "",
    mediaUrl: item.media_url || item.thumbnail_url || "",
    thumbnailUrl: item.thumbnail_url || item.media_url || "",
    permalink: item.permalink || "",
    mediaType: item.media_type || "IMAGE",
    timestamp: item.timestamp || null,
  };
}

export const getInstagramFeed = async (req: Request, res: Response) => {
  try {
    const cached = sysCache.get(INSTAGRAM_CACHE_KEY);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const settings = await getSettingsService();
    const cfg = settings.instagramFeedSettings || {};
    const enabled = cfg.enabled === true;

    if (!enabled || !cfg.accessToken) {
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          profile: {
            name: cfg.profileName || "Instagram",
            profileUrl: cfg.profileUrl || "",
            profileImageUrl: cfg.profileImageUrl || "",
            bio: cfg.profileBio || "",
          },
          posts: [],
        },
      });
    }

    const profileId = cfg.profileId || "me";
    const limit = Number(cfg.postCount) || 6;
    const cacheMinutes = Number(cfg.cacheMinutes) || 30;
    const token = encodeURIComponent(cfg.accessToken);
    const url = `https://graph.instagram.com/${profileId}/media?fields=id,caption,media_url,thumbnail_url,permalink,media_type,timestamp&access_token=${token}&limit=${limit}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      const message =
        data.error?.message ||
        response.statusText ||
        "Instagram Graph API fetch failed";
      return res
        .status(500)
        .json({ success: false, error: message, details: data });
    }

    const items = Array.isArray(data.data)
      ? data.data.map(mapInstagramMedia)
      : [];
    const payload = {
      enabled: true,
      profile: {
        name: cfg.profileName || "Instagram",
        profileUrl: cfg.profileUrl || "",
        profileImageUrl: cfg.profileImageUrl || "",
        bio: cfg.profileBio || "",
      },
      posts: items,
      fetchedAt: new Date().toISOString(),
    };

    sysCache.set(INSTAGRAM_CACHE_KEY, payload, cacheMinutes * 60);
    return res.status(200).json({ success: true, data: payload });
  } catch (error: any) {
    console.error("Failed to load Instagram feed:", error);
    return res
      .status(500)
      .json({
        success: false,
        error: "Failed to load Instagram feed",
        details: error.message,
      });
  }
};

export const trackInstagramFeedInteraction = async (
  req: Request,
  res: Response,
) => {
  try {
    const { eventType, postId } = req.body || {};
    if (!eventType || !postId) {
      return res
        .status(400)
        .json({ success: false, error: "eventType and postId are required" });
    }

    console.log(`Instagram feed interaction: ${eventType} on post ${postId}`);

    return res.status(200).json({ success: true, data: { eventType, postId } });
  } catch (error: any) {
    console.error("Failed to track Instagram interaction:", error);
    return res
      .status(500)
      .json({
        success: false,
        error: "Failed to track Instagram interaction",
        details: error.message,
      });
  }
};
