"use client";

import { useEffect, useRef } from "react";

/** Prevent a completed request from updating an example that was reset/unmounted. */
export function useMountedRef() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}
