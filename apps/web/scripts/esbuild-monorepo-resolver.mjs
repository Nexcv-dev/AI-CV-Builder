import path from 'node:path';
import { builtinModules } from 'node:module';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const BARE_IMPORT = /^(?:@[^/]+\/[^/]+|[^./:@][^:]*)/;
const BUILTIN_MODULES = new Set(builtinModules);

export function createMonorepoResolvePlugin({ repoRoot, projectRoot }) {
  const roots = [
    projectRoot,
    path.join(repoRoot, 'apps', 'api'),
    repoRoot,
  ];
  const workspacePaths = new Map([
    ['@nexcv/shared', path.join(repoRoot, 'packages', 'shared', 'src', 'index.ts')],
    ['@nexcv/shared/queuePayloads', path.join(repoRoot, 'packages', 'shared', 'src', 'queuePayloads.ts')],
    ['@nexcv/templates', path.join(repoRoot, 'packages', 'templates', 'src', 'index.ts')],
  ]);

  return {
    name: 'monorepo-resolve',
    setup(build) {
      build.onResolve({ filter: BARE_IMPORT }, (args) => {
        if (args.path.startsWith('node:') || BUILTIN_MODULES.has(args.path)) return null;

        const workspacePath = workspacePaths.get(args.path);
        if (workspacePath) return { path: workspacePath };

        try {
          return {
            path: require.resolve(args.path, {
              paths: [args.resolveDir, ...roots].filter(Boolean),
            }),
          };
        } catch {
          return null;
        }
      });
    },
  };
}
