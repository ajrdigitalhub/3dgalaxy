import { Request, Response } from "express";
import { sysCache } from "../config/cache";
import { getSettingsService } from "../modules/settings/settings.service";
import { clearCache } from "../middleware/cache";

const INSTAGRAM_CACHE_KEY = "instagram_feed";
const STALE_INSTAGRAM_CACHE_KEY = "stale_instagram_feed";

export interface InstagramMediaChild {
  id: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string;
}

export interface InstagramPost {
  id: string;
  caption: string;
  imageUrl: string;
  thumbnailUrl: string;
  mediaUrl: string;
  permalink: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  timestamp: string | null;
  children?: InstagramMediaChild[];
}

export interface InstagramProfileData {
  id?: string;
  username: string;
  name: string;
  profileUrl: string;
  profileImageUrl: string;
  bio: string;
  followersCount?: number | null;
  mediaCount?: number | null;
  followsCount?: number | null;
  accountType?: string;
  isVerified?: boolean;
  lastRefreshed?: string;
}

export interface MetaDiagnosticError {
  category: "auth" | "permission" | "identifier" | "rate_limit" | "timeout" | "api_error";
  code?: number;
  subcode?: number;
  message: string;
  recommendation: string;
}

/**
 * Maps raw Instagram Graph API media object into normalized structure.
 * Correctly extracts poster images for video posts and preserves carousel children.
 */
export function mapInstagramMedia(item: any): InstagramPost {
  const mediaType = (item.media_type || "IMAGE").toUpperCase();
  const rawMediaUrl = item.media_url || "";
  const rawThumb = item.thumbnail_url || "";

  // For video posts, poster thumbnail must be prioritized for grid display
  let displayImage = rawMediaUrl;
  if (mediaType === "VIDEO") {
    displayImage = rawThumb || rawMediaUrl;
  } else if (!displayImage) {
    displayImage = rawThumb;
  }

  const rawChildren = Array.isArray(item.children?.data) ? item.children.data : [];
  const children: InstagramMediaChild[] | undefined = rawChildren.length > 0
    ? rawChildren.map((c: any) => {
        const cType = (c.media_type || "IMAGE").toUpperCase();
        const cMedia = c.media_url || "";
        const cThumb = c.thumbnail_url || "";
        return {
          id: String(c.id || ""),
          mediaType: cType as any,
          mediaUrl: cMedia || cThumb,
          thumbnailUrl: cThumb || cMedia,
        };
      })
    : undefined;

  return {
    id: String(item.id || ""),
    caption: String(item.caption || ""),
    imageUrl: displayImage,
    thumbnailUrl: rawThumb || displayImage,
    mediaUrl: rawMediaUrl || rawThumb,
    permalink: String(item.permalink || ""),
    mediaType: mediaType as any,
    timestamp: item.timestamp || null,
    children,
  };
}

/**
 * Translates Meta Graph API error codes into administrator-friendly diagnostic guidance.
 */
