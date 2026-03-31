"use client";

/**
 * Free(빠른 추정) / Premium(프리미엄 리포트) 상단 탭
 */
export default function AnalysisTabs({ value, onChange, simpleRemaining }) {
  const tabs = [
    { id: "free", label: "Free · 빠른 추정", hint: "캡처 3장까지" },
    { id: "premium", label: "Premium · 리포트", hint: "최대 10장 · 메모 선택" },
  ];

  return (
    <div className="mb-4 anim-slide-up delay-1">
      <div className="flex rounded-2xl p-1 gap-1 bg-white/40 border border-white/50 shadow-inner">
        {tabs.map((t) => {
          const active = value === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              className={`flex-1 rounded-xl py-3 px-2 text-center transition-all duration-200 active:scale-[0.99] ${
                active
                  ? "font-extrabold text-gray-900 shadow-md"
                  : "font-semibold text-gray-500 hover:text-gray-700"
              }`}
              style={{
                background: active
                  ? "linear-gradient(135deg, #FEE500, #FFD000)"
                  : "transparent",
              }}
            >
              <span className="block text-sm leading-tight">{t.label}</span>
              <span
                className={`block text-[10px] mt-0.5 ${active ? "text-gray-700" : "text-gray-400"}`}
              >
                {t.hint}
              </span>
            </button>
          );
        })}
      </div>
      {value === "free" && simpleRemaining != null && (
        <p className="text-[11px] text-center text-amber-800 mt-2 font-medium">
          {simpleRemaining > 0
            ? `무료 빠른 추정 ${simpleRemaining}회 남음 (디바이스 기준)`
            : "무료 횟수를 모두 사용했어요. Premium 탭에서 결제 후 프리미엄 리포트를 받을 수 있어요"}
        </p>
      )}
      {value === "premium" && (
        <p className="text-[11px] text-center text-gray-500 mt-2">
          4축·관계·소통 등 풀 리포트 · 메모는 선택 · 회당 ₩1,900
        </p>
      )}
    </div>
  );
}
