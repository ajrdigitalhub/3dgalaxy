export const environment = {
    production: false,
    siteName: '3D Galaxy',
    supportEmail: 'support@3dgalaxy.co',
    get adminUrl(): string {
        return `${this.siteUrl}/admin`;
    },
    get siteUrl() {
        if (typeof window !== 'undefined' && window.location.origin) {
            return window.location.origin;
        }
        return 'https://3dgalaxy.co';
    },
    get apiUrl(): string {
        if (typeof window !== 'undefined') {
            const host = window.location.hostname;
            if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.endsWith('.local')) {
                return `http://${host}:4000/api`;
            }
        }
        return "https://api-kcrj5xgpxa-uc.a.run.app/api";
    },
};

