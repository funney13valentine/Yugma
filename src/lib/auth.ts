import { supabase } from './supabase'
import { isPPSUEmail } from '../utils/validateEmail'

export async function signUp(email: string, password: string) {
  if (!isPPSUEmail(email)) {
    return { error: { message: 'Only @ppsu.ac.in email addresses are allowed.' } }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  return { data, error }
}

export async function signIn(email: string, password: string) {
  if (!isPPSUEmail(email)) {
    return { error: { message: 'Only @ppsu.ac.in email addresses are allowed.' } }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  return { error }
}