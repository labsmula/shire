import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const marketingFiles = [
  "components/marketing/navbar.tsx",
  "components/marketing/hero.tsx",
  "components/marketing/hero-prompt.tsx",
  "components/marketing/cta.tsx",
  "components/marketing/faq.tsx",
];

test("marketing entry points route to existing app paths", () => {
  for (const file of marketingFiles) {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    assert.equal(
      source.includes('"/dashboard"') || source.includes('"/dashboard#'),
      false,
      `${file} must not link to removed /dashboard route`,
    );
  }
});
