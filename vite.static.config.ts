import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const pagesBasePath = (
    process.env.VITE_PAGES_BASE_PATH ?? env.VITE_PAGES_BASE_PATH ?? "/dealyva/"
  ).trim();
  const adsenseClientId = (
    process.env.VITE_ADSENSE_CLIENT_ID ??
    env.VITE_ADSENSE_CLIENT_ID ??
    ""
  ).trim();
  const adsenseHeadPlugin: Plugin = {
    name: "dealyva-adsense-head",
    transformIndexHtml() {
      if (!/^ca-pub-\d{16}$/.test(adsenseClientId)) {
        return [];
      }

      return [
        {
          tag: "meta",
          attrs: {
            name: "google-adsense-account",
            content: adsenseClientId,
          },
          injectTo: "head",
        },
        {
          tag: "script",
          attrs: {
            id: "dealyva-adsense-script",
            async: true,
            crossorigin: "anonymous",
            src:
              "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js" +
              `?client=${encodeURIComponent(adsenseClientId)}`,
          },
          injectTo: "head",
        },
      ];
    },
  };

  return {
    base: pagesBasePath.endsWith("/") ? pagesBasePath : `${pagesBasePath}/`,
    plugins: [react(), adsenseHeadPlugin],
    define: {
      "import.meta.env.VITE_ROUTER_MODE": JSON.stringify("hash"),
    },
    build: {
      outDir: "dist-static",
      emptyOutDir: true,
    },
  };
});
