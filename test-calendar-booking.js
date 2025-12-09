/**
 * Test script for calendar booking feature
 * 
 * This simulates the complete booking workflow:
 * 1. Send test email asking for site visit
 * 2. Wait for AI to respond with available times
 * 3. Reply confirming a specific time
 * 4. Check if calendar event was created
 */

console.log('📅 Calendar Booking Test Script\n');
console.log('To test the calendar booking feature:');
console.log('');
console.log('STEP 1: Reconnect Gmail with Calendar Permissions');
console.log('  1. Go to http://localhost:3000/dashboard/settings');
console.log('  2. Click "Disconnect Gmail" if already connected');
console.log('  3. Click "Connect Gmail" - this will now include calendar access');
console.log('  4. Approve both Gmail AND Calendar permissions');
console.log('  5. Toggle "Enable Calendar" to ON');
console.log('');
console.log('STEP 2: Send Test Email');
console.log('  From your personal email, send to your business Gmail:');
console.log('  ');
console.log('  Subject: Need a quote');
console.log('  Body:');
console.log('    Hi, I need a quote for a concrete driveway.');
console.log('    Can you come out for a site visit?');
console.log('    My address is 123 Main St, Toronto.');
console.log('');
console.log('STEP 3: Check AI Response');
console.log('  - Wait 1 minute for email poller to process');
console.log('  - Check your inbox for AI reply with 3-5 available time slots');
console.log('  - AI should suggest times like "Monday 10 AM, Tuesday 2 PM, etc."');
console.log('');
console.log('STEP 4: Confirm Appointment Time');
console.log('  Reply to the AI email:');
console.log('  ');
console.log('    Monday at 10 AM works for me!');
console.log('');
console.log('STEP 5: Verify Calendar Event');
console.log('  - Wait 1 minute for email poller');
console.log('  - Check Google Calendar - should see new event');
console.log('  - Check your personal email - should receive calendar invite');
console.log('  - Check backend logs for: "📅 Created calendar event for [name]"');
console.log('');
console.log('STEP 6: Verify Database Updates');
console.log('  - Open Prisma Studio: npx prisma studio --schema=./packages/database/prisma/schema.prisma');
console.log('  - Check Lead record:');
console.log('    - stage should be "scheduled"');
console.log('    - appointmentDate should match confirmed time');
console.log('    - appointmentNotes should say "Site visit scheduled via AI"');
console.log('');
console.log('📊 Check Logs:');
console.log('  Backend logs should show:');
console.log('  - "🔍 Detected booking request in email"');
console.log('  - "📅 Found X available time slots"');
console.log('  - "⏰ Time confirmation detected!"');
console.log('  - "📅 Created calendar event for [customer] at [time]"');
console.log('');
console.log('❌ Troubleshooting:');
console.log('  - If no slots suggested: Check if calendarConnected = true in database');
console.log('  - If calendar event fails: Check OAuth tokens have calendar scope');
console.log('  - If AI doesn\'t detect booking: Check keywords in email');
console.log('  - If time not confirmed: Use exact format like "Monday at 10 AM"');
console.log('');
