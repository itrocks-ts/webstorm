#!/usr/bin/env node
import appDir from '@itrocks/app-dir'
import { accessSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const itrocksPath = appDir + '/node_modules/@itrocks'
const modules     = readdirSync(itrocksPath).filter(dir => !['.', '..', 'webstorm'].includes(dir))

const vcsFile  = appDir + '/.idea/vcs.xml'
let vcsContent = readFileSync(vcsFile, 'utf8')
	.replaceAll(/\n\s*<mapping directory="\$PROJECT_DIR\$\/node_modules\/@itrocks\/.*" vcs="Git" \/>/g, '')

modules.forEach(module => {
	const path = join(itrocksPath, module)
	try {
		accessSync(path + '/.git')
	}
	catch {
		rmSync(path, { force: true, recursive: true })
		execSync(`git clone git@github.com:itrocks-ts/${module}`, { cwd: itrocksPath, stdio: 'inherit' })
		execSync(`npm run build`, { cwd: path, stdio: 'inherit' })
	}
	if (!vcsContent.includes(`/@itrocks/${module}"`)) {
		vcsContent = vcsContent.replace(
			'</component>',
			`  <mapping directory="$PROJECT_DIR$/node_modules/@itrocks/${module}" vcs="Git" />\n  </component>`
		)
	}
})

writeFileSync(vcsFile, vcsContent, 'utf8')

console.log('Done.')
