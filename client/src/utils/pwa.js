/**
 * PROMPT 10: Progressive Web App (PWA)
 * Service Worker for offline support, caching, install prompt
 */

// Service Worker registration
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker registered:", registration);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);
      });
  });
}

// Install prompt handling
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Show install button
  const installBtn = document.getElementById("install-btn");
  if (installBtn) {
    installBtn.style.display = "block";
    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
      }
    });
  }
});

// App installed
window.addEventListener("appinstalled", () => {
  console.log("✅ PWA installed successfully");
  deferredPrompt = null;
});

export function registerPWA() {
  return navigator.serviceWorker?.ready || Promise.resolve();
}
