export function validateRecordName(
    name: string,
    initialValue: string,
    existingNames: string[],
): string {
    const trimmed = name.trim()
    if (!trimmed) {
        return '名称不能为空'
    }
    if (trimmed.length > 50) {
        return '名称不能超过 50 个字符'
    }
    const fileSystemReserved = /[\\/:*?"<>|]/
    if (fileSystemReserved.test(trimmed)) {
        return '不能包含 \\ / : * ? " < > |'
    }
    if (trimmed !== initialValue && existingNames.includes(trimmed)) {
        return '名称已存在'
    }
    return ''
}
