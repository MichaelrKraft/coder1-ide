export const React = {
  useState: <T>(initial: T): [T, React.Dispatch<React.SetStateAction<T>>] => [initial, () => {}],
  useEffect: (fn: () => void, deps?: any[]) => {},
  useRef: <T>(initial: T | null): { current: T | null } => ({ current: initial }),
  FC: <P>(component: (props: P) => any) => component,
  KeyboardEvent: {} as any
};

export const useState = React.useState;
export const useEffect = React.useEffect;
export const useRef = React.useRef;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
