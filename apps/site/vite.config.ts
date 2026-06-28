import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [svelte()],
  fmt: {},
  // Bind to 127.0.0.1 (not localhost/::1) so atproto's loopback OAuth client works.
  server: { host: "127.0.0.1" },
  preview: { host: "127.0.0.1" },
});
