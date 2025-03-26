export type ThemeName = 'dark' | 'light';

export interface Theme {
	backgroundColor: string;
	textColor: string;
	denotationColor: string;
	wordColor: string;
	movedWordColor: string;
	traceColor: string;
	tipBackgroundColor: string;
	tipTextColor: string;
}

export const themes: Record<ThemeName, Theme> = {
	dark: {
		backgroundColor: '#36393E',
		tipBackgroundColor: '#000020',
		tipTextColor: '#DCDDDE',
		textColor: '#DCDDDE',
		denotationColor: '#FF4466',
		wordColor: '#99EEFF',
		movedWordColor: '#FF99EE',
		traceColor: '#DCDDDE',
	},
	light: {
		backgroundColor: '#FFFFFF',
		tipBackgroundColor: '#333333',
		tipTextColor: '#EEEEEE',
		textColor: '#000000',
		denotationColor: '#FF0000',
		wordColor: '#3399FF',
		movedWordColor: '#FF3399',
		traceColor: '#000000',
	},
};
