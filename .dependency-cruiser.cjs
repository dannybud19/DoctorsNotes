// Enforces the AGENTS.md §2 boundary wall. A single violating import fails CI.
// See: https://github.com/sverweij/dependency-cruiser
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "mobile-no-ai",
      comment:
        "apps/mobile must have ZERO AI. It may never import packages/ai or any AI SDK (invariant §1.3).",
      severity: "error",
      from: { path: "^apps/mobile" },
      to: {
        path: [
          "^packages/ai",
          "node_modules/(@?ai|ai-sdk|@ai-sdk|@deepgram|openai|@anthropic-ai|@azure/ai)",
        ],
      },
    },
    {
      name: "domain-is-pure",
      comment:
        "packages/domain and packages/reconciler are pure: no AI SDKs, no react, no node builtins (invariant §1.4).",
      severity: "error",
      from: { path: "^packages/(domain|reconciler)" },
      to: {
        path: ["node_modules/(@?ai|ai-sdk|@ai-sdk|react|react-native|@deepgram|openai)"],
      },
    },
    {
      name: "domain-no-node-builtins",
      comment: "The pure core must not touch node builtins — it has to run in a browser/RN too.",
      severity: "error",
      from: { path: "^packages/(domain|reconciler)" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "ai-server-only",
      comment: "packages/ai is server-only and may be imported ONLY by apps/web (invariant §1.3).",
      severity: "error",
      from: { pathNot: ["^apps/web", "^packages/ai"] },
      to: { path: "^packages/ai" },
    },
    {
      name: "no-circular",
      comment: "No circular dependencies.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "No orphan modules (dead files) — framework entrypoints are exempt.",
      severity: "warn",
      from: {
        orphan: true,
        pathNot: [
          "\\.d\\.ts$",
          "\\.(json|md)$",
          "\\.config\\.(js|cjs|mjs|ts)$", // next/metro/babel configs
          "^apps/[^/]+/app/", // Next.js & Expo Router route entrypoints
        ],
      },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    exclude: { path: "(node_modules|\\.next|\\.expo|dist|build)" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
