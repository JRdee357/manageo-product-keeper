
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";

const AdminInitializer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const ensureUserRole = async () => {
      if (!user || initialized) return;
      
      try {
        // Check if the designated admin email matches
        const isAdminEmail = user.email === "jrdeguzman3647@gmail.com";
        
        // If user already has the correct role, skip initialization
        if ((isAdminEmail && user.user_metadata?.role === 'admin') || 
            (!isAdminEmail && user.user_metadata?.role)) {
          console.log("User already has correct role, skipping initialization");
          setInitialized(true);
          return;
        }
        
        // Determine the role based on email
        const initialRole = isAdminEmail ? 'admin' : (user.user_metadata?.role || 'user');
        
        console.log(`Initializing user role to: ${initialRole}`);
        
        // Update user metadata locally
        const session = JSON.parse(localStorage.getItem('sb-avocdhvgtmkguyboohkc-auth-token') || '{}');
        if (session.user) {
          session.user.user_metadata = {
            ...session.user.user_metadata,
            role: initialRole
          };
          localStorage.setItem('sb-avocdhvgtmkguyboohkc-auth-token', JSON.stringify(session));
          
          toast({
            title: `User role initialized`,
            description: `Your account has been initialized with the ${initialRole} role.`,
          });
        }
        
        // Try to update the role on the server if it's the admin
        if (isAdminEmail) {
          try {
            await fetch(`https://avocdhvgtmkguyboohkc.functions.supabase.co/update-user-role`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                email: user.email,
                role: 'admin',
                requestingUserEmail: user.email
              })
            });
            console.log("Admin role updated on server");
          } catch (error) {
            console.error("Failed to update admin role on server:", error);
            // Continue anyway since we updated locally
          }
        }
      } catch (error) {
        console.error("Failed to initialize user role:", error);
      }
      
      setInitialized(true);
    };

    ensureUserRole();
  }, [user, toast, initialized]);

  return null; // This component doesn't render anything
};

export default AdminInitializer;
