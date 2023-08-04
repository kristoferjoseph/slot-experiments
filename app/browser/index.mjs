/* global HTMLElement, customElements,  document  */
import MyContentTemplate from '../elements/my-content.mjs'

class BaseElement extends HTMLElement {
  constructor(api) {
    super()
    this.api = api || {}
    this.store = this.api?.store || {}
    this.context = {}
  }

  get state() {
    const attrs = this.attributes.length
      ? this.attrsToObject(this.attributes)
      : {}

    return {
      attrs,
      context: this.context,
      store: this.store
    }
  }

  attrsToObject(attrs = []) {
    const attrsObj = {}
    for (let d = attrs.length - 1; d >= 0; d--) {
      let attr = attrs[d]
      attrsObj[attr.nodeName] = attr.nodeValue
    }
    return attrsObj
  }

  html(strings, ...values) {
    const collect = []
    for (let i = 0; i < strings.length - 1; i++) {
      collect.push(strings[i], values[i])
    }
    collect.push(strings[strings.length - 1])
    return collect.join('')
  }
}

const TemplateMixin = (superclass) => class extends superclass {
  constructor() {
    super()
    if (!this.render || !this.html || !this.state) {
      throw new Error('TemplateMixin must extend Enhance BaseElement')
    }
    const templateName = `${this.tagName.toLowerCase()}-template`
    const template = document.getElementById(templateName)
    const html = this.html || function html() {}
    const state = this.state || {}
    if (template) {
      this.template = template
    }
    else {
      this.template = document.createElement('template')
      this.template.innerHTML = this.render({ html, state })
      this.template.setAttribute('id', templateName)
      document.body.appendChild(this.template)
    }
  }
}

// Mixin specifically for reusing SFCs as Custom Elements in the browser
const CustomElementMixin = (superclass) => class extends superclass {
  constructor() {
    super()
    // Removes style tags as they are already inserted into the head by SSR
    // TODO: If only added dynamically in the browser we need to insert the style tag after running the style transform on it. As well as handle deduplication.
    this.template.content.querySelectorAll('style')
      .forEach((tag) => { this.template.content.removeChild(tag) })
    // Removes script tags as they are already appended to the body by SSR
    // TODO: If only added dynamically in the browser we need to insert the script tag after running the script transform on it. As well as handle deduplication.
    this.template.content.querySelectorAll('script')
      .forEach((tag) => { this.template.content.removeChild(tag) })

    // If the Custom Element was already expanded by SSR it will have children so do not replaceChildren
    if (!this.children.length) {
      // If this Custom Element was added dynamically with JavaScript then use the template contents to expand the element
      this.replaceChildren(this.template.content.cloneNode(true))
    }
  }
}

const SlotMixin = (superclass) => class extends superclass {
  connectedCallback() {
    if (super.connectedCallback) super.connectedCallback()
    const fragment = document.createElement('div')
    fragment.innerHTML = this.innerHTML
    fragment.attachShadow({ mode: 'open' }).appendChild(
      this.template.content.cloneNode(true)
    )

    const children = Array.from(fragment.childNodes)
    children.forEach(child => {
      const slot = child.assignedSlot
      if (slot) {
        console.log('SLOT: ', slot.name, slot.innerHTML)
        //slot.parentNode.replaceChild(child,slot)
      }
    })
    this.innerHTML = fragment.shadowRoot.innerHTML
  }
}

class MyContent extends SlotMixin(CustomElementMixin(TemplateMixin(BaseElement))) {
  constructor() {
    super()
  }

  render(args) {
    return MyContentTemplate(args)
  }
}

customElements.define('my-content', MyContent)

const dynamic = `
<my-content>
  <h1 slot="title">Did it work?</h1>
  <p>
    How'd we do?
  </p>
</my-content>
`

const target = document.querySelector('#target')
target.innerHTML = dynamic
