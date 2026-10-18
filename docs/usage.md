# Usage manual

## Desktop or web

| Mode | Account and data |
| --- | --- |
| Desktop | The first start creates a local identity. The core content stays on this device. No cloud account is necessary. |
| Web | You register or log in with the service address. The service stores the content and the attachments. |

Both modes use the same workspace interface. They do not synchronize data automatically. A desktop identity is not a web account. Offline mode does not guarantee that an external website or a network link works without a network.

## Install the desktop app

Download a published release from the repository's GitHub Releases page. Drafts and candidate artifacts are for maintainers. Choose the package for your system and CPU. Unpack the platform ZIP and check the included `SHA256SUMS`. Do not mix installers of different architectures.

| Platform | Install format and steps |
| --- | --- |
| Linux x64 | Install the DEB or the RPM with the package manager of your distribution. Give the AppImage the execute permission, then run it. |
| Windows x64 | Run the EXE or the MSI. Follow the steps of the installer. |
| macOS Intel | Open the `darwin-x64` DMG. Copy the app to Applications. |
| macOS Apple Silicon | Open the `darwin-arm64` DMG. Copy the app to Applications. |

The installers contain Node, PocketBase, and the media runtime. The user does not install pnpm, Rust, or the other development dependencies. Linux still needs a WebView, system libraries, and media decoders for the target distribution. dBrain does not claim support for every Linux distribution.

Replace the file names in these examples with the downloaded files.

```bash
# Linux AppImage
chmod +x dBrain.AppImage
./dBrain.AppImage

# Debian / Ubuntu
sudo apt install ./dBrain.deb

# Fedora and other RPM systems
sudo dnf install ./dBrain.rpm
```

