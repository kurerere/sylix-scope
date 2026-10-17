use rusqlite::{params, Connection, Result};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;

/// 持有数据库连接的 Recording Session 存储入口：路径解析、目录创建、
/// 连接生命周期全部内化，调用方只见 SQL 语义接口。
pub struct HistoryDb {
    conn: Mutex<Connection>,
}

impl HistoryDb {
    pub fn open<P: AsRef<Path>>(path: P) -> Result<Self> {
        Ok(Self {
            conn: Mutex::new(init_db(path)?),
        })
    }

    pub fn with_conn<T>(&self, f: impl FnOnce(&mut Connection) -> Result<T>) -> Result<T> {
        let mut conn = self.conn.lock().expect("HistoryDb 连接锁中毒");
        f(&mut conn)
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct RecordInfo {
    pub id: u64,
    pub name: String,
    pub start_time: i64,
    pub end_time: Option<i64>,
}

#[derive(Clone, Debug, Serialize)]
pub struct SystemMetricsPoint {
    pub timestamp: i64,
    pub cpu_usage: f64,
    pub mem_total: u64,
    pub mem_used: u64,
    pub mem_free: u64,
    pub mem_kernel: u64,
    pub mem_app: u64,
    pub cpu_cores: Vec<f64>,
}

pub fn init_db<P: AsRef<Path>>(path: P) -> Result<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         CREATE TABLE IF NOT EXISTS records (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             name TEXT NOT NULL,
             start_time INTEGER NOT NULL,
             end_time INTEGER
         );
         CREATE TABLE IF NOT EXISTS system_metrics (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             record_id INTEGER NOT NULL,
             timestamp INTEGER NOT NULL,
             cpu_usage REAL NOT NULL,
             mem_total INTEGER NOT NULL,
             mem_used INTEGER NOT NULL,
             mem_free INTEGER NOT NULL,
             mem_kernel INTEGER NOT NULL,
             mem_app INTEGER NOT NULL,
             cpu_cores TEXT,
             FOREIGN KEY(record_id) REFERENCES records(id) ON DELETE CASCADE
         );
         CREATE TABLE IF NOT EXISTS process_metrics (
             id INTEGER PRIMARY KEY AUTOINCREMENT,
             record_id INTEGER NOT NULL,
             timestamp INTEGER NOT NULL,
             pid INTEGER NOT NULL,
             name TEXT NOT NULL,
             cpu REAL NOT NULL,
             mem REAL NOT NULL,
             cmdline TEXT,
             execfile TEXT,
             threads TEXT,
             FOREIGN KEY(record_id) REFERENCES records(id) ON DELETE CASCADE
         );
         CREATE INDEX IF NOT EXISTS idx_sys_metrics ON system_metrics(record_id, timestamp);
         CREATE INDEX IF NOT EXISTS idx_proc_metrics ON process_metrics(record_id, timestamp);
         CREATE TABLE IF NOT EXISTS mcp_settings (
             key TEXT PRIMARY KEY,
             value TEXT NOT NULL
         );",
    )?;
    let _ = conn.execute("ALTER TABLE system_metrics ADD COLUMN cpu_cores TEXT", []);
    let _ = conn.execute("ALTER TABLE process_metrics ADD COLUMN threads TEXT", []);
    Ok(conn)
}

