import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Trends from './pages/Trends'
import TrendDetail from './pages/TrendDetail'
import Articles from './pages/Articles'
import ArticleDetail from './pages/ArticleDetail'
import AdminLogin from './pages/AdminLogin'
import AdminTrends from './pages/AdminTrends'
import GenerateArticle from './pages/GenerateArticle'
import AdminArticles from './pages/AdminArticles'
import './App.css'

/* VITE_BASE_PATH from .env; on Windows/Git Bash, '/' can get transformed
to a Windows path (e.g. '/C:/Program Files/Git/'), so we validate it. */
const rawBasePath = import.meta.env.VITE_BASE_PATH || '/'
const validBasePath =
  rawBasePath.startsWith('/') && !/^\/[A-Za-z]:\//.test(rawBasePath)
    ? rawBasePath
    : '/'

export default function App() {
  return (
    <BrowserRouter basename={validBasePath}>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/trends/:id" element={<TrendDetail />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<ArticleDetail />} />

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/trends"
            element={
              <ProtectedRoute>
                <AdminTrends />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/generate/:trendId"
            element={
              <ProtectedRoute>
                <GenerateArticle />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/articles"
            element={
              <ProtectedRoute>
                <AdminArticles />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