The current internal candidates have no formal signature or notarization. Windows can show an unknown publisher or a SmartScreen warning. macOS can ask for a confirmation in "System Settings → Privacy & Security" with "Open Anyway". Operate only on a package from a verified source. A device management policy can stop the installation. See the [Apple note](https://support.apple.com/en-lamr/102445) and the [Microsoft note](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).

## First start

The desktop app initializes the local data, the backend, and the identity at the start. Then it shows the workspace. Wait until the initialization completes. Use the retry entry in the interface after a connection error. Do not run more than one instance on the same data directory.

A web user opens the service address from the maintainer. The user creates an app user on the registration page and logs in. The PocketBase operator superuser is not an app login account. If a page loads without an end, contact the deployment maintainer first. The maintainer checks the service and the proxy configuration.

## Workspace and content

1. Select an existing space in the workspace selector, or create a space with the create entry.
2. Select a view in the graph. Right-click the empty canvas to open the add-node menu.
3. Select a node type for the content. Open the editor and write the content or upload an attachment.
4. Change the semantics and the connections with the node and relation menus. Use the view configuration and the filters to control the visible range.
5. Switch to the Dashboard and organize your work with the workspace components and the data views.

The node types are text, rich text, image, PDF, video, audio, web page, website, collection, and database. A relation connects two nodes. A tag and a semantic classify a node. A workspace is the scope of the content. A view is the way that the app shows the content.

In the rich-text editor, the first Ctrl+A (Command+A on macOS) selects the current block and the second selects the whole document. Copying writes Markdown to the plain-text clipboard. Nodes without a text form, such as images, stay out of the copied text.

Before you remove content, check whether the menu applies to a node, a relation, or the selected collection. Back up important data first.

The graph and the Dashboard use the data of the same workspace. Database content supports table, kanban, calendar, and chart data views. The available configuration follows the interface entry and the content type. The analysis, the cover, and the transcode of media take time. On a failure, keep the error and the file type for the maintainer.

The Dashboard keeps its chrome in two sidebars. The left sidebar holds the pages and the workspace. The right sidebar holds the component library. Move the pointer to a screen edge to float the matching sidebar. Use the two header buttons to pin a sidebar. The button inside the sidebar pins a floating sidebar and closes a pinned one. The header button is hidden while its sidebar is pinned. To add the open node to the component library, select the dashboard button in the node editor header.

### Attachment upload

The largest single attachment is 2 GiB. The app selects the upload method from the size. The user does not configure it.

- A file of 32 MiB or less uploads in one request.
- A file larger than 32 MiB uploads in 8 MiB chunks. The client sends only the missing chunks. After a network break, a page refresh, or a backend restart, select the same file again. The upload continues from the completed chunks.
- The server assembles the chunks on the local disk and stores the file in the file library. This step can take a long time. The page shows the progress. A page close during this step does not lose the file. The result is visible after the page opens again.
- If you cancel the upload, the chunks stay on the server. Upload the same file again to continue.

The server rejects a file larger than 2 GiB before the upload starts. An image in the editor and the source text of a web page keep their own smaller limits (5 MiB). These limits are different from the node attachment limit.

A PDF larger than 256 MiB skips the analysis. The app stores the file only. You can still download and open it, but it has no page count and no cover. A video transcodes as a disk stream. The size does not affect the HLS generation.

The PDF viewer shows the stored cover of the first page immediately, then replaces it with the rendered page. The viewer reads only the parts it needs. It does not download the whole file first, and it locates a page through that page's entry in the document's page tree instead of reading every entry, so a large scan opens quickly even when its pages are stored far apart. The viewer reads the later pages when you scroll to them.

The app remembers the last page for each reader and each node. Reopen the node and the viewer continues from that page. The outline folds by level. Select a parent entry to open or close it. A long title wraps to the next line.

## Resource library and references

Select 资源库 in the island to open the resource library. The page lists the files that you uploaded, in the category of the file: image, video, audio, PDF, or other. The cover and the HLS parts the server derives from a file are not separate entries; they count in the storage panel and disappear with the resource. Search by name and filter by category. The storage panel shows the bytes in use, the total quota, and the share of each category. The maintainer sets the quota and the per-file limits (see the Operations and Development manuals). The built-in defaults give one user 10 GiB in total, 32 MiB per image, 512 MiB per audio file, 512 MiB per PDF, 2 GiB per video, and 256 MiB per other file.

The library can also upload a file, rename its label, copy its address, and delete it. A rename changes the label only; it does not change the stored bytes or the address. Deleting a resource deletes the stored bytes, its derived cover or HLS package, and frees all of that quota. Deleting a node does **not** delete its file, so an orphaned file stays in the library until you delete it there. Check the storage panel when the quota looks full.

To reference a file that is already stored, open the node that accepts a media file and click its add area. Select 「从资源库选择」. Select a file in the dialog; the node stores a reference to that file instead of a copy. A node in a shared workspace can reference a teammate's resource; the selector marks such a file as 共享. The analysis is stored with the resource, so it runs once: the first time a PDF is parsed or a video is packaged, the page count, the cover, the playlist and the duration are saved on the resource, and every node that references it afterwards reuses them without parsing, transcoding or storing anything again. An image or an audio file is measured once the same way; only a resource without a stored measurement is read from the file.

A reference is not a copy. If you delete the resource later, every node that references it stops loading the file. Keep a resource that a node still uses.

In the desktop app the library manages the files of the local workspace. The total quota is the built-in default; there is no deployment operator to change it.

## Data location and backup

The desktop app keeps the database, the attachments, the local identity, and the logs in the system application data directory. Locate it usually by the identifier `cn.dbrain.desktop`. The platform interface and the log give the real directory. On Linux, the common path is `$XDG_DATA_HOME/cn.dbrain.desktop`. Without that variable, the path is `~/.local/share/cn.dbrain.desktop`.

Exit the app completely before a backup. Check that the background process stopped. Copy the **complete application data directory** to a safe location. Do not copy the database file only. Keep the attachments and the local identity too.

Before a restore, keep a copy of the current directory. Then close the app and restore the complete data of the matching version.

The maintainer backs up the data of a web user. A browser cache is not a server backup. dBrain does not promise a general one-step migration between devices. A maintainer must check a migration requirement.

## Upgrade and uninstall

On each start, an installed desktop app checks the latest published release over HTTPS. If a newer signed update exists for its platform, the app downloads it, verifies the updater signature, installs it, and restarts. The app remains usable offline if the check fails. The first version built with this updater must be installed manually.

Tauri currently transfers a complete update bundle. This is a version update, not a byte-level delta patch. An upgrade does not replace the application data directory. The desktop runtime backs up the data before a version migration. It keeps the two newest migration snapshots in the `backups` directory and removes the older ones. That backup does not replace your external backup.

Uninstall and data removal are two different operations. Do not assume that the uninstaller removes the data. To remove the data, exit the app, inspect the application data directory, back it up, and remove it by hand. For a rollback, use the data backup of the old version. An old version cannot always open a migrated database.

## Report a problem

Give the product version, the OS and architecture, the install format, the reproduction steps, the expected result, and the actual result. Attach the error text or a screenshot without private data. For a media problem, state the file format and the operation. For an upgrade problem, state the old version and the backup state. Do not send a password, a local identity credential, or a complete private database.
