import { defineConfig } from "oxlint";

export default defineConfig({
    options: {
        typeAware: true
    },
    categories: {
        correctness: "error"
    },
    env: {
        node: true
    },
    ignorePatterns: ["node_modules/**", "out/**"]
});
