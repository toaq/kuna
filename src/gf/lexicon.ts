export type G_PN = `${string}_PN`;
export type G_N = `${string}_N`;
export type G_A = `${string}_A`;
export type G_V = `${string}_V`;
export type G_V2 = `${string}_V2`;
export type G_V3 = `${string}_V3`;

export default {
	N: new Map<string, G_N>([
		['raı', 'fish_N'], // hack: no "thing_N" in gf-rgl? ;_;
		['shamu', 'apple_N'],
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
	V: new Map<string, G_V>([
		['nuo', 'sleep_V'],
		['koı', 'walk_V'],
	]),
	V2: new Map<string, G_V2>([
		['chuq', 'eat_V2'],
		['noaq', 'read_V2'],
		['kaqgaı', 'see_V2'],
	]),
	V3: new Map<string, G_V3>([
		['do', 'give_V3'],
		['dıeq', 'send_V3'],
	]),
	PN: new Map<string, G_PN>([
		['parı', 'paris_PN'],
		['joq', 'john_PN'],
	]),
};
