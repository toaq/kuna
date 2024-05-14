export type ThemeName = 'dark' | 'light';

export interface Theme {
	backgroundColor: string;
	textColor: string;
	denotationColor: string;
	wordColor: string;
	movedWordColor: string;
	traceColor: string;
}

export const themes: Record<ThemeName, Theme> = {
	dark: {
		backgroundColor: '#36393E',
		textColor: '#DCDDDE',
		denotationColor: '#FF4466',
		wordColor: '#99EEFF',
		movedWordColor: '#FF99EE',
		traceColor: '#9999FF',
	},
	light: {
		backgroundColor: '#FFFFFF',
		textColor: '#000000',
		denotationColor: '#FF0000',
		wordColor: '#3399FF',
		movedWordColor: '#FF3399',
		traceColor: '#AAAAFF',
	},
};
