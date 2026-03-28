"use client";

/**
 * 무료(간단) / 유료(심층) 전환용 상단 탭 — 앱 글래스 톤에 맞춤
 */
export default function AnalysisTabs({ value, onChange, simpleRemaining }) {
  const tabs = [
    { id: "simple", label: "무료 · 간단 추측", hint: "캡처 3장까지" },
    { id: "deep", label: "유료 · 심층 분석", hint: "최대 10장 + 텍스트" },
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
      {value === "simple" && simpleRemaining != null && (
        <p className="text-[11px] text-center text-amber-800 mt-2 font-medium">
          {simpleRemaining > 0
            ? `무료 간단 분석 ${simpleRemaining}회 남음 (디바이스 기준)`
            : "무료 간단 분석 횟수를 모두 사용했어요. 간단 분석도 결제 후 이용하거나 유료 심층 탭을 이용해주세요"}
        </p>
      )}
      {value === "deep" && (
        <p className="text-[11px] text-center text-gray-500 mt-2">
          말투·행동·특징을 자세히 적을수록 정확도가 올라가요 · 회당 결제
        </p>
      )}
    </div>
  );
}
