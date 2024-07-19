import { type ReactNode, createContext, useContext } from 'react';
import type {
	BoxClause,
	BoxFragment,
	BoxSentence,
	PostField,
} from '../modes/boxes';
import { Glosser } from '../morphology/gloss';
import { type Tree, circled, effectiveLabel, findSubtree } from '../tree';
import './Boxes.css';
import { keyFor, splitNonEmpty } from '../core/misc';
import { repairTones } from '../morphology/tokenize';
import { describeSerial, getFrame } from '../syntax/serial';

interface BoxesContext {
	cpIndices: Map<Tree, number>;
	subclauses: BoxClause[];
	cpStrategy: 'flat' | 'nest' | 'split';
	isDarkMode: boolean;
	isColorful: boolean;
}

const boxesContext = createContext<BoxesContext>({
	cpIndices: new Map(),
	subclauses: [],
	cpStrategy: 'split',
	isDarkMode: true,
	isColorful: true,
});

interface BoxProps {
	color: string;
	label: string | JSX.Element;
	children: ReactNode;
}

function Box(props: BoxProps) {
	const context = useContext(boxesContext);
	const { color, label, children } = props;
	const other = context.isDarkMode ? '#444 70%' : 'white 70%';
	const gray = context.isDarkMode ? '#8882' : '#8882';
	const background = context.isColorful
		? `color-mix(in oklab, ${color}, ${other})`
		: gray;
	return (
		<div className="boxes-box" style={{ background }}>
			<div className="boxes-label">{label}</div>
			<div className="boxes-children">{children}</div>
		</div>
	);
}

function words(tree: Tree): (string | JSX.Element)[] {
	const context = useContext(boxesContext);
	if ('word' in tree) {
		if (tree.word.covert) {
			return [];
		}
		return [tree.word.text];
	}
	if ('left' in tree) {
		const cpIndex = context.cpIndices.get(tree);
		if (context.cpStrategy !== 'flat' && cpIndex !== undefined) {
			if (context.cpStrategy === 'nest') {
				const clause = context.subclauses[cpIndex];
				return [<ClauseBox key={0} clause={clause} />];
			}
			return [circled(cpIndex + 1)];
		}
		return [...words(tree.left), ...words(tree.right)];
	}
	return tree.children.flatMap(words);
}

function gluedWords(tree: Tree): (string | JSX.Element)[] {
	const glued: (string | JSX.Element)[] = [];
	for (const w of words(tree)) {
		if (
			typeof w === 'string' &&
			glued.length &&
			typeof glued[glued.length - 1] === 'string'
		) {
			glued[glued.length - 1] = repairTones(
				`${glued[glued.length - 1]} ${w}`,
			).trim();
		} else {
			glued.push(w);
		}
	}
	return glued;
}

function Segment(props: { segment: string | JSX.Element }) {
	if (typeof props.segment === 'string') {
		return (
			<div className="boxes-text">
				<div className="boxes-toaq">{props.segment}</div>
				<div className="boxes-english">
					{/\p{Letter}/iu.test(props.segment)
						? new Glosser(true)
								.glossSentence(props.segment)
								.map(x => x.english)
								.join(' ')
						: '\u00a0'}
				</div>
			</div>
		);
	}
	return props.segment;
}

function Subtree(props: { tree: Tree }) {
	// const { children } = props;
	// const ch = new Boxifier()
	const children = gluedWords(props.tree);
	return children.map(x => (
		<Segment key={typeof x === 'string' ? x : x.key} segment={x} />
	));
}

function PostFieldBox(props: {
	postField: PostField;
	argDescriptions: JSX.Element[];
}) {
	const { earlyAdjuncts, arguments: args, lateAdjuncts } = props.postField;
	return (
		<Box color="#ffcc00" label="Post-field">
			{earlyAdjuncts.map(a => (
				<Box key={keyFor(a)} color="purple" label="Adjunct">
					<Subtree tree={a} />
				</Box>
			))}
			{args.map((a, i) => (
				<Box
					key={keyFor(a)}
					color="teal"
					label={props.argDescriptions[i] ?? 'Argument'}
				>
					<Subtree tree={a} />
				</Box>
			))}
			{lateAdjuncts.map(a => (
				<Box key={keyFor(a)} color="purple" label="Adjunct">
					<Subtree tree={a} />
				</Box>
			))}
		</Box>
	);
}

