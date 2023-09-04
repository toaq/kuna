export enum VerbForm {
	First,
	Third,
	Plural,
	Infinitive,
	PresentParticiple,
	PastParticiple,
}

const irregularVerbs: Record<string, string> = {
	go: 'go goes went going gone',
	do: 'do does did doing done',
	be: 'are is were being been',
	eat: 'eat eats ate eating eaten',
	have: 'have has had having had',
};

export function conjugate(verb: string, person: VerbForm, past: boolean) {
	if (person === VerbForm.Infinitive) {
		return verb;
	}
	if (verb === 'be' && person == VerbForm.First) {
		return 'am';
	}
	if (verb === 'be' && person == VerbForm.Third && past) {
		return 'was';
	}
	const irr = irregularVerbs[verb];
	if (irr) {
		const [go, goes, went, going, gone] = irr.split(' ');
		if (person === VerbForm.PresentParticiple) {
			return going;
		} else if (person === VerbForm.PastParticiple) {
			return gone;
		} else if (past) {
			return went;
		} else if (person === VerbForm.Third) {
			return goes;
		} else {
			return go;
		}
	}
	if (person === VerbForm.PastParticiple || past) {
		return verb.replace(/e$/, '') + 'ed';
	} else if (person === VerbForm.PresentParticiple) {
		return verb.replace(/e$/, '') + 'ing';
	} else if (past) {
		return verb.replace(/e$/, '') + 'ed';
	} else if (person === VerbForm.Third) {
		if (/(s|sh|ch)$/.test(verb)) {
			return verb + 'es';
		} else if (/y$/.test(verb)) {
			return verb.replace(/y$/, 'ies');
		} else {
			return verb + 's';
		}
	} else {
		return verb;
	}
}
