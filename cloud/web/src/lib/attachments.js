export async function readAttachment(file) {
  if (file.size > 6 * 1024 * 1024) throw new Error('单个文件不能超过 6 MB。');
  if (/^image\/(png|jpeg|webp)$/.test(file.type)) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    const content = canvas.toDataURL('image/jpeg', 0.8);
    if (content.length > 1200000) throw new Error('图片内容过大，请先裁剪后再试。');
    return { name: file.name, type: 'image', content };
  }
  if (!/\.(txt|md|csv|json|js|ts|py|html|css|yaml|yml|log)$/i.test(file.name)) throw new Error('支持图片和文本文件（TXT、Markdown、CSV、代码等）；暂不支持 PDF 或 Word。');
  const content = await file.text();
  if (content.length > 45000) throw new Error('文本附件最多 45,000 字，请截取需要讨论的部分。');
  if (!content.trim() || content.includes('\u0000')) throw new Error('文件为空或不是可读取的文本。');
  return { name: file.name, type: 'text', content };
}
