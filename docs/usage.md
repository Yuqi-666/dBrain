# Usage manual

## Desktop or web

| Mode | Account and data |
| --- | --- |
| Desktop | The first start creates a local identity. The core content stays on this device. No cloud account is necessary. |
| Web | You register or log in with the service address. The service stores the content and the attachments. |

Both modes use the same workspace interface. They do not synchronize data automatically. A desktop identity is not a web account. Offline mode does not guarantee that an external website or a network link works without a network.

## Install the desktop app

A maintainer provides the current private internal-test release or candidate. A draft is visible only to a person with draft access. Choose the package for your system and CPU. Unpack the platform ZIP and check the included `SHA256SUMS`. Do not mix installers of different architectures.

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

Before you remove content, check whether the menu applies to a node, a relation, or the selected collection. Back up important data first.

The graph and the Dashboard use the data of the same workspace. Database content supports table, kanban, calendar, and chart data views. The available configuration follows the interface entry and the content type. The analysis, the cover, and the transcode of media take time. On a failure, keep the error and the file type for the maintainer.

### Attachment upload

The largest single attachment is 2 GiB. The app selects the upload method from the size. The user does not configure it.

- A file of 32 MiB or less uploads in one request.
- A file larger than 32 MiB uploads in 8 MiB chunks. The client sends only the missing chunks. After a network break, a page refresh, or a backend restart, select the same file again. The upload continues from the completed chunks.
- The server assembles the chunks on the local disk and stores the file in the file library. This step can take a long time. The page shows the progress. A page close during this step does not lose the file. The result is visible after the page opens again.
- If you cancel the upload, the chunks stay on the server. Upload the same file again to continue.

The server rejects a file larger than 2 GiB before the upload starts. An image in the editor and the source text of a web page keep their own smaller limits (5 MiB). These limits are different from the node attachment limit.

A PDF larger than 256 MiB skips the analysis. The app stores the file only. You can still download and open it, but it has no page count and no cover. A video transcodes as a disk stream. The size does not affect the HLS generation.

The PDF viewer reads only the parts of the current page. It does not download the whole file first. The first page of a large scan therefore appears fast. The viewer reads the later pages when you scroll to them.

## Data location and backup

The desktop app keeps the database, the attachments, the local identity, and the logs in the system application data directory. Locate it usually by the identifier `cn.dbrain.desktop`. The platform interface and the log give the real directory. On Linux, the common path is `$XDG_DATA_HOME/cn.dbrain.desktop`. Without that variable, the path is `~/.local/share/cn.dbrain.desktop`.

Exit the app completely before a backup. Check that the background process stopped. Copy the **complete application data directory** to a safe location. Do not copy the database file only. Keep the attachments and the local identity too.

Before a restore, keep a copy of the current directory. Then close the app and restore the complete data of the matching version.

The maintainer backs up the data of a web user. A browser cache is not a server backup. dBrain does not promise a general one-step migration between devices. A maintainer must check a migration requirement.

## Upgrade and uninstall

On each start, an installed desktop app checks the latest published release over HTTPS. If a newer signed update exists for its platform, the app downloads it, verifies the updater signature, installs it, and restarts. The app remains usable offline if the check fails. The first version built with this updater must be installed manually.

Tauri currently transfers a complete update bundle. This is a version update, not a byte-level delta patch. An upgrade does not replace the application data directory. The desktop runtime backs up the data before a version migration. That backup does not replace your external backup.

Uninstall and data removal are two different operations. Do not assume that the uninstaller removes the data. To remove the data, exit the app, inspect the application data directory, back it up, and remove it by hand. For a rollback, use the data backup of the old version. An old version cannot always open a migrated database.

## Report a problem

Give the product version, the OS and architecture, the install format, the reproduction steps, the expected result, and the actual result. Attach the error text or a screenshot without private data. For a media problem, state the file format and the operation. For an upgrade problem, state the old version and the backup state. Do not send a password, a local identity credential, or a complete private database.
