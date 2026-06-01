import { supabase } from './supabase'

/**
 * Upload a photo file to Supabase Storage under task-photos bucket.
 * Returns the public URL.
 */
export async function uploadTaskPhoto(file, assignmentId, userId) {
  const ext = file.name.split('.').pop()
  const path = `${userId}/${assignmentId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('task-photos')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a photo by its URL.
 */
export async function deleteTaskPhoto(publicUrl) {
  const path = publicUrl.split('/task-photos/')[1]
  if (!path) return
  await supabase.storage.from('task-photos').remove([path])
}
