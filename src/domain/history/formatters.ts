export const formatDate = (ts: number): string => {
    const d = new Date(ts * 1000)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

export const formatDuration = (start: number, end: number | null): string => {
    if (!end) return '录制中'
    const sec = end - start
    if (sec < 60) return `${sec} 秒`
    const min = Math.floor(sec / 60)
    return `${min} 分 ${sec % 60} 秒`
}
