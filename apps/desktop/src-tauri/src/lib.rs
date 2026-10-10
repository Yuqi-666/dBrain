mod local_backend;
use local_backend::{LocalBackend, start_local_backend};
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let app = tauri::Builder::default()
    .setup(|app| {
      app.manage(Mutex::new(LocalBackend::new(app.handle())?));
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![start_local_backend])
    .build(tauri::generate_context!())
    .expect("error while building tauri application");
  app.run(|app, event| {
    if matches!(event, tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }) {
      if let Ok(mut backend) = app.state::<Mutex<LocalBackend>>().lock() { backend.stop(); }
    }
  });
}
