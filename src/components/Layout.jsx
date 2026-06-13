import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Layout({ children }) {
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <NavLink to="/" className="brand">
          PH Trend Writer
        </NavLink>

        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/trends">Trends</NavLink>
          <NavLink to="/articles">Articles</NavLink>
          <NavLink to="/admin/trends">Admin</NavLink>
        </nav>

        <button type="button" className="ghost-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="main-content">{children}</main>

      <footer className="site-footer">
        <p>PH-focused trend articles generated with AI assistance.</p>
      </footer>
    </div>
  )
}
