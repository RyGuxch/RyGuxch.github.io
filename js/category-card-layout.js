(() => {
  const pageSelector = '#page > .category-lists'

  function getDirectChildren(element, selector) {
    return Array.from(element.children).filter(child => child.matches(selector))
  }

  function getDirectChild(element, selector) {
    return getDirectChildren(element, selector)[0] || null
  }

  function parseCategoryItem(item) {
    const link = getDirectChild(item, '.category-list-link')
    const count = getDirectChild(item, '.category-list-count')
    const childList = getDirectChild(item, '.category-list-child')

    return {
      name: link ? link.textContent.trim() : '',
      href: link ? link.getAttribute('href') : '#',
      count: count ? Number.parseInt(count.textContent.trim(), 10) || 0 : 0,
      children: childList
        ? getDirectChildren(childList, '.category-list-item').map(parseCategoryItem)
        : []
    }
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName)

    if (className) {
      element.className = className
    }

    if (typeof text === 'string') {
      element.textContent = text
    }

    return element
  }

  function createCountBadge(count) {
    return createElement('span', 'category-tree__count', `${count}`)
  }

  function renderTree(nodes, depth = 1) {
    const list = createElement('ul', `category-tree category-tree--depth-${Math.min(depth, 3)}`)

    nodes.forEach(node => {
      const item = createElement('li', 'category-tree__item')
      const row = createElement('div', 'category-tree__row')
      const link = createElement('a', 'category-tree__link', node.name)

      link.href = node.href
      row.append(link, createCountBadge(node.count))
      item.append(row)

      if (node.children.length) {
        item.append(renderTree(node.children, depth + 1))
      }

      list.append(item)
    })

    return list
  }

  function buildPreview(children) {
    const preview = createElement('div', 'category-card__preview')
    const maxVisible = 4

    children.slice(0, maxVisible).forEach(child => {
      const chip = createElement('span', 'category-card__chip', child.name)

      preview.append(chip)
    })

    if (children.length > maxVisible) {
      preview.append(createElement('span', 'category-card__chip category-card__chip--muted', `+${children.length - maxVisible}`))
    }

    return preview
  }

  function buildCard(node, index) {
    const card = createElement('article', 'category-card')
    const header = createElement('div', 'category-card__header')
    const titleWrap = createElement('div', 'category-card__title-wrap')
    const title = createElement('a', 'category-card__title', node.name)
    const meta = createElement('div', 'category-card__meta')
    const metaPrimary = createElement('span', 'category-card__meta-item', `${node.count} 篇文章`)

    title.href = node.href
    meta.append(metaPrimary)

    if (node.children.length) {
      meta.append(createElement('span', 'category-card__meta-item', `${node.children.length} 个子分类`))
    }

    titleWrap.append(title, meta)
    header.append(titleWrap)

    if (node.children.length) {
      const panelId = `category-card-panel-${index}`
      const toggle = createElement('button', 'category-card__toggle')
      const panel = createElement('div', 'category-card__panel')
      const panelInner = createElement('div', 'category-card__panel-inner')
      const toggleLabel = createElement('span', 'category-card__toggle-label', '展开子分类')
      const toggleIcon = createElement('span', 'category-card__toggle-icon')

      toggle.type = 'button'
      toggle.setAttribute('aria-expanded', 'false')
      toggle.setAttribute('aria-controls', panelId)
      toggleIcon.innerHTML = '<i class="fas fa-chevron-down"></i>'
      toggle.append(toggleLabel, toggleIcon)
      header.append(toggle)

      panel.id = panelId
      panelInner.append(renderTree(node.children))
      panel.append(panelInner)

      toggle.addEventListener('click', () => {
        const nextExpanded = toggle.getAttribute('aria-expanded') !== 'true'

        toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false')
        toggleLabel.textContent = nextExpanded ? '收起子分类' : '展开子分类'
        card.classList.toggle('is-open', nextExpanded)
      })

      card.append(header, buildPreview(node.children), panel)
    } else {
      const emptyState = createElement('div', 'category-card__preview category-card__preview--solo')
      const directLink = createElement('a', 'category-card__chip category-card__chip--link', '直接查看')

      directLink.href = node.href
      emptyState.append(directLink)
      card.append(header, emptyState)
    }

    return card
  }

  function initCategoryCards() {
    const wrapper = document.querySelector(pageSelector)

    if (!wrapper || wrapper.classList.contains('category-card-layout')) {
      return
    }

    const rootList = getDirectChild(wrapper, '.category-list')

    if (!rootList) {
      return
    }

    const topLevelNodes = getDirectChildren(rootList, '.category-list-item').map(parseCategoryItem)
    const grid = createElement('div', 'category-card-grid')
    const page = wrapper.closest('#page')

    page?.classList.add('category-card-page')

    topLevelNodes.forEach((node, index) => {
      grid.append(buildCard(node, index))
    })

    wrapper.classList.add('category-card-layout')
    wrapper.replaceChildren(grid)
  }

  document.addEventListener('DOMContentLoaded', initCategoryCards)
  document.addEventListener('pjax:complete', initCategoryCards)
})()
