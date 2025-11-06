[![npm version](https://img.shields.io/npm/v/@itrocks/webstorm?logo=npm)](https://www.npmjs.org/package/@itrocks/webstorm)
[![npm downloads](https://img.shields.io/npm/dm/@itrocks/webstorm)](https://www.npmjs.org/package/@itrocks/webstorm)
[![GitHub](https://img.shields.io/github/last-commit/itrocks-ts/webstorm?color=2dba4e&label=commit&logo=github)](https://github.com/itrocks-ts/webstorm)
[![issues](https://img.shields.io/github/issues/itrocks-ts/webstorm)](https://github.com/itrocks-ts/webstorm/issues)
[![discord](https://img.shields.io/discord/1314141024020467782?color=7289da&label=discord&logo=discord&logoColor=white)](https://25.re/ditr)

# webstorm

Facilitates development on the it.rocks framework within a single WebStorm project.

These CLI tools allow you to work on @itrocks/* modules from sources inside a single app,
with Git checkout + local builds and a watcher that rebuilds dependencies as you edit.

## Requirements

- Node.js ≥ 18
- An application that depends on one or more `@itrocks/*` packages (installed under `node_modules/@itrocks`).

## Installation

```bash
npm i --save-dev @itrocks/webstorm
```

You can then run the commands with `npx`, or wire them into your project scripts.

## Commands

### `npx vcs-modules`

Replaces any `@itrocks/*` package installed from npm with its **Git repository** checkout,
**builds** it locally, and updates WebStorm configuration so the IDE recognises each module as a proper project.

**What it does:**

- Scans `node_modules/@itrocks/*` in your app.
- Updates WebStorm configuration file `.idea/vcs.xml` that each `@itrocks/*` module appears
  as a distinct Git root and project module inside WebStorm.
- For each module that’s not already a Git checkout,
  removes the package folder and replaces it with the repository sources, so you can edit them.
- Runs the module’s build if a build script exists in its package.json.
- Builds modules in dependency order so shared libraries are ready before dependent ones.

**Notes:**

- Requires each `@itrocks/*` module to have a build script.
- Safe to run multiple times: it will only rebuild or update modules as needed.
- Intended for **local development**, not **CI**.

### `npx wsbuild`

Watches all `@itrocks/*` modules for file changes and rebuild them automatically.

**What it does:**

- Watches all `.ts`  and `.scss` source files under `node_modules/@itrocks/**`.
- On change: detects the modified module, runs its `npm run build` script.

**Notes:**

- Perfect for editing multiple @itrocks/* modules at once in a single environment.
- Your app rebuilds itself using the freshly compiled outputs.
- The build status is displayed in the console.
- Debounces rapid edits to avoid overlapping builds.

## Recommended setup

Add both commands to your `package.json` scripts for convenience:

```json
{
	"scripts": {
		"itrocks:setup": "vcs-modules",
		"itrocks:watch": "wsbuild"
	}
}
```

Then you can simply run:

```bash
npm run itrocks:setup
npm run itrocks:watch
```

## Troubleshooting

| Symptom                                               | Cause / Fix                                                                     |
|-------------------------------------------------------|---------------------------------------------------------------------------------|
| No build script for a module                          | Add a `"build": "tsc"` (or similar) to its package.json.                        |
| Changes don’t reflect in the app                      | Ensure `wsbuild` is running and outputs go to the same folder your app imports. |
| Watcher does nothing                                  | Verify you edit files inside `node_modules/@itrocks/<module>/src`.              |
| `npx wsbuild` or `npx vcs-modules` command not found  | Run `npm rebuild @itrocks/webstorm` to restore the missing executable links.    |
