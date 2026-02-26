/**
 * File → Base64 변환 (리사이즈 포함, max 1024px, JPEG 80%)
 */
export function fileToBase64(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

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

        const base64 = canvas.toDataURL("image/jpeg", 0.8);
        resolve({
          base64,
          base64Data: base64.split(",")[1],
          mimeType: "image/jpeg",
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
