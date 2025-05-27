const interval = 60 * 1000;
const alert_interval = 25 * 60 * 1000;
const blackout_interval = 9 * 60 * 1000;
let blackout = false;

//Timer Update Routine
function main() {
  function TimerUpdateRoutine(tabs) {
    //Communicate with Content Script
    function commContentScript(payload, callback) {
      function handleResponse(response) {
        if (response == undefined) {
          console.log("Content Script died, injected new script");
          browser.tabs.executeScript({ file: "/content.js" });
          browser.tabs.sendMessage(
            tabs[0].id,
            payload);
        } else {
          console.log(response.inWorkMode);
          if (callback != undefined) { callback(response.inWorkMode) };
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
    function falseBlackout() {
      blackout = false;
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
        if ((Date.now() - item.ytIntrrupt.lastlog < (interval + 5 * 1000))) {
          item.ytIntrrupt.logged += interval;
          item.ytIntrrupt.session += interval;
        } else {
          item.ytIntrrupt.logged += interval;
          item.ytIntrrupt.session = interval;
        }
        item.ytIntrrupt.lastlog = Date.now();

      }
      console.log(item.ytIntrrupt)
      payload_alert = {
        command: "alert",
        alert: `You've been on YouTube for ${item.ytIntrrupt.session / (60 * 1000)} minutes. How about a quick break? 🙂`
      };
      payload_ui = {
        command: "updateUI",
        logged: `${(item.ytIntrrupt.logged / (60 * 1000))} min`,
      };
      //Prepare payload and send
      let flag = 0
      if (item.ytIntrrupt.session != 0 && item.ytIntrrupt.session % alert_interval == 0) {
        flag = 1;
        commContentScript(payload_alert);
      }
      commContentScript(payload_ui,
        (inWorkMode) => {
          if (inWorkMode == false) {
            browser.storage.local.set({ "ytIntrrupt": item.ytIntrrupt });
            if (flag == 1) {
              console.log("hit")
              blackout = true;
              setTimeout(falseBlackout, blackout_interval);
            }
          }
          payload_blackout = {
            command: "blackout",
            active: blackout,
          }
          console.log(payload_blackout);
          commContentScript(payload_blackout);
        }
      )
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