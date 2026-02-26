import { useState, useRef } from "react";

const MBTI_DATA = [
  {
    type: "ENFP", emoji: "🌟", title: "열정적인 활동가", color: "#FF6B6B",
    traits: ["이모티콘 과다 사용자 🎉", "긴 문장 + 많은 느낌표!!", "대화 주제 빠르게 전환", "공감 리액션 마스터"],
    tags: ["#활발", "#공감왕", "#즉흥적"],
    profile: { mood: "밝고 긍정적인 에너지", status: "재밌는 밈이나 노래 가사", bg: "컬러풀하거나 활동적인 사진", score: 88 },
  },
  {
    type: "INTJ", emoji: "🧠", title: "전략적 분석가", color: "#4ECDC4",
    traits: ["짧고 핵심만 전달", "이모티콘 거의 없음", "논리적 문장 구조", "답장 텀이 긴 편"],
    tags: ["#논리적", "#계획적", "#독립적"],
    profile: { mood: "차분하고 신중한 느낌", status: "상태 메시지 없거나 짧은 한마디", bg: "심플하거나 풍경 사진", score: 74 },
  },
  {
    type: "INFJ", emoji: "🌿", title: "선의의 옹호자", color: "#A29BFE",
    traits: ["감정 표현이 섬세함", "긴 글로 마음 전달", "공감하는 말투", "깊은 주제 선호"],
    tags: ["#공감", "#진심", "#내성적"],
    profile: { mood: "감성적이고 내면이 풍부한", status: "시구나 감성적인 문장", bg: "자연이나 감성 사진", score: 92 },
  },
  {
    type: "ESTP", emoji: "⚡", title: "활동적인 모험가", color: "#FD79A8",
    traits: ["빠른 답장 속도", "직설적인 표현", "짧은 메시지 선호", "유머 코드 탑재"],
    tags: ["#즉흥", "#현실적", "#재치있음"],
    profile: { mood: "활기차고 자신감 넘치는", status: "유머러스하거나 없음", bg: "활동적인 아웃도어 사진", score: 85 },
  },
];

const QUICK_TAGS = [
  "말이 많아요", "말이 적어요", "리액션이 과해요", "감정 표현 잘 함",
  "논리적으로 말함", "즉흥적인 편", "계획적인 편", "공감을 잘 해줘요",
  "유머 감각 있음", "진지한 편", "답장이 빨라요", "답장이 느려요",
];

