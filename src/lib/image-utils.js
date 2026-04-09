/**
 * 무료·프리미엄 공통: 긴 변 기준 리사이즈 + JPEG 압축
 */
const IMAGE_COMPRESS = { maxSize: 500, quality: 0.52 };

/**
 * File → Base64 변환
 * @param {File}   file        - 원본 이미지 파일
 * @param {number} totalImages - 호환용(이전 API). 압축 강도에는 사용하지 않음
 * @param {function} [onProgress] - (index, total) 콜백 (선택)
 * @param {{ tier?: 'free'|'premium' }} [options] - 호환용. 티어별 압축 차이 없음
 */
export function fileToBase64(file, totalImages = 1, onProgress, options = {}) {
  void totalImages;
  void options;
  const preset = IMAGE_COMPRESS;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const { maxSize, quality } = preset;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL("image/jpeg", quality);
        if (onProgress) onProgress();
        resolve({
          base64,
          base64Data: base64.split(",")[1],
          mimeType: "image/jpeg",
          originalSize: file.size,
          compressedSize: Math.round((base64.length * 3) / 4),
        });
      };
      // 브라우저는 onerror 에 ProgressEvent 를 넘김 → reject(event) 시 Next 오버레이가 [object Event] 로만 표시됨
      img.onerror = () =>
        reject(new Error("이미지를 불러오거나 압축할 수 없습니다. 다른 파일로 시도해 주세요."));
      img.src = reader.result;
    };
    reader.onerror = () => {
      const hint = reader.error?.message;
      reject(
        new Error(
          hint
            ? `파일을 읽을 수 없습니다: ${hint}`
            : "이미지 파일을 읽을 수 없습니다.",
        ),
      );
    };
    reader.readAsDataURL(file);
  });
}

export function stripBase64Prefix(base64DataUri) {
  const idx = base64DataUri.indexOf(",");
  return idx >= 0 ? base64DataUri.slice(idx + 1) : base64DataUri;
}
