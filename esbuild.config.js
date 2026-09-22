const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const isWatch = process.argv.includes('--watch');
const isProduction = process.argv.includes('--production') || process.env.NODE_ENV === 'production';

async function build() {
  // Ensure output directory exists
  fs.mkdirSync(path.join(__dirname, 'dist', 'webview'), { recursive: true });

  // Copy codicons if available
  const codiconCssSrc = path.join(__dirname, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.css');
  const codiconTtfSrc = path.join(__dirname, 'node_modules', '@vscode', 'codicons', 'dist', 'codicon.ttf');
  const webviewDist = path.join(__dirname, 'dist', 'webview');

  if (fs.existsSync(codiconCssSrc)) {
    fs.copyFileSync(codiconCssSrc, path.join(webviewDist, 'codicon.css'));
  }
  if (fs.existsSync(codiconTtfSrc)) {
    fs.copyFileSync(codiconTtfSrc, path.join(webviewDist, 'codicon.ttf'));
  }

  // Extension Host build (Node / CommonJS)
  const extensionContext = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['vscode'],
    outfile: 'dist/extension.js',
    sourcemap: !isProduction,
    minify: isProduction,
    logLevel: 'info',
  });

  // Webview UI build (Browser / IIFE)
  const webviewContext = await esbuild.context({
    entryPoints: ['webview-ui/src/index.tsx'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2022', 'chrome110'],
    outfile: 'dist/webview/index.js',
    sourcemap: !isProduction,
    minify: isProduction,
    logLevel: 'info',
  });

  if (isWatch) {
    console.log('[esbuild] Watching for file changes...');
    await Promise.all([
      extensionContext.watch(),
      webviewContext.watch()
    ]);
  } else {
    await Promise.all([
      extensionContext.rebuild(),
      webviewContext.rebuild()
    ]);
    await extensionContext.dispose();
    await webviewContext.dispose();
    console.log('[esbuild] Build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
