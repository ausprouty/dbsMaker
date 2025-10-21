import { boot } from 'quasar/wrappers'
export default boot(() => {
  if (import.meta.env.DEV) {
    window.ENV = { ...import.meta.env }
    console.log('[ENV]', window.ENV)
  }
})
