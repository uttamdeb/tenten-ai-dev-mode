interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Register service worker
export const registerSW = () => {
  if ('serviceWorker' in navigator) {
    // Reload the page when a new Service Worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    // Optional: Handle messages from the Service Worker
    navigator.serviceWorker.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === 'SW_ACTIVATED') {
        console.log('Service Worker activated and controlling this page');
        // If a new SW activated, ensure the page refreshes so it loads the newest index.html
        // Some browsers may not trigger controllerchange immediately for all clients — reload on message as a fallback.
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      }
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          // Force an immediate update check for the Service Worker
          registration.update();
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
};

// PWA install prompt
let deferredPrompt: BeforeInstallPromptEvent | null = null;

export const initPWAInstall = () => {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
};

export const showInstallPrompt = async () => {
  if (deferredPrompt) {
    // Show the prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // Clear the deferred prompt variable
    deferredPrompt = null;
    return outcome === 'accepted';
  }
  return false;
};