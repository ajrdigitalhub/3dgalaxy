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
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { SettingsService } from "../../core/services/settings.service";
import { buildWhatsAppUrl } from "../../shared/utils/phone.utils";

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
  private sanitizer = inject(DomSanitizer);

  isLoading = signal(true);

  siteName = computed(() => this.settingsService.siteName() || "3D Galaxy");

  whatsappUrl = computed(() => {
    const whatsappSettings = this.settingsService.whatsappSettings() || {};
    const contact = this.settingsService.contact() || {};
    const phone =
      whatsappSettings.adminPhoneNumber ||
      whatsappSettings.adminPhone ||
      contact.phone ||
      "919111381113";
    const site = this.siteName();
    const origin =
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://3dgalaxy.co.in";
    const message = `Hello ${site}, I was visiting your About Us page (${origin}/about) and would like to get in touch with you regarding your 3D printing products and services.`;
    return buildWhatsAppUrl(phone, message, "919111381113");
  });

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
        `Certainly, we offer end-to-end additive manufacturing solutions including 3D Printing, 3D Scanning, Rapid Prototyping, 3D Printers, 3D Pens, and premium PLA Filaments at India's most competitive prices. At 3D Galaxy, we deliver dependable quality and technical support for hobbyists, engineers, and industrial creators. Contact us to learn more.`,
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
        "3D Galaxy, Budana Compound, 374/1, Udhyog Nagar, Palda, Indore, Madhya Pradesh 452001",
        workingHours: contact.workingHours || "Mon-Sat - 11:00 AM - 7:00 PM",
          mapUrl:
      contact.mapUrl ||
        contact.googleMapUrl ||
        "https://maps.app.goo.gl/Nu2hvW8yBzMUzZxQ7"
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

  async loadSettings(): Promise < void> {
  this.isLoading.set(true);
  try {
    await this.settingsService.loadSettings();
  } catch(error) {
    console.error("Failed to load about page settings", error);
  } finally {
    this.isLoading.set(false);
  }
}

getMapUrl(addressOrUrl: string): SafeResourceUrl {
  const defaultQuery = "3D Galaxy, Budana Compound, 374/1, Udhyog Nagar, Palda, Indore, Madhya Pradesh 452001";
  let query = (addressOrUrl || defaultQuery).trim();

  if (query.includes('google.com/maps/embed')) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(query);
  }

  if (query.includes('maps.app.goo.gl') || query.includes('maps.google.com')) {
    try {
      const urlObj = new URL(query);
      const qParam = urlObj.searchParams.get('q');
      query = qParam || defaultQuery;
    } catch {
      query = defaultQuery;
    }
  }

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
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
