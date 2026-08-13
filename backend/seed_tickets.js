const { pool } = require('./config/db');
const { generateTicketNumber, calculateDueDate } = require('./utils/ticketHelpers');

const subjects = [
  "Cannot connect to the Wi-Fi in the main office",
  "Printer on 2nd floor is out of toner",
  "Need to install new software for accounting",
  "Laptop battery is draining too fast",
  "Cannot access the shared network drive",
  "Requesting a new monitor for my desk",
  "Email is not syncing on my mobile phone",
  "Keyboard is missing some keys",
  "Need access to the HR portal",
  "Internet connection drops intermittently"
];

const descriptions = [
  "I have been trying to connect to the main office Wi-Fi but it keeps saying 'Incorrect Password' even though it's correct.",
  "The printer near the break room is flashing a red light and says replace toner.",
  "Please install the latest version of QuickBooks on my machine.",
  "My laptop only lasts about 45 minutes on a full charge.",
  "When I click on the Z drive, it says 'Network path not found'.",
  "My current monitor is too small for the spreadsheets I work on.",
  "My iPhone is no longer receiving work emails since yesterday.",
  "The spacebar on my keyboard is sticky and doesn't work well.",
  "I was told I need to submit my timesheet but I don't have an account.",
  "During Zoom calls, my connection drops every 10 minutes."
];

async function seedTickets() {
  try {
    for (let i = 0; i < 10; i++) {
      const ticketNumber = await generateTicketNumber();
      const priority = ['Normal', 'High', 'Low', 'Critical'][Math.floor(Math.random() * 4)];
      const status = ['New', 'In Progress', 'Resolved'][Math.floor(Math.random() * 3)];
      const dueDate = await calculateDueDate(priority);
      
      const requesterId = 5; // Admin user as requester for now
      const categoryId = Math.floor(Math.random() * 8) + 1; // Random category 1-8
      const departmentId = 1; // IT Department
      
      await pool.query(
        `INSERT INTO tickets (ticket_number, requester_id, category_id, department_id, subject, description, priority, status, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ticketNumber, requesterId, categoryId, departmentId, subjects[i], descriptions[i], priority, status, dueDate]
      );
      
      console.log(`Created ticket ${ticketNumber}`);
    }
    console.log("Successfully created 10 tickets!");
  } catch (err) {
    console.error("Error seeding tickets:", err);
  }
}

seedTickets();
