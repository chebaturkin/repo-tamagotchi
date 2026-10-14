// A small fictional repository. It follows the same analysis path as user files.
const files = {
  'small-garden/README.md': '# small garden\nA tiny browser garden. Run npm test to check the plants.',
  'small-garden/LICENSE': 'MIT License',
  'small-garden/package.json': '{"name":"small-garden","scripts":{"test":"node --test"},"type":"module"}',
  'small-garden/package-lock.json': '{"name":"small-garden","lockfileVersion":3}',
  'small-garden/index.html': '<!doctype html><html><body><main id="garden"></main></body></html>',
  'small-garden/src/garden.js': 'export const plants = ["fern", "moss"];\nexport const grow = plant => `${plant} is growing`;',
  'small-garden/src/styles.css': ':root { color: #183a37; background: #f5efdf; }\n.plant { padding: 1rem; }',
  'small-garden/tests/garden.test.js': 'import { test } from "node:test";\nimport { grow } from "../src/garden.js";\ntest("fern grows", () => grow("fern"));',
  'small-garden/.github/workflows/test.yml': 'name: test\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - run: npm test',
};

export const exampleEntries = Object.entries(files).map(([path, text]) => ({
  path, text, bytes: new TextEncoder().encode(text).byteLength,
}));
