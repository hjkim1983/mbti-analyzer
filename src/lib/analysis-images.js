/**
 * API로 보낼 이미지가 max를 넘을 때, 앞·중·뒤를 고르게 대표 샘플링
 * (업로드 순서 유지 — 사용자가 첫 장·마지막 장에 의미를 두는 경우 대비)
 * @param {unknown[]} images
 * @param {number} max
 */
export function selectImagesForApi(images, max) {
  if (!Array.isArray(images) || images.length <= max) return images || [];
  const n = images.length;
  const idxs = [];
  for (let k = 0; k < max; k++) {
    idxs.push(Math.round((k * (n - 1)) / Math.max(1, max - 1)));
  }
  return [...new Set(idxs)]
    .sort((a, b) => a - b)
    .map((i) => images[i]);
}
