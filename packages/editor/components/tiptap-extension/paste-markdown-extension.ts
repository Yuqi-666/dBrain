import { Extension } from "@tiptap/core"
import { Plugin } from '@tiptap/pm/state'

export const PasteMarkdown = Extension.create({
  name: 'pasteMarkdown',

  addProseMirrorPlugins() {
    const { editor } = this;
    return [
      new Plugin({
        props: {
          handlePaste(view, event, slice) {
            const text = event.clipboardData?.getData('text/plain')

            if (!text) {
              return false
            }

            if (editor.markdown) {
              // Parse the Markdown text to Tiptap JSON using the Markdown manager
              const json = editor.markdown.parse(text)

              // Insert the parsed JSON content at cursor position
              editor.commands.insertContent(json)
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})
