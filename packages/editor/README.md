# Notion-like

The **Notion-like Editor Template** is a fully featured block-based editor that replicates the familiar Notion experience. It supports collaboration, AI assistance, emoji, drag & drop, advanced formatting—and it’s fully customizable.

[

View in Full Screen

](<https://template.tiptap.dev/preview/templates/notion-like>)

### Start plan required

The Notion-like template requires at least a **Start plan** subscription to use in production. You can integrate and test it during your trial period. Usage of this template is subject to our [Terms of Service](https://tiptap.dev/terms-of-service) and [Pro License](https://tiptap.dev/pro-license).

## [](#installation)Installation

You'll need a Tiptap account with an active subscription or trial. Create one at [cloud.tiptap.dev/register](https://cloud.tiptap.dev/register).

### [](#for-existing-projects)For existing projects

```
npx @tiptap/cli@latest add notion-like-editor
```

### [](#for-new-projects)For new projects

```
npx @tiptap/cli@latest init notion-like-editor
```

This template requires styling and configuration setup.

### [](#styling)Styling

We stay unopinionated about styling frameworks, so you'll need to integrate it with your setup. Follow the [style setup guide](/docs/ui-components/getting-started/style) to ensure the editor displays correctly.

### [](#configuration)Configuration

Before running the app, configure the required constants inside `tiptap-collab-utils.ts`. This is necessary to enable features like AI or collaboration

### [](#environment-variables)Environment Variables

Provide values for the following environment variables:

- `TIPTAP_COLLAB_DOC_PREFIX` - Prefix for identifying collaborative documents
- `TIPTAP_COLLAB_APP_ID` - Your document server ID
- `TIPTAP_COLLAB_TOKEN` - JWT for accessing Collaboration services
- `TIPTAP_AI_APP_ID` - Your AI App ID
- `TIPTAP_AI_TOKEN` - JWT for accessing AI services

The above environment variables should be available in the client-side. Depending on your framework, use the following prefixes to expose them to the client:

- [Next.js](/docs/ui-components/install/next): `NEXT_PUBLIC_`. For example, `NEXT_PUBLIC_TIPTAP_COLLAB_DOC_PREFIX`.
- [Vite + React](/docs/ui-components/install/vite): `VITE_`. For example, `VITE_TIPTAP_COLLAB_DOC_PREFIX`.
- Other frameworks: Follow the specific rules of your framework, and define the variables in the `tiptap-collab-utils.ts` file.

### [](#jwt-authentication)JWT Authentication

Collaboration and AI features require a valid server-generated JWT passed to the editor. See the `fetchCollabToken` function in `tiptap-collab-utils.ts` for an example.

> See the full guide on [JWT authentication](https://tiptap.dev/docs/guides/authentication).

### Generate the JWT

To get started quickly, you can use the example JWT from your Tiptap Cloud account and store them in the `TIPTAP_COLLAB_TOKEN` and `TIPTAP_AI_TOKEN` enviroment variables. However, example JWT are valid for a short time and should not be used in production. In production, implement an API endpoint that generates JWTs on the server side.

### [](#room-prop)`room` prop

Use the `room` prop to distinguish collaborative documents. Each session should use a unique room ID.

### [](#image-uploads)Image uploads

Image uploads require a server side that is not part of our ui components. You can find an example server that accepts an image, uploads it to s3 and then returns the permanent URL for it below. Note that you may want to implement additional checks when running this in production to prevent abuse.

server side (run with `node --experimental-strip-types`)

```
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { v4 } from 'uuid'

const S3_REGION = 'xxx'
const S3_BUCKET = 'xxx'
const S3_ACCESS_KEY= 'xxx'
const S3_ACCESS_SECRET_KEY='xxx'

const PORT = 1234
const BASE_URL = `http://127.0.0.1:${PORT}`

const app = new Hono()
const client = new S3Client({
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_ACCESS_SECRET_KEY,
  }
});

// in production, make sure to set up restrictive cors rules
app.use('/upload', cors())

// in prod, you should add sensitive rate limits for both endpoints
// you probably want to add content-type and/or filename and filesize validation
app.post('/upload', async (c) => {
  const body = await c.req.arrayBuffer()
  const remoteFileKey = `upload-${v4()}`

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: remoteFileKey,
    Body: body,
    ContentType: c.req.header('content-type') ?? ''
  });

  try{
    await client.send(command)
  } catch(e) {
    console.error(e)
    c.status(500)
    return c.text('')
  }

  return c.text(`${BASE_URL}/files/${remoteFileKey}`)
})

