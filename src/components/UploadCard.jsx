"use client";

import { useState, useRef } from "react";
import GlassCard from "./GlassCard";

export default function UploadCard({
  images,
  targetName,
  onAddImages,
  onRemoveImage,
  onTargetNameChange,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const isMulti = images.length >= 2;

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    onAddImages(e.dataTransfer.files);
  };

  return (
    <GlassCard animate delay={2} className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-extrabold text-gray-900 text-sm">캡처 업로드</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            최대 5장까지 한번에 올릴 수 있어요
          </p>
        </div>
        {images.length > 0 && (
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full text-gray-900"
            style={{ background: isMulti ? "#FEE500" : "#F3F4F6" }}
          >
            {isMulti ? "✨ 종합 분석 모드" : `📎 ${images.length}장`}
          </span>
        )}
      </div>

      {/* 이름 입력 */}
      <div className="mb-3">
        <p className="text-xs font-bold text-gray-500 mb-0.5 flex items-center gap-1">
          👤 분석할 상대방 이름
          <span className="text-xs font-normal text-gray-400 bg-white/50 px-1.5 py-0.5 rounded-full">
            단체톡 필수
          </span>
        </p>
        <p className="text-xs text-gray-400 mb-1.5">
          캡처에 표시된 이름을{" "}
          <b className="text-gray-500">정확하게</b> 입력해주세요
        </p>
        <div className="relative">
          <input
            type="text"
            value={targetName}
            onChange={(e) => onTargetNameChange(e.target.value.slice(0, 20))}
            placeholder="예) 캡처에 보이는 그대로 — 김민준, 박지수 등"
            className="w-full text-sm text-gray-700 rounded-xl px-4 py-2.5 transition-all duration-200 bg-white/60"
            style={{
              border: targetName.trim()
                ? "1.5px solid #FEE500"
                : "1.5px solid rgba(255,255,255,0.4)",
            }}
          />
          {targetName.trim() && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-green-400 flex items-center justify-center text-white text-xs font-bold">
              ✓
            </div>
          )}
        </div>
        {targetName.trim() && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            ✓ <b>{targetName}</b>의 말풍선을 집중 분석할게요
          </p>
        )}
      </div>

      {/* 드롭존 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => images.length < 5 && fileRef.current?.click()}
        className="rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer mb-3"
        style={{
          borderColor: isDragging
            ? "#FEE500"
            : images.length > 0
              ? "rgba(255,255,255,0.4)"
              : "rgba(200,200,200,0.5)",
          background: isDragging
            ? "rgba(254,229,0,0.06)"
            : images.length > 0
              ? "rgba(255,255,255,0.3)"
              : "rgba(255,255,255,0.2)",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => onAddImages(e.target.files)}
        />

        {images.length === 0 ? (
          <div className="py-10 px-6 text-center">
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-3xl"
              style={{
                background: isDragging ? "#FEE500" : "#FFF9C4",
              }}
            >
              📁
            </div>
            <p className="font-bold text-gray-800 text-sm mb-1">
              여기에 캡처를 올려주세요
            </p>
            <p className="text-gray-400 text-xs mb-4">
              클릭하거나 파일을 끌어다 놓으세요
            </p>
            <div
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-gray-900 text-xs shadow-md"
              style={{ background: "#FEE500" }}
            >
              📎 파일 선택하기
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {images.map((img, i) => (
                <div
                  key={i}
                  className="relative rounded-xl overflow-hidden anim-pop"
                  style={{ aspectRatio: "1" }}
                >
                  <img
                    src={img.preview}
                    alt={`캡처 ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1">
                    <span
                      className="font-bold text-white rounded-md px-1.5 py-0.5 shadow"
                      style={{
                        background:
                          i === 0
                            ? "rgba(0,0,0,0.55)"
                            : "rgba(90,70,180,0.75)",
                        fontSize: 9,
                      }}
                    >
                      {i === 0 ? "💬 대화" : "👤 프로필"}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveImage(i);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <div
                  className="rounded-xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-1 text-gray-300"
                  style={{ aspectRatio: "1" }}
                >
                  <span className="text-xl font-light">+</span>
                  <span className="text-xs">추가</span>
                </div>
              )}
            </div>
            <p className="text-xs text-center text-gray-400">
              총 {images.length}장 · ✕로 삭제
            </p>
          </div>
        )}
      </div>

      {/* 상태 배너 */}
      <div
        className="rounded-2xl p-3"
        style={{
          background:
            images.length === 0
              ? "rgba(255,251,235,0.8)"
              : isMulti
                ? "linear-gradient(135deg,rgba(254,229,0,0.1),rgba(162,155,254,0.08))"
                : "rgba(240,253,244,0.8)",
          border:
            images.length === 0
              ? "1px solid #FDE68A"
              : isMulti
                ? "1px solid rgba(254,229,0,0.35)"
                : "1px solid #BBF7D0",
        }}
      >
        {images.length === 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold text-amber-700 mb-1">
              💡 이런 캡처가 잘 분석돼요
            </p>
            <p className="text-xs text-amber-600">
              📱 <b>대화 캡처</b> — 상대방 말풍선이 <b>3개 이상</b> 포함된 화면
            </p>
            <p className="text-xs text-amber-600">
              👤 <b>프로필 캡처</b> — 프로필 사진·상태 메시지가 보이는 화면{" "}
              <span className="bg-amber-100 px-1 rounded font-bold">
                선택사항
              </span>
            </p>
          </div>
        )}
        {images.length > 0 && !isMulti && (
          <p className="text-xs text-green-700 font-medium text-center">
            ✅ 업로드 완료!{" "}
            <span className="text-gray-500">
              프로필 캡처도 추가하면 더 정확한 분석이 가능해요 👤
            </span>
          </p>
        )}
        {isMulti && (
          <p
            className="text-xs font-bold text-center"
            style={{ color: "#856C00" }}
          >
            🚀 종합 분석 모드 — 말투 + 프로필 동시 분석으로 정확도 UP!
          </p>
        )}
      </div>
    </GlassCard>
  );
}
