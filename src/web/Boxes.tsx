import { ReactElement, useState, useEffect, ReactNode } from 'react';
import { BoxClause, BoxSentence, PostField } from '../boxes';
import './Boxes.css';

interface BoxProps {
	color: string;
	label: string;
	children: ReactNode;
}

function Box(props: BoxProps) {
	const { color, label, children } = props;
	return (
		<div
			className="boxes-box"
			style={{
				// border: `2px solid ${color}`,
				background: `color-mix(in srgb, ${color}, white 80%)`,
			}}
		>
			<div className="boxes-label">{label}</div>
			<div className="boxes-children">{children}</div>
		</div>
	);
}

function PostFieldBox(props: { postField: PostField }) {
	const { earlyAdjuncts, arguments: args, lateAdjuncts } = props.postField;
	return (
		<Box color="#ffcc00" label="Post-field">
			{earlyAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<div className="boxes-toaq">{a}</div>
				</Box>
			))}
			{args.map((a, i) => (
				<Box key={i} color="teal" label="Argument">
					<div className="boxes-toaq">{a}</div>
				</Box>
			))}
			{lateAdjuncts.map((a, i) => (
				<Box key={i} color="purple" label="Adjunct">
					<div className="boxes-toaq">{a}</div>
				</Box>
			))}
		</Box>
	);
}

function ClauseBox(props: { clause: BoxClause }) {
	const { complementizer, topic, verbalComplex, postField } = props.clause;
	return (
		<Box color="red" label="Clause">
			<Box color="orange" label="Comp.">
				<div className="boxes-toaq">{complementizer}</div>
			</Box>
			{topic && (
				<Box color="aqua" label="Topic">
					<div className="boxes-toaq">{topic}</div>
				</Box>
			)}
			<Box color="green" label="Verbal complex">
				<div className="boxes-toaq">{verbalComplex}</div>
			</Box>
			{postField.earlyAdjuncts.length +
			postField.arguments.length +
			postField.lateAdjuncts.length ? (
				<PostFieldBox postField={postField} />
			) : undefined}
		</Box>
	);
}

export function Boxes(props: { sentence: BoxSentence }) {
	const { clause, speechAct } = props.sentence;
	return (
		<Box color="blue" label="Sentence">
			<ClauseBox clause={clause} />
			<Box color="gray" label="Speech act">
				<div className="boxes-toaq">{speechAct}</div>
			</Box>
		</Box>
	);
}
