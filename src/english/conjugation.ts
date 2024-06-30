import { Unimplemented } from '../core/error';

export enum VerbForm {
	First = 0,
	Third = 1,
	Plural = 2,
	Infinitive = 3,
	PresentParticiple = 4,
	PastParticiple = 5,
}

const irregularVerbs: Record<string, string> = {
	go: 'go,goes,went,go,going,gone',
	do: 'do,does,did,do,doing,done',
	be: 'are,is,were,be,being,been',
	eat: 'eat,eats,ate,eat,eating,eaten',
	have: 'have,has,had,have,having,had',
	will: 'will,will,would,be about to,being about to,been about to',
	can: 'can,can,could,be able to,being able to,been able to',
	sleep: 'sleep,sleeps,slept,sleep,sleeping,slept',
};

export function conjugate(verb: string, person: VerbForm, past: boolean) {
	if (verb === 'be' && person === VerbForm.First && !past) {
		return 'am';
	}
	if (verb === 'be' && person <= VerbForm.Third && past) {
		return 'was';
	}
	const irr = irregularVerbs[verb];
	if (irr) {
		const [go, goes, went, go_inf, going, gone] = irr.split(',');
		if (person === VerbForm.PresentParticiple) {
			return going;
		}
		if (person === VerbForm.PastParticiple) {
			return gone;
		}
		if (past) {
			return went;
		}
		if (person === VerbForm.Infinitive) {
			return go_inf;
		}
		if (person === VerbForm.Third) {
			return goes;
		}
		return go;
	}
	if (person === VerbForm.PastParticiple || past) {
		return `${verb.replace(/e$/, '')}ed`;
	}
	if (person === VerbForm.PresentParticiple) {
		return `${verb.replace(/e$/, '')}ing`;
	}
	if (past) {
		return `${verb.replace(/e$/, '')}ed`;
	}
	if (person === VerbForm.Third) {
		if (/(s|sh|ch)$/.test(verb)) {
			return `${verb}es`;
		}
		if (/y$/.test(verb)) {
			return verb.replace(/y$/, 'ies');
		}
		return `${verb}s`;
	}
	return verb;
}

export function negateAuxiliary(auxiliary: string) {
	switch (auxiliary) {
		case 'am':
			return 'am not';
		case 'shall':
			return "shan't";
		case 'will':
			return "won't";
		default:
			return `${auxiliary.replace(/n$/, '')}n't`;
	}
}

export interface VerbConstruction {
	past?: boolean;
	auxiliary?: string;
	auxiliary2?: string;
	preVerb?: string;
	verbForm?: VerbForm;
}

export function realizeTense(toaqTense: string): VerbConstruction {
	switch (toaqTense) {
		case '':
		case 'naı':
		case 'tuom':
			return {};
		case 'pu':
			return { past: true };
		case 'mala':
			return {
				auxiliary: 'have',
				preVerb: 'ever',
				verbForm: VerbForm.PastParticiple,
			};
		case 'sula':
			return { preVerb: 'ever' };
		case 'jela':
			return {
				auxiliary: 'will',
				preVerb: 'ever',
				verbForm: VerbForm.Infinitive,
			};
		case 'jıa':
			return { auxiliary: 'will', verbForm: VerbForm.Infinitive };
		default:
			throw new Unimplemented(`realizeTense: ${toaqTense}`);
	}
}

export function realizeAspect(toaqAspect: string): VerbConstruction {
	switch (toaqAspect) {
		case '':
		case 'tam':
			return {};
		case 'luı':
			return { auxiliary: 'have', verbForm: VerbForm.PastParticiple };
		case 'chum':
			return { auxiliary: 'be', verbForm: VerbForm.PresentParticiple };
		case 'za':
			return {
				auxiliary: 'be',
				preVerb: 'yet to',
				verbForm: VerbForm.Infinitive,
			};
		case 'hoaı':
			return { preVerb: 'still' };
		case 'haı':
			return { preVerb: 'already' };
		case 'hıq':
			return {
				auxiliary: 'have',
				preVerb: 'just',
				verbForm: VerbForm.PastParticiple,
			};
		case 'fı':
			return {
				auxiliary: 'be',
				preVerb: 'about to',
				verbForm: VerbForm.Infinitive,
			};
		default:
			throw new Unimplemented(`realizeAspect: ${toaqAspect}`);
	}
}

export function mergeConstructions(
	tense: VerbConstruction,
	aspect: VerbConstruction,
): VerbConstruction {
	// TODO it's actually more complex
	const merged = { ...aspect, ...tense };
	if (aspect.auxiliary) {
		if (!tense.auxiliary || tense.auxiliary === 'do') {
			merged.auxiliary = aspect.auxiliary;
		} else {
			merged.auxiliary2 = aspect.auxiliary;
			merged.verbForm = aspect.verbForm;
		}
	}
	return merged;
}

export function verbFormFor(englishWord: string): VerbForm {
	switch (englishWord) {
		case 'I':
		case 'me':
			return VerbForm.First;
		case 'you':
		case 'we':
		case 'us':
		case 'they':
		case 'them':
			return VerbForm.Plural;
		default:
			return VerbForm.Third;
	}
}

export function nominative(pronoun: string): string {
	switch (pronoun) {
		case 'us':
			return 'we';
		case 'me':
			return 'I';
		case 'her':
			return 'she';
		case 'them':
			return 'they';
		default:
			return pronoun;
	}
}