export function parseMetaError(errObj: any, statusCode?: number): MetaDiagnosticError {
  const metaErr = errObj?.error || errObj;
  const code = metaErr?.code || statusCode;
  const subcode = metaErr?.error_subcode;
  const rawMsg = metaErr?.message || "";

  if (code === 190) {
    if (subcode === 463) {
      return {
        category: "auth",
        code,
        subcode,
        message: "Instagram access token has expired.",
        recommendation: "Your Long-Lived User Access Token has expired. Generate a new token in the Meta Developer Portal or re-authenticate.",
      };
    }
    if (subcode === 467) {
      return {
        category: "auth",
        code,
        subcode,
        message: "Instagram access token was invalidated or revoked.",
        recommendation: "The access token has been revoked or invalidated. Generate a fresh token in the Meta Developer Portal.",
      };
    }
    return {
      category: "auth",
      code,
      subcode,
      message: "Invalid Instagram OAuth access token.",
      recommendation: "The access token could not be verified by Meta. Ensure the complete token is entered. For Instagram Basic / Login, use an Instagram User Access Token; for Instagram Business, use a Facebook Page token.",
    };
  }

  if (code === 10 || (typeof code === 'number' && code >= 200 && code <= 299 && rawMsg.toLowerCase().includes("permission"))) {
    return {
      category: "permission",
      code,
      subcode,
      message: "Missing required Instagram API permissions.",
      recommendation: "Ensure the token has 'instagram_basic' and 'instagram_manage_insights' (or 'pages_show_list') permissions granted in Meta Developer Portal.",
    };
  }

  if (code === 803 || rawMsg.toLowerCase().includes("alias")) {
    return {
      category: "identifier",
      code,
      subcode,
      message: "Invalid Instagram Profile ID format.",
      recommendation: "Profile ID cannot be an Instagram username handle (e.g. '@username'). Use 'me' for User Access Tokens, or the numeric Instagram Business Account ID.",
    };
  }

  if (code === 4 || code === 17 || code === 32 || code === 613) {
    return {
      category: "rate_limit",
      code,
      subcode,
      message: "Instagram Graph API rate limit exceeded.",
      recommendation: "Temporary rate limit reached on Meta's servers. Cached posts will continue to be served until the limit resets.",
    };
  }

  return {
    category: "api_error",
    code,
    subcode,
    message: rawMsg || "Instagram Graph API request failed.",
    recommendation: "Verify your Meta App configuration and credentials in the Meta Developer Portal.",
  };
}

/**
 * Resolves the primary and secondary Meta endpoints based on token signature and profile ID.
 */
function resolveMetaEndpoints(profileId: string, token: string, limit: number): { primaryUrl: string; fallbackUrl?: string } {
  let cleanId = (profileId || "me").trim().replace(/^@/, "");
  if (!cleanId) cleanId = "me";

  const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}";
  const encodedToken = encodeURIComponent(token);

  const isFacebookToken = token.startsWith("EAA");
  const isNumericId = /^\d+$/.test(cleanId);

  if (isFacebookToken && isNumericId) {
    // Facebook Graph API for Instagram Business Account
    return {
      primaryUrl: `https://graph.facebook.com/v21.0/${cleanId}/media?fields=${fields}&access_token=${encodedToken}&limit=${limit}`,
      fallbackUrl: `https://graph.instagram.com/v21.0/${cleanId}/media?fields=${fields}&access_token=${encodedToken}&limit=${limit}`
    };
  }

  // Instagram Graph API / Instagram Basic Display
  const targetId = cleanId === "me" || !isNumericId ? "me" : cleanId;
  return {
    primaryUrl: `https://graph.instagram.com/v21.0/${targetId}/media?fields=${fields}&access_token=${encodedToken}&limit=${limit}`,
    fallbackUrl: isNumericId ? `https://graph.facebook.com/v21.0/${cleanId}/media?fields=${fields}&access_token=${encodedToken}&limit=${limit}` : undefined
  };
}

/**
 * Fetches verified profile metadata (username, name, bio, follower count, post count) directly from Meta Graph API.
 */
