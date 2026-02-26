"use client";

export default function Header({ freeRemaining }) {
  return (
    <header className="glass-header sticky top-0 z-10">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: "#FEE500" }}
        >
          <span className="text-sm">💬</span>
        </div>
        <span className="font-bold text-gray-900 text-sm">
          카톡 MBTI 스캐너
        </span>

        {freeRemaining != null && freeRemaining > 0 && (
          <span className="ml-auto text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
            무료 {freeRemaining}회 남음
          </span>
        )}
        {freeRemaining != null && freeRemaining <= 0 && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            유료 모드
          </span>
        )}
        {freeRemaining == null && (
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            BETA
          </span>
        )}
      </div>
    </header>
  );
}