export default function App() {
  const [stage, setStage] = useState("main");
  const [isDragging, setIsDragging] = useState(false);
  const [images, setImages] = useState([]);
  const [targetName, setTargetName] = useState("");
  const [memo, setMemo] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  const isMulti = images.length >= 2;
  const hasMemo = memo.trim().length > 0;
  const canAnalyze = images.length > 0 || hasMemo;

  const loadingSteps = isMulti
    ? ["말투 & 어조 패턴 분석", "이모티콘 사용 빈도 계산", "문장 길이 & 구조 파악", "프로필 분위기 스캔", "추가 정보 종합 분석", "MBTI 데이터와 대조"]
    : hasMemo
    ? ["말투 & 어조 패턴 분석", "추가 입력 정보 분석", "MBTI 데이터와 대조", "분석 결과 정리"]
    : ["말투 & 어조 패턴 분석", "이모티콘 사용 빈도 계산", "문장 길이 & 구조 파악", "MBTI 데이터와 대조"];

  const loadingMsgs = isMulti
    ? ["업로드된 캡처 이미지 분석 중...", "카카오톡 말투 패턴 파악 중...", "프로필 분위기 & 상태 메시지 스캔 중...", "추가 정보 종합 중...", "MBTI 데이터와 대조 중...", "분석 완료! 결과를 정리하고 있어요..."]
    : hasMemo
    ? ["말투 패턴 분석 중...", "입력하신 정보 분석 중...", "MBTI 데이터와 대조 중...", "분석 완료! 결과를 정리하고 있어요..."]
    : ["카카오톡 말투 패턴 분석 중...", "이모티콘 빈도 계산 중...", "MBTI 데이터와 대조 중...", "분석 완료! 결과를 정리하고 있어요..."];

  const addImages = (files) => {
    const newImgs = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 5 - images.length)
      .map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

  const toggleTag = (tag) => {
    setMemo((prev) => {
      const lines = prev.split("\n").filter(Boolean);
      if (lines.includes(tag)) return lines.filter((l) => l !== tag).join("\n");
      return [...lines, tag].join("\n");
    });
  };

  const startAnalysis = () => {
    if (!canAnalyze) return;
    setStage("loading");
    setLoadingStep(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      if (i < loadingMsgs.length) {
        setLoadingStep(i);
      } else {
        clearInterval(timerRef.current);
        setResult(MBTI_DATA[Math.floor(Math.random() * MBTI_DATA.length)]);
        setStage("result");
      }
    }, 900);
  };

  const handleReset = () => {
    clearInterval(timerRef.current);
    setStage("main");
    setLoadingStep(0);
    setResult(null);
    setImages([]);
    setTargetName("");
    setMemo("");
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
                <span className="text-gray-400 text-xs">프로필 캡처는 선택사항이지만, 함께 올리면 더 정확한 분석이 가능해요</span>
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex justify-center gap-2 mb-5 flex-wrap anim-su d1">
              {["🔍 말투 분석", "📸 프로필 분석", "🧠 MBTI 유추"].map((t) => (
                <span key={t} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full shadow-sm font-medium">{t}</span>
              ))}
            </div>

            {/* ── Upload Card ── */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d2">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-extrabold text-gray-900 text-sm">캡처 업로드</h2>
                  <p className="text-xs text-gray-400 mt-0.5">최대 5장까지 한번에 올릴 수 있어요</p>
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
                    onFocus={(e) => e.target.style.border = "1.5px solid #FEE500"}
                    onBlur={(e) => e.target.style.border = targetName.trim() ? "1.5px solid #FEE500" : "1.5px solid #F3F4F6"}
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
                onClick={() => images.length < 5 && fileRef.current?.click()}
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
                        <div key={i} className="relative rounded-xl overflow-hidden anim-pop" style={{ aspectRatio: "1" }}>
                          <img src={img.url} alt={`캡처 ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute top-1 left-1">
                            <span className="font-bold text-white rounded-md px-1.5 py-0.5 shadow"
                              style={{ background: i === 0 ? "rgba(0,0,0,0.55)" : "rgba(90,70,180,0.75)", fontSize: 9 }}>
                              {i === 0 ? "💬 대화" : "👤 프로필"}
                            </span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black bg-opacity-60 flex items-center justify-center text-white"
                            style={{ fontSize: 10 }}>✕</button>
                        </div>
                      ))}
                      {images.length < 5 && (
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
                  <p className="text-xs text-gray-400 mt-0.5">입력할수록 분석 정확도가 높아져요</p>
                </div>
                {hasMemo && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full text-green-700 bg-green-50">✓ 입력됨</span>
                )}
              </div>

              {/* Quick tag buttons */}
              <p className="text-xs font-bold text-gray-500 mb-2">빠른 선택</p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {QUICK_TAGS.map((tag) => {
                  const active = memo.split("\n").includes(tag);
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)}
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

              {/* Free text */}
              <p className="text-xs font-bold text-gray-500 mb-1.5">직접 작성</p>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value.slice(0, 300))}
                placeholder="예) 평소에 말이 많고 리액션이 과한 편이에요. 감정 표현도 잘 하고 유머 감각이 있어요. 계획적이기보다 즉흥적으로 행동하는 것 같아요."
                rows={4}
                className="w-full text-sm text-gray-700 rounded-2xl p-3.5 resize-none"
                style={{
                  background: "#F9FAFB",
                  border: memo.trim() ? "1.5px solid #FEE500" : "1.5px solid #F3F4F6",
                  lineHeight: "1.65",
                  placeholderColor: "#D1D5DB",
                }}
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-gray-300">태그 선택 또는 자유롭게 작성해주세요</p>
                <p className="text-xs" style={{ color: memo.length > 260 ? "#EF4444" : "#9CA3AF" }}>{memo.length} / 300</p>
              </div>
            </div>

            {/* ── Final CTA ── */}
            <div className="anim-su d4">
              {/* Info row showing what's been filled */}
              <div className="flex items-center gap-2 mb-3 px-1 flex-wrap">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${images.length > 0 ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {images.length > 0 ? "✓" : "○"} 캡처 {images.length > 0 ? `${images.length}장` : "없음"}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 ${hasMemo ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {hasMemo ? "✓" : "○"} 추가 정보 {hasMemo ? "입력됨" : "없음"}
                </span>
                {(isMulti || hasMemo) && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1"
                    style={{ background: "#FEE50033", color: "#856C00" }}>
                    ✨ {isMulti && hasMemo ? "최고 정확도" : "높은 정확도"}
                  </span>
                )}
              </div>

              <button
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
                  {isMulti && hasMemo ? "종합 MBTI 분석 요청"
                    : isMulti ? `캡처 ${images.length}장으로 MBTI 분석 요청`
                    : hasMemo && images.length === 0 ? "입력 정보로 MBTI 분석 요청"
                    : "MBTI 분석 요청"}
                </span>
              </button>
              {canAnalyze && (
                <p className="text-xs text-center text-gray-400 mt-2">
                  약 5~10초 내에 결과를 드릴게요
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
                {isMulti ? "🔮" : hasMemo ? "✏️" : "🧠"}
              </div>
            </div>

            <h2 className="text-xl font-extrabold text-gray-900 mb-1">AI가 분석 중이에요</h2>
            <p className="text-gray-500 text-sm mb-3 min-h-5">{loadingMsgs[loadingStep]}</p>

            {isMulti && (
              <span className="text-xs font-bold px-3 py-1 rounded-full mb-4" style={{ background: "#FEE50033", color: "#856C00" }}>
                ✨ 종합 분석 모드 · {images.length}장
              </span>
            )}

            {/* Progress dots */}
            <div className="flex gap-2 mb-8">
              {loadingMsgs.map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{ width: i === loadingStep ? 24 : 8, height: 8, background: i <= loadingStep ? "#FEE500" : "#E5E7EB" }} />
              ))}
            </div>

            {/* Steps list */}
            <div className="w-full space-y-2.5">
              {loadingSteps.map((label, i) => (
                <div key={label} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 shadow-sm border border-gray-100">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: i < loadingStep ? "#DCFCE7" : "#FFF9C4", fontSize: 18 }}>
                    {i < loadingStep ? "✅" : ["💬","😄","📝","📸","✏️","🧠"][i] || "🧠"}
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
            {(isMulti || hasMemo) && (
              <div className="text-center mb-4 anim-su">
                <span className="text-xs font-bold px-4 py-1.5 rounded-full shadow-sm"
                  style={{ background: "linear-gradient(90deg,#FEE500cc,#A29BFE55)", color: "#333" }}>
                  {isMulti && hasMemo ? "✨ 대화 + 프로필 + 추가정보 종합 분석"
                    : isMulti ? "✨ 대화 + 프로필 종합 분석 결과"
                    : "✨ 추가 정보 반영 분석 결과"}
                </span>
              </div>
            )}

            {/* MBTI Card */}
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

            {/* Summary row — multi only */}
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

            {/* User-entered info */}
            {hasMemo && (
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d2">
                <h3 className="font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#FEE500" }}>✏️</span>
                  입력하신 정보
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-2xl p-3 whitespace-pre-line">{memo}</p>
              </div>
            )}

            {/* Chat traits */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4 anim-su d3">
              <h3 className="font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl flex items-center justify-center text-sm" style={{ background: "#FEE500" }}>💬</span>
                주요 말투 특징
              </h3>
              <div className="space-y-2.5">
                {result.traits.map((trait, i) => (
                  <div key={trait} className="flex items-center gap-3 p-3 rounded-2xl anim-su"
                    style={{ background: "#F9FAFB", animationDelay: `${0.3 + i * 0.08}s`, opacity: 0 }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: result.color, color: "white" }}>{i + 1}</div>
                    <span className="text-sm text-gray-700 font-medium">{trait}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Profile analysis — multi only */}
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

            {/* Disclaimer */}
            <div className="rounded-2xl p-4 mb-5 anim-su d5"
              style={{ background: "linear-gradient(135deg,#FEE50022,#FEE50044)", border: "1px solid #FEE50066" }}>
              <p className="text-xs font-bold text-yellow-700 mb-1">⚠️ 주의사항</p>
              <p className="text-xs text-yellow-600 leading-relaxed">이 분석은 재미를 위한 것으로, 실제 MBTI와 다를 수 있어요. 사람의 성격은 하나의 도구로 단정지을 수 없답니다 😊</p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 anim-su d6">
              <button onClick={handleReset}
                className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-white border-2 border-gray-200 active:scale-95 transition-transform text-sm">
                다시 분석하기
              </button>
              <button
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