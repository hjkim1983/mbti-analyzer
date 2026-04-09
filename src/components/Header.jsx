"use client";

/**
 * @param {{ freeRemaining?: number | null, onGoHome?: () => void }} props
 */
export default function Header({ freeRemaining: _freeRemaining, onGoHome }) {
  return (
    <header className="glass-header sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
        {onGoHome ? (
          <button
            type="button"
            onClick={() => {
              onGoHome();
              window.scrollTo(0, 0);
            }}
            className="flex items-center gap-2 min-w-0 rounded-xl px-1 -mx-1 py-0.5 text-left transition-opacity hover:opacity-85 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2"
            aria-label="처음 화면으로 이동"
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#FEE500" }}
              aria-hidden
            >
              <span className="text-sm">💬</span>
            </span>
            <span className="font-bold text-gray-900 text-sm truncate">
              카톡 MBTI 스캐너
            </span>
          </button>
        ) : (
          <>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "#FEE500" }}
            >
              <span className="text-sm">💬</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">
              카톡 MBTI 스캐너
            </span>
          </>
        )}
      </div>
    </header>
  );
}
