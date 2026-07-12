import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const record = await prisma.setting.findUnique({
    where: { settingKey: 'app_settings' }
  });

  if (!record) {
    console.log("No setting found, creating one with defaults.");
    const defaultSettings = {
      siteName: "3D Galaxy",
      logoUrl: "",
      currency: "₹",
      footer: {
        companyInfo: {
          companyName: "3D Galaxy",
          footerDescription: "World class custom 3D printing compounding and solutions.",
          address: "374/1 Budana Compound, Udyog Nagar Palda, Indore (M.P)- 452001",
          phone: "+91 9111381113",
          email: "galaxy.3d@hotmail.com",
          workingHours: "Mon-Sat - 11-7pm"
        },
        groups: [
          {
            id: "policies",
            title: "Policies",
            isActive: true,
            links: [
              { id: "ref-policy", title: "Refund Policy", url: "/refund-policy", isActive: true, openInNewTab: false },
              { id: "ret-policy", title: "Return Policy", url: "/return-policy", isActive: true, openInNewTab: false },
              { id: "priv-policy", title: "Privacy Policy", url: "/privacy-policy", isActive: true, openInNewTab: false },
              { id: "tos-policy", title: "Terms of Service", url: "/terms-of-service", isActive: true, openInNewTab: false },
              { id: "ship-policy", title: "Shipping Policy", url: "/shipping-policy", isActive: true, openInNewTab: false },
              { id: "abt-policy", title: "About Us", url: "/about-us", isActive: true, openInNewTab: false }
            ]
          },
          {
            id: "quick-links",
            title: "Quick links",
            isActive: true,
            links: [
              { id: "search-link", title: "Search", url: "/products", isActive: true, openInNewTab: false },
              { id: "contact-link", title: "Contact Us", url: "/contact", isActive: true, openInNewTab: false },
              { id: "products-link", title: "All products", url: "/products", isActive: true, openInNewTab: false },
              { id: "track-link", title: "Track Order", url: "/orders", isActive: true, openInNewTab: false }
            ]
          }
        ]
      }
    };
    await prisma.setting.create({
      data: {
        settingKey: 'app_settings',
        settingData: defaultSettings
      }
    });
    console.log("Successfully created default settings with new footer!");
    return;
  }

  let settings = typeof record.settingData === 'string' ? JSON.parse(record.settingData) : record.settingData as any;

  settings.footer = {
    ...settings.footer,
    companyInfo: {
      companyName: "3D Galaxy",
      footerDescription: settings.footer?.companyInfo?.footerDescription || "World class custom 3D printing compounding and solutions.",
      companyLogo: settings.footer?.companyInfo?.companyLogo || "",
      address: "374/1 Budana Compound, Udyog Nagar Palda, Indore (M.P)- 452001",
      phone: "+91 9111381113",
      email: "galaxy.3d@hotmail.com",
      workingHours: "Mon-Sat - 11-7pm"
    },
    groups: [
      {
        id: "policies",
        title: "Policies",
        isActive: true,
        links: [
          { id: "ref-policy", title: "Refund Policy", url: "/refund-policy", isActive: true, openInNewTab: false },
          { id: "ret-policy", title: "Return Policy", url: "/return-policy", isActive: true, openInNewTab: false },
          { id: "priv-policy", title: "Privacy Policy", url: "/privacy-policy", isActive: true, openInNewTab: false },
          { id: "tos-policy", title: "Terms of Service", url: "/terms-of-service", isActive: true, openInNewTab: false },
          { id: "ship-policy", title: "Shipping Policy", url: "/shipping-policy", isActive: true, openInNewTab: false },
          { id: "abt-policy", title: "About Us", url: "/about-us", isActive: true, openInNewTab: false }
        ]
      },
      {
        id: "quick-links",
        title: "Quick links",
        isActive: true,
        links: [
          { id: "search-link", title: "Search", url: "/products", isActive: true, openInNewTab: false },
          { id: "contact-link", title: "Contact Us", url: "/contact", isActive: true, openInNewTab: false },
          { id: "products-link", title: "All products", url: "/products", isActive: true, openInNewTab: false },
          { id: "track-link", title: "Track Order", url: "/orders", isActive: true, openInNewTab: false }
        ]
      }
    ]
  };

  await prisma.setting.update({
    where: { settingKey: 'app_settings' },
    data: { settingData: settings }
  });

  console.log("Successfully updated footer in the database!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
