import { createApp, defineComponent, h, type Component } from 'vue'

/**
 * Programmatically mount a dialog component and return a Promise.
 * The component must emit:
 *   - 'confirm' with a value → resolves the Promise with that value
 *   - 'close'               → resolves with null
 */
export function openDialog<T>(
  DialogComponent: Component,
  props: Record<string, unknown> = {},
): Promise<T | null> {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    const app = createApp(
      defineComponent({
        setup() {
          function done(val: T | null): void {
            app.unmount()
            container.remove()
            resolve(val)
          }
          return () =>
            h(DialogComponent, {
              ...props,
              onConfirm: (val: T) => done(val),
              onClose: () => done(null),
            })
        },
      }),
    )

    app.mount(container)
  })
}
