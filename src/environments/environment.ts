export const environment = {
    production: false,
    siteName: '3D Galaxy',
    supportEmail: 'support@3dgalaxy.co.in',
    adminUrl: 'https://admin.3dgalaxy.in',
    get siteUrl() {
        if (typeof window !== 'undefined' && window.location.origin) {
            return window.location.origin;
        }
        return 'https://3dgalaxy.co.in';
    },
    get apiUrl() {
        return "https://api-kcrj5xgpxa-uc.a.run.app/api";
    },
};

