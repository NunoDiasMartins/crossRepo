import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@assurance-topology/topology-webcomponent": fileURLToPath(new URL("../topology-webcomponent/src/index.ts", import.meta.url)),
      "@assurance-topology/topology-core": fileURLToPath(new URL("../topology-core/src/index.ts", import.meta.url)),
    },
  },
});
