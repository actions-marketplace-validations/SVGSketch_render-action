import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "rendered");
const expectedNames = ["architecture.svg", "bar-chart.svg", "icons.svg"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const filename of expectedNames) {
  const sourceFilename = filename.replace(/\.svg$/, ".svgs");
  const source = JSON.parse(
    readFileSync(resolve("examples", sourceFilename), "utf8"),
  );
  assert(
    source.schemaVersion === 8,
    `${sourceFilename} is not at the current schema version`,
  );
  assert(
    Array.isArray(source.shapes) && source.shapes.length > 0,
    `${sourceFilename} has no shape corpus`,
  );
}

for (const variant of ["default", "retheme"]) {
  const directory = resolve(root, variant);
  const files = readdirSync(directory)
    .filter((filename) => filename.endsWith(".svg"))
    .sort();
  assert(
    JSON.stringify(files) === JSON.stringify(expectedNames),
    `${variant} output roster differs: ${files.join(", ")}`,
  );

  for (const filename of files) {
    const path = resolve(directory, filename);
    const content = readFileSync(path, "utf8");
    assert(
      statSync(path).size > 500,
      `${variant}/${filename} is unexpectedly small`,
    );
    assert(
      /^<\?xml[^>]*>\s*<svg\b/.test(content),
      `${variant}/${filename} does not start with an XML declaration and SVG root`,
    );
    assert(
      content.includes("</svg>"),
      `${variant}/${filename} has no closing SVG root`,
    );
    assert(
      !content.includes("{{"),
      `${variant}/${filename} contains unresolved template variables`,
    );
  }
}

const defaultIcons = readFileSync(resolve(root, "default/icons.svg"), "utf8");
const themedIcons = readFileSync(resolve(root, "retheme/icons.svg"), "utf8");
const themedChart = readFileSync(
  resolve(root, "retheme/bar-chart.svg"),
  "utf8",
);
const themedArchitecture = readFileSync(
  resolve(root, "retheme/architecture.svg"),
  "utf8",
);

assert(
  defaultIcons.includes("#3498db"),
  "default icons did not apply the accent default",
);
assert(
  themedIcons.includes("#e74c3c"),
  "rethemed icons did not apply the accent override",
);
assert(
  themedChart.includes("Q1 Revenue"),
  "rethemed chart did not apply the title override",
);
assert(
  themedChart.includes("#2ecc71"),
  "rethemed chart did not apply the gradient override",
);
assert(
  themedArchitecture.includes("#8b5cf6") &&
    themedArchitecture.includes("#ec4899") &&
    themedArchitecture.includes("#f59e0b"),
  "rethemed architecture did not apply all tier color overrides",
);

console.log(
  "Verified six concrete SVG outputs and every template-variable variant.",
);
