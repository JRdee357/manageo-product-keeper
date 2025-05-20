import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

// Set up CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  try {
    console.log("list-users: Function called");

    // Extract auth token from headers
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header is required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the service role key (needed for admin operations)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify user token and get user information
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication failed: " + (userError?.message || "Unknown error") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("User role:", user.user_metadata?.role);
    
    // Only admin users can access user data
    if (user.user_metadata?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "User not allowed" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // If a specific userId is provided, return only that user's data
    if (userId) {
      const { data: userData, error: userDataError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (userDataError) {
        console.error("Error fetching specific user:", userDataError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch user: " + userDataError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format user data for response
      const formattedUser = {
        id: userData.user.id,
        email: userData.user.email,
        role: userData.user.user_metadata?.role || "user",
        created_at: userData.user.created_at,
        last_sign_in_at: userData.user.last_sign_in_at,
        user_metadata: userData.user.user_metadata,
      };

      console.log(`Successfully retrieved user ${userId}`);
      return new Response(
        JSON.stringify(formattedUser),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise, fetch all users
    const { data: { users }, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (fetchError) {
      console.error("Error fetching users:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users: " + fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format user data for response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "user",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    }));

    console.log(`Successfully retrieved ${formattedUsers.length} users`);
    return new Response(
      JSON.stringify(formattedUsers),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error: " + (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
