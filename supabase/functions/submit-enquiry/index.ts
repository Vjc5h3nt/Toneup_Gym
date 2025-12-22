import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (per IP, per instance)
// In production with multiple instances, use Redis/Upstash
const rateLimitMap = new Map<string, number[]>();
const MAX_SUBMISSIONS_PER_HOUR = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const submissions = rateLimitMap.get(ip) || [];
  
  // Filter out old submissions
  const recentSubmissions = submissions.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  
  // Update the map with recent submissions
  rateLimitMap.set(ip, recentSubmissions);
  
  return recentSubmissions.length >= MAX_SUBMISSIONS_PER_HOUR;
}

function recordSubmission(ip: string): void {
  const submissions = rateLimitMap.get(ip) || [];
  submissions.push(Date.now());
  rateLimitMap.set(ip, submissions);
}

// Validation schemas
function validateEnquiry(data: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Required fields
  if (!data.name || typeof data.name !== "string" || data.name.length < 2 || data.name.length > 100) {
    errors.push("Name must be between 2 and 100 characters");
  }
  
  if (!data.phone || typeof data.phone !== "string" || data.phone.length < 10 || data.phone.length > 15) {
    errors.push("Phone must be between 10 and 15 characters");
  }
  
  // Phone format validation - only digits, spaces, + allowed
  if (data.phone && typeof data.phone === "string") {
    const phoneRegex = /^[\d\s\+\-]+$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push("Phone contains invalid characters");
    }
  }
  
  // Optional email validation
  if (data.email && typeof data.email === "string" && data.email.length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email) || data.email.length > 255) {
      errors.push("Invalid email format");
    }
  }
  
  // Interest validation
  const validInterests = ["normal", "personal_training", "yoga", "crossfit", "other"];
  if (!data.interest || !validInterests.includes(data.interest as string)) {
    errors.push("Invalid interest selection");
  }
  
  // Source validation
  const validSources = ["website", "instagram", "qr", "referral", "walk_in", "other"];
  if (!data.source || !validSources.includes(data.source as string)) {
    errors.push("Invalid source selection");
  }
  
  // Duration validation
  if (data.expected_duration !== undefined) {
    const duration = Number(data.expected_duration);
    if (isNaN(duration) || duration < 1 || duration > 24) {
      errors.push("Duration must be between 1 and 24 months");
    }
  }
  
  // Optional fields length limits
  if (data.fitness_goal && typeof data.fitness_goal === "string" && data.fitness_goal.length > 500) {
    errors.push("Fitness goal must be under 500 characters");
  }
  
  if (data.preferred_call_time && typeof data.preferred_call_time === "string" && data.preferred_call_time.length > 100) {
    errors.push("Preferred call time must be under 100 characters");
  }
  
  if (data.preferred_visit_time && typeof data.preferred_visit_time === "string" && data.preferred_visit_time.length > 100) {
    errors.push("Preferred visit time must be under 100 characters");
  }
  
  return { valid: errors.length === 0, errors };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get client IP for rate limiting
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
               req.headers.get("cf-connecting-ip") || 
               "unknown";

    console.log(`[submit-enquiry] Request from IP: ${ip}`);

    // Check rate limit
    if (isRateLimited(ip)) {
      console.log(`[submit-enquiry] Rate limit exceeded for IP: ${ip}`);
      return new Response(
        JSON.stringify({ error: "Too many submissions. Please try again later." }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await req.json();
    
    // Honeypot check - reject if honeypot field is filled
    if (body.website || body.company || body.fax) {
      console.log(`[submit-enquiry] Honeypot triggered from IP: ${ip}`);
      // Return success to not tip off bots, but don't actually submit
      return new Response(
        JSON.stringify({ success: true, message: "Enquiry submitted successfully" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate input
    const validation = validateEnquiry(body);
    if (!validation.valid) {
      console.log(`[submit-enquiry] Validation failed: ${validation.errors.join(", ")}`);
      return new Response(
        JSON.stringify({ error: "Validation failed", details: validation.errors }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase client with service role for insertion
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare sanitized data
    const enquiryData = {
      name: String(body.name).trim().slice(0, 100),
      phone: String(body.phone).trim().slice(0, 15),
      email: body.email ? String(body.email).trim().slice(0, 255) : null,
      preferred_call_time: body.preferred_call_time ? String(body.preferred_call_time).trim().slice(0, 100) : null,
      preferred_visit_time: body.preferred_visit_time ? String(body.preferred_visit_time).trim().slice(0, 100) : null,
      interest: body.interest,
      expected_duration: Number(body.expected_duration) || 1,
      fitness_goal: body.fitness_goal ? String(body.fitness_goal).trim().slice(0, 500) : null,
      source: body.source,
      status: "new" as const,
      is_enquiry: true,
    };

    // Insert into leads table
    const { data, error } = await supabase.from("leads").insert(enquiryData).select();

    if (error) {
      console.error(`[submit-enquiry] Database error: ${error.message}`);
      return new Response(
        JSON.stringify({ error: "Failed to submit enquiry" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Record successful submission for rate limiting
    recordSubmission(ip);
    
    console.log(`[submit-enquiry] Successfully submitted enquiry from IP: ${ip}, ID: ${data?.[0]?.id}`);

    return new Response(
      JSON.stringify({ success: true, message: "Enquiry submitted successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[submit-enquiry] Unexpected error: ${error}`);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
