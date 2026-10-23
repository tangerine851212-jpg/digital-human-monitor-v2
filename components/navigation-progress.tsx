"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

const SHOW_DELAY_MS = 120;
const MIN_VISIBLE_MS = 180;
const FAILSAFE_MS = 12000;

type NavigationProgressContextValue = {
  beginNavigationProgress: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(
  null,
);

function clearTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function NavigationProgressComplete({ onComplete }: { onComplete: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onComplete();
  }, [pathname, searchParams, onComplete]);

  return null;
}

export function NavigationProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const shownAtRef = useRef(0);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const failsafeTimerRef = useRef<number | null>(null);

  const setProgressVisible = useCallback((nextVisible: boolean) => {
    visibleRef.current = nextVisible;
    setVisible(nextVisible);

    if (nextVisible) {
      shownAtRef.current = Date.now();
    }
  }, []);

  const beginNavigationProgress = useCallback(() => {
    clearTimer(hideTimerRef);
    clearTimer(failsafeTimerRef);

    if (visibleRef.current) {
      failsafeTimerRef.current = window.setTimeout(() => {
        setProgressVisible(false);
      }, FAILSAFE_MS);
      return;
    }

    clearTimer(showTimerRef);
    showTimerRef.current = window.setTimeout(() => {
      setProgressVisible(true);
      failsafeTimerRef.current = window.setTimeout(() => {
        setProgressVisible(false);
      }, FAILSAFE_MS);
    }, SHOW_DELAY_MS);
  }, [setProgressVisible]);

  const endNavigationProgress = useCallback(() => {
    clearTimer(showTimerRef);
    clearTimer(failsafeTimerRef);

    if (!visibleRef.current) {
      return;
    }

    const remainingVisibleMs = Math.max(
      0,
      MIN_VISIBLE_MS - (Date.now() - shownAtRef.current),
    );

    clearTimer(hideTimerRef);
    hideTimerRef.current = window.setTimeout(() => {
      setProgressVisible(false);
    }, remainingVisibleMs);
  }, [setProgressVisible]);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.hasAttribute("download")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (
        nextUrl.pathname === currentUrl.pathname &&
        nextUrl.search === currentUrl.search
      ) {
        return;
      }

      beginNavigationProgress();
    }

    window.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("click", handleDocumentClick, true);
    };
  }, [beginNavigationProgress]);

  useEffect(() => {
    function handlePopState() {
      beginNavigationProgress();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [beginNavigationProgress]);

  useEffect(() => {
    return () => {
      clearTimer(showTimerRef);
      clearTimer(hideTimerRef);
      clearTimer(failsafeTimerRef);
    };
  }, []);

  const contextValue = useMemo(
    () => ({ beginNavigationProgress }),
    [beginNavigationProgress],
  );

  return (
    <NavigationProgressContext.Provider value={contextValue}>
      {children}
      <Suspense fallback={null}>
        <NavigationProgressComplete onComplete={endNavigationProgress} />
      </Suspense>
      <div
        aria-live="polite"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[100] transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div aria-hidden="true" className="h-1 w-full bg-[rgba(36,31,26,0.08)]">
          <div className="route-progress-bar h-full w-2/5 rounded-full bg-[linear-gradient(90deg,rgba(185,84,46,0.15),rgba(185,84,46,0.95),rgba(98,116,86,0.75))]" />
        </div>
        {visible ? <span className="sr-only">页面正在加载</span> : null}
      </div>
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    throw new Error("useNavigationProgress 必须在 NavigationProgressProvider 内使用。");
  }

  return context;
}
