import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Google Sheets API configuration
const SPREADSHEET_ID = "125iuh-wPn_XFNfmjufOkB0anM3wGG3_9Cq5X_IxlICc";

interface AttendanceRecord {
  student_name: string;
  roll_no: string;
  status: string;
  date: string;
  marked_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_SERVICE_ACCOUNT_KEY = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    
    if (!GOOGLE_SERVICE_ACCOUNT_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Google Service Account Key not configured",
          message: "Please add GOOGLE_SERVICE_ACCOUNT_KEY to your secrets"
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate that the key looks like JSON
    const trimmedKey = GOOGLE_SERVICE_ACCOUNT_KEY.trim();
    if (!trimmedKey.startsWith('{')) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid service account key format",
          message: "The key should be JSON starting with '{'. You entered something that starts with: " + trimmedKey.substring(0, 10) + "...",
          hint: "Download the JSON key file from Google Cloud Console (IAM → Service Accounts → Keys → Add Key → Create new key → JSON) and paste the ENTIRE file contents."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { action, records } = await req.json();

    // Parse the service account key
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(trimmedKey);
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          error: "Failed to parse service account key as JSON",
          message: "The key appears to be malformed JSON. Make sure to copy the entire contents of the downloaded JSON file.",
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid service account key",
          message: "The JSON is missing required fields (client_email or private_key). Make sure you're using a Service Account key, not an API key."
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate JWT for Google OAuth
    const jwt = await generateGoogleJWT(serviceAccount);
    
    // Get access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error("Failed to get access token: " + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;

    if (action === "sync") {
      // Sync attendance records to Google Sheets
      const result = await syncToSheets(accessToken, records as AttendanceRecord[]);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "append") {
      // Append a single record
      const result = await appendToSheet(accessToken, records as AttendanceRecord);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      throw new Error("Invalid action. Use 'sync' or 'append'");
    }
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

async function generateGoogleJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signatureInput}.${signatureB64}`;
}

async function syncToSheets(accessToken: string, records: AttendanceRecord[]) {
  // First, get or create the sheet for today's date
  const today = new Date().toISOString().split("T")[0];
  const sheetName = `Attendance_${today}`;

  // Check if sheet exists
  const sheetsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const sheetsData = await sheetsResponse.json();
  const sheetExists = sheetsData.sheets?.some(
    (s: { properties: { title: string } }) => s.properties.title === sheetName
  );

  if (!sheetExists) {
    // Create new sheet
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: sheetName },
              },
            },
          ],
        }),
      }
    );

    // Add headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:E1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [["Roll No", "Student Name", "Status", "Date", "Time Marked"]],
        }),
      }
    );
  }

  // Clear existing data (keep header)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A2:E1000:clear`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // Prepare rows
  const rows = records.map((r) => [
    r.roll_no,
    r.student_name,
    r.status,
    r.date,
    new Date(r.marked_at).toLocaleTimeString(),
  ]);

  // Append data
  if (rows.length > 0) {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A2:E${rows.length + 1}?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: rows }),
      }
    );
  }

  return { synced: rows.length, sheetName };
}

async function appendToSheet(accessToken: string, record: AttendanceRecord) {
  const today = new Date().toISOString().split("T")[0];
  const sheetName = `Attendance_${today}`;

  // Check if sheet exists, create if not
  const sheetsResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const sheetsData = await sheetsResponse.json();
  const sheetExists = sheetsData.sheets?.some(
    (s: { properties: { title: string } }) => s.properties.title === sheetName
  );

  if (!sheetExists) {
    // Create new sheet with headers
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: sheetName } } }],
        }),
      }
    );

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A1:E1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          values: [["Roll No", "Student Name", "Status", "Date", "Time Marked"]],
        }),
      }
    );
  }

  // Append the record
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [[
          record.roll_no,
          record.student_name,
          record.status,
          record.date,
          new Date(record.marked_at).toLocaleTimeString(),
        ]],
      }),
    }
  );

  return { appended: true, sheetName };
}
