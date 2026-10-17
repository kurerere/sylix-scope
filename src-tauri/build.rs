fn get_build_date() -> String {
    let now = std::time::SystemTime::now();
    let duration = now.duration_since(std::time::UNIX_EPOCH).unwrap_or_default();
    let total_secs = duration.as_secs();

    let sec = total_secs % 60;
    let total_min = total_secs / 60;
    let min = total_min % 60;
    let total_hours = total_min / 60;
    let hour = total_hours % 24;
    let mut days = (total_hours / 24) as i64;

    let mut year = 1970;
    loop {
        let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
        let days_in_year = if is_leap { 366 } else { 365 };
        if days < days_in_year {
            break;
        }
        days -= days_in_year;
        year += 1;
    }

    let is_leap = (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0);
    let days_in_months = [
        31,
        if is_leap { 29 } else { 28 },
        31,
        30,
        31,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];

    let mut month = 1;
    for &dim in &days_in_months {
        if days < dim {
            break;
        }
        days -= dim;
        month += 1;
    }
    let day = days + 1;

    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC",
        year, month, day, hour, min, sec
    )
}

fn main() {
    println!("cargo:rerun-if-changed=Cargo.toml");
    println!("cargo:rustc-env=BUILD_DATE={}", get_build_date());
    tauri_build::build();

    // tauri-build 只给主程序嵌入 comctl32 v6 manifest；集成测试把 GUI 运行时
    // 拉进链接可达图后，裸加载老版 comctl32 会 STATUS_ENTRYPOINT_NOT_FOUND，
    // 因此集成测试目标也要嵌入同款 manifest。
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let manifest_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("windows/test.manifest");
        println!("cargo:rustc-link-arg-tests=/MANIFEST:EMBED");
        println!(
            "cargo:rustc-link-arg-tests=/MANIFESTINPUT:{}",
            manifest_path.display()
        );
    }
}