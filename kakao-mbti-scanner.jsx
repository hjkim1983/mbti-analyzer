"use client";

import { useState, useRef, useCallback } from "react";
import { getDeviceId } from "./src/lib/device-id.js";
import { fileToBase64 } from "./src/lib/image-utils.js";
import { ANALYSIS_MODE, MAX_IMAGES_FREE } from "./src/lib/analysis-tier.js";
import { getLoadingSteps } from "./src/constants/loading-steps.js";

const QUICK_TAGS = [
  "말이 많아요",
  "말이 적어요",
  "리액션이 과해요",
  "감정 표현 잘 함",
  "논리적으로 말함",
  "즉흥적인 편",
  "계획적인 편",
  "공감을 잘 해줘요",
  "유머 감각 있음",
  "진지한 편",
  "답장이 빨라요",
  "답장이 느려요",
];

/**
 * /api/analyze 무료 응답 → 기존 결과 카드 UI 형태로 매핑
 * (free 스키마는 evidenceBullets·summary 중심, premium은 traits·profile 풍부)
 */
function mapApiToCardResult(d) {
  const evidence = Array.isArray(d.evidenceBullets) ? d.evidenceBullets : [];
  const traitsFromEvidence = evidence
    .map((b) => (b && (b.insight || b.snippet)) || "")
    .filter(Boolean);
  const traits =
    Array.isArray(d.traits) && d.traits.length > 0
      ? d.traits
      : traitsFromEvidence.length > 0
        ? traitsFromEvidence
        : [
            d.summary?.oneLiner ||
              d.summary?.headline ||
              "캡처 기반 추정 결과를 확인해 주세요",
          ];

  const tagList =
    Array.isArray(d.tags) && d.tags.length > 0 ? d.tags : ["#빠른추정"];

  const conf = Number(d.confidence) || 70;
  const profile =
    d.profile && typeof d.profile === "object" && !Array.isArray(d.profile)
      ? {
          mood: d.profile.mood || d.profile.overallMood || "—",
          status: d.profile.status || d.profile.statusMessage || "—",
          bg: d.profile.bg || d.profile.backgroundTaste || "—",
          score:
            typeof d.profile.score === "number"
              ? d.profile.score
              : Math.min(95, Math.max(50, Math.round(conf))),
        }
      : {
          mood: d.summary?.headline || "요약",
          status: d.summary?.oneLiner || "—",
          bg: "캡처 기반",
          score: Math.min(95, Math.max(50, Math.round(conf))),
        };

  return {
    type: d.mbtiType || d.type,
    emoji: d.emoji || "🧠",
    title: d.title || "유형 분석",
    color: d.color || "#6366F1",
    traits,
    tags: tagList,
    profile,
  };
}

