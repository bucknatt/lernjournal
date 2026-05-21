import { initRouter } from "./router.js";
import { journalStore } from "./store/journal-store.js";
import { initTheme } from "./utils/theme.js";

async function bootstrap() {
  try {
    initTheme();
    await journalStore.prepare();
    await journalStore.init();
    initRouter();
  } catch (err) {
    const app = document.getElementById("app");
    app.innerHTML = `
      <div class="error-panel">
        <h1>Lernjournal konnte nicht starten</h1>
        <p>${err.message}</p>
        <p class="muted">Starte die App mit <code>npm run dev</code> (kein file://).</p>
      </div>
    `;
    console.error(err);
  }
}

bootstrap();
