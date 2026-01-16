import { toPng } from 'html-to-image'

export async function exportCaptura(
  element: HTMLElement,
  filename: string
) {
  const dataUrl = await toPng(element, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    cacheBust: true
  })

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.click()
}
