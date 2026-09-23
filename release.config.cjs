module.exports = {
  branches: ['main'],
  tagFormat: 'v${version}',
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['@semantic-release/npm', { npmPublish: false }],
    ['@semantic-release/exec', {
      prepareCmd: 'npm run package:release',
      publishCmd: 'npx --no-install vsce publish --oidc --packagePath artifacts/extension.vsix',
    }],
    ['@semantic-release/github', {
      assets: [{ path: 'artifacts/extension.vsix', name: 'openspec-vscode-extension-${nextRelease.version}.vsix' }],
      successComment: false,
      failComment: false,
      releasedLabels: false,
    }],
  ],
};