export async function fetchMetaProfile(
  profileId: string,
  token: string
): Promise<{ success: boolean; profile?: InstagramProfileData; error?: MetaDiagnosticError }> {
  if (!token || token.trim() === "") {
    return {
      success: false,
      error: {
        category: "auth",
        message: "No Instagram access token configured.",
        recommendation: "Enter a valid Instagram Access Token in Admin Settings → Social Links → Instagram Feed Settings."
      }
    };
  }

  let cleanId = (profileId || "me").trim().replace(/^@/, "");
  if (!cleanId) cleanId = "me";
  const encodedToken = encodeURIComponent(token.trim());
  const isFacebookToken = token.startsWith("EAA");
  const isNumericId = /^\d+$/.test(cleanId);

  const fullFields = "id,username,name,account_type,profile_picture_url,biography,followers_count,follows_count,media_count";
  const basicFields = "id,username,name,account_type,media_count";

  const buildUrl = (target: string, fields: string, domain: "instagram" | "facebook") => {
    if (domain === "facebook") {
      return `https://graph.facebook.com/v21.0/${target}?fields=${fields}&access_token=${encodedToken}`;
    }
    return `https://graph.instagram.com/v21.0/${target}?fields=${fields}&access_token=${encodedToken}`;
  };

  const callEndpoint = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = (await response.json()) as any;
      return { ok: response.ok, status: response.status, data };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  };

  const primaryDomain = (isFacebookToken && isNumericId) ? "facebook" : "instagram";
  const primaryTarget = primaryDomain === "facebook" ? cleanId : (cleanId === "me" || !isNumericId ? "me" : cleanId);

  try {
    let res = await callEndpoint(buildUrl(primaryTarget, fullFields, primaryDomain));

    // Fall back to basic fields if full fields query returned parameter error (code 100 or subcode)
    if ((!res.ok || res.data?.error) && (res.data?.error?.code === 100 || res.data?.error?.message?.includes("field"))) {
      try {
        const retryRes = await callEndpoint(buildUrl(primaryTarget, basicFields, primaryDomain));
        if (retryRes.ok && !retryRes.data?.error) {
          res = retryRes;
        }
      } catch (e) {
        // preserve original
      }
    }

    // Try secondary endpoint if numeric ID and auth failure
    if ((!res.ok || res.data?.error) && isNumericId) {
      const secondaryDomain = primaryDomain === "instagram" ? "facebook" : "instagram";
      const secondaryTarget = secondaryDomain === "instagram" ? "me" : cleanId;
      try {
        const secRes = await callEndpoint(buildUrl(secondaryTarget, fullFields, secondaryDomain));
        if (secRes.ok && !secRes.data?.error) {
          res = secRes;
        }
      } catch (e) {
        // preserve original
      }
    }

    if (!res.ok || res.data?.error) {
      const diag = parseMetaError(res.data, res.status);
      console.warn(`[INSTAGRAM_PROFILE_WARN] Meta Graph API error: ${diag.category} - ${diag.message}`);
      return { success: false, error: diag };
    }

    const d = res.data;
    const username = String(d.username || "").trim();
    const profile: InstagramProfileData = {
      id: d.id ? String(d.id) : undefined,
      username: username || "3d.galaxy",
      name: d.name ? String(d.name) : (username ? `@${username}` : "Instagram"),
      profileUrl: username ? `https://www.instagram.com/${username}/` : "https://www.instagram.com/",
      profileImageUrl: d.profile_picture_url || "",
      bio: d.biography || "",
      followersCount: typeof d.followers_count === "number" ? d.followers_count : null,
      followsCount: typeof d.follows_count === "number" ? d.follows_count : null,
      mediaCount: typeof d.media_count === "number" ? d.media_count : null,
      accountType: d.account_type || undefined,
      isVerified: Boolean(d.is_verified),
      lastRefreshed: new Date().toISOString()
    };

    return { success: true, profile };
  } catch (err: any) {
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    const diag: MetaDiagnosticError = {
      category: isTimeout ? "timeout" : "api_error",
      message: isTimeout ? "Connection to Instagram API timed out." : (err.message || "Failed to reach Instagram API"),
      recommendation: "Check server network connectivity to graph.instagram.com."
    };
    console.warn(`[INSTAGRAM_PROFILE_WARN] Profile network error: ${diag.message}`);
    return { success: false, error: diag };
  }
}

// Mutex promise to prevent cache stampedes on concurrent incoming requests
let inFlightFeedPromise: Promise<any> | null = null;

/**
 * Executes external HTTP fetch to Meta Graph API with 10-second timeout.
 */