export default function App() {
  const [stage, setStage] = useState("main");
  const [isDragging, setIsDragging] = useState(false);
  /** { file, preview, name } — API용 base64 생성 */
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  /** 직접 작성란 — 무료 API 규칙상 전송하지 않음(비어 있어야 분석 가능) */
  const [memo, setMemo] = useState("");
  /** 빠른 태그 — /api/analyze body.tags 로 전달 */
  const [selectedTags, setSelectedTags] = useState([]);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  const isMulti = images.length >= 2;
  const hasMemoText = memo.trim().length > 0;
  const hasExtraInput = selectedTags.length > 0 || hasMemoText;
  /** 무료 빠른 추정: 캡처 1~3장, 직접 작성란 비어 있어야 함 */
  const canAnalyze =
    images.length >= 1 &&
    images.length <= MAX_IMAGES_FREE &&
    !hasMemoText;

  const { steps: loadingSteps, messages: loadingMsgs, icons: loadingIcons } =
    getLoadingSteps(isMulti, selectedTags.length > 0, images.length, ANALYSIS_MODE.FREE);

  const addImages = (files) => {
    const newImgs = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES_FREE - images.length)
      .map((f) => ({
        file: f,
        preview: URL.createObjectURL(f),
        name: f.name,
      }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const runAnalysis = useCallback(async () => {
    if (!canAnalyze) return;
    if (hasMemoText) {
      setError(
        "무료 빠른 추정은 직접 작성란을 비운 뒤 진행해 주세요. (빠른 태그는 반영됩니다)",
      );
      return;
    }
    setError(null);
    setStage("loading");
    setLoadingStep(0);

    const { messages } = getLoadingSteps(
      isMulti,
      selectedTags.length > 0,
      images.length,
      ANALYSIS_MODE.FREE,
    );

    let step = 0;
    timerRef.current = setInterval(() => {
      step++;
      if (step < messages.length) setLoadingStep(step);
    }, 700);

    try {
      const deviceId = await getDeviceId();
      const total = images.length;
      const base64Images = await Promise.all(
        images.map(async (img) => {
          const converted = await fileToBase64(img.file, total, undefined, {
            tier: "free",
          });
          return {
            base64Data: converted.base64Data,
            mimeType: converted.mimeType,
          };
        }),
      );

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          targetName: targetName.trim() || "미지정",
          memo: "",
          images: base64Images,
          mode: ANALYSIS_MODE.FREE,
          tags: selectedTags,
        }),
      });

      const json = await res.json();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!json.success) {
        throw new Error(json.message || "분석에 실패했습니다");
      }

      const mapped = mapApiToCardResult(json.data);
      setLoadingStep(messages.length);
      setTimeout(() => {
        setResult(mapped);
        setStage("result");
      }, 220);
    } catch (e) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setError(e.message || "분석 중 오류가 발생했습니다");
      setStage("main");
    }
  }, [
    canAnalyze,
    hasMemoText,
    images,
    isMulti,
    selectedTags,
    targetName,
  ]);

  const startAnalysis = () => {
    void runAnalysis();
  };

  const handleReset = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    setError(null);
    images.forEach((img) => {
      if (img?.preview) URL.revokeObjectURL(img.preview);
    });
    setImages([]);
    setTargetName("");
    setMemo("");
    setSelectedTags([]);
  };

  return (
    <div style={{ fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif" }} className="min-h-screen bg-gray-50">
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pop {
          0% { transform: scale(0.75); opacity: 0; }
          80% { transform: scale(1.04); }
          100% { transform: scale(1); opacity: 1; }
        }
        .anim-float { animation: float 3s ease-in-out infinite; }
        .anim-su { animation: slide-up 0.45s ease forwards; }
        .anim-pr { animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite; }
        .anim-pop { animation: pop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .d0 { opacity: 0; }
        .d1 { animation-delay: 0.08s; opacity: 0; }
        .d2 { animation-delay: 0.18s; opacity: 0; }
        .d3 { animation-delay: 0.30s; opacity: 0; }
        .d4 { animation-delay: 0.42s; opacity: 0; }
        .d5 { animation-delay: 0.54s; opacity: 0; }
        .d6 { animation-delay: 0.66s; opacity: 0; }
        textarea:focus { outline: none; }
      `}</style>

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FEE500" }}>
            <span style={{ fontSize: 14 }}>💬</span>
          </div>
          <span className="font-bold text-gray-900 text-sm">카톡 MBTI 스캐너</span>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">BETA</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-24">

        {/* ════════ MAIN SCREEN ════════ */}
        {stage === "main" && (
          <div>
            {/* Hero */}
            <div className="pt-10 pb-6 text-center anim-su">
              <div className="anim-float inline-block mb-4">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg" style={{ background: "#FEE500", fontSize: 36 }}>
                  💬
                </div>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-2">말투로 MBTI를<br />읽어드릴게요</h1>
              <p className="text-gray-500 text-sm leading-relaxed">
                카톡 대화 캡처를 올려주세요<br />
                <span className="text-gray-400 text-xs">무료 빠른 추정은 캡처 1~3장 · 빠른 태그만 서버에 전달돼요</span>
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex justify-center gap-2 mb-5 flex-wrap anim-su d1">
              {["🔍 말투 분석", "📸 프로필 분석", "🧠 MBTI 유추"].map((t) => (
                <span key={t} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full shadow-sm font-medium">{t}</span>
              ))}
            </div>

            {error && (
              <div
                className="rounded-2xl p-4 mb-4 border border-red-200 bg-red-50 anim-su"
                role="alert"
              >
                <p className="text-sm font-bold text-red-800 mb-2">{error}</p>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs text-red-600 underline mr-3"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={startAnalysis}
                  className="text-xs font-bold text-red-800 bg-white px-3 py-1.5 rounded-lg border border-red-200"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* ── Upload Card ── */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-sm">캡처 업로드</h2>
                  <p className="text-xs text-gray-400 mt-0.5">무료 빠른 추정: 최대 {MAX_IMAGES_FREE}장</p>
                </div>
                {images.length > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-gray-900"
                    style={{ background: isMulti ? "#FEE500" : "#F3F4F6" }}>
                    {isMulti ? "✨ 종합 분석 모드" : `📎 ${images.length}장`}
                  </span>
                )}
              </div>

              {/* Name input */}
              <div className="mb-3">
                <p className="text-xs font-bold text-gray-500 mb-0.5 flex items-center gap-1">
                  👤 분석할 상대방 이름
                  <span className="text-xs font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">단체톡 필수</span>
                </p>
                <p className="text-xs text-gray-400 mb-1.5">캡처에 표시된 이름을 <b className="text-gray-500">정확하게</b> 입력해주세요</p>
                <div className="relative">
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value.slice(0, 20))}
                    placeholder="예) 캡처에 보이는 그대로 — 김민준, 박지수 등"
                    className="w-full text-sm text-gray-700 rounded-xl px-4 py-2.5 transition-all duration-200"
                    style={{
                      background: "#F9FAFB",
                      border: targetName.trim() ? "1.5px solid #FEE500" : "1.5px solid #F3F4F6",
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.border = "1.5px solid #FEE500")}
                    onBlur={(e) => (e.target.style.border = targetName.trim() ? "1.5px solid #FEE500" : "1.5px solid #F3F4F6")}
                  />
                  {targetName.trim() && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-white text-xs font-bold">✓</div>
                  )}
                </div>
                {targetName.trim() && (
                  <p className="text-xs text-green-600 mt-1 font-medium">
                    ✓ <b>{targetName}</b>의 말풍선을 집중 분석할게요
                  </p>
                )}
              </div>

              {/* Drop zone */}
              <div
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); addImages(e.dataTransfer.files); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onClick={() => images.length < MAX_IMAGES_FREE && fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer mb-3"
                style={{
                  borderColor: isDragging ? "#FEE500" : images.length > 0 ? "#D1D5DB" : "#E5E7EB",
                  background: isDragging ? "rgba(254,229,0,0.06)" : images.length > 0 ? "#FAFAFA" : "white",
                }}
              >
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => addImages(e.target.files)} />

                {images.length === 0 ? (
                  <div className="py-10 px-6 text-center">
                    <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{ background: isDragging ? "#FEE500" : "#FFF9C4", fontSize: 28 }}>📁</div>
                    <p className="font-bold text-gray-800 text-sm mb-1">여기에 캡처를 올려주세요</p>
                    <p className="text-gray-400 text-xs mb-4">클릭하거나 파일을 끌어다 놓으세요</p>
                    <div className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-gray-900 text-xs shadow-md"
                      style={{ background: "#FEE500" }}>
                      📎 파일 선택하기
                    </div>
                  </div>
                ) : (
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {images.map((img, i) => (
                        <div key={img.preview} className="relative rounded-xl overflow-hidden anim-pop" style={{ aspectRatio: "1" }}>
                          <img src={img.preview} alt={`캡처 ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1">
                            <span className="font-bold text-white rounded-md px-1.5 py-0.5 shadow"
                              style={{ background: i === 0 ? "rgba(0,0,0,0.55)" : "rgba(90,70,180,0.75)", fontSize: 9 }}>
                              {i === 0 ? "💬 대화" : "👤 프로필"}
                            </span>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black bg-opacity-60 flex items-center justify-center text-white"
                            style={{ fontSize: 10 }}>✕</button>
                        </div>
                      ))}
                      {images.length < MAX_IMAGES_FREE && (
                        <div className="rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-300"
                          style={{ aspectRatio: "1" }}>
                          <span className="text-xl font-light">+</span>
                          <span className="text-xs">추가</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-center text-gray-400">총 {images.length}장 · ✕로 삭제</p>
                  </div>
                )}
              </div>

              {/* Status banner */}
              <div className="rounded-2xl p-3 mb-4"
                style={{
                  background: images.length === 0 ? "#FFFBEB" : isMulti ? "linear-gradient(135deg,#FEE50018,#A29BFE15)" : "#F0FDF4",
                  border: images.length === 0 ? "1px solid #FDE68A" : isMulti ? "1px solid #FEE50060" : "1px solid #BBF7D0",
                }}>
                {images.length === 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-700 mb-1">💡 이런 캡처가 잘 분석돼요</p>
                    <p className="text-xs text-amber-600">📱 <b>대화 캡처</b> — 상대방 말풍선이 <b>3개 이상</b> 포함된 화면</p>
                    <p className="text-xs text-amber-600">👤 <b>프로필 캡처</b> — 프로필 사진·상태 메시지가 보이는 화면 <span className="bg-amber-100 px-1 rounded font-bold">선택사항</span></p>
                    <p className="text-xs text-amber-500 mt-0.5">프로필 캡처는 선택사항이지만, 함께 올리면 더 정확한 분석이 가능해요</p>
                  </div>
                )}
                {images.length > 0 && !isMulti && (
                  <p className="text-xs text-green-700 font-medium text-center">
                    ✅ 업로드 완료! <span className="text-gray-500">프로필 캡처도 추가하면 더 정확한 분석이 가능해요 👤</span>
                  </p>
                )}
                {isMulti && (
                  <p className="text-xs font-bold text-center" style={{ color: "#856C00" }}>
                    🚀 종합 분석 모드 — 말투 + 프로필 동시 분석으로 정확도 UP!
                  </p>
                )}
              </div>


            </div>

            {/* ── Additional Info Card ── */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    ✏️ 추가 정보 입력
                    <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">선택사항</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">빠른 태그는 무료 분석에 반영돼요 · 긴 글은 메인 앱 프리미엄에서 이용해 주세요</p>
                </div>
                {hasExtraInput && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-50">✓ 입력됨</span>
                )}
              </div>

              {/* Quick tag buttons */}
              <p className="text-xs font-bold text-gray-500 mb-2">빠른 선택</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {QUICK_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <button type="button" key={tag} onClick={() => toggleTag(tag)}
                      className="text-xs px-2.5 py-1.5 rounded-full border transition-all duration-150 active:scale-95"
                      style={{
                        background: active ? "#FEE500" : "white",
                        borderColor: active ? "#FEE500" : "#E5E7EB",
                        color: active ? "#1a1a1a" : "#6B7280",
                        fontWeight: active ? "700" : "500",
                      }}>
                      {active ? "✓ " : ""}{tag}
                    </button>
                  );
                })}
              </div>

              {/* Free text — 무료 API 전송 안 함 */}
              <p className="text-xs font-bold text-gray-500 mb-1.5">직접 작성 (무료 API 미포함)</p>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 300))}
                placeholder="무료 빠른 추정에서는 이 칸이 채워져 있으면 분석 버튼이 비활성화됩니다. 메인 앱의 프리미엄 탭에서 긴 관찰 메모를 넣을 수 있어요."
                rows={4}
                className="w-full text-sm text-gray-700 rounded-2xl p-3.5 resize-none"
                style={{
                  background: "#F9FAFB",
                  border: memo.trim() ? "1.5px solid #F97316" : "1.5px solid #F3F4F6",
                  lineHeight: "1.65",
                  placeholderColor: "#D1D5DB",
                }}
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-gray-400">작성 시 → 빠른 태그·캡처만으로 분석하려면 비워 주세요</p>
                <p className="text-xs" style={{ color: memo.length > 260 ? "#EF4444" : "#9CA3AF" }}>{memo.length} / 300</p>
              </div>
            </div>

            {/* ── Final CTA ── */}
            <div className="anim-su d4">
              <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${images.length > 0 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {images.length > 0 ? "✓" : "○"} 캡처 {images.length > 0 ? `${images.length}장` : "없음"}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${hasExtraInput ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {hasExtraInput ? "✓" : "○"} 추가 정보 {hasExtraInput ? "있음" : "없음"}
                </span>
                {(isMulti || selectedTags.length > 0) && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
                    style={{ background: "#FEE50033", color: "#856C00" }}>
                    ✨ 높은 정확도
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={startAnalysis}
                disabled={!canAnalyze}
                className="w-full py-5 rounded-2xl font-extrabold text-base transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  background: canAnalyze
                    ? "linear-gradient(135deg, #FEE500, #FFD000)"
                    : "#F3F4F6",
                  color: canAnalyze ? "#1a1a1a" : "#9CA3AF",
                  boxShadow: canAnalyze ? "0 6px 24px rgba(254,229,0,0.5)" : "none",
                  cursor: canAnalyze ? "pointer" : "not-allowed",
                }}>
                <span style={{ fontSize: 20 }}>🔍</span>
                <span>
                  {!canAnalyze && images.length === 0
                    ? "캡처 1장 이상 필요"
                    : !canAnalyze && hasMemoText
                      ? "직접 작성란을 비워 주세요"
                      : isMulti && selectedTags.length > 0
                        ? "종합 MBTI 분석 요청"
                        : isMulti
                          ? `캡처 ${images.length}장으로 MBTI 분석 요청`
                          : "MBTI 분석 요청"}
                </span>
              </button>
              {canAnalyze && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  서버 분석 완료까지 잠시만 기다려 주세요
                </p>
              )}
            </div>
          </div>
        )}

        {/* ════════ LOADING SCREEN ════════ */}
        {stage === "loading" && (
          <div className="pt-14 flex flex-col items-center text-center anim-su">
            <div className="relative w-28 h-28 flex items-center justify-center mb-8">
              <div className="absolute inset-0 rounded-full anim-pr" style={{ background: "rgba(254,229,0,0.3)" }} />
              <div className="absolute inset-2 rounded-full anim-pr" style={{ background: "rgba(254,229,0,0.2)", animationDelay: "0.35s" }} />
              <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl anim-float"
                style={{ background: "#FEE500", fontSize: 36 }}>
                {isMulti ? "🔮" : selectedTags.length ? "✏️" : "🧠"}
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 mb-1">AI가 분석 중이에요</h2>
            <p className="text-gray-500 text-sm mb-3 min-h-5">{loadingMsgs[loadingStep] ?? loadingMsgs[0]}</p>

            {isMulti && (
              <span className="text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#FEE50033", color: "#856C00" }}>
                ✨ 종합 분석 모드 · {images.length}장
              </span>
            )}

            <div className="flex gap-2 mb-8">
              {loadingMsgs.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === loadingStep ? 24 : 8, height: 8, background: i <= loadingStep ? "#FEE500" : "#E5E7EB" }} />
              ))}
            </div>

            <div className="w-full space-y-2.5">
              {loadingSteps.map((label, i) => (
                <div key={label} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-gray-100">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: i < loadingStep ? "#DCFCE7" : "#FFF9C4", fontSize: 18 }}>
                    {i < loadingStep ? "✅" : loadingIcons[i] ?? "🧠"}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: i < loadingStep ? "100%" : i === loadingStep ? "55%" : "0%", background: "#FEE500" }} />
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${i < loadingStep ? "bg-green-400 text-white" : "bg-gray-100"}`}>
                    {i < loadingStep ? "✓" : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════ RESULT SCREEN ════════ */}
        {stage === "result" && result && (
          <div className="pt-6">
            {(isMulti || selectedTags.length > 0) && (
              <div className="text-center mb-4 anim-su">
                <span className="text-xs font-bold px-4 py-1.5 rounded-full shadow-sm"
                  style={{ background: "linear-gradient(90deg,#FEE500cc,#A29BFE55)", color: "#333" }}>
                  {isMulti && selectedTags.length > 0
                    ? "✨ 대화 + 프로필 + 빠른 태그 반영"
                    : isMulti
                      ? "✨ 대화 + 프로필 종합 분석 결과"
                      : "✨ 빠른 태그 반영 분석 결과"}
                </span>
              </div>
            )}

            <div className="rounded-3xl overflow-hidden shadow-xl mb-4 anim-su d1"
              style={{ background: `linear-gradient(135deg,${result.color}22,${result.color}44)`, border: `2px solid ${result.color}44` }}>
              <div className="p-6 text-center">
                {targetName.trim() && (
                  <p className="text-xs font-bold text-gray-400 mb-2 tracking-wide uppercase">
                    {targetName}의 MBTI
                  </p>
                )}
                <div className="text-5xl mb-3 anim-float">{result.emoji}</div>
                <div className="text-5xl font-black tracking-widest mb-1" style={{ color: result.color }}>{result.type}</div>
                <p className="text-gray-600 font-semibold text-sm mb-3">{result.title}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {result.tags.map((tag) => (
                    <span key={tag} className="text-xs font-bold px-3 py-1 rounded-full text-white" style={{ background: result.color }}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>

            {isMulti && (
              <div className="grid grid-cols-2 gap-3 mb-4 anim-su d2">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-700 mb-2">💬 대화 분석</p>
                  {result.traits.slice(0, 2).map((t) => <p key={t} className="text-xs text-gray-500 mb-1">• {t}</p>)}
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-extrabold text-gray-700 mb-2">👤 프로필 분석</p>
                  <p className="text-xs text-gray-500 mb-1">• {result.profile.mood}</p>
                  <p className="text-xs text-gray-500">• {result.profile.status}</p>
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d2">
                <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#FEE500" }}>✏️</span>
                  선택하신 빠른 태그
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-3 whitespace-pre-line">{selectedTags.join("\n")}</p>
              </div>
            )}

            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d3">
              <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#FEE500" }}>💬</span>
                주요 말투 특징
              </h3>
              <div className="space-y-2.5">
                {result.traits.map((trait, i) => (
                  <div key={`${trait}-${i}`} className="flex items-center gap-3 p-3 rounded-2xl anim-su"
                    style={{ background: "#F9FAFB", animationDelay: `${0.3 + i * 0.08}s`, opacity: 0 }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: result.color, color: "white" }}>{i + 1}</div>
                    <span className="text-sm text-gray-700 font-medium">{trait}</span>
                  </div>
                ))}
              </div>
            </div>

            {isMulti && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d4">
                <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#A29BFE" }}>👤</span>
                  프로필 분위기 분석
                </h3>
                <div className="space-y-2.5 mb-4">
                  {[
                    { label: "전체 무드", value: result.profile.mood, icon: "🌈" },
                    { label: "상태 메시지 스타일", value: result.profile.status, icon: "✍️" },
                    { label: "배경 이미지 취향", value: result.profile.bg, icon: "🖼️" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "#EDE9FE" }}>
                      <span className="flex-shrink-0 mt-0.5" style={{ fontSize: 18 }}>{item.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-purple-500 mb-0.5">{item.label}</p>
                        <p className="text-sm text-gray-700 font-medium">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                  <span className="text-xs font-extrabold text-gray-700 whitespace-nowrap">✨ 첫인상 점수</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${result.profile.score}%`, background: "linear-gradient(90deg,#A29BFE,#7C3AED)" }} />
                  </div>
                  <span className="text-xl font-black" style={{ color: "#7C3AED" }}>{result.profile.score}</span>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-4 mb-5 anim-su d5"
              style={{ background: "linear-gradient(135deg,#FEE50022,#FEE50044)", border: "1px solid #FEE50066" }}>
              <p className="text-xs font-bold text-yellow-700 mb-1">⚠️ 주의사항</p>
              <p className="text-xs text-yellow-600 leading-relaxed">이 분석은 재미를 위한 것으로, 실제 MBTI와 다를 수 있어요. 사람의 성격은 하나의 도구로 단정지을 수 없답니다 😊</p>
            </div>

            <div className="flex gap-3 anim-su d6">
              <button type="button" onClick={handleReset}
                className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-white border-2 border-gray-200 active:scale-95 transition-transform text-sm">
                다시 분석하기
              </button>
              <button
                type="button"
                className="flex-1 py-4 rounded-2xl font-bold text-gray-900 active:scale-95 transition-transform text-sm shadow-lg"
                style={{ background: "#FEE500" }}
                onClick={() => alert(`${result.type} 결과 공유! (백엔드 연동 시 실제 공유 가능)`)}>
                결과 공유하기 🔗
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
