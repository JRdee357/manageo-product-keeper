
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "../lib/supabase";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Shield, Calendar, Mail, User, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";

interface UserDetailData {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata?: {
    name?: string;
    full_name?: string;
  };
}

const UserDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user: currentUser } = useAuth();
  
  // Check if current user is admin
  const isAdmin = currentUser?.user_metadata?.role === "admin";
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (!id || !isAdmin) return;
      
      setIsLoading(true);
      try {
        // Get the current session token
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          throw new Error("No active session");
        }
        
        // Call the edge function with the auth token to get user details
        const response = await fetch(`https://avocdhvgtmkguyboohkc.functions.supabase.co/list-users?userId=${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch user details');
        }
        
        const userDataResponse = await response.json();
        // If response is an array, get the first item
        const userData = Array.isArray(userDataResponse) && userDataResponse.length > 0 
          ? userDataResponse[0] 
          : userDataResponse;
          
        setUserData(userData);
      } catch (error: any) {
        console.error("Error fetching user details:", error);
        toast({
          variant: "destructive",
          title: "Error fetching user details",
          description: error.message || "Could not load user information",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserDetails();
  }, [id, isAdmin, toast]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "blocked":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">User Details</h1>
          <Button variant="outline" onClick={() => navigate('/users')}>
            Back to Users
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : !userData ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 mb-4">User information not available</p>
              <Button variant="secondary" onClick={() => navigate('/users')}>
                Return to User List
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="text-lg font-medium">
                      {userData.user_metadata?.name || userData.user_metadata?.full_name || "Not provided"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="text-lg font-medium">{userData.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Role</h3>
                    <Badge variant="outline" className={getRoleBadgeColor(userData.role)}>
                      {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Account Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="text-lg font-medium">{formatDate(userData.created_at)}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Last Sign In</h3>
                    <p className="text-lg font-medium">
                      {userData.last_sign_in_at ? formatDate(userData.last_sign_in_at) : "Never"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserDetail;
