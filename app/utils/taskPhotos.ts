export interface TaskPhoto { id: string; file_name: string; file_path: string; mime_type: string | null }

export function isPdf(file?: TaskPhoto | null): boolean {
  if (!file) return false
  return file.mime_type === 'application/pdf' || /\.pdf$/i.test(file.file_name || '')
}

export function isImage(file?: TaskPhoto | null): boolean {
  if (!file) return false
  return !!(
    file.mime_type?.startsWith('image/') ||
    (!file.mime_type && /\.(jpe?g|png|gif|webp|avif|bmp)$/i.test(file.file_name || ''))
  )
}

export function isPreviewable(file?: TaskPhoto | null): boolean {
  return isImage(file) || isPdf(file)
}

export function taskPhotos(files: TaskPhoto[] = []): TaskPhoto[] {
  return files.filter(file => !!file.file_path && isPreviewable(file))
}
