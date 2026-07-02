// @ts-check

import { createFolderStructure } from "eslint-plugin-project-structure";

/**
 * Collocation architecture:
 *   src/routes/<route>/features/<feature>/views/<view>/<component>/
 *     └── types.ts, constants.ts, hooks/, utils/, lib/, components/
 *   src/components/ — global (used in 2+ routes)
 *   src/lib/ — shared domain logic
 */
export const folderStructureConfig = createFolderStructure({
  structureRoot: "src",
  structure: [
    { name: "app", children: [] },
    { name: "lib", children: [] },
    { name: "components", ruleId: "global_components" },
    { name: "routes", ruleId: "routes_root" },
  ],
  rules: {
    global_components: {
      children: [
        { name: "{kebab-case}.tsx" },
        { name: "ui", children: [{ name: "{kebab-case}.tsx" }] },
        {
          name: "evilcharts",
          children: [
            { name: "ui", children: [{ name: "{kebab-case}.tsx" }] },
            { name: "charts", children: [{ name: "{kebab-case}.tsx" }] },
          ],
        },
      ],
    },

    routes_root: {
      children: [
        { name: "types.ts" },
        { name: "lib", children: [{ name: "{kebab-case}.ts" }] },
        { ruleId: "route_tree" },
      ],
    },

    route_tree: {
      name: "*",
      children: [
        { name: "index.ts" },
        { name: "{kebab-case}.tsx" },
        { name: "features", ruleId: "features_tree" },
        { name: "components", ruleId: "route_shared_components" },
        { name: "hooks", children: [{ name: "use*.ts" }] },
        { name: "utils", children: [{ name: "{kebab-case}.ts" }] },
        {
          name: "lib",
          children: [
            { name: "{kebab-case}.ts" },
            { name: "{kebab-case}", children: [{ name: "{kebab-case}.ts" }] },
          ],
        },
        { name: "types.ts" },
        { name: "constants.ts" },
        { ruleId: "route_tree" },
      ],
    },

    features_tree: {
      children: [{ ruleId: "feature_module" }],
    },

    feature_module: {
      name: "{kebab-case}",
      children: [
        { name: "index.ts" },
        { name: "{kebab-case}.tsx" },
        { name: "views", ruleId: "views_tree" },
        { name: "components", ruleId: "feature_components" },
        { ruleId: "component_module" },
        { name: "hooks", children: [{ name: "use*.ts" }] },
        { name: "utils", children: [{ name: "{kebab-case}.ts" }] },
        { name: "lib", children: [{ name: "{kebab-case}.ts" }] },
        { name: "types.ts" },
        { name: "constants.ts" },
      ],
    },

    views_tree: {
      children: [{ ruleId: "view_module" }],
    },

    view_module: {
      name: "{kebab-case}-view",
      children: [
        { name: "index.ts" },
        { name: "{kebab-case}.tsx" },
        { ruleId: "component_module" },
      ],
    },

    component_module: {
      name: "{kebab-case}",
      children: [
        { name: "index.ts" },
        { name: "{kebab-case}.tsx" },
        { name: "constants.ts" },
        { name: "types.ts" },
        { name: "hooks", children: [{ name: "use*.ts" }] },
        { name: "utils", children: [{ name: "{kebab-case}.ts" }] },
        { name: "lib", children: [{ name: "{kebab-case}.ts" }] },
        {
          name: "components",
          children: [
            { name: "{kebab-case}.tsx" },
            { ruleId: "component_module" },
          ],
        },
        { ruleId: "component_module" },
      ],
    },

    route_shared_components: {
      children: [{ ruleId: "component_module" }],
    },

    feature_components: {
      children: [
        { name: "{kebab-case}.tsx" },
        { ruleId: "component_module" },
      ],
    },
  },
});
