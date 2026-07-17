import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import { RouterModule } from "@angular/router";
import { SettingsService } from "../../core/services/settings.service";

@Component({
  selector: "app-about-page",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: "./about.html",
  styleUrl: "./about.scss",
})
export class AboutPage implements OnInit {
  private settingsService = inject(SettingsService);

  isLoading = signal(true);

  siteName = computed(() => this.settingsService.siteName() || "3D Galaxy");

  aboutContent = computed(() => {
    const about = this.settingsService.aboutPage() || {};
    const contact = this.settingsService.contact() || {};
    const social = this.settingsService.socialLinks() || {};
    const data = this.settingsService.settingsData() || {};

    const teamMembers = Array.isArray(about.teamMembers)
      ? about.teamMembers
      : [];
    const gallery = Array.isArray(about.gallery) ? about.gallery : [];
    const achievements = Array.isArray(about.achievements)
      ? about.achievements
      : [];

    return {
      headline: about.headline || `${this.siteName()} — Innovation in Motion`,
      intro:
        about.bodyText ||
        about.intro ||
        about.description ||
        `We create precision 3D printing solutions for makers, businesses, and creators with reliable production quality and premium service.`,
      story:
        about.story ||
        about.storyText ||
        about.bodyText ||
        `From prototyping to production, 3D Galaxy has been helping customers turn ideas into tangible products with dependable manufacturing and support.`,
      mission:
        about.mission ||
        about.missionText ||
        `To make advanced manufacturing accessible, dependable, and beautifully executed for everyone we serve.`,
      vision:
        about.vision ||
        about.visionText ||
        `To become a trusted technology partner that sets the standard for innovation, craftsmanship, and customer experience.`,
      heroImage:
        about.heroImage ||
        data.logoUrl ||
        "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=1400&q=80",
      teamMembers,
      gallery,
      achievements,
      contact: {
        phone: contact.phone || "+91 9111381113",
        email: contact.email || "galaxy.3d@hotmail.com",
        address:
          contact.address ||
          "374/1 Budana Compound, Udyog Nagar, Palda, Indore, MP 452001",
      },
      socialLinks: {
        facebook: social.facebook || "",
        instagram: social.instagram || "",
        linkedin: social.linkedin || "",
        youtube: social.youtube || "",
      },
    };
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  async loadSettings(): Promise<void> {
    this.isLoading.set(true);
    try {
      await this.settingsService.loadSettings();
    } catch (error) {
      console.error("Failed to load about page settings", error);
    } finally {
      this.isLoading.set(false);
    }
  }

  getMapUrl(address: string): string {
    return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
  }

  getSocialItems() {
    const content = this.aboutContent();
    return [
      {
        key: "facebook",
        label: "Facebook",
        url: content.socialLinks.facebook,
        icon: "facebook",
      },
      {
        key: "instagram",
        label: "Instagram",
        url: content.socialLinks.instagram,
        icon: "photo_camera",
      },
      {
        key: "linkedin",
        label: "LinkedIn",
        url: content.socialLinks.linkedin,
        icon: "business",
      },
      {
        key: "youtube",
        label: "YouTube",
        url: content.socialLinks.youtube,
        icon: "play_circle",
      },
    ].filter((item) => Boolean(item.url));
  }
}
