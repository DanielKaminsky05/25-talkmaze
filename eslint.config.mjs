import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/app/api/*", "@/src/app/api/**"],
              message:
                "Import shared logic from src/lib instead of importing route handlers from src/app/api.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/services/lessonspace/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/app/api/*", "@/src/app/api/**"],
              message:
                "Import shared logic from src/lib instead of importing route handlers from src/app/api.",
            },
            {
              group: [
                "@/src/services/supabase/*",
                "@supabase/*",
                "@/src/lib/**",
              ],
              message:
                "LessonSpace adapters in src/services must not depend on app-domain or Supabase modules.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.property.name='from']",
          message:
            "Do not perform database queries in LessonSpace adapter files under src/services/lessonspace.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
