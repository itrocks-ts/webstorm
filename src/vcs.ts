#!/usr/bin/env node
import appDir from '@itrocks/app-dir'
import { accessSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { basename, join } from 'path'
import { execSync } from 'child_process'

const itrocksPath = appDir + '/node_modules/@itrocks'
const modules     = readdirSync(itrocksPath).filter(dir => !['.', '..'].includes(dir))

modules.forEach(module => {
	const path = join(itrocksPath, module)
	try {
		accessSync(path + '/.git')
	}
	catch {
		rmSync(path, { force: true, recursive: true })
		execSync(`git clone git@github.com:itrocks-ts/${module}`, { cwd: itrocksPath, stdio: 'inherit' })
	}
})

const vcsFile  = appDir + '/.idea/vcs.xml'
let vcsContent = readFileSync(vcsFile, 'utf8')
	.replaceAll(/\n\s*<mapping directory="\$PROJECT_DIR\$\/node_modules\/@itrocks\/.*" vcs="Git" \/>/g, '')
modules.forEach(module => {
	if (!vcsContent.includes(`/@itrocks/${module}"`)) {
		vcsContent = vcsContent.replace(
			'</component>',
			`  <mapping directory="$PROJECT_DIR$/node_modules/@itrocks/${module}" vcs="Git" />\n  </component>`
		)
	}
})
writeFileSync(vcsFile, vcsContent, 'utf8')

const build = new Set<string>(modules)
while (build.size) {
	build.forEach(module => {
		let   canBuild = true
		const path     = join(itrocksPath, module)
		Object.keys(JSON.parse(readFileSync(path + '/package.json', 'utf-8')).dependencies || {}).forEach(dependency => {
			if (dependency.startsWith('@itrocks/') && build.has(basename(dependency))) {
				canBuild = false
			}
		})
		if (canBuild) {
			execSync(`npm run build`, {cwd: path, stdio: 'inherit'})
			build.delete(module)
		}
	})
}

console.log('Done.')
