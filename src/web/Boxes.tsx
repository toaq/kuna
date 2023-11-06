import { ReactElement, useState, useEffect, ReactNode } from 'react';
import { BoxClause, BoxSentence, PostField } from '../boxes';
import './Boxes.css';
import { useDarkMode } from 'usehooks-ts';
import { Glosser } from '../gloss';

interface BoxProps {
	color: string;
	label: string;
	children: ReactNode;
}

function Box(props: BoxProps) {
	const darkMode = useDarkMode();
	const { color, label, children } = props;
	const other = darkMode.isDarkMode ? '#444 80%' : 'white 80%';
	return (
		<div
			className="boxes-box"
			style={{
				background: `color-mix(in srgb, ${color}, ${other})`,
			}}
		>
			<div className="boxes-label">{label}</div>
			<div className="boxes-children">{children}</div>
		</div>
	);
}

function Toaq(props: { children: string }) {
	const { children } = props;
	return (
		<div className="boxes-text">
			<div className="boxes-toaq">{children}</div>
			<div className="boxes-english">
				{new Glosser(true)
					.glossSentence(children)
					.map(x => x.english)
					.join(' ')}
			</div>
		</div>
	);
}

function PostFieldBox(props: { postField: PostField }) {
	const { earlyAdjuncts, arguments: args, lateAdjuncts } = props.postField;
	return (
		<Box color="#ffcc00" label="Post-field">
			{earlyAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<Toaq>{a}</Toaq>
				</Box>
			))}
			{args.map((a, i) => (
				<Box key={i} color="teal" label="Argument">
					<Toaq>{a}</Toaq>
				</Box>
			))}
			{lateAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<Toaq>{a}</Toaq>
				</Box>
			))}
		</Box>
	);
}

function ClauseInner(props: { clause: BoxClause }) {
	const { verbalComplex, postField, conjunction } = props.clause;
	return (
		<>
			<Box color="green" label="Verbal complex">
				<Toaq>{verbalComplex}</Toaq>
			</Box>
			{postField.earlyAdjuncts.length +
			postField.arguments.length +
			postField.lateAdjuncts.length ? (
				<PostFieldBox postField={postField} />
			) : undefined}
			{conjunction && (
				<>
					<Box color="gray" label="Conjunction">
						<Toaq>{conjunction.word}</Toaq>
					</Box>
					<ClauseInner clause={conjunction.clause} />
				</>
			)}
		</>
	);
}

function ClauseBox(props: { clause: BoxClause }) {
	const { complementizer, topic, subject } = props.clause;
	return (
		<Box color="red" label="Clause">
			<Box color="orange" label="Comp.">
				<Toaq>{complementizer}</Toaq>
			</Box>
			{topic && (
				<Box color="aqua" label="Topic">
					<Toaq>{topic}</Toaq>
				</Box>
			)}
			{subject && (
				<Box color="aqua" label="Subject">
					<Toaq>{subject}</Toaq>
				</Box>
			)}
			<ClauseInner clause={props.clause} />
		</Box>
	);
}

export function Boxes(props: { sentence: BoxSentence }) {
	const { clause, speechAct } = props.sentence;
	return (
		<Box color="blue" label="Sentence">
			<ClauseBox clause={clause} />
			<Box color="gray" label="Speech act">
				<Toaq>{speechAct}</Toaq>
			</Box>
		</Box>
	);
}
