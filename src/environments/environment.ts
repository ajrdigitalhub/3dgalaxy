export const environment = {
  production: false,
  get apiUrl() {
    // if (typeof window !== 'undefined') {
    //   return `${window.location.origin}/api`;
    // } this is for local development
    // return 'https://api-kcrj5xgpxa-uc.a.run.app/api';
    return 'http://localhost:4000/api';
  }
};
