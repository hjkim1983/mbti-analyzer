"use client";

import GlassCard from "./GlassCard";
import { getMbtiMeta } from "@/constants/mbti-data";
import {
  ANALYSIS_MODE,
  normalizeAnalysisMode,
} from "@/lib/analysis-tier";
import {
  axisStrengthFromConfidence,
  confidenceLevelToKorean,
} from "@/lib/result-confidence";

export default function ResultScreen({
  result,
  targetName,
  memo,
  isMulti,
  hasMemo,
  onReset,
  analysisMode = ANALYSIS_MODE.FREE,
  onGoPremium,
}) {
  if (!result) return null;

  const {
    mbtiType,
    emoji,
    title,
    color,
    confidence,
    confidenceDisplay,
    confidenceLevel,
    confidenceReason,
    oneLineConclusion,
    keyEvidenceSummary = [],
    evidenceBullets = [],
    indicators,
    highlights,
    traits,
    tags,
    conflicts,
    profile,
    summary,
    teaserBullets,
    lockedPreview,
    tier,
    mbtiRankings = [],
    relationshipAndCommunication,
    workAndRoutine,
    cautionAndMisread,
    analysisLimitations,
    practicalTips,
    alternativeTypes,
    quotedInsights = [],
  } = result;

  const displayConf =
    confidenceDisplay != null ? confidenceDisplay : confidence;
  const levelKo = confidenceLevelToKorean(confidenceLevel);

  const mode = normalizeAnalysisMode(analysisMode);
  const isPremium =
    mode === ANALYSIS_MODE.PREMIUM ||
    tier === "premium";
  const showFreeTeaser =
    !isPremium &&
    summary &&
    typeof summary.headline === "string";

  const rank2 =
    mbtiRankings?.find((r) => r.rank === 2) || mbtiRankings?.[1];
  const rank3 =
    mbtiRankings?.find((r) => r.rank === 3) || mbtiRankings?.[2];
  const meta2 = rank2 ? getMbtiMeta(rank2.mbtiType) : null;

  /** 프리미엄 상단 훅: API keyEvidenceSummary 없으면 인용에서 최대 3개 보강 */
  const premiumHookEvidence =
    isPremium && keyEvidenceSummary.length === 0 && quotedInsights.length > 0
      ? quotedInsights.slice(0, 3).map((q) => ({
          snippet: q.quote || "…",
          axis: "",
          insight: q.note || "",
        }))
      : keyEvidenceSummary;

  return (
    <div className="pt-6">
      {/* 분석 티어 뱃지 */}
      <div className="text-center mb-4 anim-slide-up">
        <span
          className="text-xs font-bold px-4 py-1.5 rounded-full shadow-sm"
          style={{
            background: isPremium
              ? "linear-gradient(90deg,rgba(162,155,254,0.5),rgba(124,58,237,0.25))"
              : "linear-gradient(90deg,rgba(254,229,0,0.8),rgba(162,155,254,0.3))",
            color: "#333",
          }}
        >
          {isPremium
            ? "✨ Premium · 심층 리포트"
            : "🎁 Free · 빠른 추정"}
        </span>
      </div>

      {(isMulti || hasMemo) && (
        <div className="text-center mb-4 anim-slide-up">
          <span
            className="text-xs font-bold px-4 py-1.5 rounded-full shadow-sm inline-block"
            style={{
              background: "rgba(255,255,255,0.6)",
              color: "#555",
            }}
          >
            {isMulti && hasMemo
              ? "대화 + 프로필 + 추가정보 반영"
              : isMulti
                ? "대화 + 프로필 종합"
                : "추가 정보 반영"}
          </span>
        </div>
      )}

      {/* Premium: 핵심 근거 요약 — 최상단 3초 훅 */}
      {isPremium && premiumHookEvidence.length > 0 && (
        <GlassCard animate className="mb-4 border-2 border-amber-200/80 bg-amber-50/30">
          <p className="text-[11px] font-extrabold text-amber-900 mb-2 uppercase tracking-wide">
            📌 대화에서 잡힌 핵심 근거
          </p>
          <ul className="space-y-2.5">
            {premiumHookEvidence.slice(0, 3).map((item, i) => (
              <li key={i} className="text-sm text-gray-800 leading-snug">
                <span className="font-bold text-violet-800">
                  {item.snippet ? `「${item.snippet.replace(/^「|」$/g, "")}」` : "—"}
                </span>
                {item.axis ? (
                  <span className="text-[10px] text-gray-500 ml-1">({item.axis}축)</span>
                ) : null}
                {item.insight ? (
                  <span className="block text-xs text-gray-600 mt-1 pl-0.5 border-l-2 border-violet-200">
                    → {item.insight}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Premium: 한 줄 결론 */}
      {isPremium && (oneLineConclusion?.trim() || title) && (
        <div className="rounded-2xl p-4 mb-4 text-center border border-white/60 bg-white/35 anim-slide-up">
          <p className="text-[10px] font-bold text-gray-500 mb-1">한 줄 결론</p>
          <p className="text-base font-extrabold text-gray-900 leading-snug">
            {oneLineConclusion?.trim() || `${mbtiType} / ${title}`}
          </p>
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
          <p className="text-xs text-gray-500 mb-1">
            {isPremium ? (
              <>
                종합 확신: <span className="font-bold text-gray-800">{levelKo}</span>
                {" · "}
                표시 {displayConf}% (과장 방지를 위해 완화 표시)
              </>
            ) : (
              <>
                확신도 {displayConf}% ({levelKo})
              </>
            )}
          </p>
          {isPremium && confidenceReason?.trim() && (
            <p className="text-[11px] text-gray-600 mb-3 px-1 leading-relaxed">
              왜 이 정도로 봤나요? {confidenceReason}
            </p>
          )}
          {!isPremium && <p className="text-[10px] text-gray-400 mb-3">캡처만으로는 오판 가능성이 있어요</p>}
          {isPremium && !confidenceReason?.trim() && <div className="mb-2" />}
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

      {/* Free: 가까운 후보 1개만 (개인화 깊이는 Premium에서) */}
      {!isPremium && rank2 && (
        <div className="mb-4 anim-slide-up delay-1">
          <p className="text-[11px] font-bold text-gray-600 mb-2 px-1">
            빠른 추정 — 1순위와 비슷했던 다른 유형
          </p>
          <div
            className="flex items-center gap-3 rounded-2xl p-3 border border-white/50"
            style={{ background: "rgba(255,255,255,0.55)" }}
          >
            <span className="text-xs font-black text-violet-700 w-14 shrink-0">
              가까운 후보
            </span>
            <span className="text-2xl">{meta2?.emoji}</span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-black text-gray-900 tracking-wider">
                {rank2.mbtiType}
              </p>
              <p className="text-[11px] text-gray-600 truncate">
                {meta2?.title}
                {rank2.hint ? ` · ${rank2.hint}` : ""}
              </p>
            </div>
          </div>
          {rank3 && (
            <p className="text-[10px] text-gray-400 mt-2 px-1">
              3순위({rank3.mbtiType})까지의 비교·선택 이유는 Premium 리포트에서 볼 수 있어요.
            </p>
          )}
        </div>
      )}

      {/* Free 전용: 요약·티저·잠금 미리보기 */}
      {showFreeTeaser && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-2 text-sm">
            {summary.headline}
          </h3>
          {summary.oneLiner && (
            <p className="text-sm text-gray-600 mb-3 leading-relaxed">
              {summary.oneLiner}
            </p>
          )}
          {evidenceBullets.length > 0 && (
            <div className="mb-4 rounded-2xl p-3 bg-violet-50/50 border border-violet-100">
              <p className="text-[11px] font-bold text-violet-900 mb-2">
                캡처에서 잡힌 짧은 근거
              </p>
              <ul className="space-y-2">
                {evidenceBullets.slice(0, 3).map((ev, i) => (
                  <li key={i} className="text-xs text-gray-800">
                    {ev.snippet ? (
                      <span className="font-semibold text-violet-900">
                        「{String(ev.snippet).replace(/^「|」$/g, "")}」
                      </span>
                    ) : null}
                    {ev.insight ? (
                      <span className="block text-gray-600 mt-0.5">→ {ev.insight}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {teaserBullets?.length > 0 && (
            <ul className="space-y-2 mb-4">
              {teaserBullets.map((b, i) => (
                <li key={i} className="text-xs text-gray-700 flex gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{typeof b === "object" ? JSON.stringify(b) : String(b)}</span>
                </li>
              ))}
            </ul>
          )}
          {lockedPreview?.labels?.length > 0 && (
            <div
              className="rounded-2xl p-3 border border-dashed border-amber-200 bg-amber-50/40"
            >
              <p className="text-[11px] font-bold text-amber-900 mb-2">
                🔒 Premium에서 열리는 항목
              </p>
              <ul className="text-[11px] text-amber-800 space-y-1">
                {lockedPreview.labels.map((lb, i) => (
                  <li key={i}>· {lb}</li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>
      )}

      {/* 지표별 분석 — 프리미엄: 근거+해석+축 강도 */}
      {indicators && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-1 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FEE500" }}
            >
              📊
            </span>
            지표별 분석 (대화 근거)
          </h3>
          {isPremium && (
            <p className="text-[11px] text-gray-500 mb-4">
              각 축은 캡처 속 표현·말투 패턴을 바탕으로 본 것입니다. 애매한 축은 경계·혼합으로 표시될 수 있어요.
            </p>
          )}
          <div className="space-y-5">
            {Object.entries(indicators).map(([key, ind]) => {
              const [leftLabel, rightLabel] = {
                EI: ["E 외향", "I 내향"],
                SN: ["S 감각", "N 직관"],
                TF: ["T 사고", "F 감정"],
                JP: ["J 판단", "P 인식"],
              }[key] || [key[0], key[1]];

              const isLeft = ind.result === key[0];
              const percentage = Math.min(100, Math.max(0, ind.score));
              const winPct = percentage;
              const losePct = 100 - percentage;
              const leftPct = isLeft ? winPct : losePct;
              const rightPct = isLeft ? losePct : winPct;
              const axisConf = Number(ind.confidence);
              const strength =
                ind.strengthLabel?.trim() ||
                axisStrengthFromConfidence(axisConf);

              return (
                <div key={key} className="border-b border-white/40 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between text-xs font-bold mb-1 gap-1 items-start">
                    <span
                      style={{
                        color: leftPct >= rightPct ? color : "#9CA3AF",
                      }}
                    >
                      {leftLabel} {leftPct}%
                    </span>
                    <span className="text-gray-500 text-[10px] shrink-0 pt-0.5">
                      축 {strength}
                    </span>
                    <span
                      style={{
                        color: rightPct > leftPct ? color : "#9CA3AF",
                      }}
                    >
                      {rightPct}% {rightLabel}
                    </span>
                  </div>
                  {isPremium && (
                    <p className="text-[10px] text-gray-500 mb-1.5 text-center">
                      {key[0]} {leftPct}% · {key[1]} {rightPct}%
                    </p>
                  )}
                  <div className="h-2.5 bg-gray-100/60 rounded-full overflow-hidden clear-both">
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
                  {isPremium && ind.interpretation?.trim() && (
                    <p className="text-xs text-gray-700 mt-2 leading-relaxed bg-white/30 rounded-xl p-2">
                      {ind.interpretation}
                    </p>
                  )}
                  {isPremium && ind.boundaryNote?.trim() && (
                    <p className="text-[11px] text-amber-900 mt-1.5 bg-amber-50/60 rounded-lg px-2 py-1">
                      경계·혼합: {ind.boundaryNote}
                    </p>
                  )}
                  {ind.evidence && ind.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] font-bold text-gray-500">
                        이 축 근거 {isPremium ? `(≥3)` : ""}
                      </p>
                      {(isPremium ? ind.evidence : ind.evidence.slice(0, 2)).map(
                        (e, i) => (
                          <p
                            key={i}
                            className="text-xs text-gray-600 pl-1 leading-relaxed border-l-2 border-violet-100"
                          >
                            {typeof e === "object" ? JSON.stringify(e) : String(e)}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* 프리미엄: 1·2·3순위 비교 — 지표 직후 */}
      {isPremium &&
        alternativeTypes &&
        (alternativeTypes.whyFirst?.trim() ||
          alternativeTypes.first?.mbtiType ||
          alternativeTypes.second?.mbtiType ||
          alternativeTypes.third?.mbtiType ||
          alternativeTypes.distinction?.trim()) && (
        <GlassCard animate delay={3} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#DDD6FE" }}
            >
              🔀
            </span>
            헷갈릴 수 있는 유형 비교
          </h3>
          <p className="text-[11px] text-gray-500 mb-3">
            왜 {mbtiType}인지, 비슷한 다른 유형은 왜 아닌지 정리했어요.
          </p>
          {alternativeTypes.first?.mbtiType &&
            alternativeTypes.first.mbtiType.length === 4 &&
            alternativeTypes.first.mbtiType !== mbtiType && (
            <div className="rounded-2xl p-3 mb-3 bg-violet-50/50 border border-violet-100">
              <p className="text-xs font-black text-violet-900 mb-1">
                가장 가까웠던 다른 유형
              </p>
              <p className="text-lg font-black tracking-widest text-gray-900">
                {alternativeTypes.first.mbtiType}
              </p>
              {alternativeTypes.first?.oneLiner?.trim() && (
                <p className="text-xs text-gray-700 mt-1">
                  {alternativeTypes.first.oneLiner}
                </p>
              )}
            </div>
          )}
          {alternativeTypes.second?.mbtiType &&
            alternativeTypes.second.mbtiType.length === 4 &&
            alternativeTypes.second.mbtiType !== mbtiType && (
            <div className="mb-3 p-3 rounded-2xl bg-white/40 border border-white/60">
              <p className="text-xs font-bold text-gray-800 mb-1">
                2순위 후보 · {alternativeTypes.second.mbtiType}{" "}
                <span className="font-normal text-gray-500">
                  ({getMbtiMeta(alternativeTypes.second.mbtiType)?.title})
                </span>
              </p>
              {alternativeTypes.second.shared?.trim() && (
                <p className="text-[11px] text-gray-600 mb-1">
                  공통점: {alternativeTypes.second.shared}
                </p>
              )}
              {alternativeTypes.second.difference?.trim() && (
                <p className="text-[11px] text-violet-800">
                  최종에서 밀린 이유: {alternativeTypes.second.difference}
                </p>
              )}
            </div>
          )}
          {alternativeTypes.third?.mbtiType &&
            alternativeTypes.third.mbtiType.length === 4 &&
            alternativeTypes.third.mbtiType !== mbtiType && (
            <div className="mb-3 p-3 rounded-2xl bg-white/30 border border-white/50">
              <p className="text-xs font-bold text-gray-800 mb-1">
                3순위 후보 · {alternativeTypes.third.mbtiType}{" "}
                <span className="font-normal text-gray-500">
                  ({getMbtiMeta(alternativeTypes.third.mbtiType)?.title})
                </span>
              </p>
              {alternativeTypes.third.shared?.trim() && (
                <p className="text-[11px] text-gray-600 mb-1">
                  공통점: {alternativeTypes.third.shared}
                </p>
              )}
              {alternativeTypes.third.difference?.trim() && (
                <p className="text-[11px] text-violet-800">
                  최종에서 밀린 이유: {alternativeTypes.third.difference}
                </p>
              )}
            </div>
          )}
          {alternativeTypes.whyFirst?.trim() && (
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line border-t border-violet-100 pt-3">
              <span className="font-bold text-violet-900">최종 선택 이유 — </span>
              {alternativeTypes.whyFirst}
            </p>
          )}
          {!alternativeTypes.whyFirst?.trim() &&
            alternativeTypes.distinction?.trim() && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {alternativeTypes.distinction}
            </p>
          )}
        </GlassCard>
      )}

      {/* 프리미엄: 추가 인용 (보조) */}
      {isPremium && quotedInsights.length > 0 && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#E0E7FF" }}
            >
              💬
            </span>
            추가 대화 인용
          </h3>
          <p className="text-[11px] text-gray-500 mb-3">
            지표 근거와 함께 보면 좋아요. 실명·전화번호 등은 가명 처리했을 수 있어요.
          </p>
          <div className="space-y-3">
            {quotedInsights.map((q, i) => (
              <div
                key={i}
                className="rounded-2xl p-3 bg-white/40 border border-white/50"
              >
                <p className="text-xs text-gray-800 font-medium italic mb-1">
                  &ldquo;{q.quote}&rdquo;
                </p>
                {q.note && (
                  <p className="text-[11px] text-gray-600">→ {q.note}</p>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 프리미엄: 관계·소통 (실전형) */}
      {isPremium &&
        relationshipAndCommunication &&
        (relationshipAndCommunication.summary?.trim() ||
          relationshipAndCommunication.whenInterested?.trim() ||
          relationshipAndCommunication.whenUncomfortable?.trim() ||
          relationshipAndCommunication.whenClose?.trim() ||
          relationshipAndCommunication.inConflict?.trim() ||
          relationshipAndCommunication.replyAndEmoji?.trim() ||
          relationshipAndCommunication.contactPreference?.trim() ||
          relationshipAndCommunication.tips?.length > 0) && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-2 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FBCFE8" }}
            >
              💕
            </span>
            관계·소통 스타일
          </h3>
          {relationshipAndCommunication.summary?.trim() && (
            <p className="text-sm text-gray-800 leading-relaxed mb-4">
              {relationshipAndCommunication.summary}
            </p>
          )}
          {[
            {
              k: "whenInterested",
              label: "호감이 있을 때",
              v: relationshipAndCommunication.whenInterested,
            },
            {
              k: "whenUncomfortable",
              label: "불편할 때",
              v: relationshipAndCommunication.whenUncomfortable,
            },
            {
              k: "whenClose",
              label: "친해졌을 때",
              v: relationshipAndCommunication.whenClose,
            },
            {
              k: "inConflict",
              label: "갈등·싸움",
              v: relationshipAndCommunication.inConflict,
            },
            {
              k: "replyAndEmoji",
              label: "답장·이모티콘·말투",
              v: relationshipAndCommunication.replyAndEmoji,
            },
            {
              k: "contactPreference",
              label: "연락 선호",
              v: relationshipAndCommunication.contactPreference,
            },
          ]
            .filter((x) => x.v?.trim())
            .map((x) => (
              <div
                key={x.k}
                className="mb-3 p-3 rounded-2xl bg-pink-50/40 border border-pink-100/80"
              >
                <p className="text-[11px] font-extrabold text-pink-900 mb-1">
                  {x.label}
                </p>
                <p className="text-xs text-gray-800 leading-relaxed">{x.v}</p>
              </div>
            ))}
          {relationshipAndCommunication.tips?.length > 0 && (
            <div className="mt-2">
              <p className="text-[11px] font-bold text-gray-600 mb-1.5">
                연락할 때 참고
              </p>
              <ul className="space-y-1.5">
                {relationshipAndCommunication.tips.map((t, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-pink-500 font-bold">✓</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </GlassCard>
      )}

      {/* 프리미엄: 실전 소통 팁 */}
      {isPremium &&
        practicalTips &&
        (practicalTips.emotionVsDirect?.trim() ||
          practicalTips.effectiveCommunication?.length > 0 ||
          practicalTips.whenHurt?.length > 0 ||
          practicalTips.conflictAvoid?.length > 0 ||
          practicalTips.scheduling?.length > 0) && (
        <GlassCard animate delay={2} className="mb-4 border border-emerald-100 bg-emerald-50/20">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#6EE7B7" }}
            >
              🎯
            </span>
            실전 소통 가이드
          </h3>
          {practicalTips.emotionVsDirect?.trim() && (
            <p className="text-xs text-gray-800 mb-3 p-2 rounded-xl bg-white/50">
              <span className="font-bold text-emerald-900">감정 vs 핵심 — </span>
              {practicalTips.emotionVsDirect}
            </p>
          )}
          {[
            { title: "이렇게 말하면 잘 통할 수 있어요", items: practicalTips.effectiveCommunication },
            { title: "서운함을 전할 때", items: practicalTips.whenHurt },
            { title: "갈등 시 피하면 좋은 방식", items: practicalTips.conflictAvoid },
            { title: "약속·일정·제안", items: practicalTips.scheduling },
          ]
            .filter((s) => s.items?.length > 0)
            .map((s) => (
              <div key={s.title} className="mb-3">
                <p className="text-[11px] font-extrabold text-emerald-900 mb-1">
                  {s.title}
                </p>
                <ul className="space-y-1">
                  {s.items.map((line, i) => (
                    <li key={i} className="text-xs text-gray-700">
                      • {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </GlassCard>
      )}

      {/* 프리미엄: 일·학습·협업 */}
      {isPremium && workAndRoutine?.summary && (
        <GlassCard animate delay={2} className="mb-4">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#BFDBFE" }}
            >
              💼
            </span>
            일·학습·협업
          </h3>
          <p className="text-sm text-gray-700 leading-relaxed mb-3">
            {workAndRoutine.summary}
          </p>
          {workAndRoutine.tips?.length > 0 && (
            <ul className="space-y-1.5">
              {workAndRoutine.tips.map((t, i) => (
                <li key={i} className="text-xs text-gray-600 flex gap-2">
                  <span className="text-sky-600 font-bold">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      )}

      {/* 대화 + 프로필 요약 (종합 모드 또는 프리미엄 전체 패턴) */}
      {(isPremium || isMulti) &&
        highlights &&
        Object.keys(highlights).length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4 anim-slide-up delay-2">
          <GlassCard className="!p-4">
            <p className="text-xs font-extrabold text-gray-700 mb-2">
              💬 대화 분석
            </p>
            {(isPremium
              ? highlights.chatPatterns ?? []
              : (highlights.chatPatterns ?? []).slice(0, 2)
            ).map((t) => (
              <p key={String(t)} className="text-xs text-gray-500 mb-1">
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

      {/* 프로필 분석 상세 (종합 모드 또는 프리미엄) */}
      {(isPremium || isMulti) && profile && (
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

      {/* 프리미엄: 오판 가능성 · 분석 한계 (신뢰 강화) */}
      {isPremium &&
        (cautionAndMisread?.points?.length > 0 ||
          analysisLimitations?.points?.length > 0) && (
        <GlassCard animate delay={4} className="mb-4 border border-amber-200/80">
          <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm"
              style={{ background: "#FEF3C7" }}
            >
              🧭
            </span>
            오판 가능성 · 이 분석의 한계
          </h3>
          <p className="text-[11px] text-amber-950/90 mb-2">
            숨기지 않고 적어 두었어요. 오히려 이런 설명이 있을 때 분석을 더 믿을 수 있답니다.
          </p>
          <ul className="space-y-1.5">
            {[
              ...(cautionAndMisread?.points ?? []),
              ...(analysisLimitations?.points ?? []),
            ].map((p, i) => (
              <li key={i} className="text-xs text-amber-900 leading-relaxed">
                • {p}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-600 mt-3">
            프로필 이미지·배경은 분위기 참고용이며, 결정적 근거는 대화 텍스트입니다.
          </p>
        </GlassCard>
      )}

      {/* 주의사항 — 본문 대비 선명한 대비색 */}
      <div
        className="rounded-2xl p-4 mb-5 anim-slide-up delay-5 border border-amber-400/90 bg-amber-50 shadow-sm"
      >
        <p className="text-sm font-extrabold text-amber-950 mb-1.5">
          ⚠️ 주의사항
        </p>
        <p className="text-sm text-gray-900 leading-relaxed font-medium">
          이 분석은 재미를 위한 것으로, 실제 MBTI와 다를 수 있어요. 사람의
          성격은 하나의 도구로 단정지을 수 없답니다.
        </p>
      </div>

      {/* 액션 버튼 — 프리미엄 유도보다 위: 다시 분석 / 공유 */}
      <div className="flex gap-3 anim-slide-up delay-6 mb-6">
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

      {/* Free → Premium 유도 (화면 최하단: 후킹 멘트 → CTA) */}
      {!isPremium && typeof onGoPremium === "function" && (
        <div className="anim-slide-up delay-6 pt-2 border-t border-white/25">
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background:
                "linear-gradient(145deg, rgba(124,58,237,0.08), rgba(254,229,0,0.12))",
              border: "1px solid rgba(124,58,237,0.2)",
            }}
          >
            <p className="text-sm font-extrabold text-gray-900 mb-2 leading-snug">
              무료 테스트는 캡처 최대 3장만으로 보는{" "}
              <span className="text-amber-900">압축 추정</span>이라, 방금 결과가
              실제 성향과 다를 수 있어요.
            </p>
            <p className="text-sm text-gray-800 leading-relaxed mb-2">
              Premium은 카드 개수가 아니라{" "}
              <span className="font-bold text-purple-900">
                대화 근거·유형 비교·관계 실전 해석의 깊이
              </span>
              가 달라요. (캡처 최대 10장 · 메모 선택)
            </p>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              아래 버튼을 누르면 프리미엄 탭으로 이동한 뒤 결제하고 심층 리포트를
              받을 수 있어요.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoPremium}
            className="w-full py-4 rounded-2xl font-extrabold text-sm text-gray-900 shadow-lg active:scale-[0.99] transition-transform border-2 border-purple-200"
            style={{
              background:
                "linear-gradient(135deg, rgba(162,155,254,0.45), rgba(167,139,250,0.28))",
            }}
          >
            💎 Premium 리포트로 이어가기
          </button>
          <p className="text-[11px] text-center text-gray-400 mt-2.5 px-1">
            축별 대화 근거 3개+, 비슷한 유형 비교, 실전 소통 가이드는 Premium에서
            열려요
          </p>
        </div>
      )}
    </div>
  );
}
