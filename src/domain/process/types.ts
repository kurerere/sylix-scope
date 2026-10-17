export interface ProcessThread {
    name: string
    tid: string
    tid_decimal: number
    cpu: number
}

export interface ProcessInfo {
    pid: number
    name: string
    cpu: number
    mem: number
    cmdline: string | null
    execfile: string | null
    threads?: ProcessThread[]
}
