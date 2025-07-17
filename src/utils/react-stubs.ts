export const React = {
  useState: <T>(initial: T): [T, (value: T) => void] => [initial, () => {}],
  useEffect: (fn: () => void, deps?: any[]) => {},
  useRef: <T>(initial: T): { current: T } => ({ current: initial }),
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
