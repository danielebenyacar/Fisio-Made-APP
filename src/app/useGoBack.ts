import { useLocation, useNavigate } from 'react-router-dom'

/** Goes back in the app history, or to `fallback` when the page was opened directly. */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key === 'default') navigate(fallback, { replace: true })
    else navigate(-1)
  }
}
