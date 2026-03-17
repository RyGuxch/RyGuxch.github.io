(() => {
  const typedAsset = 'https://cdn.jsdelivr.net/npm/typed.js@2.1.0/dist/typed.umd.min.js'
  const selectors = ['#page-site-info #site-title', '#post-info .post-title']
  const typedOptions = {
    startDelay: 300,
    typeSpeed: 150,
    backSpeed: 50,
    loop: true,
    showCursor: true,
    cursorChar: '|'
  }

  function getTitleElements() {
    return selectors.flatMap(selector => Array.from(document.querySelectorAll(selector)))
  }

  function initTypedTitle(element) {
    const text = (element.dataset.typedSource || element.textContent || '').trim()

    if (!text || element.dataset.typedReady === 'true') {
      return
    }

    element.dataset.typedSource = text
    element.dataset.typedReady = 'true'
    element.textContent = ''

    new window.Typed(element, {
      ...typedOptions,
      strings: [text]
    })
  }

  function run() {
    if (window.GLOBAL_CONFIG_SITE && window.GLOBAL_CONFIG_SITE.isHome) {
      return
    }

    const titles = getTitleElements()

    if (!titles.length) {
      return
    }

    const boot = () => titles.forEach(initTypedTitle)

    if (typeof window.Typed === 'function') {
      boot()
      return
    }

    if (typeof window.getScript === 'function') {
      window.getScript(typedAsset).then(boot)
    }
  }

  document.addEventListener('DOMContentLoaded', run)
  document.addEventListener('pjax:complete', run)
})()
