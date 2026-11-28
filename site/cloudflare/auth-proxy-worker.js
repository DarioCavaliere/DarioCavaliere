// Cloudflare Worker "dado-auth": serves Firebase's sign-in helper from www.dadofood.com/__/...
// so Google sign-in runs on our own domain (no third-party blocking, and Google shows dadofood.com).
// Routes: www.dadofood.com/__/*  and  dadofood.com/__/*
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = "dadofood-11d07.firebaseapp.com";
    url.port = "";
    return fetch(new Request(url, request));
  }
};
