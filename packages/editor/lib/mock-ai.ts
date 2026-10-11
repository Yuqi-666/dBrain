import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";

export type Language = string;
export type Tone = string;
export type TextOptions = {
  stream?: boolean;
  format?: string;
  insertAt?: { from: number; to: number } | "start" | "end" | "cursor";
  regenerate?: boolean;
  text?: string;
  tone?: string;
  language?: string;
};

export interface AiContext {
  editor: Editor;
  tr: Transaction | null;
  from: number;
  to: number;
  text: string;
}

export interface AiErrorContext {
  editor: Editor;
  error: Error;
}

export interface AiOptions {
  appId: string;
  token: string;
  autocompletion: boolean;
  showDecorations: boolean;
  hideDecorationsOnStreamEnd: boolean;
  onLoading?: (context: AiContext) => void;
  onChunk?: (context: AiContext) => void;
  onSuccess?: (context: AiContext) => void;
  onError?: (context: AiErrorContext) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ai: {
      aiComplete: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiAccept: () => ReturnType;
      aiReject: (options?: { type?: string }) => ReturnType;
      aiFixSpellingAndGrammar: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiExtend: (options?: { stream?: boolean; format?: string }) => ReturnType;
      aiShorten: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiSimplify: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiEmojify: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiSummarize: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiAdjustTone: (
        tone: string,
        options?: { stream?: boolean; format?: string },
      ) => ReturnType;
      aiTranslate: (
        language: string,
        options?: { stream?: boolean; format?: string },
      ) => ReturnType;
      aiGenerationSetIsLoading: (isLoading: boolean) => ReturnType;
      aiGenerationHasMessage: (hasMessage: boolean) => ReturnType;
      aiGenerationShow: () => ReturnType;
      aiGenerationHide: () => ReturnType;
      aiRegenerate: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiRephrase: (options?: {
        stream?: boolean;
        format?: string;
      }) => ReturnType;
      aiTextPrompt: (options?: {
        text?: string;
        insert?: boolean;
        stream?: boolean;
        tone?: string;
        format?: string;
      }) => ReturnType;
    };
  }

  interface Storage {
    ai: {
      state: string;
      generatedWith?: { range?: { from: number; to: number } };
      response?: string;
    };
    aiAdvanced: {
      state: string;
    };
  }
}

const MOCK_AI_TEXT = "[AI: 功能在此版本中不可用]";

export const MockAi = Extension.create<AiOptions>({
  name: "ai",

  addOptions() {
    return {
      appId: "",
      token: "",
      autocompletion: false,
      showDecorations: true,
      hideDecorationsOnStreamEnd: true,
    };
  },

  addStorage() {
    return {
      state: "idle",
    };
  },

  addCommands() {
    return {
      aiComplete:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          if (this.options.onLoading) {
            this.options.onLoading({
              editor,
              tr: null,
              from: 0,
              to: 0,
              text: "",
            });
          }

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);

            if (this.options.onSuccess) {
              this.options.onSuccess({
                editor,
                tr: null,
                from: 0,
                to: 0,
                text: MOCK_AI_TEXT,
              });
            }
          }, 100);

          return true;
        },

      aiAccept:
        () =>
        ({ editor, commands }) => {
          editor.commands.aiGenerationHide();
          editor.commands.aiGenerationHasMessage(false);
          return commands.aiGenerationHide();
        },

      aiReject:
        () =>
        ({ editor, commands }) => {
          editor.commands.aiGenerationHide();
          editor.commands.aiGenerationHasMessage(false);
          return commands.aiGenerationHide();
        },

      aiFixSpellingAndGrammar:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiExtend:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiShorten:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiSimplify:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiEmojify:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiSummarize:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiAdjustTone:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiTranslate:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiGenerationSetIsLoading:
        (isLoading: boolean) =>
        ({ editor }) => {
          if ("aiGenerationSetIsLoading" in editor.commands) {
            return editor.commands.aiGenerationSetIsLoading(isLoading);
          }
          return true;
        },

      aiGenerationHasMessage:
        (hasMessage: boolean) =>
        ({ editor }) => {
          if ("aiGenerationHasMessage" in editor.commands) {
            return editor.commands.aiGenerationHasMessage(hasMessage);
          }
          return true;
        },

      aiGenerationShow:
        () =>
        ({ editor }) => {
          if ("aiGenerationShow" in editor.commands) {
            return editor.commands.aiGenerationShow();
          }
          return true;
        },

      aiRegenerate:
        () =>
        ({ editor, chain }) => {
          editor.commands.aiGenerationSetIsLoading(true);
          editor.commands.aiGenerationHasMessage(true);

          setTimeout(() => {
            chain()
              .focus()
              .deleteRange({ from: 0, to: editor.state.doc.content.size })
              .insertContent(MOCK_AI_TEXT)
              .run();

            editor.commands.aiGenerationSetIsLoading(false);
          }, 100);

          return true;
        },

      aiRephrase:
        () =>
        ({ chain }) => {
          setTimeout(() => {
            chain().focus().insertContent(MOCK_AI_TEXT).run();
          }, 100);
          return true;
        },

      aiTextPrompt:
        (options?) =>
        ({ chain }) => {
          setTimeout(() => {
            if (options?.insert) {
              chain().focus().insertContent(MOCK_AI_TEXT).run();
            }
          }, 100);
          return true;
        },

      aiGenerationHide:
        () =>
        ({ editor }) => {
          if ("aiGenerationHide" in editor.commands) {
            return editor.commands.aiGenerationHide();
          }
          return true;
        },
    };
  },
});

export default MockAi;
