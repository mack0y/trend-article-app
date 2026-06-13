import { supabase } from './supabase'

export async function invokeFunction(functionName, payload = {}) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  })

  if (error) {
    throw error
  }

  return data
}

export function getPublicArticleUrl(slug) {
  const basePath = import.meta.env.VITE_BASE_PATH || ''
  return `${window.location.origin}${basePath}/articles/${slug}`
}
