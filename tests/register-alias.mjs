import { registerHooks } from "node:module";
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const rootDir = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const relativeTarget = specifier.slice(2);
      const targetWithExt = relativeTarget.endsWith(".ts")
        ? relativeTarget
        : `${relativeTarget}.ts`;
      const fileUrl = pathToFileURL(resolvePath(rootDir, targetWithExt)).href;
      return nextResolve(fileUrl, context);
    }
    return nextResolve(specifier, context);
  },
});

