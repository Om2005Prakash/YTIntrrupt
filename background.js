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

const interval = 60 * 1000;
const alert_interval = 30 * 60 * 1000;

let workMode = false;

browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.command === "workMode") {
    workMode = request.state;
    console.log(`Work mode: ${workMode}`);
    return true;
  }
});

//Timer Update Routine
function main() {
  function TimerUpdateRoutine(tabs) {
    //Communicate with Content Script
    function commContentScript(payload) {
      function handleResponse(response) {
        if (response == undefined) {
          console.log("Content Script died, injected new script");
          browser.tabs.executeScript({ file: "/content.js" });
          browser.tabs.sendMessage(
            tabs[0].id,
            payload);
        } else {
          console.log(response.content);
        }
      }

      browser.tabs.sendMessage(tabs[0].id, payload, handleResponse);
    }

    //Handle Error from storage API
    function onError(error) {
      console.log(`Error in Storage API ${error}`);
      const now = new Date();
      browser.storage.local.set({
        "ytIntrrupt": {
          "day": now.getDay(),
          "logged": 0,
          "lastlog": Date.now(),
          "session": 0,
        }
      });
    }

    //Handle HIT from storage API
    function onGot(item) {
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Initialize ytIntrrupt if undefined or if day has changed
      if ((item.ytIntrrupt == undefined) ||
        (item.ytIntrrupt.day == undefined) ||
        (item.ytIntrrupt.logged == undefined) ||
        (item.ytIntrrupt.day != now.getDay())) {

        item.ytIntrrupt = {
          "day": now.getDay(),
          "logged": 0,
          "lastlog": Date.now(),
          "session": 0,
        };
      } else {
        // Just update logged time on same day
        item.ytIntrrupt.lastlog = Date.now();
        if (!workMode) {
          if ((Date.now() - item.ytIntrrupt.lastlog < (interval + 5 * 1000))) {
            item.ytIntrrupt.logged += interval;
            item.ytIntrrupt.session += interval;
          } else {
            item.ytIntrrupt.logged += interval;
            item.ytIntrrupt.session = 0;
          }
        }
      }
      console.log(item.ytIntrrupt);
      browser.storage.local.set({ "ytIntrrupt": item.ytIntrrupt });

      //Prepare payload and send
      if (item.ytIntrrupt.session != 0 && item.ytIntrrupt.session % alert_interval == 0) {
        // Update UI and alert
        payload = {
          command: "updateUI&alert",
          logged: `${item.ytIntrrupt.logged / (60 * 1000)} min`,
          alert: `You've been on YouTube for ${item.ytIntrrupt.session / (60 * 1000)} minutes. How about a quick break? 🙂`
        };

      } else {
        payload = {
          command: "updateUI",
          logged: `${(item.ytIntrrupt.logged / (60 * 1000))} min`,
        };
      }
      commContentScript(payload);
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
          TimerUpdateRoutine(tabs);
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

//Sync Intervals
setInterval(main, interval);