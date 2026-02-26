/**
 * 이미지 장수에 따른 최대 해상도 / 품질 설정
 * 5장 동시 전송 시 총 페이로드를 ~4MB 이하로 유지
 */
const COMPRESS_PRESETS = {
  1: { maxSize: 1024, quality: 0.82 },
  2: { maxSize: 900,  quality: 0.78 },
  3: { maxSize: 800,  quality: 0.72 },
  4: { maxSize: 720,  quality: 0.68 },
  5: { maxSize: 640,  quality: 0.62 },
};

/**
 * File → Base64 변환
 * @param {File}   file        - 원본 이미지 파일
 * @param {number} totalImages - 함께 전송할 이미지 총 장수 (압축 강도 결정)
 * @param {function} [onProgress] - (index, total) 콜백 (선택)
 */
export function fileToBase64(file, totalImages = 1, onProgress) {
  const preset = COMPRESS_PRESETS[Math.min(totalImages, 5)] ?? COMPRESS_PRESETS[5];

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
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function stripBase64Prefix(base64DataUri) {
  const idx = base64DataUri.indexOf(",");
  return idx >= 0 ? base64DataUri.slice(idx + 1) : base64DataUri;
}
