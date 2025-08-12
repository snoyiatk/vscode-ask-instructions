# GitHub Actions Workflow for VS Code Extension Release

This directory contains the GitHub Actions workflow for automatically building and releasing the VS Code extension.

## Workflow: `release.yml`

### Triggers
- **Push to main branch**: Automatically triggers when code is merged to the main branch
- **Manual dispatch**: Can be triggered manually from the GitHub Actions tab

### What it does

1. **Environment Setup**
   - Checks out the code with full git history
   - Sets up Node.js 18 with npm caching
   - Installs project dependencies

2. **Code Quality & Build**
   - Runs ESLint to check code quality
   - Compiles TypeScript to JavaScript
   - Ensures the extension builds successfully

3. **Extension Packaging**
   - Installs `vsce` (VS Code Extension Manager) globally
   - Extracts version from `package.json`
   - Checks if a release for this version already exists
   - Packages the extension into a `.vsix` file

4. **Release Creation**
   - Creates a git tag for the version
   - Creates a GitHub release with:
     - Release notes including commit SHA and installation instructions
     - The `.vsix` file as a downloadable asset
     - Package information (name, version, publisher)

### Prerequisites

- The workflow requires the `GITHUB_TOKEN` secret (automatically provided by GitHub)
- Proper permissions are configured for creating releases and writing to the repository

### Version Management

The workflow uses semantic versioning based on the `version` field in `package.json`. To create a new release:

1. Update the version in `package.json`
2. Commit and push to the main branch
3. The workflow will automatically create a release if the version tag doesn't exist

### Error Handling

- Skips release creation if a tag for the current version already exists
- Verifies the `.vsix` file was created successfully before proceeding
- Provides clear error messages and logging throughout the process

### Security

- Uses official GitHub actions with pinned versions
- Minimal permissions granted (only what's needed for releases)
- No sensitive data exposure in logs

## File Structure

```
.github/
└── workflows/
    ├── release.yml     # Main release workflow
    └── README.md       # This documentation
```

## Customization

To modify the workflow:

1. Edit `.github/workflows/release.yml`
2. Common customizations:
   - Change Node.js version in the setup step
   - Modify the release notes template
   - Add additional build steps or tests
   - Change the trigger conditions

## Troubleshooting

### Release not created
- Check if the version in `package.json` already has a corresponding git tag
- Ensure the workflow has proper permissions
- Check the workflow logs in the GitHub Actions tab

### Build failures
- Verify all dependencies are properly listed in `package.json`
- Check that the TypeScript compilation succeeds locally
- Ensure linting passes with `npm run lint`

### VSIX packaging issues
- Verify the `package.json` has all required fields for VS Code extensions
- Check that the `.vscodeignore` file properly excludes development files
- Ensure the compiled JavaScript files are in the expected location (`out/`)