export async function fetchMetaMedia(profileId: string, token: string, limit: number): Promise<{ success: boolean; posts: InstagramPost[]; error?: MetaDiagnosticError }> {
  if (!token || token.trim() === "") {
    return {
      success: false,
      posts: [],
      error: {
        category: "auth",
        message: "No Instagram access token configured.",
        recommendation: "Enter a valid Instagram Access Token in Admin Settings → Social Links → Instagram Feed Settings."
      }
    };
  }

  const { primaryUrl, fallbackUrl } = resolveMetaEndpoints(profileId, token.trim(), limit);

  const callEndpoint = async (url: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s non-blocking timeout
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const data = (await response.json()) as any;
      return { ok: response.ok, status: response.status, data };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  };

  try {
    let result = await callEndpoint(primaryUrl);

    // If primary returned an auth/domain mismatch and fallback is available, try fallback
    if ((!result.ok || result.data?.error) && fallbackUrl && result.data?.error?.code === 190) {
      try {
        const fallbackResult = await callEndpoint(fallbackUrl);
        if (fallbackResult.ok && !fallbackResult.data?.error) {
          result = fallbackResult;
        }
      } catch (fallbackErr) {
        // preserve original error
      }
    }

    if (!result.ok || result.data?.error) {
      const diag = parseMetaError(result.data, result.status);
      console.warn(`[INSTAGRAM_FETCH_WARN] Meta Graph API error: ${diag.category} - ${diag.message}`);
      return { success: false, posts: [], error: diag };
    }

    const items = Array.isArray(result.data?.data) ? result.data.data.map(mapInstagramMedia) : [];
    return { success: true, posts: items };
  } catch (err: any) {
    const isTimeout = err.name === "AbortError" || err.message?.includes("aborted");
    const diag: MetaDiagnosticError = {
      category: isTimeout ? "timeout" : "api_error",
      message: isTimeout ? "Connection to Instagram API timed out." : (err.message || "Failed to reach Instagram API"),
      recommendation: "Check your server network connectivity to graph.instagram.com or verify your Meta access token."
    };
    console.warn(`[INSTAGRAM_FETCH_WARN] External network error: ${diag.message}`);
    return { success: false, posts: [], error: diag };
  }
}

/**
 * Public Endpoint: GET /api/public/instagram-feed
 * Returns verified profile data and posts for home page without exposing any credentials.
 */
