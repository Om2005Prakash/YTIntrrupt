/**
 * My goal is to prevent binge watching and avoid excessive screen time
 * 
 * I want to build a tracker, It works in two modes work mode and normal mode
 * 
 * Work mode tracks time spend in doing useful stuff (like tutorials, music etc) and has to manually activated.
 * For now work mode basically stops the timer increment.
 * 
 * The time spent on Normal mode is shown on UI, with a background session timer count which triggers
 * a alert at certain interval
 * 
 * Normal is the default mode
 */


const interval = 60 * 1000; // 1 minute sync delay
const alert_interval = 25 * 60 * 1000 //alert threhold
const daily_limit = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

function main() {
  function updateTimer(tabs) {
    function onError(error) {
      console.log(`Error in Storage API ${error}`);
      const now = new Date();
      browser.storage.local.set({
        "ytIntrrupt": {
          "day": now.getDay(),
          "logged": 0,
          "streak": 0,
          "lastStreak": now.toISOString().split('T')[0]
        }
      });
    }

    function onGot(item) {
      // Check Response from Content Script

      function handleResponse(response) {
        if (response == undefined) {
          console.log("Content Script died, injected new script");
          browser.tabs.executeScript({ file: "/content.js" });
          browser.tabs.sendMessage(tabs[0].id,
            {
              command: "updateUI",
              logged: item.ytIntrrupt.logged,
              streak: item.ytIntrrupt.streak
            },
            handleResponse);
        } else {
          console.log(response.content);
          return true;
        }
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Initialize ytIntrrupt if undefined or if day has changed
      if ((item.ytIntrrupt == undefined) ||
        (item.ytIntrrupt.day == undefined) ||
        (item.ytIntrrupt.logged == undefined) ||
        (item.ytIntrrupt.day != now.getDay())) {

        // Check if we had a streak before
        let streak = 0;
        if (item.ytIntrrupt && item.ytIntrrupt.streak) {
          streak = item.ytIntrrupt.streak;

          // Check if we need to update streak based on previous day's watch time
          if (item.ytIntrrupt.lastStreak) {
            const lastStreakDate = new Date(item.ytIntrrupt.lastStreak);
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            // If yesterday's date matches lastStreak AND watch time was under limit
            if (lastStreakDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0] &&
              item.ytIntrrupt.logged < daily_limit) {
              // Maintain streak
            } else if (lastStreakDate.toISOString().split('T')[0] !== yesterday.toISOString().split('T')[0]) {
              // Broke streak - day missed
              streak = 0;
            }
          }
        }

        item.ytIntrrupt = {
          "day": now.getDay(),
          "logged": 0,
          "streak": streak,
          "lastStreak": today
        };
      } else {
        // Just update logged time on same day
        item.ytIntrrupt.logged += interval;
      }

      browser.storage.local.set({ "ytIntrrupt": item.ytIntrrupt });

      // Send appropriate message to content script
      if (item.ytIntrrupt.logged != 0 && item.ytIntrrupt.logged % alert_interval == 0) {
        // Update UI and alert
        browser.tabs.sendMessage(tabs[0].id,
          {
            command: "updateUI&alert",
            logged: `${item.ytIntrrupt.logged / (60 * 1000)} min`,
            streak: item.ytIntrrupt.streak,
            alert: `It's time to take a break 🙂, WatchTime logged is ${item.ytIntrrupt.logged / (60 * 1000)} min`
          },
          handleResponse);
      } else {
        browser.tabs.sendMessage(tabs[0].id,
          {
            command: "updateUI",
            logged: `${(item.ytIntrrupt.logged / (60 * 1000))} min`,
            streak: item.ytIntrrupt.streak
          },
          handleResponse);
      }

      // Check if we need to update streak at the end of the day
      if (item.ytIntrrupt.logged >= daily_limit && item.ytIntrrupt.streak > 0) {
        // User has exceeded daily limit, streak will be reset tomorrow
        console.log("Daily limit exceeded, streak will be reset tomorrow");
      }
    }

    browser.storage.local.get("ytIntrrupt").then(onGot, onError);
  }

  function checkYT(tabs) {
    if (tabs.length > 0) {
      try {
        const url = new URL(tabs[0].url);
        const isYouTube =
          url.hostname === 'www.youtube.com' ||
          url.hostname === 'youtube.com' ||
          url.hostname.endsWith('.youtube.com');
        if (isYouTube) {
          console.log("Youtube is active");
          updateTimer(tabs);
        } else {
          console.log("YT not active");
        }
      } catch (error) {
        console.error("Error parsing URL:", error);
      }
    }
  }

  console.log("main is invoked");
  browser.tabs.query({ active: true, currentWindow: true }, checkYT);
}

// Function to update streak at the end of day
function updateDailyStreak() {
  function onError(error) {
    console.log(`Error in Storage API ${error}`);
  }

  function onGot(item) {
    if (item.ytIntrrupt && item.ytIntrrupt.logged !== undefined) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // If we haven't updated the streak today
      if (item.ytIntrrupt.lastStreak !== today) {
        // Check if yesterday's usage was under the limit
        if (item.ytIntrrupt.logged < daily_limit) {
          // Increment streak
          item.ytIntrrupt.streak++;
        } else {
          // Reset streak
          item.ytIntrrupt.streak = 0;
        }

        item.ytIntrrupt.lastStreak = today;
        browser.storage.local.set({ "ytIntrrupt": item.ytIntrrupt });
      }
    }
  }

  browser.storage.local.get("ytIntrrupt").then(onGot, onError);
}

setInterval(main, interval);

// Check for streak updates every hour
setInterval(updateDailyStreak, 60 * 60 * 1000);