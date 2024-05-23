export type G_PN = `${string}_PN`;
export type G_N = `${string}_N`;
export type G_A = `${string}_A`;
export type G_V0 = `${string}_V0`;
export type G_V = `${string}_V` | G_V0;
export type G_V2 = `${string}_V2`;
export type G_V2S = `${string}_V2S`;
export type G_V2Q = `${string}_V2Q`;
export type G_V3 = `${string}_V3`;
export type G_Interj = `${string}_Interj`;

export default {
	N: new Map<string, G_N>([
		['raı', 'fish_N'], // hack: no "thing_N" in gf-rgl? ;_;
		['seoqmeaq', 'airplane_N'],
		['rıochao', 'airplane_N'],
		['kuabue', 'apartment_N'],
		['shamu', 'apple_N'],
		['lea', 'art_N'],
		['nam', 'bread_N'],
		['kato', 'cat_N'],
		['gochıq', 'cat_N'],
		['poq', 'person_N'],
		['rua', 'flower_N'],
	]),
	A: new Map<string, G_A>([
		['huı', 'bad_A'],
		['gı', 'good_A'],
	]),
	V0: new Map<string, G_V0>([['ruqshua', 'rain_V0']]),
	V: new Map<string, G_V>([
		['nuo', 'sleep_V'],
		['koı', 'walk_V'],
	]),
	V2: new Map<string, G_V2>([
		['chuq', 'eat_V2'],
		['noaq', 'read_V2'],
		['kaqgaı', 'see_V2'],
	]),
	V2S: new Map<string, G_V2S>([['cuadeoq', 'answer_V2S']]),
	V2Q: new Map<string, G_V2Q>([['duasue', 'ask_V2Q']]),
	V3: new Map<string, G_V3>([
		['do', 'give_V3'],
		['dıeq', 'send_V3'],
	]),
	PN: new Map<string, G_PN>([
		['parı', 'paris_PN'],
		['joq', 'john_PN'],
	]),
	Interj: new Map<string, G_Interj>([['ubaı', 'alas_Interj']]),
};
