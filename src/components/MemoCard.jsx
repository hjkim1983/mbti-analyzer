"use client";

import GlassCard from "./GlassCard";

/**
 * 추가 메모 (선택) — 프리미엄 탭에서만 서버로 전송됩니다.
 */
export default function MemoCard({ memo, onMemoChange, isDeep = false }) {
  const hasMemoText = memo.trim().length > 0;

  return (
    <GlassCard animate delay={4} className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
            추가 메모 (선택)
            {isDeep && (
              <span className="text-xs font-normal text-gray-400 bg-white/50 px-2 py-0.5 rounded-full">
                프리미엄
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            이 사람에 대해 더 알려주고 싶은 게 있으면 적어주세요
          </p>
        </div>
        {hasMemoText && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-50">
            ✓ 입력됨
          </span>
        )}
      </div>

      {isDeep ? (
        <>
          <textarea
            value={memo}
            onChange={(e) => onMemoChange(e.target.value.slice(0, 300))}
            placeholder="이 사람에 대해 더 알려주고 싶은 게 있으면 적어주세요"
            rows={4}
            className="w-full text-sm text-gray-700 rounded-2xl p-3.5 resize-none bg-white/60"
            style={{
              border: hasMemoText
                ? "1.5px solid #FEE500"
                : "1.5px solid rgba(255,255,255,0.4)",
              lineHeight: "1.65",
            }}
          />
          <div className="flex justify-between mt-1.5">
            <p className="text-xs text-gray-300">선택 사항입니다</p>
            <p
              className="text-xs"
              style={{ color: memo.length > 260 ? "#EF4444" : "#9CA3AF" }}
            >
              {memo.length} / 300
            </p>
          </div>
        </>
      ) : (
        <p className="text-xs text-amber-700/90 bg-amber-50/80 rounded-xl px-3 py-2 border border-amber-100">
          무료 빠른 추정에는 <b>긴 메모</b>가 서버에 포함되지 않아요. 자세한 관찰 메모는{" "}
          <b>프리미엄</b> 탭에서 입력할 수 있어요.
        </p>
      )}
    </GlassCard>
  );
}
