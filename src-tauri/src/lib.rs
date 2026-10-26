use socket2::{Domain, Socket, Type};
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpListener};
use std::time::Duration;

fn create_reusable_listener(port: u16) -> Result<TcpListener, std::io::Error> {
    let socket = Socket::new(Domain::IPV4, Type::STREAM, None)?;
    socket.set_reuse_address(true)?;
    let addr: SocketAddr = format!("127.0.0.1:{}", port).parse().unwrap();
    socket.bind(&addr.into())?;
    socket.listen(128)?;
    Ok(socket.into())
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn start_oauth_listener(port: u16) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let listener = create_reusable_listener(port)
            .map_err(|e| format!("Failed to bind to port {}: {}", port, e))?;

        let start_time = std::time::Instant::now();
        listener.set_nonblocking(true).map_err(|e| e.to_string())?;

        while start_time.elapsed() < Duration::from_secs(180) {
            match listener.accept() {
                Ok((mut stream, _)) => {
                    let _ = stream.set_nonblocking(false);
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(5)));
                    let mut buffer = [0; 4096];
                    let bytes_read = stream.read(&mut buffer).unwrap_or(0);
                    let request = String::from_utf8_lossy(&buffer[..bytes_read]);

                    if let Some(pos) = request.find("GET /oauth-callback?") {
                        let query = &request[pos + 20..];
                        let line_end = query.find(" HTTP").unwrap_or(query.len());
                        let query_str = &query[..line_end];

                        let mut code = String::new();
                        for param in query_str.split('&') {
                            if let Some(val) = param.strip_prefix("code=") {
                                code = val.to_string();
                                break;
                            }
                        }

                        let response_body = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Authentication Successful</title></head>
<body style="font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
  <div style="background: #111827; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; text-align: center; max-width: 420px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <h2 style="color: #38bdf8; margin-top: 0;">Login Berhasil!</h2>
    <p style="color: #94a3b8; font-size: 14px;">Akun Google Antigravity Anda berhasil terhubung ke Smart Diagram. Tab ini akan menutup otomatis.</p>
    <script>setTimeout(function(){ window.close(); }, 1200);</script>
  </div>
</body>
</html>"#;

                        let response = format!(
                            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                            response_body.len(),
                            response_body
                        );

                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.flush();

                        if !code.is_empty() {
                            return Ok(code);
                        }
                    } else if request.starts_with("GET /") {
                        let _ = stream.write_all(b"HTTP/1.1 204 No Content\r\nConnection: close\r\n\r\n");
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                    std::thread::sleep(Duration::from_millis(150));
                }
                Err(e) => {
                    return Err(format!("Listener error: {}", e));
                }
            }
        }
        Err("OAuth login timed out after 3 minutes. Please try again.".to_string())
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, start_oauth_listener])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
