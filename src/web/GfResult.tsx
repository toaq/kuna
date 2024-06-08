import { useEffect, useState } from 'react';

interface Linearization {
	to: string;
	text: string;
}

export function ShowLinearization({
	linearization: { to, text },
}: {
	linearization: Linearization;
}) {
	if (to === 'LibraryBrowserAPI') {
		return undefined;
	} else {
		const lang = to.replace(/^ResourceDemo/, '').toLowerCase();
		return (
			<div className="linearization">
				<dd>{lang}:&nbsp;</dd>
				<dt lang={lang}>{text}</dt>
			</div>
		);
	}
}

export interface GfResultProps {
	gf: string;
}

export default (props: GfResultProps) => {
	const [linearizations, setLinearizations] = useState<Linearization[]>([]);
	const { gf } = props;
	useEffect(() => {
		fetch(
			'https://cloud.grammaticalframework.org/grammars/ResourceDemo.pgf?command=linearize&tree=' +
				encodeURIComponent(gf),
		).then(response => response.json().then(json => setLinearizations(json)));
	}, [gf]);
	return (
		<div>
			<div style={{ maxWidth: '66ch' }}>
				<code>{gf}</code>
			</div>
			<ul>
				{linearizations.map((l, i) => (
					<ShowLinearization linearization={l} key={i} />
				))}
			</ul>
		</div>
	);
};