pub fn get_mcp_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM mcp_settings WHERE key = ?1")?;
    let mut rows = stmt.query(params![key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set_mcp_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO mcp_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn insert_record(conn: &Connection, name: &str, start_time: i64) -> Result<u64> {
    conn.execute(
        "INSERT INTO records (name, start_time, end_time) VALUES (?1, ?2, NULL)",
        params![name, start_time],
    )?;
    Ok(conn.last_insert_rowid() as u64)
}

pub fn stop_record(conn: &Connection, id: u64, end_time: i64) -> Result<()> {
    conn.execute(
        "UPDATE records SET end_time = ?1 WHERE id = ?2",
        params![end_time, id],
    )?;
    Ok(())
}

pub fn insert_metrics(
    conn: &Connection,
    record_id: u64,
    timestamp: i64,
    metrics: &crate::monitor_manager::SystemMetrics,
) -> Result<()> {
    let cores_json = serde_json::to_string(&metrics.cpu_cores).unwrap_or_else(|_| "[]".to_string());
    conn.execute(
        "INSERT INTO system_metrics (record_id, timestamp, cpu_usage, mem_total, mem_used, mem_free, mem_kernel, mem_app, cpu_cores)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            record_id,
            timestamp,
            metrics.cpu_usage,
            metrics.mem_total,
            metrics.mem_used,
            metrics.mem_free,
            metrics.mem_kernel,
            metrics.mem_app,
            cores_json
        ],
    )?;
    Ok(())
}

pub fn insert_processes(
    conn: &mut Connection,
    record_id: u64,
    timestamp: i64,
    processes: &[crate::monitor_manager::ProcessInfo],
) -> Result<()> {
    let tx = conn.transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO process_metrics (record_id, timestamp, pid, name, cpu, mem, cmdline, execfile, threads)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
        )?;
        for proc in processes {
            let threads_json = serde_json::to_string(&proc.threads).unwrap_or_else(|_| "[]".to_string());
            stmt.execute(params![
                record_id,
                timestamp,
                proc.pid,
                proc.name,
                proc.cpu,
                proc.mem,
                proc.cmdline,
                proc.execfile,
                threads_json
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn get_records(conn: &Connection) -> Result<Vec<RecordInfo>> {
    let mut stmt = conn
        .prepare("SELECT id, name, start_time, end_time FROM records ORDER BY start_time DESC")?;
    let rows = stmt.query_map([], |row| {
        Ok(RecordInfo {
            id: row.get(0)?,
            name: row.get(1)?,
            start_time: row.get(2)?,
            end_time: row.get(3)?,
        })
    })?;
    let mut res = Vec::new();
    for r in rows {
        res.push(r?);
    }
    Ok(res)
}

pub fn rename_record(conn: &Connection, id: u64, name: &str) -> Result<()> {
    conn.execute(
        "UPDATE records SET name = ?1 WHERE id = ?2",
        params![name, id],
    )?;
    Ok(())
}

pub fn delete_record(conn: &Connection, id: u64) -> Result<()> {
    conn.execute("DELETE FROM records WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn get_record_metrics(conn: &Connection, record_id: u64) -> Result<Vec<SystemMetricsPoint>> {
    let mut stmt = conn.prepare(
        "SELECT timestamp, cpu_usage, mem_total, mem_used, mem_free, mem_kernel, mem_app, cpu_cores
         FROM system_metrics WHERE record_id = ?1 ORDER BY timestamp ASC",
    )?;
    let rows = stmt.query_map(params![record_id], |row| {
        let cores_str: Option<String> = row.get(7)?;
        let cpu_cores = cores_str
            .and_then(|s| serde_json::from_str::<Vec<f64>>(&s).ok())
            .unwrap_or_default();
        Ok(SystemMetricsPoint {
            timestamp: row.get(0)?,
            cpu_usage: row.get(1)?,
            mem_total: row.get(2)?,
            mem_used: row.get(3)?,
            mem_free: row.get(4)?,
            mem_kernel: row.get(5)?,
            mem_app: row.get(6)?,
            cpu_cores,
        })
    })?;
    let mut res = Vec::new();
    for r in rows {
        res.push(r?);
    }
    Ok(res)
}

pub fn get_record_processes(
    conn: &Connection,
    record_id: u64,
    timestamp: i64,
) -> Result<Vec<crate::monitor_manager::ProcessInfo>> {
    let mut stmt = conn.prepare(
        "SELECT pid, name, cpu, mem, cmdline, execfile, threads
         FROM process_metrics WHERE record_id = ?1 AND timestamp = ?2 ORDER BY cpu DESC",
    )?;
    let rows = stmt.query_map(params![record_id, timestamp], |row| {
        let threads_str: Option<String> = row.get(6)?;
        let threads = threads_str
            .and_then(|s| serde_json::from_str::<Vec<crate::monitor_manager::ThreadInfo>>(&s).ok())
            .unwrap_or_default();
        Ok(crate::monitor_manager::ProcessInfo {
            pid: row.get(0)?,
            name: row.get(1)?,
            cpu: row.get(2)?,
            mem: row.get(3)?,
            cmdline: row.get(4)?,
            execfile: row.get(5)?,
            threads,
        })
    })?;
    let mut res = Vec::new();
    for r in rows {
        res.push(r?);
    }
    Ok(res)
}

#[derive(Clone, Debug, Serialize)]
pub struct ProcessMetricPoint {
    pub timestamp: i64,
    pub pid: u32,
    pub name: String,
    pub cpu: f64,
    pub mem: f64,
    pub cmdline: Option<String>,
    pub execfile: Option<String>,
    pub threads: Vec<crate::monitor_manager::ThreadInfo>,
}

pub fn get_record_processes_all(
    conn: &Connection,
    record_id: u64,
) -> Result<Vec<ProcessMetricPoint>> {
    let mut stmt = conn.prepare(
        "SELECT timestamp, pid, name, cpu, mem, cmdline, execfile, threads
         FROM process_metrics 
         WHERE record_id = ?1 
         ORDER BY timestamp ASC, cpu DESC",
    )?;
    let rows = stmt.query_map(params![record_id], |row| {
        let threads_str: Option<String> = row.get(7)?;
        let threads = threads_str
            .and_then(|s| serde_json::from_str::<Vec<crate::monitor_manager::ThreadInfo>>(&s).ok())
            .unwrap_or_default();
        Ok(ProcessMetricPoint {
            timestamp: row.get(0)?,
            pid: row.get(1)?,
            name: row.get(2)?,
            cpu: row.get(3)?,
            mem: row.get(4)?,
            cmdline: row.get(5)?,
            execfile: row.get(6)?,
            threads,
        })
    })?;
    let mut res = Vec::new();
    for r in rows {
        res.push(r?);
    }
    Ok(res)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_workflow() {
        let mut conn = init_db(":memory:").unwrap();
        let record_id = insert_record(&conn, "test-rec", 1000).unwrap();
        assert_eq!(record_id, 1);

        let metrics = crate::monitor_manager::SystemMetrics {
            cpu_usage: 12.5,
            mem_total: 1024,
            mem_used: 512,
            mem_free: 512,
            mem_kernel: 200,
            mem_app: 312,
            cpu_cores: vec![10.0, 15.0],
        };
        insert_metrics(&conn, record_id, 1001, &metrics).unwrap();

        let procs = vec![crate::monitor_manager::ProcessInfo {
            pid: 100,
            name: "test_proc".to_string(),
            cpu: 5.5,
            mem: 10.0,
            cmdline: Some("./test_proc".to_string()),
            execfile: Some("/bin/test_proc".to_string()),
            threads: vec![crate::monitor_manager::ThreadInfo {
                name: "worker".to_string(),
                tid: "40000a1".to_string(),
                tid_decimal: 67109025,
                cpu: 3.2,
            }],
        }];
        insert_processes(&mut conn, record_id, 1001, &procs).unwrap();

        let records = get_records(&conn).unwrap();
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].name, "test-rec");

        let saved_metrics = get_record_metrics(&conn, record_id).unwrap();
        assert_eq!(saved_metrics.len(), 1);
        assert_eq!(saved_metrics[0].cpu_usage, 12.5);
        assert_eq!(saved_metrics[0].cpu_cores, vec![10.0, 15.0]);

        let saved_procs = get_record_processes(&conn, record_id, 1001).unwrap();
        assert_eq!(saved_procs.len(), 1);
        assert_eq!(saved_procs[0].name, "test_proc");
        assert_eq!(saved_procs[0].threads.len(), 1);
        assert_eq!(saved_procs[0].threads[0].name, "worker");
        assert_eq!(saved_procs[0].threads[0].tid, "40000a1");
        assert_eq!(saved_procs[0].threads[0].tid_decimal, 67109025);
        assert_eq!(saved_procs[0].threads[0].cpu, 3.2);

        rename_record(&conn, record_id, "new-name").unwrap();
        let records = get_records(&conn).unwrap();
        assert_eq!(records[0].name, "new-name");

        stop_record(&conn, record_id, 1010).unwrap();
        let records = get_records(&conn).unwrap();
        assert_eq!(records[0].end_time, Some(1010));

        delete_record(&conn, record_id).unwrap();
        assert!(get_records(&conn).unwrap().is_empty());
        assert!(get_record_metrics(&conn, record_id).unwrap().is_empty());
    }

    #[test]
    fn test_get_record_processes_all_data() {
        let mut conn = init_db(":memory:").unwrap();
        let record_id = insert_record(&conn, "export-test", 2000).unwrap();
        let procs_t1 = vec![crate::monitor_manager::ProcessInfo {
            pid: 101,
            name: "p1".to_string(),
            cpu: 1.5,
            mem: 20.0,
            cmdline: None,
            execfile: None,
            threads: vec![crate::monitor_manager::ThreadInfo {
                name: "t1".to_string(),
                tid: "40000b1".to_string(),
                tid_decimal: 67109041,
                cpu: 1.5,
            }],
        }];
        insert_processes(&mut conn, record_id, 2001, &procs_t1).unwrap();

        let procs_t2 = vec![crate::monitor_manager::ProcessInfo {
            pid: 102,
            name: "p2".to_string(),
            cpu: 2.5,
            mem: 30.0,
            cmdline: None,
            execfile: None,
            threads: vec![],
        }];
        insert_processes(&mut conn, record_id, 2002, &procs_t2).unwrap();

        let all_procs = get_record_processes_all(&conn, record_id).unwrap();
        assert_eq!(all_procs.len(), 2);
        assert_eq!(all_procs[0].pid, 101);
        assert_eq!(all_procs[0].threads.len(), 1);
        assert_eq!(all_procs[0].threads[0].name, "t1");
        assert_eq!(all_procs[1].pid, 102);
        assert!(all_procs[1].threads.is_empty());
    }

    #[test]
    fn test_history_db_owned_connection() {
        let db = HistoryDb::open(":memory:").unwrap();
        let rid = db
            .with_conn(|conn| insert_record(conn, "owned-test", 3000))
            .unwrap();
        let name = db
            .with_conn(|conn| Ok(get_records(conn)?.remove(0).name))
            .unwrap();
        assert_eq!(name, "owned-test");
        db.with_conn(|conn| stop_record(conn, rid, 3010)).unwrap();
        let end_time = db
            .with_conn(|conn| Ok(get_records(conn)?[0].end_time))
            .unwrap();
        assert_eq!(end_time, Some(3010));
    }

    #[test]
    fn test_mcp_settings_kv() {
        let conn = init_db(":memory:").unwrap();
        assert!(get_mcp_setting(&conn, "token").unwrap().is_none());

        set_mcp_setting(&conn, "token", "sk-sylixos-123456").unwrap();
        assert_eq!(get_mcp_setting(&conn, "token").unwrap().as_deref(), Some("sk-sylixos-123456"));

        set_mcp_setting(&conn, "token", "sk-sylixos-654321").unwrap();
        assert_eq!(get_mcp_setting(&conn, "token").unwrap().as_deref(), Some("sk-sylixos-654321"));
    }
}
