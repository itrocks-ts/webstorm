import { appDir }   from '@itrocks/app-dir'
import { access }   from 'node:fs/promises'
import { readdir }  from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { join }     from 'node:path'
import { relative } from 'node:path'
import { run }      from 'npm-check-updates'
import { diff }     from 'semver'
import { valid }    from 'semver'

const baseDir = appDir + '/node_modules/@itrocks'

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

	const upgraded = await run({
		jsonUpgraded: true,
		packageFile,
		silent:       true,
		upgrade:      false
	})
	if (!upgraded) return {}

	const majors: Record<string, { current: string, latest: string }> = {}

	for (const [name, latestRange] of Object.entries(upgraded)) {
		const currentRange = allDeps[name]
		if (!currentRange) continue

		const current = cleanVersion(currentRange)
		const latest  = cleanVersion(latestRange)

		if ((current === 'latest') || (current === latest)) continue

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

async function main()
{
	const packageDirs = await getPackageDirs(baseDir)
	let   total       = 0

	packageDirs.push(appDir)

	for (const dir of packageDirs) {
		const packageFile = join(dir, 'package.json')
		const majors      = await findMajorsForPackageJson(packageFile)
		if (!Object.keys(majors).length) continue

		console.log(`\n${dir.substring(dir.indexOf('@itrocks'))}`)
		for (const [name, { current, latest }] of Object.entries(majors)) {
			console.log(`  ${name}  ${current}  →  ${latest}`)
			total ++
		}
	}

	if (!total) {
		console.log('Aucun bump majeur dispo dans @itrocks, tu peux dormir tranquille 😎')
	}
	else {
		console.log(`\n${total} dépendance(s) avec une major dispo dans @itrocks`)
	}
}

async function readJson(file: string)
{
	return JSON.parse(await readFile(file, 'utf8'))
}

main().catch(error => {
	console.error(error)
	process.exit(1)
})
