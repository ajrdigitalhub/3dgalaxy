export const environment = {
  production: false,
  get apiUrl() {
    // if (typeof window !== 'undefined') {
    //   return `${window.location.origin}/api`;
    // }
    return 'http://localhost:4000/api';
  }
};
