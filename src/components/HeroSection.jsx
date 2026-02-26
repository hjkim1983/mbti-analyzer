"use client";

export default function HeroSection() {
  return (
    <div className="pt-10 pb-6 text-center anim-slide-up">
      <div className="anim-float inline-block mb-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-lg text-4xl"
          style={{ background: "#FEE500" }}
        >
          💬
        </div>
      </div>
      <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mb-2">
        말투로 MBTI를
        <br />
        읽어드릴게요
      </h1>
      <p className="text-gray-500 text-sm leading-relaxed">
        카톡 대화 캡처를 올려주세요
        <br />
        <span className="text-gray-400 text-xs">
          프로필 캡처는 선택사항이지만, 함께 올리면 더 정확한 분석이 가능해요
        </span>
      </p>

      <div className="flex justify-center gap-2 mt-5 flex-wrap anim-slide-up delay-1">
        {["🔍 말투 분석", "📸 프로필 분석", "🧠 MBTI 유추"].map((t) => (
          <span
            key={t}
            className="text-xs glass-subtle text-gray-600 px-3 py-1.5 rounded-full font-medium"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
