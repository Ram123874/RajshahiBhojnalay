RAJSHAHI BHOJNALAY MESS MANAGEMENT - COLLEGE/VIVA EDITION

How to run:
1. Extract this ZIP.
2. Open index.html in a browser.
3. Admin demo login: username admin, password admin123.
4. Add students first, using each student's ID/M-Number.
5. Open student-leave.html for the student leave portal. Enter the student's ID, choose date/meal, and submit.
6. From the Admin Dashboard, open Student Leave Requests and Approve or Reject. Only approved leave affects attendance/monthly bill calculations.

Important limitations:
- This is a frontend demo using browser LocalStorage, not a secure multi-user system. Student leave portal and admin dashboard share data only when opened in the same browser profile on the same origin. Opening files on different devices/browsers will not sync data.
- Login credentials are in frontend JavaScript and are not secure for production. Use a backend/database and proper authentication for real deployment.


ADDED COLLEGE/VIVA FEATURES:
- Smart dashboard cards: student count, current-month collection, estimated pending fees and actions needed.
- Six-month payment collection chart.
- In-app reminders for pending leave requests and estimated unpaid fees. These are dashboard notifications only; no SMS/WhatsApp is sent.
- Printable payment receipt with receipt number; choose Print / Save as PDF in the browser.
- CSV exports for students, payments and attendance (opens in Excel/Google Sheets).
- JSON backup download and restore for the browser-local data groups.
- Refresh button and data-store status indicator.

HOW TO USE THE NEW FEATURES:
1. Login and add students, mark attendance and record payments as usual.
2. Use Smart Dashboard for collection and pending-fee overview. Select a month in billing to calculate that month's figures.
3. Add a payment and confirm whether to print/save the receipt as PDF. The billing row also has a Latest Receipt button.
4. Use the CSV buttons to export reports. Use Backup Data before moving/clearing browser data. Restore Backup replaces the current saved data groups after confirmation.

IMPORTANT FOR VIVA / DEMO:
- This is a client-side academic demo. LocalStorage acts as a browser-local data store, not a server database. Data does not sync across devices or different browser profiles.
- Backup/restore is provided so demo data can be moved manually. Keep backup JSON private because it contains student and payment information.
- Fee reminder notifications are in-app only. Automatic WhatsApp/SMS/email requires an external service and backend.
- Login credentials remain demo credentials in frontend code and are not secure for production. A real deployment needs a backend API, server database, proper authentication/authorization and validation.
- Payment receipts use the browser's Print dialog; choose Save as PDF to create a PDF file.
- Tested archive structure and JavaScript syntax; verify browser-specific print/popup behavior during the viva demo.


NEW: Clear All Old Leaves
- In the Admin Dashboard, open Student Leave Requests and click “Clear All Old Leaves”.
- The app asks for confirmation, then requires typing CLEAR.
- Before removing records, it stores a recoverable snapshot in browser LocalStorage under studentLeavesClearBackup.
- This clears leave requests/history only; attendance and payment records are not deleted.


ULTIMATE BACKUP SAFETY UPDATE
- Added a daily safety snapshot stored in the current browser before dashboard use.
- Restore now creates a pre-restore safety snapshot before replacing data.
- Added a Safety Snapshot download action.
- Continue using Backup Data to download a full JSON backup and store it outside the browser (for example, on your laptop or a private drive).
- Important: daily snapshots are browser-local and are NOT cloud backups. Clearing browser storage may remove them.
- This is a static frontend demo. LocalStorage is not a shared server database; do not publish real student personal data in a public GitHub repository.


LIVE MEAL REPORT + APPROVED LEAVE UPDATE
- Approved leave students are excluded from the selected meal's active student total, meal-taken list, and meal-pending list.
- Approved leave students appear in a separate Leave list with leave type and reason.
- Morning-only and night-only leaves affect only the matching meal; full-day leaves affect both.
- Pending and rejected leave requests do not affect meal totals.
- The meal report refreshes when student, attendance, or leave data changes in another open tab.
- Leave records and attendance records are retained; the report only changes how students are grouped.
\n\nCLIENT MESS MONTHLY RATES\n- M (Morning only): Rs. 1,300 per month\n- E (Evening only): Rs. 1,300 per month\n- M+E (Morning + Evening): Rs. 2,400 per month\nThe Student List shows the mess type for the currently selected month.\n