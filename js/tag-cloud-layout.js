(() => {
  const selector = '#page .tag-cloud-list'
  const mobileBreakpoint = 720
  const palette = ['#5d74f6', '#78c7f7', '#f2cf69', '#ee8b74', '#8b6cf7', '#f1b25b', '#9eb9ff']
  let resizeTimer = null

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

  function hashText(text) {
    let hash = 0

    for (let index = 0; index < text.length; index += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(index)
      hash |= 0
    }

    return Math.abs(hash)
  }

  function getWeight(tag) {
    if (!tag.dataset.cloudWeight) {
      const inlineSize = parseFloat(tag.style.fontSize)
      const computedSize = parseFloat(window.getComputedStyle(tag).fontSize) / 16
      tag.dataset.cloudWeight = String(inlineSize || computedSize || 1)
    }

    return parseFloat(tag.dataset.cloudWeight)
  }

  function getColor(text, index) {
    return palette[(hashText(`${text}-${index}`) + index) % palette.length]
  }

  function setBaseTagStyle(tag) {
    tag.style.margin = '0'
    tag.style.padding = '0'
    tag.style.borderRadius = '0'
    tag.style.background = 'none'
    tag.style.boxShadow = 'none'
    tag.style.textDecoration = 'none'
    tag.style.whiteSpace = 'nowrap'
    tag.style.lineHeight = '1.08'
    tag.style.transform = 'translate3d(0, 0, 0)'
  }

  function measureTag(tag) {
    const rect = tag.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  }

  function overlaps(rect, placed, gap) {
    return placed.some(item => (
      rect.x < item.x + item.width + gap &&
      rect.x + rect.width + gap > item.x &&
      rect.y < item.y + item.height + gap &&
      rect.y + rect.height + gap > item.y
    ))
  }

  function fitsEllipse(rect, centerX, centerY, radiusX, radiusY) {
    const inset = 8
    const points = [
      [rect.x + rect.width / 2, rect.y + rect.height / 2],
      [rect.x + inset, rect.y + inset],
      [rect.x + rect.width - inset, rect.y + inset],
      [rect.x + inset, rect.y + rect.height - inset],
      [rect.x + rect.width - inset, rect.y + rect.height - inset]
    ]

    return points.every(([pointX, pointY]) => {
      const normalizedX = (pointX - centerX) / radiusX
      const normalizedY = (pointY - centerY) / radiusY
      return normalizedX * normalizedX + normalizedY * normalizedY <= 1.02
    })
  }

  function prepareItems(tags, containerWidth) {
    const weights = tags.map(getWeight)
    const minWeight = Math.min(...weights)
    const maxWeight = Math.max(...weights)

    return tags.map((tag, index) => {
      const text = tag.textContent.trim()
      const weight = getWeight(tag)
      const normalized = maxWeight === minWeight ? 0.5 : (weight - minWeight) / (maxWeight - minWeight)
      const bonus = text.length <= 4 ? 3 : text.length <= 8 ? 0 : -4
      const fontSize = clamp(
        containerWidth * 0.018 + normalized * containerWidth * 0.026 + bonus,
        20,
        74
      )
      const opacity = (0.72 + normalized * 0.28).toFixed(2)

      setBaseTagStyle(tag)
      tag.style.position = 'absolute'
      tag.style.left = '0'
      tag.style.top = '0'
      tag.style.display = 'inline-block'
      tag.style.visibility = 'hidden'
      tag.style.fontSize = `${fontSize}px`
      tag.style.fontWeight = normalized > 0.7 ? '700' : normalized > 0.35 ? '600' : '500'
      tag.style.letterSpacing = normalized > 0.55 ? '0.02em' : '0'
      tag.style.color = getColor(text, index)
      tag.style.opacity = opacity
      tag.style.textShadow = '0 10px 24px rgba(107, 118, 145, 0.14)'

      const box = measureTag(tag)

      return {
        tag,
        text,
        normalized,
        width: box.width,
        height: box.height
      }
    }).sort((left, right) => right.normalized - left.normalized || right.width - left.width)
  }

  function applyCompactLayout(list, tags) {
    list.classList.remove('tag-cloud-ready')
    list.classList.add('tag-cloud-compact')
    list.style.height = 'auto'

    tags.forEach((tag, index) => {
      const weight = getWeight(tag)
      const fontSize = clamp(16 + weight * 6, 16, 32)

      setBaseTagStyle(tag)
      tag.style.position = 'relative'
      tag.style.left = 'auto'
      tag.style.top = 'auto'
      tag.style.display = 'inline-block'
      tag.style.visibility = 'visible'
      tag.style.fontSize = `${fontSize}px`
      tag.style.fontWeight = weight > 1.5 ? '700' : '600'
      tag.style.letterSpacing = '0'
      tag.style.color = getColor(tag.textContent.trim(), index)
      tag.style.opacity = '0.95'
      tag.style.textShadow = '0 6px 14px rgba(107, 118, 145, 0.14)'
    })
  }

  function placeItems(items, width, height) {
    const placed = []
    const centerX = width / 2
    const centerY = height / 2
    const radiusX = width / 2 - 22
    const radiusY = height / 2 - 18
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    for (const item of items) {
      let placedRect = null
      const gap = clamp(12 - item.normalized * 6, 5, 12)
      const angleOffset = (hashText(item.text) % 360) * (Math.PI / 180)

      for (let step = 0; step < 2400; step += 1) {
        const radius = 6 + Math.sqrt(step) * (10 + (1 - item.normalized) * 2.8)
        const angle = angleOffset + step * goldenAngle
        const candidate = {
          x: centerX + Math.cos(angle) * radius * 1.18 - item.width / 2,
          y: centerY + Math.sin(angle) * radius * 0.84 - item.height / 2,
          width: item.width,
          height: item.height
        }

        if (!fitsEllipse(candidate, centerX, centerY, radiusX, radiusY)) {
          continue
        }

        if (overlaps(candidate, placed, gap)) {
          continue
        }

        placedRect = candidate
        break
      }

      if (!placedRect) {
        return null
      }

      placed.push(placedRect)
    }

    return placed
  }

  function applyCloudLayout(list) {
    const tags = Array.from(list.querySelectorAll('a'))
    const page = list.closest('#page')

    page?.classList.add('tag-cloud-page')

    if (!tags.length) {
      return
    }

    const width = Math.max(320, list.clientWidth - 8)

    if (width < mobileBreakpoint) {
      applyCompactLayout(list, tags)
      return
    }

    list.classList.remove('tag-cloud-compact')
    list.classList.add('tag-cloud-ready')

    const items = prepareItems(tags, width)
    const heights = [
      clamp(width * 0.56, 380, 520),
      clamp(width * 0.68, 450, 620),
      clamp(width * 0.8, 520, 700)
    ]

    let placements = null
    let finalHeight = heights[0]

    for (const height of heights) {
      list.style.height = `${Math.round(height)}px`
      placements = placeItems(items, width, height)

      if (placements) {
        finalHeight = height
        break
      }
    }

    if (!placements) {
      applyCompactLayout(list, tags)
      return
    }

    list.style.height = `${Math.round(finalHeight)}px`

    items.forEach((item, index) => {
      const placement = placements[index]
      item.tag.style.left = `${placement.x}px`
      item.tag.style.top = `${placement.y}px`
      item.tag.style.visibility = 'visible'
    })
  }

  function initTagCloud() {
    document.querySelectorAll(selector).forEach(applyCloudLayout)
  }

  function scheduleLayout() {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(initTagCloud, 150)
  }

  document.addEventListener('DOMContentLoaded', initTagCloud)
  document.addEventListener('pjax:complete', initTagCloud)
  window.addEventListener('resize', scheduleLayout)
})()