app.get('/files/:name', async (c) => {
  const { name } = c.req.param()
  const remoteFileKey = `${name}`

  // you may want to implement caching when using this in production
  // or, maybe you want to use pre-signed URLs to the client can directly fetch
  // the document from S3.
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: remoteFileKey,
  })

  try{
    const r = await client.send(command)
    return c.body(r.Body, 200, {
      'content-type': r.ContentType ?? ''
    })
  } catch(e) {
    console.error(e)
    c.status(500)
    return c.text('')
  }

})

serve({...app, port: PORT})
```

In order to use the endpoint, adjust `handleImageUpload` in `tiptap-utils.ts`. You will want to remove all code after the validation and replace it with something similar to this:

```
const response = await fetch('http://YOUR_URL/upload', {
    body: file,
    method: 'post',
    headers: {
        'content-type': file.type,
    }
})

if( response.ok ) {
    return response.text()
}

throw new Error('upload failed')
```

## [](#usage)Usage

Import and render the `NotionEditor` component in your React app:

```
import { NotionEditor } from '@/components/tiptap-templates/notion/notion-like-editor'

export default function App() {
  return <NotionEditor room="my-document-room" placeholder="Start writing..." />
}
```

## [](#features)Features

The template includes all the essentials of a modern Notion-style editor:

- **Real-time collaboration**: Live cursors and user presence

- **AI assistance**: Inline AI tools for writing and editing

- **Responsive design**: Mobile-ready UI with adaptive toolbars

- **Dark/light mode**: Fully themed out of the box

- **Slash commands**: `/` menu for quick formatting

- **Floating toolbar**: Context-aware formatting

- **Drag and drop**: Block-level reordering

- **Emoji support**: GitHub-style emoji picker

- **Mentions**: `@user` autocomplete

- **Rich formatting**:
  - Bold, italic, underline, strikethrough
  - Highlight and color
  - Superscript / subscript
  - Syntax-highlighted code blocks

- **Block types**:
  - Headings, lists, blockquotes, dividers, math

- **Media support**: Drag & drop image upload

- **Link management**: With inline previews

- **Text alignment**: Left, center, right, justified

- **Undo/Redo**: Full editing history

- **Context menus**: Right-click enhancements

## [](#component-breakdown)Component Breakdown

### [](#hooks)Hooks

- `use-mobile`
- `use-window-size`
- `use-ui-editor-state`

### [](#icons)Icons

- `arrow-left-icon`
- `chevron-right-icon`
- `highlighter-icon`
- `link-icon`
- `more-vertical-icon`

### [](#tiptap-extensions)Tiptap Extensions

- `collaboration`, `collaboration-caret`
- `selection-extension`
- `link-extension`
- `trailing-node-extension`
- `ai-extension`
- `emoji-extension`
- `mention-extension`
- `mathematics-extension`
- `unique-id-extension`

### [](#libs)Libs

- `tiptap-utils`
- `tiptap-collab-utils`

### [](#ui-components)UI Components

- `ai-menu`
- `blockquote-button`
- `code-block-button`
- `color-highlight-button`, `color-highlight-popover`
- `drag-context-menu`
- `emoji-dropdown-menu`
- `heading-button`, `heading-dropdown-menu`
- `image-upload-button`
- `link-popover`
- `list-button`, `list-dropdown-menu`
- `mark-button`
- `mention-dropdown-menu`
- `slash-dropdown-menu`
- `text-align-button`
- `turn-into-dropdown`
- `undo-redo-button`

### [](#nodes)Nodes

- `code-block-node`
- `image-node`, `image-upload-node`
- `list-node`
- `paragraph-node`

### [](#primitives)Primitives

- `button`, `button-group`
- `dropdown-menu`
- `separator`, `spacer`, `toolbar`

### [](#contexts)Contexts

- `app-context`
- `user-context`
- `collab-context`

## [](#collaboration)Collaboration

To use collaboration:

1. Pass a unique `room` ID to `NotionEditor`
2. Enable JWT auth for each user session
3. User presence and cursors are handled automatically
4. Operational transformation handles concurrent edits
5. Sync and save are managed out-of-the-box

```
<NotionEditor room="team-notes" placeholder="Share your ideas..." />
```

## [](#ai-integration)AI Integration

The built-in AI tools let you:

- **Generate content** from prompts
- **Improve** existing text
- **Get smart completions** based on context

### AI Configuration

Make sure to configure your AI provider. Check the [AI Generation extension docs](/docs/content-ai/capabilities/generation/overview) for setup steps.

## [](#extendability)Extendability

This template is designed to grow with your needs. New Tiptap Cloud features will be seamlessly compatible with the same UI system—no rewrites required.
