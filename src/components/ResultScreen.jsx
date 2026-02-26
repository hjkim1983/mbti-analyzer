"use client";

import GlassCard from "./GlassCard";

export default function ResultScreen({
  result,
  targetName,
  memo,
  isMulti,
  hasMemo,
  onReset,
}) {
  if (!result) return null;

  const {
    mbtiType,
    emoji,
    title,
    color,
    confidence,
    confidenceLevel,
    indicators,
    highlights,
    traits,
    tags,
    conflicts,
    profile,
  } = result;

  return (
    <div className="pt-6">
      {/* 분석 모드 뱃지 */}
      {(isMulti || hasMemo) && (
        <div className="text-center mb-4 anim-slide-up">
          <span
            className="text-xs font-bold px-4 py-1.5 rounded-full shadow-sm"
            style={{
              background: "linear-gradient(90deg,rgba(254,229,0,0.8),rgba(162,155,254,0.3))",
              color: "#333",
            }}
          >
            {isMulti && hasMemo
              ? "✨ 대화 + 프로필 + 추가정보 종합 분석"
              : isMulti
                ? "✨ 대화 + 프로필 종합 분석 결과"
                : "✨ 추가 정보 반영 분석 결과"}
          </span>
        </div>
      )}

      {/* MBTI 메인 카드 */}
      <div
        className="rounded-3xl overflow-hidden shadow-xl mb-4 anim-slide-up delay-1"
        style={{
          background: `linear-gradient(135deg,${color}22,${color}44)`,
          border: `2px solid ${color}44`,
        }}
      >
        <div className="p-6 text-center">
          {targetName?.trim() && (
            <p className="text-xs font-bold text-gray-400 mb-2 tracking-wide uppercase">
              {targetName}의 MBTI
            </p>
          )}
          <div className="text-5xl mb-3 anim-float">{emoji}</div>
          <div
            className="text-5xl font-black tracking-widest mb-1"
            style={{ color }}
          >
            {mbtiType}
          </div>
          <p className="text-gray-600 font-semibold text-sm mb-1">{title}</p>
          <p className="text-xs text-gray-400 mb-3">
            확신도 {confidence}% ({confidenceLevel})
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs font-bold px-3 py-1 rounded-full text-white"
                style={{ background: color }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 지표별 분석 */}
      {indicators && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FEE500" }}
            >
              📊
            </span>
            지표별 분석
          </h3>
          <div className="space-y-4">
            {Object.entries(indicators).map(([key, ind]) => {
              const [leftLabel, rightLabel] = {
                EI: ["E 외향", "I 내향"],
                SN: ["S 감각", "N 직관"],
                TF: ["T 사고", "F 감정"],
                JP: ["J 판단", "P 인식"],
              }[key] || [key[0], key[1]];

              const isLeft = ind.result === key[0];
              const percentage = ind.score;

              return (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span
                      style={{
                        color: isLeft ? color : "#9CA3AF",
                      }}
                    >
                      {leftLabel} {isLeft ? `${percentage}%` : ""}
                    </span>
                    <span className="text-gray-400">{ind.confidence}% 확신</span>
                    <span
                      style={{
                        color: !isLeft ? color : "#9CA3AF",
                      }}
                    >
                      {!isLeft ? `${percentage}%` : ""} {rightLabel}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100/60 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${percentage}%`,
                        background: color,
                        marginLeft: isLeft ? 0 : "auto",
                        float: isLeft ? "left" : "right",
                      }}
                    />
                  </div>
                  {ind.evidence && ind.evidence.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {ind.evidence.slice(0, 2).map((e, i) => (
                        <p key={i} className="text-xs text-gray-400 pl-1">
                          • {typeof e === "object" ? JSON.stringify(e) : String(e)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 대화 + 프로필 요약 (종합 모드) */}
      {isMulti && highlights && (
        <div className="grid grid-cols-2 gap-3 mb-4 anim-slide-up delay-2">
          <GlassCard className="!p-4">
            <p className="text-xs font-extrabold text-gray-700 mb-2">
              💬 대화 분석
            </p>
            {highlights.chatPatterns?.slice(0, 2).map((t) => (
              <p key={t} className="text-xs text-gray-500 mb-1">
                • {t}
              </p>
            ))}
          </GlassCard>
          <GlassCard className="!p-4">
            <p className="text-xs font-extrabold text-gray-700 mb-2">
              👤 프로필 분석
            </p>
            {profile ? (
              <>
                <p className="text-xs text-gray-500 mb-1">• {profile.mood}</p>
                <p className="text-xs text-gray-500">• {profile.status}</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                {highlights.profileAnalysis || "프로필 분석 없음"}
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {/* 입력 메모 */}
      {hasMemo && memo && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FEE500" }}
            >
              ✏️
            </span>
            입력하신 정보
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed bg-white/40 rounded-2xl p-3 whitespace-pre-line">
            {memo}
          </p>
        </GlassCard>
      )}

      {/* 주요 말투 특징 */}
      {traits && traits.length > 0 && (
        <GlassCard animate delay={3} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FEE500" }}
            >
              💬
            </span>
            주요 말투 특징
          </h3>
          <div className="space-y-2.5">
            {traits.map((trait, i) => (
              <div
                key={trait}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white/30 anim-slide-up"
                style={{ animationDelay: `${0.3 + i * 0.08}s`, opacity: 0 }}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                  style={{ background: color }}
                >
                  {i + 1}
                </div>
                <span className="text-sm text-gray-700 font-medium">
                  {typeof trait === "object" ? JSON.stringify(trait) : String(trait)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 프로필 분석 상세 (종합 모드) */}
      {isMulti && profile && (
        <GlassCard animate delay={4} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#A29BFE" }}
            >
              👤
            </span>
            프로필 분위기 분석
          </h3>
          <div className="space-y-2.5 mb-4">
            {[
              { label: "전체 무드", value: profile.mood, icon: "🌈" },
              { label: "상태 메시지 스타일", value: profile.status, icon: "✍️" },
              { label: "배경 이미지 취향", value: profile.bg, icon: "🖼️" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start gap-3 p-3 rounded-2xl"
                style={{ background: "rgba(237,233,254,0.6)" }}
              >
                <span className="flex-shrink-0 mt-0.5 text-lg">
                  {item.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-purple-500 mb-0.5">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-700 font-medium">
                    {item.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/30 flex items-center gap-3">
            <span className="text-xs font-extrabold text-gray-700 whitespace-nowrap">
              ✨ 첫인상 점수
            </span>
            <div className="flex-1 h-2.5 bg-gray-100/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${profile.score}%`,
                  background: "linear-gradient(90deg,#A29BFE,#7C3AED)",
                }}
              />
            </div>
            <span className="text-xl font-black" style={{ color: "#7C3AED" }}>
              {profile.score}
            </span>
          </div>
        </GlassCard>
      )}

      {/* 충돌 표시 */}
      {conflicts && conflicts.length > 0 && (
        <GlassCard animate delay={4} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FDE68A" }}
            >
              ⚠️
            </span>
            지표 간 충돌 발견
          </h3>
          {conflicts.map((c, i) => (
            <p key={i} className="text-xs text-amber-700 mb-1">
              • {typeof c === "object" ? (c.description || c.indicator || JSON.stringify(c)) : String(c)}
            </p>
          ))}
        </GlassCard>
      )}

      {/* 주의사항 */}
      <div
        className="glass-highlight rounded-2xl p-4 mb-5 anim-slide-up delay-5"
      >
        <p className="text-xs font-bold text-yellow-700 mb-1">⚠️ 주의사항</p>
        <p className="text-xs text-yellow-600 leading-relaxed">
          이 분석은 재미를 위한 것으로, 실제 MBTI와 다를 수 있어요. 사람의
          성격은 하나의 도구로 단정지을 수 없답니다.
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-3 anim-slide-up delay-6">
        <button
          onClick={onReset}
          className="flex-1 py-4 rounded-2xl font-bold text-gray-700 glass border border-white/40 active:scale-95 transition-transform text-sm"
        >
          다시 분석하기
        </button>
        <button
          className="flex-1 py-4 rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform text-sm shadow-lg"
          style={{ background: "#FEE500" }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: `${mbtiType} — 카톡 MBTI 스캐너`,
                text: `${targetName || "이 사람"}의 MBTI는 ${mbtiType} (${title})!`,
                url: window.location.href,
              }).catch(() => {});
            } else {
              navigator.clipboard.writeText(
                `${targetName || "이 사람"}의 MBTI는 ${mbtiType} (${title})! — 카톡 MBTI 스캐너`,
              );
              alert("결과가 클립보드에 복사되었어요!");
            }
          }}
        >
          결과 공유하기 🔗
        </button>
      </div>
    </div>
  );
}
