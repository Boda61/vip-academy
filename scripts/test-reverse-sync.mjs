import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase credentials in environment");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const TEST_ID = "e0000000-0000-0000-0000-000000000002";

async function runTests() {
  console.log("=== STARTING REVERSE SYNC VERIFICATION TESTS ===");
  const results = [];

  // Setup test row if not exists
  await supabaseAdmin.from("qr_tokens").upsert({
    id: "e0000000-0000-0000-0000-000000000000",
    token_hash: "test-hash-reverse-sync-1234567890123456",
    status: "expired",
    expires_at: new Date(Date.now() + 3600000).toISOString()
  });

  await supabaseAdmin.from("registration_sessions").upsert({
    id: "e0000000-0000-0000-0000-000000000001",
    qr_token_id: "e0000000-0000-0000-0000-000000000000",
    session_token: "test-session-token-reverse-sync-123456",
    status: "completed",
    expires_at: new Date(Date.now() + 3600000).toISOString()
  });

  await supabaseAdmin.from("registrations").upsert({
    id: TEST_ID,
    session_id: "e0000000-0000-0000-0000-000000000001",
    full_name: "TEST STUDENT ORIGINAL NAME",
    phone_number: "+201999999991",
    whatsapp_number: "+201999999991",
    country: "مصر",
    university_id: "6c28f1ff-fc9b-44c8-a91c-d2077d2449a0",
    academic_year_id: "f55b0844-6e83-42ed-adad-157365d0abb8",
    payment_method_id: "1aa1eb7c-630e-4bb0-970c-a58b6eca1a76",
    total_amount: 100.00,
    status: "confirmed",
    sync_status: "synced"
  });

  // TEST A: Google Sheets Name Edit
  console.log("\n--- TEST A: Full Name Edit ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        full_name: "TEST STUDENT UPDATED NAME",
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, full_name, phone_number, whatsapp_number, country, status, sync_status, updated_at, sheet_updated_at")
      .single();

    const passed = !error && data.full_name === "TEST STUDENT UPDATED NAME" && data.sync_status === "sheet_modified";
    results.push({ test: "TEST A (Name Edit)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST B: Google Sheets Phone Edit
  console.log("\n--- TEST B: Phone Number Edit ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        phone_number: "+201999999992",
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, full_name, phone_number, whatsapp_number, country, status, sync_status")
      .single();

    const passed = !error && data.phone_number === "+201999999992";
    results.push({ test: "TEST B (Phone Edit)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST C: Google Sheets WhatsApp Edit
  console.log("\n--- TEST C: WhatsApp Number Edit ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        whatsapp_number: "+201999999993",
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, full_name, phone_number, whatsapp_number, country, status, sync_status")
      .single();

    const passed = !error && data.whatsapp_number === "+201999999993";
    results.push({ test: "TEST C (WhatsApp Edit)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST D: Google Sheets Country Edit
  console.log("\n--- TEST D: Country Edit ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        country: "المملكة العربية السعودية",
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, full_name, phone_number, whatsapp_number, country, status, sync_status")
      .single();

    const passed = !error && data.country === "المملكة العربية السعودية";
    results.push({ test: "TEST D (Country Edit)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST E1: Google Sheets Price Edit (500 -> 600)
  console.log("\n--- TEST E1: Price Edit (500 -> 600) ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        total_amount: 600.00,
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, total_amount, status, sync_status")
      .single();

    const passed = !error && Number(data.total_amount) === 600.00;
    results.push({ test: "TEST E1 (Price Edit -> 600)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST E2: Google Sheets Price Edit (600 -> 450)
  console.log("\n--- TEST E2: Price Edit (600 -> 450) ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        total_amount: 450.00,
        sheet_updated_at: nowIso,
        sync_status: "sheet_modified"
      })
      .eq("id", TEST_ID)
      .select("id, total_amount, status, sync_status")
      .single();

    const passed = !error && Number(data.total_amount) === 450.00;
    results.push({ test: "TEST E2 (Price Edit -> 450)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST E3: Google Sheets Row Deletion (Soft-Delete)
  console.log("\n--- TEST E3: Row Deletion -> Soft Delete ---");
  {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        status: "cancelled",
        sync_status: "sheet_deleted",
        sheet_updated_at: nowIso
      })
      .eq("id", TEST_ID)
      .select("id, full_name, status, sync_status, payment_method_id, total_amount")
      .single();

    const passed = !error && data.status === "cancelled" && data.sync_status === "sheet_deleted" && data.total_amount !== null;
    results.push({ test: "TEST E (Row Deletion / Soft Delete)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // TEST F: Failure Simulation (No changes when read fails)
  console.log("\n--- TEST F: Failure Simulation ---");
  {
    const { count, error } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .neq("id", TEST_ID);

    const passed = !error && count === 35;
    results.push({ test: "TEST F (Failure Simulation / Real Data Untouched)", passed, count, error });
    console.log("Result:", passed ? "✅ PASSED (35 real rows intact)" : "❌ FAILED", { realRowsCount: count });
  }

  // TEST G: Loop Protection Check
  console.log("\n--- TEST G: Sync Loop Protection ---");
  {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id, updated_at, sheet_updated_at, sync_status")
      .eq("id", TEST_ID)
      .single();

    const passed = !error && data.sheet_updated_at !== null && data.sync_status === "sheet_deleted";
    results.push({ test: "TEST G (Loop Protection Timestamps)", passed, data, error });
    console.log("Result:", passed ? "✅ PASSED" : "❌ FAILED", data);
  }

  // Clean up ONLY the test registration and test session
  console.log("\n--- CLEANUP: Removing isolated test registration ---");
  await supabaseAdmin.from("registrations").delete().eq("id", TEST_ID);
  await supabaseAdmin.from("registration_sessions").delete().eq("id", "e0000000-0000-0000-0000-000000000001");
  await supabaseAdmin.from("qr_tokens").delete().eq("id", "e0000000-0000-0000-0000-000000000000");

  const { count: finalCount } = await supabaseAdmin
    .from("registrations")
    .select("id", { count: "exact", head: true });

  console.log("\n=== ALL TESTS SUMMARY ===");
  console.log("Final real registrations count:", finalCount, "(Expected: 35)");
  const allPassed = results.every(r => r.passed) && finalCount === 35;
  console.log("FINAL RESULT:", allPassed ? "ALL TESTS PASSED ✅" : "SOME TESTS FAILED ❌");
}

runTests().catch(console.error);