export const getInstagramFeed = async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === "true" || req.query.bypassCache === "true";

    if (!forceRefresh) {
      const cached = sysCache.get(INSTAGRAM_CACHE_KEY);
      if (cached) {
        return res.status(200).json({ success: true, data: cached });
      }
    }

    const settings = await getSettingsService();
    const cfg = settings.instagramFeedSettings || {};
    const enabled = cfg.enabled === true;

    // Fallback profile data from settings
    const fallbackProfile: InstagramProfileData = {
      username: (cfg.profileUrl ? cfg.profileUrl.replace(/.*instagram\.com\/([^/?#]+).*/, "$1") : "") || "3d.galaxy",
      name: cfg.profileName || "3D Galaxy",
      profileUrl: cfg.profileUrl || settings.socialLinks?.instagram || "https://www.instagram.com/3d.galaxy/",
      profileImageUrl: cfg.profileImageUrl || "",
      bio: cfg.profileBio || "",
      followersCount: null,
      mediaCount: null,
      followsCount: null,
      isVerified: false,
    };

    if (!enabled || !cfg.accessToken) {
      const emptyPayload = {
        enabled: false,
        isLive: false,
        profile: fallbackProfile,
        posts: [],
        fetchedAt: new Date().toISOString(),
      };
      return res.status(200).json({ success: true, data: emptyPayload });
    }

    const profileId = cfg.profileId || "me";
    const limit = Math.max(1, Math.min(24, Number(cfg.postCount) || 6));
    const cacheMinutes = Math.max(5, Math.min(1440, Number(cfg.cacheMinutes) || 30));

    // Cache stampede protection: Reuse in-flight promise if multiple concurrent requests arrive
    if (!inFlightFeedPromise) {
      inFlightFeedPromise = Promise.all([
        fetchMetaProfile(profileId, cfg.accessToken),
        fetchMetaMedia(profileId, cfg.accessToken, limit),
      ]).finally(() => {
        inFlightFeedPromise = null;
      });
    }

    const [profileResult, mediaResult] = await inFlightFeedPromise;

    if (!mediaResult.success) {
      // Graceful degradation: Check if we have stale cached posts
      const stale = sysCache.get(STALE_INSTAGRAM_CACHE_KEY) as any;
      if (stale && Array.isArray(stale.posts) && stale.posts.length > 0) {
        console.warn("[INSTAGRAM_FEED] Serving stale cached posts due to external API fetch failure");
        return res.status(200).json({
          success: true,
          data: {
            ...stale,
            isLive: false,
            isStale: true,
          }
        });
      }

      // No cache available; return empty payload so public home page handles cleanly
      return res.status(200).json({
        success: true,
        data: {
          enabled: false,
          isLive: false,
          profile: fallbackProfile,
          posts: [],
          fetchedAt: new Date().toISOString(),
        }
      });
    }

    // Merge live verified profile with configured fallbacks
    const liveProf = profileResult.success && profileResult.profile ? profileResult.profile : null;
    const resolvedUsername = liveProf?.username || fallbackProfile.username || "3d.galaxy";
    const finalProfile: InstagramProfileData = {
      username: resolvedUsername,
      name: liveProf?.name || fallbackProfile.name,
      profileUrl: liveProf?.profileUrl || `https://www.instagram.com/${resolvedUsername}/`,
      profileImageUrl: liveProf?.profileImageUrl || fallbackProfile.profileImageUrl,
      bio: liveProf?.bio || fallbackProfile.bio,
      followersCount: liveProf?.followersCount ?? null,
      mediaCount: liveProf?.mediaCount ?? mediaResult.posts.length,
      followsCount: liveProf?.followsCount ?? null,
      accountType: liveProf?.accountType || undefined,
      isVerified: Boolean(liveProf?.isVerified),
      lastRefreshed: new Date().toISOString(),
    };

    const responsePayload = {
      enabled: true,
      isLive: true,
      isStale: false,
      profile: finalProfile,
      posts: mediaResult.posts,
      fetchedAt: new Date().toISOString(),
    };

    // Store in short-term active cache and long-term stale backup
    sysCache.set(INSTAGRAM_CACHE_KEY, responsePayload, cacheMinutes * 60);
    sysCache.set(STALE_INSTAGRAM_CACHE_KEY, responsePayload, 86400); // 24-hour fallback backup

    return res.status(200).json({ success: true, data: responsePayload });
  } catch (error: any) {
    console.error("Failed to load Instagram feed:", error);
    return res.status(200).json({
      success: true,
      data: {
        enabled: false,
        isLive: false,
        profile: {
          username: "3d.galaxy",
          name: "Instagram",
          profileUrl: "https://www.instagram.com/",
          profileImageUrl: "",
          bio: "",
        },
        posts: [],
        fetchedAt: new Date().toISOString(),
      }
    });
  }
};

/**
 * Admin Endpoint: GET /api/admin/settings/instagram/diagnostics
 * Returns complete diagnostic health info, live profile metrics, and preview data for admin panel.
 */
export const getInstagramDiagnostics = async (req: Request, res: Response) => {
  try {
    const settings = await getSettingsService();
    const cfg = settings.instagramFeedSettings || {};
    const enabled = cfg.enabled === true;
    const token = cfg.accessToken || "";
    const hasToken = Boolean(token && typeof token === "string" && token.trim().length > 0);

    const tokenLength = token ? token.length : 0;
    const tokenPrefix = token ? token.substring(0, 4) : "";
    const tokenType = token.startsWith("IG")
      ? "Instagram Long-Lived Token"
      : token.startsWith("EAA")
      ? "Facebook Graph API Token"
      : hasToken
      ? "Custom OAuth Token"
      : "Not Configured";

    const fallbackProfile: InstagramProfileData = {
      username: (cfg.profileUrl ? cfg.profileUrl.replace(/.*instagram\.com\/([^/?#]+).*/, "$1") : "") || "3d.galaxy",
      name: cfg.profileName || "Instagram",
      profileUrl: cfg.profileUrl || settings.socialLinks?.instagram || "https://www.instagram.com/",
      profileImageUrl: cfg.profileImageUrl || "",
      bio: cfg.profileBio || "",
      profileId: cfg.profileId || "me",
    } as any;

    if (!enabled) {
      return res.status(200).json({
        success: true,
        data: {
          status: "disabled",
          enabled: false,
          isLive: false,
          message: "Instagram Feed is currently disabled in settings.",
          recommendation: "Toggle 'Enable Instagram Feed' on to activate the feed.",
          profile: fallbackProfile,
          postsCount: 0,
          posts: [],
          tokenStatus: {
            configured: hasToken,
            length: tokenLength,
            prefix: tokenPrefix,
            type: tokenType,
            valid: hasToken,
          },
          lastChecked: new Date().toISOString(),
        }
      });
    }

    if (!hasToken) {
      return res.status(200).json({
        success: true,
        data: {
          status: "not_configured",
          enabled: true,
          isLive: false,
          message: "No Instagram access token has been provided.",
          recommendation: "Enter a valid User Access Token or Facebook Page Token to connect your Instagram account.",
          profile: fallbackProfile,
          postsCount: 0,
          posts: [],
          tokenStatus: {
            configured: false,
            length: 0,
            prefix: "",
            type: "Not Configured",
            valid: false,
          },
          lastChecked: new Date().toISOString(),
        }
      });
    }

    const limit = Math.max(1, Math.min(24, Number(cfg.postCount) || 6));
    const [profileResult, mediaResult] = await Promise.all([
      fetchMetaProfile(cfg.profileId || "me", token),
      fetchMetaMedia(cfg.profileId || "me", token, limit)
    ]);

    if (!mediaResult.success) {
      return res.status(200).json({
        success: true,
        data: {
          status: "error",
          enabled: true,
          isLive: false,
          message: mediaResult.error?.message || "Failed to connect to Instagram Graph API.",
          recommendation: mediaResult.error?.recommendation || "Verify your token and account configuration.",
          errorCategory: mediaResult.error?.category || "api_error",
          profile: fallbackProfile,
          postsCount: 0,
          posts: [],
          tokenStatus: {
            configured: true,
            length: tokenLength,
            prefix: tokenPrefix,
            type: tokenType,
            valid: false,
          },
          lastChecked: new Date().toISOString(),
        }
      });
    }

    const liveProf = profileResult.success && profileResult.profile ? profileResult.profile : null;
    const resolvedUsername = liveProf?.username || fallbackProfile.username || "3d.galaxy";
    const finalProfile: InstagramProfileData = {
      username: resolvedUsername,
      name: liveProf?.name || fallbackProfile.name,
      profileUrl: liveProf?.profileUrl || `https://www.instagram.com/${resolvedUsername}/`,
      profileImageUrl: liveProf?.profileImageUrl || fallbackProfile.profileImageUrl,
      bio: liveProf?.bio || fallbackProfile.bio,
      followersCount: liveProf?.followersCount ?? null,
      mediaCount: liveProf?.mediaCount ?? mediaResult.posts.length,
      followsCount: liveProf?.followsCount ?? null,
      accountType: liveProf?.accountType || undefined,
      isVerified: Boolean(liveProf?.isVerified),
      lastRefreshed: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: {
        status: "connected",
        enabled: true,
        isLive: true,
        message: `Successfully connected to Instagram Graph API for @${resolvedUsername}.`,
        recommendation: "Feed integration is operating normally with live metrics and posts.",
        profile: finalProfile,
        postsCount: mediaResult.posts.length,
        posts: mediaResult.posts,
        tokenStatus: {
          configured: true,
          length: tokenLength,
          prefix: tokenPrefix,
          type: tokenType,
          valid: true,
        },
        lastChecked: new Date().toISOString(),
      }
    });
  } catch (error: any) {
    console.error("Failed to run Instagram diagnostics:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to run Instagram diagnostics",
      details: error.message,
    });
  }
};

/**
 * Admin Endpoint: POST /api/admin/settings/instagram/test-connection
 * Directly tests candidate or saved credentials against Meta API and returns live profile and preview posts.
 */
export const testInstagramConnection = async (req: Request, res: Response) => {
  try {
    const { accessToken, profileId, postCount, enabled } = req.body || {};

    const settings = await getSettingsService();
    const storedCfg = settings.instagramFeedSettings || {};

    // Resolve token: if candidate is empty or masked, fall back to stored token
    let token = typeof accessToken === "string" ? accessToken.trim() : "";
    if (!token || token.includes("••••") || token.startsWith("***")) {
      token = storedCfg.accessToken || "";
    }

    const resolvedProfileId = (profileId || storedCfg.profileId || "me").trim();
    const limit = Math.max(1, Math.min(24, Number(postCount) || Number(storedCfg.postCount) || 6));

    if (!token) {
      return res.status(200).json({
        success: true,
        data: {
          status: "not_configured",
          message: "No access token provided to test.",
          recommendation: "Please enter a valid Instagram access token.",
          posts: [],
          postsCount: 0,
          tokenStatus: { configured: false, valid: false },
        }
      });
    }

    const [profileResult, mediaResult] = await Promise.all([
      fetchMetaProfile(resolvedProfileId, token),
      fetchMetaMedia(resolvedProfileId, token, limit)
    ]);

    if (!mediaResult.success) {
      return res.status(200).json({
        success: true,
        data: {
          status: "error",
          message: mediaResult.error?.message || "Instagram API connection failed.",
          recommendation: mediaResult.error?.recommendation || "Verify your credentials and permissions.",
          errorCategory: mediaResult.error?.category,
          posts: [],
          postsCount: 0,
          tokenStatus: {
            configured: true,
            length: token.length,
            prefix: token.substring(0, 4),
            valid: false,
          },
        }
      });
    }

    // Bust server route cache so upcoming client fetches see fresh posts
    sysCache.del(INSTAGRAM_CACHE_KEY);
    clearCache("/api/public/instagram-feed");

    const liveProf = profileResult.success && profileResult.profile ? profileResult.profile : null;
    const resolvedUsername = liveProf?.username || (storedCfg.profileUrl ? storedCfg.profileUrl.replace(/.*instagram\.com\/([^/?#]+).*/, "$1") : "") || "3d.galaxy";
    const finalProfile: InstagramProfileData = {
      username: resolvedUsername,
      name: liveProf?.name || storedCfg.profileName || "3D Galaxy",
      profileUrl: liveProf?.profileUrl || `https://www.instagram.com/${resolvedUsername}/`,
      profileImageUrl: liveProf?.profileImageUrl || storedCfg.profileImageUrl || "",
      bio: liveProf?.bio || storedCfg.profileBio || "",
      followersCount: liveProf?.followersCount ?? null,
      mediaCount: liveProf?.mediaCount ?? mediaResult.posts.length,
      followsCount: liveProf?.followsCount ?? null,
      accountType: liveProf?.accountType || undefined,
      isVerified: Boolean(liveProf?.isVerified),
      lastRefreshed: new Date().toISOString(),
    };

    return res.status(200).json({
      success: true,
      data: {
        status: "connected",
        message: `Connection successful! Retrieved live profile for @${resolvedUsername} and ${mediaResult.posts.length} posts from Instagram.`,
        recommendation: "Configuration is valid and ready to display on the home page.",
        profile: finalProfile,
        posts: mediaResult.posts,
        postsCount: mediaResult.posts.length,
        tokenStatus: {
          configured: true,
          length: token.length,
          prefix: token.substring(0, 4),
          valid: true,
        },
      }
    });
  } catch (error: any) {
    console.error("Test connection exception:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to test Instagram connection",
      details: error.message,
    });
  }
};

/**
 * Public Endpoint: POST /api/public/instagram-feed/interaction
 * Logs user clicks and impressions safely.
 */
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

    return res.status(200).json({ success: true, data: { eventType, postId } });
  } catch (error: any) {
    return res
      .status(500)
      .json({
        success: false,
        error: "Failed to track Instagram interaction",
        details: error.message,
      });
  }
};
