// JSX types for <checking-orb> (packages/checking-orb).
import type { HTMLAttributes } from "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "checking-orb": HTMLAttributes<HTMLElement> & { delay?: number };
    }
  }
}
