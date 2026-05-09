// Fix React 18.3+ type compatibility with Next.js
import "react";

declare module "react" {
  interface ReactNodeArray extends Array<ReactNode> {}
  type ReactNode =
    | React.ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactNodeArray
    | React.ReactPortal
    | bigint;
}
