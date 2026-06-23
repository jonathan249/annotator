use std::{
    fs,
    path::{Path, PathBuf},
};

use tauri::{
    ipc::Response,
    menu::{Menu, MenuItem, Submenu},
    Emitter, Manager,
};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct Annotation {
    id: String,
    pdf_id: String,
    file_name: String,
    source_path: String,
    page_number: u32,
    selected_text: String,
    comment: String,
    created_at: String,
    updated_at: String,
}

fn validate_pdf_id(pdf_id: &str) -> Result<(), String> {
    if pdf_id.len() == 64 && pdf_id.chars().all(|character| character.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("Invalid PDF identifier.".into())
    }
}

fn annotations_path(app: &tauri::AppHandle, pdf_id: &str) -> Result<PathBuf, String> {
    validate_pdf_id(pdf_id)?;

    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

    path.push("annotations");
    path.push(format!("{pdf_id}.json"));
    Ok(path)
}

fn markdown_path(app: &tauri::AppHandle, pdf_id: &str) -> Result<PathBuf, String> {
    validate_pdf_id(pdf_id)?;

    let mut path = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Failed to resolve app data directory: {error}"))?;

    path.push("markdown");
    path.push(format!("{pdf_id}.md"));
    Ok(path)
}

#[tauri::command]
fn read_pdf_file(path: String) -> Result<Response, String> {
    let path_ref = Path::new(&path);
    let is_pdf = path_ref
        .extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("pdf"));

    if !is_pdf {
        return Err("Please choose a PDF file.".into());
    }

    let data = fs::read(path_ref).map_err(|error| format!("Failed to read PDF: {error}"))?;
    Ok(Response::new(data))
}

#[tauri::command]
fn load_annotations(app: tauri::AppHandle, pdf_id: String) -> Result<Vec<Annotation>, String> {
    let path = annotations_path(&app, &pdf_id)?;

    if !path.exists() {
        return Ok(Vec::new());
    }

    let contents =
        fs::read_to_string(path).map_err(|error| format!("Failed to read annotations: {error}"))?;
    serde_json::from_str(&contents).map_err(|error| format!("Failed to parse annotations: {error}"))
}

#[tauri::command]
fn save_annotations(
    app: tauri::AppHandle,
    pdf_id: String,
    annotations: Vec<Annotation>,
) -> Result<(), String> {
    let path = annotations_path(&app, &pdf_id)?;
    let directory = path
        .parent()
        .ok_or_else(|| "Failed to resolve annotations directory.".to_string())?;

    fs::create_dir_all(directory)
        .map_err(|error| format!("Failed to create annotations directory: {error}"))?;

    let json = serde_json::to_string_pretty(&annotations)
        .map_err(|error| format!("Failed to serialize annotations: {error}"))?;
    let temp_path = path.with_extension("json.tmp");

    fs::write(&temp_path, json).map_err(|error| format!("Failed to write annotations: {error}"))?;

    if let Err(rename_error) = fs::rename(&temp_path, &path) {
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|error| format!("Failed to replace annotations: {error}"))?;
            fs::rename(&temp_path, &path)
                .map_err(|error| format!("Failed to finalize annotations: {error}"))?;
        } else {
            return Err(format!("Failed to finalize annotations: {rename_error}"));
        }
    }

    Ok(())
}

#[tauri::command]
fn load_markdown_document(app: tauri::AppHandle, pdf_id: String) -> Result<String, String> {
    let path = markdown_path(&app, &pdf_id)?;

    if !path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(path).map_err(|error| format!("Failed to read markdown document: {error}"))
}

#[tauri::command]
fn save_markdown_document(
    app: tauri::AppHandle,
    pdf_id: String,
    markdown: String,
) -> Result<(), String> {
    let path = markdown_path(&app, &pdf_id)?;
    let directory = path
        .parent()
        .ok_or_else(|| "Failed to resolve markdown directory.".to_string())?;

    fs::create_dir_all(directory)
        .map_err(|error| format!("Failed to create markdown directory: {error}"))?;

    let temp_path = path.with_extension("md.tmp");
    fs::write(&temp_path, markdown)
        .map_err(|error| format!("Failed to write markdown document: {error}"))?;

    if let Err(rename_error) = fs::rename(&temp_path, &path) {
        if path.exists() {
            fs::remove_file(&path)
                .map_err(|error| format!("Failed to replace markdown document: {error}"))?;
            fs::rename(&temp_path, &path)
                .map_err(|error| format!("Failed to finalize markdown document: {error}"))?;
        } else {
            return Err(format!("Failed to finalize markdown document: {rename_error}"));
        }
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .menu(|app| {
            let open_pdf = MenuItem::with_id(app, "open_pdf", "Open PDF", true, Some("CmdOrCtrl+O"))?;
            let file_menu = Submenu::with_items(app, "File", true, &[&open_pdf])?;
            Menu::with_items(app, &[&file_menu])
        })
        .on_menu_event(|app, event| {
            if event.id() == "open_pdf" {
                let _ = app.emit("open-pdf-requested", ());
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_pdf_file,
            load_annotations,
            save_annotations,
            load_markdown_document,
            save_markdown_document
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
