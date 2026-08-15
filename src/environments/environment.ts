export const environment = {
    production: false,
    get apiUrl() {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            return "http://localhost:4000/api";
        }
        return "https://api-kcrj5xgpxa-uc.a.run.app/api";
    },
};
