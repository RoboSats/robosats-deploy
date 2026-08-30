const { ChatClient } = require("..");
const { ChatType } = require("../dist/command");
const { ciContentText, ChatInfoType } = require("../dist/response");
const { Client } = require("pg");
const sqlite3 = require("sqlite3").verbose();

// Define PostgreSQL connection details at the top of the script
const dbConfig = {
  user: "postgres", // Change to your actual user
  host: "localhost",
  database: "postgres",  // Change to your actual database name
  password: "postgres", // Change to your actual pass
  port: 5432,
};

run();

async function run() {
  // Connect to SimpleX server
  const chat = await ChatClient.create("ws://localhost:5225");
  const user = await chat.apiGetActiveUser();
  if (!user) {
    console.log("No user profile");
    return;
  }
  console.log(`Bot profile: ${user.profile.displayName} (${user.profile.fullName})`);

  // Create or use existing long-term address for the bot
  const address = (await chat.apiGetUserAddress()) || (await chat.apiCreateUserAddress());
  console.log(`Bot address: ${address}`);

  // Enable automatic acceptance of contact connections
  await chat.enableAddressAutoAccept();

  // Set up local database (SQLite) for the bot's data
  const db = new sqlite3.Database("./botdata.sqlite", (err) => {
    if (err) {
      console.error("Error opening database:", err);
    } else {
      console.log("Connected to the bot data database.");
    }
  });

  // Create tables if they don't exist
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS user_mappings (
      simplex_user_id INTEGER,
      robot_id INTEGER,
      mapping_created_at DATETIME,
      notifications_enabled BOOLEAN,
      PRIMARY KEY(simplex_user_id, robot_id)
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS sent_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id INTEGER,
      simplex_user_id INTEGER,
      FOREIGN KEY(simplex_user_id) REFERENCES user_mappings(simplex_user_id)
    )`);
  });

  // Start processing messages
  processMessages(chat, db);

  // Start polling for notifications
  pollNotifications(chat, db);
}

async function processMessages(chat, db) {
  for await (const r of chat.msgQ) {
    const resp = r instanceof Promise ? await r : r;
    if (resp.type === "newChatItem") {
      const { chatInfo } = resp.chatItem;
      if (chatInfo.type !== ChatInfoType.Direct) continue;
      const msg = ciContentText(resp.chatItem.chatItem.content);

      if (msg.startsWith("/start ")) {
        const parts = msg.split(" ");
        if (parts.length >= 2) {
          const token = parts[1];

          // Verify token and get robot info
          const valid = await verifyToken(token);

          if (valid) {
            // Save the user mapping for this robot
            await saveUserMapping(chatInfo.contact.contactId, valid.robot_id, db);

            // Send the message with the robot name
            const message = `You have successfully registered ✅. You will receive notifications here for Robot 🤖: ${valid.robot_name}.`;
            await chat.apiSendTextMessage(ChatType.Direct, chatInfo.contact.contactId, message);
          } else {
            await chat.apiSendTextMessage(
              ChatType.Direct,
              chatInfo.contact.contactId,
              `Invalid token. Please make sure you copied it correctly.`
            );
          }
        } else {
          await chat.apiSendTextMessage(ChatType.Direct, chatInfo.contact.contactId, `Please provide a token. Usage: /start <token>`);
        }
      }
    }
  }
}

async function verifyToken(token) {
  // Use dbConfig for PostgreSQL connection
  const pgClient = new Client(dbConfig);

  try {
    await pgClient.connect();

    // Query the robot ID using the token
    const res = await pgClient.query("SELECT id, user_id FROM api_robot WHERE telegram_token = $1", [token]);

    if (res.rows.length > 0) {
      const robotId = res.rows[0].id;
      const userId = res.rows[0].user_id;

      // Query the robot's name using the user_id
      const robotNameRes = await pgClient.query("SELECT username FROM auth_user WHERE id = $1", [userId]);

      await pgClient.end(); // Close the connection

      if (robotNameRes.rows.length > 0) {
        const robotName = robotNameRes.rows[0].username;
        return { robot_id: robotId, robot_name: robotName };
      } else {
        return { robot_id: robotId, robot_name: "Unknown Robot" };
      }
    } else {
      await pgClient.end(); // Close the connection
      return null; // Invalid token
    }
  } catch (err) {
    console.error("Error verifying token:", err);
    return null;
  }
}

function saveUserMapping(simplex_user_id, robot_id, db) {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO user_mappings (simplex_user_id, robot_id, mapping_created_at, notifications_enabled) VALUES (?, ?, ?, ?)' +
        ' ON CONFLICT(simplex_user_id, robot_id) DO UPDATE SET mapping_created_at=excluded.mapping_created_at, notifications_enabled=1',
      [simplex_user_id, robot_id, now, 1],
      function (err) {
        if (err) {
          console.error("Error saving user mapping:", err);
          reject(err);
        } else {
          console.log(`Saved mapping: simplex_user_id=${simplex_user_id}, robot_id=${robot_id}`);
          resolve();
        }
      }
    );
  });
}

async function pollNotifications(chat, db) {
  // Poll the backend database every 3 minutes
  setInterval(async () => {
    try {
      // Get all user mappings
      const userMappings = await getUserMappings(db);
      const now = new Date();
      const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
      for (const mapping of userMappings) {
        const { simplex_user_id, robot_id, mapping_created_at, notifications_enabled } = mapping;
        const mappingDate = new Date(mapping_created_at);
        if (notifications_enabled) {
          if (now - mappingDate >= twoDaysInMs) {
            // Disable notifications
            await disableNotifications(simplex_user_id, robot_id, db);
            // Get robot name
            const robotName = await getRobotName(robot_id);
            // Send message to user
            const message = `Notifications for ${robotName} are disabled. The lifetime of the notification is 2 days. You can reenable the notification for this robot sending /start <token in cleartext for that specific robot>, but you should consider creating a new robot for each trade`;
            await chat.apiSendTextMessage(ChatType.Direct, simplex_user_id, message);
          } else {
            // Continue processing notifications
            const notifications = await getNotificationsForRobot(robot_id, mapping_created_at);
            for (const notification of notifications) {
              // Check if notification has already been sent
              const sent = await checkNotificationSent(notification.id, simplex_user_id, db);
              if (!sent) {
                // Send notification
                await chat.apiSendTextMessage(
                  ChatType.Direct,
                  simplex_user_id,
                  `${notification.title} ${notification.description}`
                );
                // Mark notification as sent
                await markNotificationSent(notification.id, simplex_user_id, db);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Error polling notifications:", err);
    }
  }, 180000); // Every 180 seconds
}

function getUserMappings(db) {
  return new Promise((resolve, reject) => {
    db.all("SELECT simplex_user_id, robot_id, mapping_created_at, notifications_enabled FROM user_mappings", [], function (err, rows) {
      if (err) {
        console.error("Error getting user mappings:", err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

async function getNotificationsForRobot(robot_id, sinceTime) {
  // Use dbConfig for PostgreSQL connection
  const pgClient = new Client(dbConfig);

  try {
    await pgClient.connect();
    // Query the Notification table for notifications for this robot created after 'sinceTime'
    const res = await pgClient.query(
      "SELECT id, title, description FROM api_notification WHERE robot_id = $1 AND created_at > $2",
      [robot_id, sinceTime]
    );
    await pgClient.end();
    return res.rows;
  } catch (err) {
    console.error("Error getting notifications:", err);
    return [];
  }
}

function checkNotificationSent(notification_id, simplex_user_id, db) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id FROM sent_notifications WHERE notification_id = ? AND simplex_user_id = ?",
      [notification_id, simplex_user_id],
      function (err, row) {
        if (err) {
          console.error("Error checking notification sent:", err);
          reject(err);
        } else {
          resolve(row ? true : false);
        }
      }
    );
  });
}

function markNotificationSent(notification_id, simplex_user_id, db) {
  return new Promise((resolve, reject) => {
    db.run(
      "INSERT INTO sent_notifications (notification_id, simplex_user_id) VALUES (?, ?)",
      [notification_id, simplex_user_id],
      function (err) {
        if (err) {
          console.error("Error marking notification sent:", err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

function disableNotifications(simplex_user_id, robot_id, db) {
  return new Promise((resolve, reject) => {
    db.run(
      "UPDATE user_mappings SET notifications_enabled = 0 WHERE simplex_user_id = ? AND robot_id = ?",
      [simplex_user_id, robot_id],
      function (err) {
        if (err) {
          console.error("Error disabling notifications:", err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function getRobotName(robot_id) {
  // Use dbConfig for PostgreSQL connection
  const pgClient = new Client(dbConfig);

  try {
    await pgClient.connect();
    const res = await pgClient.query("SELECT user_id FROM api_robot WHERE id = $1", [robot_id]);
    if (res.rows.length > 0) {
      const user_id = res.rows[0].user_id;
      // Now get username from auth_user table
      const userRes = await pgClient.query("SELECT username FROM auth_user WHERE id = $1", [user_id]);
      await pgClient.end();
      if (userRes.rows.length > 0) {
        return userRes.rows[0].username;
      } else {
        return "Unknown Robot";
      }
    } else {
      await pgClient.end();
      return "Unknown Robot";
    }
  } catch (err) {
    console.error("Error getting robot name:", err);
    return "Unknown Robot";
  }
}
