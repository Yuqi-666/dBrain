"use client"

import { ThemeToggle } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor-theme-toggle"

// --- Tiptap UI ---
import { UndoRedoButton } from "@workspace/editor/components/tiptap-ui/undo-redo-button"

// --- UI Primitives ---
import { Spacer } from "@workspace/editor/components/tiptap-ui-primitive/spacer"
import { Separator } from "@workspace/editor/components/tiptap-ui-primitive/separator"
import { ButtonGroup } from "@workspace/editor/components/tiptap-ui-primitive/button-group"

// --- Styles ---
import "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor-header.scss"

import { CollaborationUsers } from "@workspace/editor/components/tiptap-templates/notion-like/notion-like-editor-collaboration-users"

export function NotionEditorHeader() {
  return (
    <header className="notion-like-editor-header">
      <Spacer />
      <div className="notion-like-editor-header-actions">
        <ButtonGroup>
          <ButtonGroup>
            <UndoRedoButton action="undo" />
          </ButtonGroup>
          <ButtonGroup>
            <UndoRedoButton action="redo" />
          </ButtonGroup>
        </ButtonGroup>

        <Separator />

        <ThemeToggle />

        <Separator />

        <CollaborationUsers />
      </div>
    </header>
  )
}
