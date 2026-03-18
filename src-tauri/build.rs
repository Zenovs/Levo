fn main() {
    // Expose the target triple to the binary via env!("TARGET")
    println!("cargo:rustc-env=TARGET={}", std::env::var("TARGET").unwrap_or_default());
    tauri_build::build()
}
