#!/usr/bin/env node
import { appDir }    from '@itrocks/app-dir'
import { access }    from 'node:fs/promises'
import { readdir }   from 'node:fs/promises'
import { readFile }  from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join }      from 'node:path'
import { run }       from 'npm-check-updates'
import { coerce }    from 'semver'
import { diff }      from 'semver'
import { inc }       from 'semver'
import { valid }     from 'semver'

const baseDir = appDir + '/node_modules/@itrocks'
const upgrade = process.argv.slice(2).includes('upgrade')

type Majors = Record<string, { current: string, latest: string }>

function cleanVersion(version: string)
{
	return version.replace(/^[~^><=\s]+/, '')
}

async function findMajorsForPackageJson(packageFile: string)
{
	const pkg     = await readJson(packageFile)
	const allDeps = {
		...(pkg.dependencies ?? {}),
		...(pkg.devDependencies ?? {}),
		...(pkg.peerDependencies ?? {}),
		...(pkg.optionalDependencies ?? {})
	}
	if (!Object.keys(allDeps).length) return {}

	process.setMaxListeners(0)
	const upgraded = await run({
		jsonUpgraded: true,
		packageFile,
		silent:       true,
		upgrade:      false
	})
	process.removeAllListeners('exit')
	if (!upgraded) return {}

	const majors: Majors = {}

	for (const [name, latestRange] of Object.entries(upgraded)) {
		const currentRange = allDeps[name]
		if (!currentRange) continue

		const current = coerce(cleanVersion(currentRange))
		const latest  = coerce(cleanVersion(latestRange))

		if (!current || !latest || !valid(current) || !valid(latest)) continue

		const changeType = diff(current, latest)
		if (!changeType) continue

		majors[name] = {
			current: currentRange,
			latest:  latestRange
		}
	}

	return majors
}

async function getPackageDirs(dir: string)
{
	const dirs    = []
	const entries = await readdir(dir, { withFileTypes: true })
	for (const entry of entries) {
		if (!entry.isDirectory()) continue
		const pkg = join(dir, entry.name, 'package.json')
		try {
			await access(pkg)
			dirs.push(join(dir, entry.name))
		}
		catch {
		}
	}
	return dirs
}

async function upgradePackageJson(packageFile: string, majors: Majors)
{
	let   fromVersion: string | undefined
	const names      = Object.keys(majors)
	const pkg        = await readJson(packageFile) as Record<string, Record<string, string> | string>
	const sections   = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']

	for (const name of names) {
		for (const section of sections) {
			const deps = pkg[section]
			if ((typeof deps === 'object') && deps[name]) {
				deps[name] = majors[name].latest
			}
		}
	}

	if (typeof pkg.version === 'string') {
		fromVersion = coerce(pkg.version)?.toString() ?? undefined
		if (fromVersion) {
			pkg.version = inc(pkg.version, 'patch') ?? pkg.version
		}
	}

	await writeJson(packageFile, pkg)

	if (fromVersion && (pkg.version !== fromVersion)) {
		console.log(`  package version  ${fromVersion}  →  ${pkg.version}`)
	}
}

async function main()
{
	if (upgrade) {
		console.log('Upgrade mode: package.json files will be updated and the minor version will be incremented\n')
	}

	const packageDirs = await getPackageDirs(baseDir)
	let   total       = 0

	packageDirs.push(appDir)

	for (const dir of packageDirs) {
		let   changes     = 0
		const packageFile = join(dir, 'package.json')
		const majors      = await findMajorsForPackageJson(packageFile)
		if (!Object.keys(majors).length) continue

		console.log(`\n${dir.substring(dir.indexOf('@itrocks'))}`)
		for (const [name, { current, latest }] of Object.entries(majors)) {
			console.log(`  ${name}  ${current}  →  ${latest}`)
			changes ++
			total   ++
		}

		if (changes && upgrade) {
			await upgradePackageJson(packageFile, majors)
		}
	}

	if (!total) {
		console.log('No major bump available in @itrocks, you can sleep soundly 😎')
	}
	else {
		console.log(`\n${total} dependency(ies) with a major available in @itrocks`)
	}
}

async function readJson(file: string)
{
	return JSON.parse(await readFile(file, 'utf8'))
}

async function writeJson(file: string, value: unknown)
{
	await writeFile(file, JSON.stringify(value, null, '\t') + '\n')
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})