/**
 * Turn a serial like "Dua cho" into a list of strings like
 *
 *     [
 *       "Subject of dua",
 *       "Subject of cho",
 *       "Object of cho",
 *     ]
 */
function argumentDescriptions(serial: Tree): JSX.Element[] {
	if (serial && 'children' in serial) {
		const children = serial.children;
		const description = describeSerial(children);
		return (description?.slots ?? []).map((group, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: order is stable
			<div className="boxes-col" key={i}>
				{group.map(({ verbIndex, slotIndex }, j) => {
					const verb = children[verbIndex];
					const frame = getFrame(verb);
					const arity = splitNonEmpty(frame, ' ').length;
					const roles =
						arity === 3
							? ['Subject', 'Indirect object', 'Direct object']
							: ['Subject', 'Object'];
					const key = 1000 * i + j;
					return description?.didSerialize ? (
						<span key={key}>
							{roles[slotIndex]} of <b>{verb.source.toLowerCase()}</b>
						</span>
					) : (
						<span key={key}>{roles[slotIndex]}</span>
					);
				})}
			</div>
		));
	}
	return [];
}

function ClauseInner(props: { clause: BoxClause }) {
	const { verbalComplex, postField, conjunction } = props.clause;
	const serial = findSubtree(verbalComplex, '*Serial');
	const argDescriptions = serial ? argumentDescriptions(serial) : [];

	return (
		<>
			<Box color="green" label="Verbal complex">
				<Subtree tree={verbalComplex} />
			</Box>
			{postField.earlyAdjuncts.length +
			postField.arguments.length +
			postField.lateAdjuncts.length ? (
				<PostFieldBox postField={postField} argDescriptions={argDescriptions} />
			) : undefined}
			{conjunction && (
				<>
					<Box color="gray" label="Conjunction">
						<Subtree tree={conjunction.word} />
					</Box>
					<ClauseInner clause={conjunction.clause} />
				</>
			)}
		</>
	);
}

function ClauseBox(props: { clause: BoxClause }) {
	const { complementizer, topic, fronted, frontedLabel } = props.clause;
	return (
		<Box color="red" label="Clause">
			<Box color="orange" label="Comp.">
				<Subtree tree={complementizer} />
			</Box>
			{topic && (
				<Box color="aqua" label="Topic">
					<Subtree tree={topic} />
				</Box>
			)}
			{fronted && (
				<Box color="aqua" label={frontedLabel}>
					<Subtree tree={fronted} />
				</Box>
			)}
			<ClauseInner clause={props.clause} />
		</Box>
	);
}

function FragmentBox(props: { tree: Tree }) {
	let color = 'gray';
	let label = 'Fragment';
	switch (effectiveLabel(props.tree)) {
		case 'DP':
			color = 'teal';
			label = 'Argument';
			break;
		case 'AdjunctP':
			color = 'purple';
			label = 'Adjunct';
			break;
	}
	return (
		<Box color={color} label={label}>
			<Subtree tree={props.tree} />
		</Box>
	);
}

export function Boxes(props: {
	main: BoxSentence | BoxFragment;
	subclauses: BoxClause[];
	cpIndices: Map<Tree, number>;
	cpStrategy: 'flat' | 'nest' | 'split';
	isDarkMode: boolean;
}) {
	const { main, subclauses, cpIndices, cpStrategy, isDarkMode } = props;
	const isColorful = true;
	const context: BoxesContext = {
		cpIndices,
		subclauses,
		cpStrategy,
		isDarkMode,
		isColorful,
	};
	return (
		<boxesContext.Provider value={context}>
			<ol className="boxes-clause-list" start={1}>
				{'clause' in main ? (
					<Box color="blue" label="Sentence">
						<ClauseBox clause={main.clause} />
						<Box color="gray" label="Speech act">
							<Subtree tree={main.speechAct} />
						</Box>
					</Box>
				) : (
					<FragmentBox tree={main.fragment} />
				)}
				{cpStrategy === 'split' &&
					props.subclauses.map((clause, i) => (
						<li key={keyFor(clause)}>
							<div className="boxes-clause-number">{circled(i + 1)}</div>
							<ClauseBox clause={clause} />
						</li>
					))}
			</ol>
		</boxesContext.Provider>
	);
}
