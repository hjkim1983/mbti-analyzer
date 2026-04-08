"use client";

import { Fragment } from "react";

/**
 * 「」인용 구간을 형광펜 처리하고, 빈 줄로 단락을 나눠 가독성을 높입니다.
 */
function highlightJapaneseQuotes(str) {
  if (typeof str !== "string") return str;
  const parts = str.split(/(「[^」]*」)/g);
  return parts.map((part, idx) =>
    part.startsWith("「") && part.endsWith("」") ? (
      <mark key={idx} className="hl-mark">
        {part}
      </mark>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

function linesInParagraph(p) {
  const lines = p.split("\n");
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 ? <br /> : null}
      {highlightJapaneseQuotes(line)}
    </Fragment>
  ));
}

/**
 * @param {string} text
 * @param {string} className - 단락(p)에 붙는 클래스
 * @param {boolean} compact - true면 최대 줄폭 제한 없음(카드·리스트 안쪽용)
 */
export default function ReadableBlock({ text, className = "", compact = false }) {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const paras = trimmed.split(/\n{2,}/);

  return (
    <div className={compact ? "" : "read-body-wrap"}>
      {paras.map((p, i) => (
        <p key={i} className={`read-body-p ${className}`.trim()}>
          {linesInParagraph(p.trim())}
        </p>
      ))}
    </div>
  );
}
