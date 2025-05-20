
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Define CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle OPTIONS requests
const handleCorsOptions = () => {
  return new Response(null, {
    headers: corsHeaders,
    status: 204,
  })
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return handleCorsOptions()
  }

  try {
    console.log("update-user-role: Function called");
    
    // Create a Supabase client with the Auth context of the logged in user.
    const supabaseClient = createClient(
      // Supabase API URL - env var exposed by default.
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API ANON KEY - env var exposed by default.
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Create admin auth client
    const adminAuthClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the request body
    const reqData = await req.json();
    
    // Check if this is a delete action
    if (reqData.action === 'delete' && reqData.userId) {
      // Get the authenticated user's JWT claims to check their role
      const { data: { user: requestingUser } } = await supabaseClient.auth.getUser();
      
      if (!requestingUser) {
        return new Response(
          JSON.stringify({ error: 'Authentication required' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
          }
        )
      }
      
      const requestingUserRole = requestingUser.user_metadata?.role || 'user';
      
      // Only admins and owners can delete users
      if (requestingUserRole !== 'admin' && requestingUserRole !== 'owner') {
        return new Response(
          JSON.stringify({ error: 'Admin privileges required to delete users' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        )
      }
      
      // Get user info before deletion
      const { data: userData, error: userError } = await adminAuthClient.auth.admin.getUserById(reqData.userId);
      
      if (userError) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        )
      }
      
      // Cannot delete the owner account
      if (userData.user.email === 'jrdeguzman3647@gmail.com') {
        return new Response(
          JSON.stringify({ error: 'The owner account cannot be deleted' }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          }
        )
      }
      
      // Delete the user
      const { error: deleteError } = await adminAuthClient.auth.admin.deleteUser(reqData.userId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      return new Response(
        JSON.stringify({ message: 'User deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Normal role update flow
    const { email, role, requestingUserEmail } = reqData;

    if (!email || !role) {
      return new Response(
        JSON.stringify({ error: 'Email and role are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate role - include 'owner' in allowed roles
    if (!['owner', 'admin', 'user', 'blocked'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be owner, admin, user, or blocked' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Get the authenticated user's JWT claims to check their role
    const { data: { user: requestingUser } } = await supabaseClient.auth.getUser();
    
    if (!requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }
    
    const requestingUserRole = requestingUser.user_metadata?.role || 'user';
    
    // Owner role special rules
    if (email === "jrdeguzman3647@gmail.com" && role !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'The designated owner role cannot be changed' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }
    
    // Owner role can only be set for jrdeguzman3647@gmail.com
    if (role === 'owner' && email !== "jrdeguzman3647@gmail.com") {
      return new Response(
        JSON.stringify({ error: 'Owner role can only be assigned to the designated owner email' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Only admins and owners can change user roles
    if (requestingUserRole !== 'admin' && requestingUserRole !== 'owner') {
      return new Response(
        JSON.stringify({ error: 'Only admins and owners can modify user roles' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    // Find the user by email
    const { data: usersData, error: usersError } = await adminAuthClient.auth.admin.listUsers();

    if (usersError) {
      console.error("Error listing users:", usersError);
      throw usersError;
    }

    // Case insensitive email search
    const targetUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log("Found target user:", targetUser.id);
    
    // Update the user role in metadata
    const { data, error } = await adminAuthClient.auth.admin.updateUserById(
      targetUser.id,
      { user_metadata: { ...targetUser.user_metadata, role } }
    );

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }

    console.log("Successfully updated user role:", data.user);

    return new Response(
      JSON.stringify({ 
        message: `User's role has been updated to ${role} successfully`, 
        user: data.user 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("Error in update-user-role function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
