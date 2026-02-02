import { Navigate, Outlet } from 'react-router-dom'

function ProtectedRoute() {
  const user = localStorage.getItem("user");
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  if (!user || !isLoggedIn) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute
