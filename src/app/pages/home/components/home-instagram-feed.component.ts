import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  Input,
  Output,
  EventEmitter,
  HostListener,
  OnInit,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ApiService } from "../../../services/api.service";

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

export interface InstagramFeedPayload {
  enabled: boolean;
  isLive?: boolean;
  isStale?: boolean;
  profile: InstagramProfileData;
  posts: InstagramPost[];
  fetchedAt: string;
}

@Component({
  selector: "app-home-instagram-feed",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Top Level Conditional Wrapper -->
    @if (shouldRender()) {
      <section
        class="relative overflow-hidden w-full select-none"
        [class.py-16]="!previewMode"
        [class.py-6]="previewMode"
      >
        <!-- Subtle Instagram Radiant Glow Background Accent -->
        <div
          class="pointer-events-none absolute inset-x-0 top-0 h-96 -z-10 opacity-30 dark:opacity-20"
          style="background: radial-gradient(ellipse 70% 60% at 50% 0%, rgba(225, 48, 108, 0.25), rgba(245, 96, 64, 0.15), rgba(254, 218, 119, 0.08), transparent 75%);"
        ></div>

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- 1. Centered Section Heading (Screenshot 2) -->
          <div class="flex flex-col items-center text-center space-y-3 mb-8 sm:mb-10">
            <!-- Live Badge / Stale Status -->
            @if (effectiveData()?.isLive) {
              <div
                class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/95 dark:bg-black/95 text-white border border-neutral-700/60 shadow-md backdrop-blur-md"
              >
                <span class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <svg class="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span class="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em]">Live Instagram Feed</span>
              </div>
            } @else if (effectiveData()?.isStale) {
              <div
                class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider"
              >
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Previously Updated</span>
              </div>
            }

            <!-- Main Heading with gradient text accent -->
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-950 dark:text-white tracking-tight leading-tight">
              Follow <span class="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 bg-clip-text text-transparent">&#64;{{ displayProfile().username || '3d.galaxy' }}</span> On Instagram
            </h2>

            <!-- Supporting Bio / Tagline Description -->
            <p class="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl leading-relaxed">
              {{ displayProfile().bio || 'Explore our latest 3D prints, custom rotating lithophane lamps, glowing moon nightlights, personalized keychains & maker workshop reels! ✨' }}
            </p>
          </div>

          <!-- 2. Wide Profile Summary Banner Card (Screenshot 2) -->
          <div
            class="p-5 sm:p-6 rounded-3xl bg-[#111827] dark:bg-[#0b1120] text-white border border-neutral-800 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition hover:border-neutral-700/80 mb-8 sm:mb-10"
          >
            <!-- Left Info: Avatar + Details + Metrics -->
            <div class="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              <!-- Profile Picture with Instagram Gradient Ring -->
              <div class="relative shrink-0">
                <div class="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-lg">
                  <img
                    [src]="displayProfile().profileImageUrl || 'assets/images/user-placeholder.png'"
                    [alt]="displayProfile().username"
                    class="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover bg-neutral-900 border-2 border-[#111827]"
                    (error)="handleAvatarError($event)"
                  />
                </div>
              </div>

              <!-- Profile Details -->
              <div class="min-w-0 space-y-1.5 flex-1">
                <!-- Username + Official Badge -->
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                    &#64;{{ displayProfile().username || '3d.galaxy' }}
                  </span>
                  @if (displayProfile().isVerified) {
                    <svg class="w-4 h-4 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24" title="Verified">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  } @else {
                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                      Official
                    </span>
                  }
                </div>

                <!-- Subtitle / Bio -->
                <p class="text-xs sm:text-sm text-neutral-300 leading-snug line-clamp-2 max-w-xl">
                  {{ displayProfile().bio || 'Crafting magical custom 3D printed lithophanes, glowing moon lamps & personalized gifts. Made with love in Tamil Nadu! 🇮🇳✨' }}
                </p>

                <!-- Metrics Pills Row -->
                <div class="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <!-- Followers Pill -->
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/60 shadow-sm">
                    <svg class="w-3.5 h-3.5 text-pink-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="text-neutral-400">Followers:</span>
                    <strong class="text-white font-black">{{ formatCount(displayProfile().followersCount) }}</strong>
                  </div>

                  <!-- Posts Pill -->
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/60 shadow-sm">
                    <svg class="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span class="text-neutral-400">Posts:</span>
                    <strong class="text-white font-black">{{ formatCount(displayProfile().mediaCount) }}</strong>
                  </div>

                  <!-- Community Pill -->
                  <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/60 shadow-sm">
                    <svg class="w-3.5 h-3.5 text-rose-500 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                    <span class="text-neutral-400">Community:</span>
                    <strong class="text-emerald-400 font-black">Active</strong>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Action: Follow on Instagram Button -->
            <div class="shrink-0 flex items-center justify-end">
              <a
                [href]="displayProfile().profileUrl || 'https://www.instagram.com/3d.galaxy/'"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-600 hover:via-rose-600 hover:to-pink-700 text-white font-black text-xs sm:text-sm tracking-wide shadow-lg hover:shadow-pink-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>Follow on Instagram</span>
                <svg class="w-3.5 h-3.5 fill-none stroke-current" viewBox="0 0 24 24" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            </div>
          </div>

          <!-- 3. Responsive Post Grid (Screenshot 2: 5 Columns Desktop, 3 Tablet, 2 Mobile) -->
          @if (loading() && (!effectivePosts() || effectivePosts().length === 0)) {
            <!-- Skeleton Loading State -->
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
              @for (n of skeletonArray(); track n) {
                <div class="aspect-square sm:aspect-[4/5] rounded-2xl bg-neutral-200 dark:bg-neutral-800 animate-pulse"></div>
              }
            </div>
          } @else if (effectivePosts().length > 0) {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4.5">
              @for (post of effectivePosts(); track post.id) {
                <div
                  class="group relative aspect-square sm:aspect-[4/5] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col"
                  (click)="openPostModal(post)"
                  [title]="post.caption || 'Click to view post details'"
                >
                  <!-- Card Image / Video Poster -->
                  <img
                    [src]="post.imageUrl || post.thumbnailUrl || post.mediaUrl"
                    [alt]="post.caption || 'Instagram Post'"
                    loading="lazy"
                    class="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    (error)="handleImageError($event)"
                  />

                  <!-- Top Left Badge: Instagram Camera + Handle / Store Name -->
                  <div
                    class="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] sm:text-[11px] font-bold text-white border border-white/10 shadow-sm z-10 pointer-events-none"
                  >
                    <svg class="w-3 h-3 fill-current shrink-0 text-white" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span class="truncate max-w-[100px]">{{ displayProfile().name || displayProfile().username || '3D Galaxy' }}</span>
                  </div>

                  <!-- Top Right Indicator: Video/Reel or Carousel Album -->
                  @if (post.mediaType === 'VIDEO') {
                    <div
                      class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-md z-10 pointer-events-none"
                      title="Reel / Video"
                    >
                      <svg class="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  } @else if (post.mediaType === 'CAROUSEL_ALBUM') {
                    <div
                      class="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-md z-10 pointer-events-none"
                      title="Carousel Album"
                    >
                      <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
                      </svg>
                    </div>
                  }

                  <!-- Bottom Gradient Overlay: Timestamp + Caption Preview -->
                  <div
                    class="absolute inset-x-0 bottom-0 pt-12 pb-3 px-3 bg-gradient-to-t from-black/95 via-black/70 to-transparent flex flex-col justify-end z-10 pointer-events-none"
                  >
                    <!-- Time Ago -->
                    <span class="text-[10px] sm:text-[11px] font-medium text-neutral-300 text-right mb-1">
                      {{ formatRelativeTime(post.timestamp) }}
                    </span>
                    <!-- Caption Preview -->
                    <p class="text-[11px] sm:text-xs text-white line-clamp-2 leading-relaxed drop-shadow">
                      {{ post.caption || 'View post on Instagram' }}
                    </p>
                  </div>
                </div>
              }
            </div>
          } @else if (hasError()) {
            <!-- Error State -->
            <div class="p-8 text-center rounded-3xl bg-neutral-100 dark:bg-neutral-900/60 border border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 max-w-lg mx-auto">
              <svg class="w-10 h-10 text-rose-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white">Unable to Load Instagram Feed</h3>
              <p class="text-xs mt-1 text-neutral-500">Temporary network or API issue occurred while fetching media from Meta.</p>
              <button
                type="button"
                (click)="loadFeed(true)"
                class="mt-4 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Retry Feed
              </button>
            </div>
          } @else {
            <!-- Empty State -->
            <div class="p-8 text-center rounded-3xl bg-neutral-100 dark:bg-neutral-900/60 border border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-500 max-w-lg mx-auto">
              <svg class="w-10 h-10 text-neutral-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              <h3 class="text-sm font-bold text-neutral-900 dark:text-white">No Instagram Posts Found</h3>
              <p class="text-xs mt-1">There are currently no accessible media items from this profile.</p>
              <a
                [href]="displayProfile().profileUrl || 'https://www.instagram.com/3d.galaxy/'"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-block mt-3 text-xs font-bold text-pink-600 hover:underline"
              >
                Visit Instagram Profile →
              </a>
            </div>
          }
        </div>

        <!-- 4. Instagram Post Details Popup Modal (Screenshot 1) -->
        @if (selectedPost(); as post) {
          <div
            class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
            (click)="onBackdropClick($event)"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-post-author"
          >
            <!-- Modal Container (2-Panel Desktop Layout, Vertically Stacked Mobile) -->
            <div
              class="relative w-full max-w-4xl bg-[#0f172a] text-white rounded-3xl overflow-hidden border border-neutral-700/60 shadow-2xl flex flex-col md:flex-row max-h-[92vh] sm:max-h-[88vh] animate-scaleIn"
              (click)="$event.stopPropagation()"
            >
              <!-- Left Panel: Large Media Viewer (Video Player / Carousel / Image) -->
              <div class="relative w-full md:w-[56%] bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px] select-none overflow-hidden">
                @if (currentSlide()?.mediaType === 'VIDEO' || post.mediaType === 'VIDEO') {
                  <!-- Native HTML5 Video Player with controls (as shown in Screenshot 1) -->
                  <video
                    [src]="currentSlide()?.mediaUrl || post.mediaUrl"
                    [poster]="currentSlide()?.thumbnailUrl || post.thumbnailUrl || post.imageUrl"
                    controls
                    playsinline
                    autoplay
                    loop
                    class="w-full h-full max-h-[50vh] md:max-h-[75vh] object-contain bg-black"
                  ></video>
                } @else {
                  <!-- High-Res Image Display -->
                  <img
                    [src]="currentSlide()?.mediaUrl || post.imageUrl || post.mediaUrl"
                    [alt]="post.caption || 'Instagram Post'"
                    class="w-full h-full max-h-[50vh] md:max-h-[75vh] object-contain bg-black"
                    (error)="handleImageError($event)"
                  />
                }

                <!-- Carousel Navigation Arrows & Slide Counter -->
                @if (activeSlides().length > 1) {
                  <!-- Prev Arrow -->
                  <button
                    type="button"
                    (click)="prevSlide($event)"
                    aria-label="Previous image"
                    class="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer z-20 border border-white/10"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <!-- Next Arrow -->
                  <button
                    type="button"
                    (click)="nextSlide($event)"
                    aria-label="Next image"
                    class="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer z-20 border border-white/10"
                  >
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  <!-- Slide Indicator Badge -->
                  <div class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-white tracking-widest shadow border border-white/10 z-20">
                    {{ currentSlideIndex() + 1 }} / {{ activeSlides().length }}
                  </div>
                }
              </div>

              <!-- Right Panel: Author Info, Full Caption, Timestamp, and View Button -->
              <div class="w-full md:w-[44%] p-5 sm:p-6 flex flex-col justify-between bg-[#0f172a] border-t md:border-t-0 md:border-l border-neutral-800">
                <!-- Header: Profile Picture, Handle, Subtitle, Close Button -->
                <div class="flex items-center justify-between pb-4 border-b border-neutral-800/80">
                  <div class="flex items-center gap-3 min-w-0" id="modal-post-author">
                    <div class="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shrink-0">
                      <img
                        [src]="displayProfile().profileImageUrl || 'assets/images/user-placeholder.png'"
                        [alt]="displayProfile().username"
                        class="w-10 h-10 rounded-full object-cover bg-neutral-900 border border-[#0f172a]"
                        (error)="handleAvatarError($event)"
                      />
                    </div>
                    <div class="min-w-0">
                      <div class="flex items-center gap-1.5">
                        <span class="font-bold text-sm text-white truncate">&#64;{{ displayProfile().username || '3d.galaxy' }}</span>
                        @if (displayProfile().isVerified) {
                          <svg class="w-3.5 h-3.5 text-blue-500 fill-current shrink-0" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                        } @else {
                          <span class="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
                        }
                      </div>
                      <p class="text-[11px] text-neutral-400 truncate">{{ displayProfile().name || '3D Galaxy' }} • 3D Creations</p>
                    </div>
                  </div>

                  <!-- Close Button (X) -->
                  <button
                    type="button"
                    (click)="closeModal()"
                    aria-label="Close modal"
                    class="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <!-- Middle: Scrollable Readable Caption Area -->
                <div class="py-4 my-auto overflow-y-auto max-h-[260px] md:max-h-[360px] pr-2 space-y-4 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                  <p class="text-xs sm:text-sm text-neutral-200 whitespace-pre-line leading-relaxed font-normal select-text">
                    {{ post.caption || 'No caption available for this post.' }}
                  </p>

                  <!-- Timestamp & Instagram Mark -->
                  <div class="flex items-center justify-between text-xs text-neutral-400 pt-3 border-t border-neutral-800/80">
                    <span class="inline-flex items-center gap-1.5 text-neutral-400 text-[11px]">
                      <svg class="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{{ post.timestamp ? (post.timestamp | date:'mediumDate') : 'Recent' }}</span>
                    </span>

                    <svg class="w-4 h-4 fill-current text-neutral-400" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                </div>

                <!-- Footer: View on Instagram Button (Screenshot 1) -->
                <div class="pt-4 border-t border-neutral-800">
                  <a
                    [href]="post.permalink || 'https://www.instagram.com/'"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-600 hover:from-amber-600 hover:via-rose-600 hover:to-pink-700 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2.5 shadow-lg transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    <span>View on Instagram</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        }
      </section>
    }
  `,
})
export class HomeInstagramFeedComponent implements OnInit, OnChanges {
  private api = inject(ApiService);

  /** When true, runs in admin preview mode without auto-fetching public endpoint */
  @Input() previewMode: boolean = false;

  /** Preview data supplied directly by admin diagnostics */
  @Input() previewData: any = null;

  /** Number of posts to show override (for admin preview) */
  @Input() postCountLimit: number | null = null;

  /** External loading indicator (e.g. while testing connection) */
  @Input() externalLoading: boolean = false;

  /** Emitted when manual refresh is requested */
  @Output() refreshRequested = new EventEmitter<void>();

  private _feedData = signal<InstagramFeedPayload | null>(null);
  loading = signal<boolean>(true);
  hasError = signal<boolean>(false);

  // Selected post for modal popup
  selectedPost = signal<InstagramPost | null>(null);
  currentSlideIndex = signal<number>(0);

  // Effective feed data computed from either previewData or fetched public feed
  effectiveData = computed<InstagramFeedPayload | null>(() => {
    if (this.previewMode && this.previewData) {
      return {
        enabled: this.previewData.enabled !== false,
        isLive: this.previewData.status === "connected" || this.previewData.isLive === true,
        isStale: this.previewData.isStale === true,
        profile: this.previewData.profile || {},
        posts: Array.isArray(this.previewData.posts) ? this.previewData.posts : [],
        fetchedAt: this.previewData.lastChecked || new Date().toISOString(),
      };
    }
    return this._feedData();
  });

  // Effective profile information
  displayProfile = computed<InstagramProfileData>(() => {
    const data = this.effectiveData();
    return data?.profile || {
      username: "3d.galaxy",
      name: "3D Galaxy",
      profileUrl: "https://www.instagram.com/3d.galaxy/",
      profileImageUrl: "",
      bio: "",
      followersCount: null,
      mediaCount: null,
      isVerified: false,
    };
  });

  // Effective posts limited by postCount
  effectivePosts = computed<InstagramPost[]>(() => {
    const data = this.effectiveData();
    const raw = data?.posts || [];
    const limit = this.postCountLimit || (this.previewMode ? 6 : raw.length);
    return limit > 0 ? raw.slice(0, limit) : raw;
  });

  // Whether the entire section should render
  shouldRender = computed<boolean>(() => {
    if (this.previewMode) return true;
    const data = this.effectiveData();
    if (this.loading()) return true;
    return Boolean(data?.enabled && data?.posts && data.posts.length > 0);
  });

  // Slides of the currently open post in modal
  activeSlides = computed<InstagramMediaChild[]>(() => {
    const post = this.selectedPost();
    if (!post) return [];
    if (post.mediaType === "CAROUSEL_ALBUM" && Array.isArray(post.children) && post.children.length > 0) {
      return post.children;
    }
    return [
      {
        id: post.id,
        mediaType: post.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
        mediaUrl: post.mediaUrl || post.imageUrl,
        thumbnailUrl: post.thumbnailUrl || post.imageUrl,
      },
    ];
  });

  currentSlide = computed<InstagramMediaChild | null>(() => {
    const slides = this.activeSlides();
    const idx = this.currentSlideIndex();
    return slides[idx] || slides[0] || null;
  });

  skeletonArray = computed<number[]>(() => {
    const count = this.postCountLimit || 5;
    return Array.from({ length: Math.min(count, 10) }, (_, i) => i + 1);
  });

  ngOnInit() {
    if (!this.previewMode) {
      this.loadFeed();
    } else {
      this.loading.set(false);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes["previewData"] && this.previewMode) {
      this.loading.set(false);
    }
    if (changes["externalLoading"]) {
      this.loading.set(Boolean(this.externalLoading));
    }
  }

  loadFeed(forceRefresh = false) {
    this.loading.set(true);
    this.hasError.set(false);
    const query = forceRefresh ? "?refresh=true" : "";
    this.api.get<any>(`/public/instagram-feed${query}`, undefined, forceRefresh).subscribe({
      next: (response) => {
        const payload: InstagramFeedPayload = response?.data || {
          enabled: false,
          isLive: false,
          profile: {} as any,
          posts: [],
          fetchedAt: new Date().toISOString(),
        };
        this._feedData.set(payload);
        this.loading.set(false);
        if (payload.enabled && payload.posts?.length > 0) {
          this.trackInteraction("impression", payload.posts[0]?.id || "feed");
        }
      },
      error: () => {
        this.hasError.set(true);
        this.loading.set(false);
      },
    });
  }

  openPostModal(post: InstagramPost) {
    this.selectedPost.set(post);
    this.currentSlideIndex.set(0);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
    }
    if (!this.previewMode) {
      this.trackInteraction("click", post.id);
    }
  }

  closeModal() {
    this.selectedPost.set(null);
    this.currentSlideIndex.set(0);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  @HostListener("document:keydown.escape")
  onEscapePress() {
    if (this.selectedPost()) {
      this.closeModal();
    }
  }

  nextSlide(e?: Event) {
    e?.stopPropagation();
    const total = this.activeSlides().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((i) => (i + 1) % total);
  }

  prevSlide(e?: Event) {
    e?.stopPropagation();
    const total = this.activeSlides().length;
    if (total <= 1) return;
    this.currentSlideIndex.update((i) => (i - 1 + total) % total);
  }

  formatCount(count: number | null | undefined): string {
    if (count === null || count === undefined) return "Unavailable";
    if (count >= 1_000_000) return (count / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (count >= 1_000) return (count / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(count);
  }

  formatRelativeTime(timestamp: string | null | undefined): string {
    if (!timestamp) return "Recent";
    try {
      const postTime = new Date(timestamp).getTime();
      const now = Date.now();
      const diffSec = Math.floor((now - postTime) / 1000);
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      const diffWeeks = Math.floor(diffDays / 7);
      if (diffWeeks < 5) return `${diffWeeks}w ago`;
      return new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch {
      return "Recent";
    }
  }

  handleAvatarError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset["failed"]) {
      img.dataset["failed"] = "true";
      img.src = "assets/images/user-placeholder.png";
    }
  }

  handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img && !img.dataset["fallback"]) {
      img.dataset["fallback"] = "true";
      img.src =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='1.5'%3E%3Crect x='2' y='2' width='20' height='20' rx='5' ry='5'/%3E%3Cpath d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z'/%3E%3Cline x1='17.5' y1='6.5' x2='17.51' y2='6.5'/%3E%3C/svg%3E";
    }
  }

  private trackInteraction(eventType: "impression" | "click", postId: string) {
    this.api
      .post<any>("/public/instagram-feed/interaction", {
        eventType,
        postId,
      })
      .subscribe({
        next: () => {},
        error: () => {},
      });
  }
}
