import fs from 'fs'
import gulp from 'gulp'
import rename from 'gulp-rename'
import replace from 'gulp-replace'
import htmlmin from 'gulp-htmlmin'
import gulpsass from 'gulp-sass'
import esbuild from 'esbuild'
import * as sasscompiler from 'sass'

const { series, parallel, src, dest, watch } = gulp
const sass = gulpsass(sasscompiler)

function html(platform) {
	//
	// Index & settings minified
	// Multiple scripts tags => only main.js
	//

	return () => {
		const assets = ['src/*.html']

		// no background.html on chrome because manifest v3
		if (/edge|chrome|online/.test(platform)) assets.push('!src/background.html')

		const stream = src(assets)

		if (platform === 'edge') {
			stream.pipe(replace(`favicon.ico`, `monochrome.png`))
		}

		if (platform === 'online') {
			stream.pipe(replace(`<!-- icon -->`, `<link rel="apple-touch-icon" href="src/assets/apple-touch-icon.png" />`))
			stream.pipe(replace(`<!-- manifest -->`, `<link rel="manifest" href="manifest.webmanifest">`))
		} else {
			stream.pipe(replace(`<!-- webext-storage -->`, `<script src="src/scripts/webext-storage.js"></script>`))
		}

		return stream.pipe(htmlmin({ collapseWhitespace: true })).pipe(dest(`release/${platform}`))
	}
}

function scripts(platform) {
	let envs = {}

	try {
		const envFile = fs.readFileSync('.env.json', 'utf-8')
		envs = JSON.parse(envFile)
	} catch (e) {}

	return () => {
		esbuild.buildSync({
			entryPoints: ['src/scripts/index.ts'],
			outfile: 'release/online/src/scripts/main.js',
			format: 'iife',
			bundle: true,
			minifySyntax: true,
			minifyWhitespace: true,
		})

		return src('release/online/src/scripts/main.js')
			.pipe(replace('@@SUGGESTIONS', envs?.SUGGESTIONS || '/'))
			.pipe(replace('@@UNSPLASH', envs?.UNSPLASH || '/'))
			.pipe(replace('@@FAVICON', envs?.FAVICON || '/'))
			.pipe(replace('@@QUOTES', envs?.QUOTES || '/'))
			.pipe(replace('@@WEATHER', envs?.WEATHER || '/'))
			.pipe(dest(`release/${platform}/src/scripts`))
	}
}

function ressources(platform) {
	return () => {
		const assetPath = ['src/assets/**', '!src/assets/bonjourr.png']

		if (platform !== 'online') {
			assetPath.push('!src/assets/screenshots/**')
		}

		return src(assetPath).pipe(dest(`release/${platform}/src/assets`))
	}
}

function worker(platform) {
	return () => {
		if (platform === 'online') {
			return src('src/scripts/services/service-worker.js').pipe(dest('release/online'))
		} else {
			const services = ['src/scripts/services/background.js', 'src/scripts/services/webext-storage.js']
			return src(services).pipe(dest('release/' + platform + '/src/scripts'))
		}
	}
}

function manifest(platform) {
	return () => {
		return platform === 'online'
			? src(`src/manifests/manifest.webmanifest`).pipe(dest(`release/${platform}`))
			: src(`src/manifests/${platform}.json`)
					.pipe(rename('manifest.json'))
					.pipe(dest(`release/${platform}`))
	}
}

function styles(platform) {
	return () =>
		src('src/styles/style.scss')
			.pipe(sass.sync({ outputStyle: 'compressed' }).on('error', sass.logError))
			.pipe(dest(`release/${platform}/src/styles/`))
}

function locales(platform) {
	const filenames = platform === 'online' ? 'translations' : '*'
	return () => src(`_locales/**/${filenames}.json`).pipe(dest(`release/${platform}/_locales/`))
}

//
// Tasks
//

// Watches style map to make sure everything is compiled
const filesToWatch = ['./_locales/**', './src/*.html', './src/scripts/**', './src/styles/**', './src/manifests/*.json']

// prettier-ignore
const taskOnline = () => [
	html('online'),
	styles('online'),
	worker('online'),
	manifest('online'),
	scripts('online'),
	locales('online'),
	ressources('online', false),
]

const taskExtension = (from) => [
	html(from),
	worker(from),
	styles(from),
	locales(from),
	manifest(from),
	ressources(from),
	scripts(from),
]

//
// All Exports
//

export const online = async function () {
	watch(filesToWatch, series(parallel(...taskOnline())))
}

export const chrome = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('chrome'))))
}

export const edge = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('edge'))))
}

export const firefox = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('firefox'))))
}

export const safari = async function () {
	watch(filesToWatch, series(parallel(...taskExtension('safari'))))
}

export const build = parallel(
	...taskOnline(),
	...taskExtension('firefox'),
	...taskExtension('chrome'),
	...taskExtension('edge'),
	...taskExtension('safari')
)
