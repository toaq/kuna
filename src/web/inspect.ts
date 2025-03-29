import type { ReactNode } from 'react';
import { createContext } from 'react';

export const InspectContext = createContext<{
	inspectee: ReactNode;
	setInspectee: (newInspectee: ReactNode) => void;
	inspecteePath: string | undefined;
	setInspecteePath: (newInspecteePath: string | undefined) => void;
}>({
	inspectee: undefined,
	setInspectee: () => {},
	inspecteePath: undefined,
	setInspecteePath: () => {},
});
