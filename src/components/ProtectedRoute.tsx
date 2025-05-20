
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const ProtectedRoute = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  console.log("ProtectedRoute - loading:", loading, "isAuthenticated:", isAuthenticated, "path:", location.pathname);

  // Check if this is a password reset route which doesn't need authentication
  const isPasswordResetRoute = location.pathname === "/reset-password";

  // Check if user is the designated admin
  useEffect(() => {
    if (user && user.email === "jrdeguzman3647@gmail.com" && user.user_metadata?.role !== "admin") {
      // Update admin role in localStorage if needed
      try {
        const session = JSON.parse(localStorage.getItem('sb-avocdhvgtmkguyboohkc-auth-token') || '{}');
        if (session.user) {
          session.user.user_metadata = {
            ...session.user.user_metadata,
            role: "admin" // Ensure designated email has admin role
          };
          localStorage.setItem('sb-avocdhvgtmkguyboohkc-auth-token', JSON.stringify(session));
          console.log("Updated admin role in localStorage");
          
          // Force page reload to update the user object with new role
          window.location.reload();
        }
      } catch (error) {
        console.error("Error ensuring admin role:", error);
      }
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
        <p>Loading authentication status...</p>
      </div>
    );
  }

  // Allow access to password reset route without authentication
  if (isPasswordResetRoute) {
    return <Outlet />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // All routes are accessible to all logged-in users
  return <Outlet />;
};

export default ProtectedRoute;
