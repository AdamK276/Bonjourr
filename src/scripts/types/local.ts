export type Quote = {
	author: string
	content: string
}

export type UnsplashCache = {
	noon: UnsplashImage[]
	day: UnsplashImage[]
	evening: UnsplashImage[]
	night: UnsplashImage[]
	user: UnsplashImage[]
}

export type UnsplashImage = {
	url: string
	link: string
	username: string
	name: string
	city: string
	country: string
	color: string
	exif?: {
		make: string
		model: string
		exposure_time: string
		aperture: string
		focal_length: string
		iso: number
	}
}

export type Local = {
	fonts?: { family: string; weights: string[]; variable: boolean }[]
	fontface?: string
	selectedId: string
	idsList: string[]
	userQuoteSelection: number
	quotesCache: Quote[]
	unsplashCache: UnsplashCache
	translations: { [key: string]: string }
}
